#!/usr/bin/env node
/**
 * Article Content Comparison Script
 *
 * Compares article body text stored in database against original source URLs.
 * Detects copy-paste errors by diffing the content.
 *
 * STRICTLY READ-ONLY - Makes no changes to the database.
 *
 * Usage:
 *   node scripts/compare-articles.js [options]
 *
 * Options:
 *   --limit N       Only check first N articles (default: all)
 *   --start N       Start from article shortId N (default: 1)
 *   --type TYPE     Only check articles of type (Asdaa|TelegramArticle)
 *   --verbose       Show detailed comparison output
 *   --output FILE   Write report to file (default: stdout)
 *   --delay MS      Delay between requests in ms (default: 500)
 *
 * Environment:
 *   MONGODB_URI     MongoDB connection string (from .env)
 *
 * Example:
 *   node scripts/compare-articles.js --limit 10 --verbose
 *   node scripts/compare-articles.js --type Asdaa --output report.txt
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: null,
  start: 1,
  type: null,
  verbose: false,
  output: null,
  delay: 500
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--limit':
      options.limit = parseInt(args[++i], 10);
      break;
    case '--start':
      options.start = parseInt(args[++i], 10);
      break;
    case '--type':
      options.type = args[++i];
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--output':
      options.output = args[++i];
      break;
    case '--delay':
      options.delay = parseInt(args[++i], 10);
      break;
    case '--help':
      console.log(`
Article Content Comparison Script

Compares article body text stored in database against original source URLs.
STRICTLY READ-ONLY - Makes no changes to the database.

Usage: node scripts/compare-articles.js [options]

Options:
  --limit N       Only check first N articles (default: all)
  --start N       Start from article shortId N (default: 1)
  --type TYPE     Only check articles of type (Asdaa|TelegramArticle)
  --verbose       Show detailed comparison output
  --output FILE   Write report to file (default: stdout)
  --delay MS      Delay between requests in ms (default: 500)

Environment:
  MONGODB_URI     MongoDB connection string (from .env)
`);
      process.exit(0);
  }
}

// Output helper
let outputStream = process.stdout;
function log(msg) {
  if (options.output) {
    fs.appendFileSync(options.output, msg + '\n');
  } else {
    console.log(msg);
  }
}

// Strip HTML tags and normalize whitespace
function stripHtml(html) {
  if (!html) return '';
  return html
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '...')
    .replace(/&#\d+;/g, '') // Remove numeric entities
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalize Arabic text for comparison
function normalizeArabic(text) {
  if (!text) return '';
  return text
    // Normalize alef variants
    .replace(/[أإآ]/g, 'ا')
    // Normalize taa marbuta
    .replace(/ة/g, 'ه')
    // Normalize yaa
    .replace(/ى/g, 'ي')
    // Remove diacritics (tashkeel)
    .replace(/[ً-ٟ]/g, '')
    // Remove tatweel
    .replace(/ـ/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract article content from Telegram post
function extractTelegramContent(html) {
  // Telegram posts have content in .tgme_widget_message_text
  const match = html.match(/<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (match) {
    return stripHtml(match[1]);
  }
  // Fallback: try to find any substantial text block
  const textMatch = html.match(/<div[^>]*class="[^"]*message[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (textMatch) {
    return stripHtml(textMatch[1]);
  }
  return null;
}

// Extract article content from Asdaa page
function extractAsdaaContent(html) {
  // Asdaa articles typically have content in article or main content div
  // Try various selectors
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return stripHtml(match[1]);
    }
  }
  return null;
}

// Fetch content from URL with retry
async function fetchUrl(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArticleChecker/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ar,en;q=0.9'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await sleep(1000 * attempt);
    }
  }
}

// Simple diff - returns differences
function findDifferences(stored, fetched) {
  const storedNorm = normalizeArabic(stored);
  const fetchedNorm = normalizeArabic(fetched);

  if (storedNorm === fetchedNorm) {
    return { identical: true };
  }

  // Calculate similarity percentage
  const longer = storedNorm.length > fetchedNorm.length ? storedNorm : fetchedNorm;
  const shorter = storedNorm.length > fetchedNorm.length ? fetchedNorm : storedNorm;

  let matches = 0;
  const windowSize = 50;

  for (let i = 0; i < shorter.length - windowSize; i += windowSize) {
    const chunk = shorter.substring(i, i + windowSize);
    if (longer.includes(chunk)) {
      matches += windowSize;
    }
  }

  const similarity = shorter.length > 0 ? Math.round((matches / shorter.length) * 100) : 0;

  // Find first difference position
  let firstDiffPos = 0;
  const minLen = Math.min(storedNorm.length, fetchedNorm.length);
  for (let i = 0; i < minLen; i++) {
    if (storedNorm[i] !== fetchedNorm[i]) {
      firstDiffPos = i;
      break;
    }
    firstDiffPos = i + 1;
  }

  return {
    identical: false,
    similarity,
    storedLength: stored.length,
    fetchedLength: fetched.length,
    lengthDiff: Math.abs(stored.length - fetched.length),
    firstDiffPos,
    storedContext: stored.substring(Math.max(0, firstDiffPos - 20), firstDiffPos + 50),
    fetchedContext: fetched.substring(Math.max(0, firstDiffPos - 20), firstDiffPos + 50)
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Define Article schema inline (read-only, no model modification)
const articleSchema = new mongoose.Schema({
  shortId: Number,
  type: String,
  sourceUrl: String,
  title: String,
  content: String,
  lastEditedAt: Date
}, { strict: false });

async function main() {
  log('='.repeat(60));
  log('Article Content Comparison Tool');
  log('='.repeat(60));
  log(`Started: ${new Date().toISOString()}`);
  log(`Mode: READ-ONLY`);
  log('');

  // Connect to database
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    log('ERROR: MONGODB_URI not set in .env file');
    process.exit(1);
  }

  log('Connecting to database...');
  await mongoose.connect(mongoUri, {
    // Read-only connection options
    readPreference: 'secondaryPreferred',
    maxPoolSize: 5
  });
  log('Connected to database\n');

  // Get Article model
  const Article = mongoose.model('Article', articleSchema, 'articles');

  // Build query
  const query = { sourceUrl: { $exists: true, $ne: '' } };
  if (options.start > 1) {
    query.shortId = { $gte: options.start };
  }
  if (options.type) {
    query.type = options.type;
  }

  // Fetch articles
  let articlesQuery = Article.find(query)
    .select('shortId type sourceUrl title content lastEditedAt')
    .sort({ shortId: 1 })
    .lean();

  if (options.limit) {
    articlesQuery = articlesQuery.limit(options.limit);
  }

  const articles = await articlesQuery;
  log(`Found ${articles.length} articles to check\n`);

  if (articles.length === 0) {
    log('No articles to check.');
    await mongoose.disconnect();
    return;
  }

  // Statistics
  const stats = {
    total: articles.length,
    checked: 0,
    identical: 0,
    different: 0,
    fetchError: 0,
    noSourceContent: 0
  };

  const differences = [];

  log('Checking articles...\n');
  log('-'.repeat(60));

  for (const article of articles) {
    stats.checked++;
    const prefix = `[${stats.checked}/${stats.total}] #${article.shortId}`;

    try {
      // Skip if no source URL
      if (!article.sourceUrl) {
        log(`${prefix}: No source URL - skipped`);
        stats.noSourceContent++;
        continue;
      }

      // Fetch source content
      const html = await fetchUrl(article.sourceUrl);

      // Extract content based on type
      let sourceContent;
      if (article.type === 'TelegramArticle' || article.sourceUrl.includes('t.me')) {
        sourceContent = extractTelegramContent(html);
      } else {
        sourceContent = extractAsdaaContent(html);
      }

      if (!sourceContent) {
        log(`${prefix}: Could not extract content from source`);
        stats.noSourceContent++;
        continue;
      }

      // Get stored content (strip HTML)
      const storedContent = stripHtml(article.content);

      // Compare
      const diff = findDifferences(storedContent, sourceContent);

      if (diff.identical) {
        if (options.verbose) {
          log(`${prefix}: OK (identical)`);
        }
        stats.identical++;
      } else {
        const status = diff.similarity >= 90 ? 'MINOR' : 'MAJOR';
        log(`${prefix}: ${status} DIFF (${diff.similarity}% similar, ${diff.lengthDiff} chars diff)`);

        if (options.verbose) {
          log(`  Stored (${diff.storedLength} chars): "${diff.storedContext.substring(0, 80)}..."`);
          log(`  Source (${diff.fetchedLength} chars): "${diff.fetchedContext.substring(0, 80)}..."`);
        }

        differences.push({
          shortId: article.shortId,
          title: article.title.substring(0, 50),
          sourceUrl: article.sourceUrl,
          similarity: diff.similarity,
          lengthDiff: diff.lengthDiff,
          wasEdited: !!article.lastEditedAt
        });

        stats.different++;
      }

    } catch (error) {
      log(`${prefix}: FETCH ERROR - ${error.message}`);
      stats.fetchError++;
    }

    // Rate limiting
    await sleep(options.delay);
  }

  // Summary
  log('');
  log('='.repeat(60));
  log('SUMMARY');
  log('='.repeat(60));
  log(`Total articles:     ${stats.total}`);
  log(`Checked:            ${stats.checked}`);
  log(`Identical:          ${stats.identical}`);
  log(`Different:          ${stats.different}`);
  log(`Fetch errors:       ${stats.fetchError}`);
  log(`No source content:  ${stats.noSourceContent}`);
  log('');

  if (differences.length > 0) {
    log('ARTICLES WITH DIFFERENCES:');
    log('-'.repeat(60));
    differences
      .sort((a, b) => a.similarity - b.similarity) // Most different first
      .forEach(d => {
        const editMark = d.wasEdited ? ' [EDITED]' : '';
        log(`#${d.shortId}: ${d.similarity}% similar, ${d.lengthDiff} chars diff${editMark}`);
        log(`  Title: ${d.title}`);
        log(`  URL: ${d.sourceUrl}`);
        log('');
      });
  }

  log(`Completed: ${new Date().toISOString()}`);

  await mongoose.disconnect();
  log('Database connection closed.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
