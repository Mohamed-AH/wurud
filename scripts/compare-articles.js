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
  node scripts/compare-articles.js --format json --output diffs.json
  node scripts/compare-articles.js --limit 10 --format human
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

// Convert HTML to plain text
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // HTML entities
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8217;/g, ''')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&[a-z]+;/gi, '')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Extract Asdaa article content
function extractAsdaaContent(html) {
  // Find entry-content start
  const startMatch = html.match(/<div[^>]*class="entry-content[^"]*"[^>]*>/i);
  if (!startMatch) return null;

  const startIndex = startMatch.index + startMatch[0].length;
  const afterStart = html.substring(startIndex);

  // Find end - before tags section or closing comment
  let endIndex;
  const tagsMatch = afterStart.match(/<div[^>]*class="post-bottom-meta/i);
  if (tagsMatch) {
    endIndex = tagsMatch.index;
  } else {
    const commentMatch = afterStart.match(/<\/div><!--\s*\.entry-content/i);
    endIndex = commentMatch ? commentMatch.index : afterStart.indexOf('</article>');
  }

  if (endIndex <= 0) endIndex = afterStart.length;

  return htmlToText(afterStart.substring(0, endIndex));
}

// Extract Telegram content
function extractTelegramContent(html) {
  const match = html.match(/<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  return match ? htmlToText(match[1]) : null;
}

// Find character-level differences
function findDifferences(stored, source) {
  // Normalize whitespace for comparison
  const storedNorm = stored.replace(/\s+/g, ' ').trim();
  const sourceNorm = source.replace(/\s+/g, ' ').trim();

  if (storedNorm === sourceNorm) {
    return { identical: true, differences: [] };
  }

  const differences = [];
  const minLen = Math.min(storedNorm.length, sourceNorm.length);
  let i = 0;

  while (i < minLen) {
    if (storedNorm[i] !== sourceNorm[i]) {
      const contextBefore = storedNorm.substring(Math.max(0, i - 30), i);

      // Find resync point
      let storedEnd = i + 1;
      let sourceEnd = i + 1;

      for (let offset = 1; offset <= 100; offset++) {
        let found = false;
        for (let s = 0; s <= offset && !found; s++) {
          for (let t = 0; t <= offset && !found; t++) {
            if (i + s < storedNorm.length && i + t < sourceNorm.length) {
              const sc = storedNorm.substring(i + s, i + s + 15);
              const tc = sourceNorm.substring(i + t, i + t + 15);
              if (sc.length >= 10 && sc === tc) {
                storedEnd = i + s;
                sourceEnd = i + t;
                found = true;
              }
            }
          }
        }
        if (found) break;
      }

      const storedSeg = storedNorm.substring(i, storedEnd);
      const sourceSeg = sourceNorm.substring(i, sourceEnd);
      const contextAfter = storedNorm.substring(storedEnd, storedEnd + 30);

      differences.push({
        position: i,
        stored: storedSeg,
        source: sourceSeg,
        context: { before: contextBefore, after: contextAfter }
      });

      i = Math.max(storedEnd, sourceEnd);
    } else {
      i++;
    }
  }

  // Length difference
  if (storedNorm.length !== sourceNorm.length) {
    differences.push({
      type: 'length',
      storedLength: storedNorm.length,
      sourceLength: sourceNorm.length,
      storedTail: storedNorm.length > sourceNorm.length
        ? storedNorm.substring(sourceNorm.length, sourceNorm.length + 200)
        : null,
      sourceTail: sourceNorm.length > storedNorm.length
        ? sourceNorm.substring(storedNorm.length, storedNorm.length + 200)
        : null
    });
  }

  return { identical: false, differences };
}

async function fetchUrl(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
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
    console.error('ERROR: MONGODB_URI not set in .env');
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
    log(`Found ${articles.length} articles to check\n`);
  }

  const results = [];
  const stats = { total: 0, identical: 0, different: 0, errors: 0 };

  for (const article of articles) {
    stats.total++;

    try {
      if (!article.sourceUrl) continue;

      if (options.format === 'human') {
        process.stdout.write(`\r[${stats.total}/${articles.length}] #${article.shortId}...`);
      }

      const html = await fetchUrl(article.sourceUrl);

      let sourceContent;
      if (article.type === 'TelegramArticle' || article.sourceUrl.includes('t.me')) {
        sourceContent = extractTelegramContent(html);
      } else {
        sourceContent = extractAsdaaContent(html);
      }

      if (!sourceContent) {
        if (options.format === 'human') {
          log(`\n#${article.shortId}: Could not extract source content`);
        }
        stats.errors++;
        continue;
      }

      const storedContent = htmlToText(article.content);
      const result = findDifferences(storedContent, sourceContent);

      if (result.identical) {
        stats.identical++;
      } else {
        stats.different++;

        const articleDiff = {
          shortId: article.shortId,
          title: article.title,
          sourceUrl: article.sourceUrl,
          type: article.type,
          wasEdited: !!article.lastEditedAt,
          differences: result.differences
        };

        results.push(articleDiff);

        if (options.format === 'human') {
          log(`\n${'='.repeat(60)}`);
          log(`#${article.shortId}: ${article.title.substring(0, 50)}`);
          log(`Differences: ${result.differences.length}`);

          for (const d of result.differences) {
            if (d.type === 'length') {
              log(`  [LENGTH] DB:${d.storedLength} Source:${d.sourceLength}`);
            } else {
              log(`  @${d.position}: "${d.stored}" -> "${d.source}"`);
            }
          }
        }
      }

    } catch (error) {
      stats.errors++;
      if (options.format === 'human') {
        log(`\n#${article.shortId}: ERROR - ${error.message}`);
      }
    }

    await sleep(options.delay);
  }

  if (options.format === 'json' || options.format === 'jsonl') {
    writeOutput(results);
  } else {
    log(`\n\n${'='.repeat(60)}`);
    log('SUMMARY');
    log(`Total: ${stats.total}, Identical: ${stats.identical}, Different: ${stats.different}, Errors: ${stats.errors}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
