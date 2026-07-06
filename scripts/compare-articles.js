#!/usr/bin/env node
/**
 * Article Content Comparison Script
 *
 * Compares article body text stored in database against original source URLs.
 * Shows exact character differences - NO normalization.
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
 *   --output FILE   Write report to file (default: stdout)
 *   --delay MS      Delay between requests in ms (default: 500)
 *
 * Environment:
 *   MONGODB_URI     MongoDB connection string (from .env)
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
    case '--output':
      options.output = args[++i];
      break;
    case '--delay':
      options.delay = parseInt(args[++i], 10);
      break;
    case '--help':
      console.log(`
Article Content Comparison Script

Shows EXACT character differences between stored and source content.
STRICTLY READ-ONLY - Makes no changes to the database.

Usage: node scripts/compare-articles.js [options]

Options:
  --limit N       Only check first N articles (default: all)
  --start N       Start from article shortId N (default: 1)
  --type TYPE     Only check articles of type (Asdaa|TelegramArticle)
  --output FILE   Write report to file (default: stdout)
  --delay MS      Delay between requests in ms (default: 500)
`);
      process.exit(0);
  }
}

// Output helper
function log(msg) {
  if (options.output) {
    fs.appendFileSync(options.output, msg + '\n');
  } else {
    console.log(msg);
  }
}

// Strip HTML tags only - preserve exact text
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '...')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Extract article content from Telegram post
function extractTelegramContent(html) {
  const match = html.match(/<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (match) {
    return stripHtml(match[1]);
  }
  return null;
}

// Extract article content from Asdaa page
function extractAsdaaContent(html) {
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return stripHtml(match[1]);
    }
  }
  return null;
}

// Find all differences between two strings
function findAllDifferences(stored, source) {
  const diffs = [];

  // Normalize line endings for comparison but preserve content
  const storedLines = stored.split('\n').map(l => l.trim()).filter(l => l);
  const sourceLines = source.split('\n').map(l => l.trim()).filter(l => l);

  // Compare as single strings for character-level diff
  const storedText = storedLines.join(' ');
  const sourceText = sourceLines.join(' ');

  if (storedText === sourceText) {
    return { identical: true, diffs: [] };
  }

  // Find character-level differences
  const minLen = Math.min(storedText.length, sourceText.length);
  let diffStart = -1;

  for (let i = 0; i < minLen; i++) {
    if (storedText[i] !== sourceText[i]) {
      if (diffStart === -1) diffStart = i;

      // Capture this difference
      const contextStart = Math.max(0, i - 15);
      const contextEnd = Math.min(minLen, i + 15);

      diffs.push({
        position: i,
        storedChar: storedText[i],
        sourceChar: sourceText[i],
        storedCharCode: storedText.charCodeAt(i),
        sourceCharCode: sourceText.charCodeAt(i),
        storedContext: storedText.substring(contextStart, contextEnd),
        sourceContext: sourceText.substring(contextStart, contextEnd)
      });

      // Skip ahead to find next distinct difference (avoid reporting same region multiple times)
      while (i < minLen - 1 && storedText[i + 1] !== sourceText[i + 1]) {
        i++;
      }
    }
  }

  // Check for length difference
  if (storedText.length !== sourceText.length) {
    diffs.push({
      type: 'length',
      storedLength: storedText.length,
      sourceLength: sourceText.length,
      difference: storedText.length - sourceText.length,
      storedExtra: storedText.length > sourceText.length
        ? storedText.substring(sourceText.length, sourceText.length + 100)
        : null,
      sourceExtra: sourceText.length > storedText.length
        ? sourceText.substring(storedText.length, storedText.length + 100)
        : null
    });
  }

  return { identical: false, diffs };
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format character for display
function formatChar(char, code) {
  if (char === ' ') return `[SPACE]`;
  if (char === '\n') return `[NEWLINE]`;
  if (char === '\t') return `[TAB]`;
  // Show Arabic diacritics clearly
  if (code >= 0x064B && code <= 0x0652) {
    const names = {
      0x064B: 'FATHATAN', 0x064C: 'DAMMATAN', 0x064D: 'KASRATAN',
      0x064E: 'FATHA', 0x064F: 'DAMMA', 0x0650: 'KASRA',
      0x0651: 'SHADDA', 0x0652: 'SUKUN'
    };
    return `[${names[code] || 'HARAKA'}]`;
  }
  return `"${char}" (U+${code.toString(16).toUpperCase().padStart(4, '0')})`;
}

const articleSchema = new mongoose.Schema({
  shortId: Number,
  type: String,
  sourceUrl: String,
  title: String,
  content: String,
  lastEditedAt: Date
}, { strict: false });

async function main() {
  log('='.repeat(70));
  log('Article Content Comparison - EXACT DIFF (No Normalization)');
  log('='.repeat(70));
  log(`Started: ${new Date().toISOString()}`);
  log(`Mode: READ-ONLY\n`);

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    log('ERROR: MONGODB_URI not set in .env file');
    process.exit(1);
  }

  log('Connecting to database...');
  await mongoose.connect(mongoUri, {
    readPreference: 'secondaryPreferred',
    maxPoolSize: 5
  });
  log('Connected.\n');

  const Article = mongoose.model('Article', articleSchema, 'articles');

  const query = { sourceUrl: { $exists: true, $ne: '' } };
  if (options.start > 1) {
    query.shortId = { $gte: options.start };
  }
  if (options.type) {
    query.type = options.type;
  }

  let articlesQuery = Article.find(query)
    .select('shortId type sourceUrl title content lastEditedAt')
    .sort({ shortId: 1 })
    .lean();

  if (options.limit) {
    articlesQuery = articlesQuery.limit(options.limit);
  }

  const articles = await articlesQuery;
  log(`Found ${articles.length} articles to check\n`);

  const stats = {
    total: articles.length,
    checked: 0,
    identical: 0,
    different: 0,
    fetchError: 0,
    noSourceContent: 0
  };

  const allDifferences = [];

  for (const article of articles) {
    stats.checked++;
    const prefix = `[${stats.checked}/${stats.total}] #${article.shortId}`;

    try {
      if (!article.sourceUrl) {
        stats.noSourceContent++;
        continue;
      }

      const html = await fetchUrl(article.sourceUrl);

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

      const storedContent = stripHtml(article.content);
      const result = findAllDifferences(storedContent, sourceContent);

      if (result.identical) {
        stats.identical++;
      } else {
        stats.different++;

        log('');
        log('='.repeat(70));
        log(`DIFFERENCES FOUND: #${article.shortId}`);
        log(`Title: ${article.title}`);
        log(`URL: ${article.sourceUrl}`);
        log(`Edited: ${article.lastEditedAt ? 'YES' : 'NO'}`);
        log('-'.repeat(70));

        for (const diff of result.diffs) {
          if (diff.type === 'length') {
            log(`\nLENGTH DIFFERENCE:`);
            log(`  Stored: ${diff.storedLength} chars`);
            log(`  Source: ${diff.sourceLength} chars`);
            log(`  Diff: ${diff.difference > 0 ? '+' : ''}${diff.difference} chars`);
            if (diff.storedExtra) {
              log(`  Extra in stored: "${diff.storedExtra}..."`);
            }
            if (diff.sourceExtra) {
              log(`  Missing from stored: "${diff.sourceExtra}..."`);
            }
          } else {
            log(`\nCHAR DIFF at position ${diff.position}:`);
            log(`  Stored: ${formatChar(diff.storedChar, diff.storedCharCode)}`);
            log(`  Source: ${formatChar(diff.sourceChar, diff.sourceCharCode)}`);
            log(`  Context stored: "...${diff.storedContext}..."`);
            log(`  Context source: "...${diff.sourceContext}..."`);
          }
        }

        allDifferences.push({
          shortId: article.shortId,
          title: article.title,
          url: article.sourceUrl,
          diffCount: result.diffs.length,
          wasEdited: !!article.lastEditedAt
        });
      }

    } catch (error) {
      log(`${prefix}: FETCH ERROR - ${error.message}`);
      stats.fetchError++;
    }

    await sleep(options.delay);
  }

  log('\n');
  log('='.repeat(70));
  log('SUMMARY');
  log('='.repeat(70));
  log(`Total:              ${stats.total}`);
  log(`Identical:          ${stats.identical}`);
  log(`With differences:   ${stats.different}`);
  log(`Fetch errors:       ${stats.fetchError}`);
  log(`No source content:  ${stats.noSourceContent}`);

  if (allDifferences.length > 0) {
    log('\n');
    log('ARTICLES WITH DIFFERENCES:');
    log('-'.repeat(70));
    allDifferences.forEach(d => {
      log(`#${d.shortId} (${d.diffCount} diffs)${d.wasEdited ? ' [EDITED]' : ''}: ${d.title.substring(0, 50)}`);
    });
  }

  log(`\nCompleted: ${new Date().toISOString()}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
