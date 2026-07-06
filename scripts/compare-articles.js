#!/usr/bin/env node
/**
 * Article Content Comparison Script
 *
 * Compares article body text stored in database against original source URLs.
 * Outputs machine-readable diff for automated corrections.
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
 *   --format FMT    Output format: json, jsonl, human (default: human)
 *   --output FILE   Write to file (default: stdout)
 *   --delay MS      Delay between requests in ms (default: 500)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const args = process.argv.slice(2);
const options = {
  limit: null,
  start: 1,
  type: null,
  format: 'human',
  output: null,
  delay: 500
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--limit': options.limit = parseInt(args[++i], 10); break;
    case '--start': options.start = parseInt(args[++i], 10); break;
    case '--type': options.type = args[++i]; break;
    case '--format': options.format = args[++i]; break;
    case '--output': options.output = args[++i]; break;
    case '--delay': options.delay = parseInt(args[++i], 10); break;
    case '--help':
      console.log(`
Article Content Comparison - Machine-Readable Output

Usage: node scripts/compare-articles.js [options]

Options:
  --limit N       Only check first N articles
  --start N       Start from article shortId N
  --type TYPE     Filter by type (Asdaa|TelegramArticle)
  --format FMT    Output format: json, jsonl, human (default: human)
  --output FILE   Write to file (default: stdout)
  --delay MS      Delay between requests (default: 500)

Examples:
  # JSON output for correction script
  node scripts/compare-articles.js --format json --output diffs.json

  # JSONL (one article per line) for streaming
  node scripts/compare-articles.js --format jsonl --output diffs.jsonl
`);
      process.exit(0);
  }
}

function log(msg) {
  if (options.output && options.format === 'human') {
    fs.appendFileSync(options.output, msg + '\n');
  } else if (options.format === 'human') {
    console.log(msg);
  }
}

function writeOutput(data) {
  const content = options.format === 'json'
    ? JSON.stringify(data, null, 2)
    : data.map(d => JSON.stringify(d)).join('\n');

  if (options.output) {
    fs.writeFileSync(options.output, content);
  } else {
    console.log(content);
  }
}

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

function extractTelegramContent(html) {
  const match = html.match(/<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  return match ? stripHtml(match[1]) : null;
}

function extractAsdaaContent(html) {
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return stripHtml(match[1]);
  }
  return null;
}

// Find all character-level replacements needed
function findReplacements(stored, source) {
  const replacements = [];

  // Normalize to single line for position tracking
  const storedText = stored.replace(/\s+/g, ' ').trim();
  const sourceText = source.replace(/\s+/g, ' ').trim();

  if (storedText === sourceText) {
    return { identical: true, replacements: [] };
  }

  // Use longest common subsequence approach to find differences
  const minLen = Math.min(storedText.length, sourceText.length);
  let i = 0;

  while (i < minLen) {
    if (storedText[i] !== sourceText[i]) {
      // Found a difference - find the extent
      let storedEnd = i;
      let sourceEnd = i;

      // Look ahead to find where they sync up again
      let synced = false;
      for (let lookAhead = 1; lookAhead <= 50 && !synced; lookAhead++) {
        // Try to find matching substring
        for (let sOff = 0; sOff <= lookAhead; sOff++) {
          for (let tOff = 0; tOff <= lookAhead; tOff++) {
            if (i + sOff < storedText.length && i + tOff < sourceText.length) {
              const storedChunk = storedText.substring(i + sOff, i + sOff + 10);
              const sourceChunk = sourceText.substring(i + tOff, i + tOff + 10);
              if (storedChunk === sourceChunk && storedChunk.length >= 5) {
                storedEnd = i + sOff;
                sourceEnd = i + tOff;
                synced = true;
                break;
              }
            }
          }
          if (synced) break;
        }
      }

      if (!synced) {
        // Couldn't sync - just mark single char difference
        storedEnd = i + 1;
        sourceEnd = i + 1;
      }

      const storedSegment = storedText.substring(i, storedEnd);
      const sourceSegment = sourceText.substring(i, sourceEnd);

      if (storedSegment !== sourceSegment) {
        replacements.push({
          position: i,
          stored: storedSegment,
          source: sourceSegment,
          storedCodes: [...storedSegment].map(c => c.charCodeAt(0)),
          sourceCodes: [...sourceSegment].map(c => c.charCodeAt(0)),
          context: {
            before: storedText.substring(Math.max(0, i - 20), i),
            after: storedText.substring(storedEnd, storedEnd + 20)
          }
        });
      }

      i = Math.max(storedEnd, sourceEnd);
    } else {
      i++;
    }
  }

  // Handle length difference at end
  if (storedText.length !== sourceText.length) {
    replacements.push({
      type: 'length_diff',
      storedLength: storedText.length,
      sourceLength: sourceText.length,
      storedExtra: storedText.length > sourceText.length
        ? storedText.substring(sourceText.length)
        : null,
      sourceExtra: sourceText.length > storedText.length
        ? sourceText.substring(storedText.length)
        : null
    });
  }

  return { identical: false, replacements };
}

async function fetchUrl(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArticleChecker/1.0)',
          'Accept': 'text/html',
          'Accept-Language': 'ar,en'
        }
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(1000 * attempt);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  if (options.format === 'human') {
    log('Article Content Comparison');
    log('='.repeat(60));
    log(`Started: ${new Date().toISOString()}\n`);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    readPreference: 'secondaryPreferred',
    maxPoolSize: 5
  });

  if (options.format === 'human') log('Connected to database.\n');

  const Article = mongoose.model('Article', articleSchema, 'articles');

  const query = { sourceUrl: { $exists: true, $ne: '' } };
  if (options.start > 1) query.shortId = { $gte: options.start };
  if (options.type) query.type = options.type;

  let articlesQuery = Article.find(query)
    .select('shortId type sourceUrl title content lastEditedAt')
    .sort({ shortId: 1 })
    .lean();

  if (options.limit) articlesQuery = articlesQuery.limit(options.limit);

  const articles = await articlesQuery;

  if (options.format === 'human') {
    log(`Checking ${articles.length} articles...\n`);
  }

  const results = [];
  const stats = { total: 0, identical: 0, different: 0, errors: 0 };

  for (const article of articles) {
    stats.total++;

    try {
      if (!article.sourceUrl) continue;

      const html = await fetchUrl(article.sourceUrl);

      let sourceContent;
      if (article.type === 'TelegramArticle' || article.sourceUrl.includes('t.me')) {
        sourceContent = extractTelegramContent(html);
      } else {
        sourceContent = extractAsdaaContent(html);
      }

      if (!sourceContent) {
        if (options.format === 'human') {
          log(`#${article.shortId}: Could not extract source content`);
        }
        continue;
      }

      const storedContent = stripHtml(article.content);
      const result = findReplacements(storedContent, sourceContent);

      if (result.identical) {
        stats.identical++;
        if (options.format === 'human') {
          // Skip identical in human mode for cleaner output
        }
      } else {
        stats.different++;

        const articleDiff = {
          shortId: article.shortId,
          title: article.title,
          sourceUrl: article.sourceUrl,
          type: article.type,
          wasEdited: !!article.lastEditedAt,
          replacements: result.replacements
        };

        results.push(articleDiff);

        if (options.format === 'human') {
          log(`\n${'='.repeat(60)}`);
          log(`#${article.shortId}: ${article.title.substring(0, 50)}`);
          log(`URL: ${article.sourceUrl}`);
          log(`Replacements needed: ${result.replacements.length}`);

          for (const r of result.replacements) {
            if (r.type === 'length_diff') {
              log(`  LENGTH: stored=${r.storedLength}, source=${r.sourceLength}`);
            } else {
              log(`  @${r.position}: "${r.stored}" → "${r.source}"`);
              log(`    Context: ...${r.context.before}[HERE]${r.context.after}...`);
            }
          }
        }
      }

    } catch (error) {
      stats.errors++;
      if (options.format === 'human') {
        log(`#${article.shortId}: ERROR - ${error.message}`);
      }
    }

    await sleep(options.delay);
  }

  // Output results
  if (options.format === 'json' || options.format === 'jsonl') {
    writeOutput(results);
  } else {
    log(`\n${'='.repeat(60)}`);
    log('SUMMARY');
    log(`Total: ${stats.total}, Identical: ${stats.identical}, Different: ${stats.different}, Errors: ${stats.errors}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
