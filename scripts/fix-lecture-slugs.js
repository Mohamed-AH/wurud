#!/usr/bin/env node
/**
 * Fix Lecture Slugs Script
 *
 * Regenerates slugs from lecture titles to fix mismatches.
 *
 * Usage:
 *   node scripts/fix-lecture-slugs.js [--dry-run] [--series SERIES_ID] [--env FILE] [--output FILE]
 *
 * Options:
 *   --dry-run      Show what would be updated without making changes
 *   --series ID    Only fix lectures in this series
 *   --env FILE     Path to .env file (default: .env)
 *   --output FILE  Write output to file (works on Windows)
 */

const fs = require('fs');

// Parse --env argument first
const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
const envPath = envIndex !== -1 ? args[envIndex + 1] : '.env';

// Parse --output argument
const outputIndex = args.indexOf('--output');
const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;

// Create output stream
let output = [];
function log(msg = '') {
  console.log(msg);
  output.push(msg);
}

// Write output to file at the end
function saveOutput() {
  if (outputFile) {
    fs.writeFileSync(outputFile, output.join('\n'), 'utf8');
    console.log(`\n📄 Output saved to: ${outputFile}`);
  }
}

require('dotenv').config({ path: envPath });

if (!process.env.MONGODB_URI) {
  console.error('\n❌ Error: MONGODB_URI environment variable is not set.');
  console.error('Usage: node scripts/fix-lecture-slugs.js --env /path/to/.env\n');
  process.exit(1);
}

const mongoose = require('mongoose');
const Lecture = require('../models/Lecture');
const { generateSlug } = require('../utils/slugify');

// Parse arguments
const DRY_RUN = args.includes('--dry-run');
const seriesIndex = args.indexOf('--series');
const SERIES_ID = seriesIndex !== -1 ? args[seriesIndex + 1] : null;

async function fixSlugs() {
  log('\n🔧 Fix Lecture Slugs Script');
  log('='.repeat(50));

  if (DRY_RUN) {
    log('📋 DRY RUN MODE - No changes will be made\n');
  }

  if (SERIES_ID) {
    log(`📚 Filtering by series: ${SERIES_ID}\n`);
  }

  if (outputFile) {
    log(`📄 Output will be saved to: ${outputFile}\n`);
  }

  // Connect to MongoDB
  log('🔌 Connecting to MongoDB...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log('✓ Connected to MongoDB\n');
  } catch (err) {
    log('✗ MongoDB connection failed: ' + err.message);
    saveOutput();
    process.exit(1);
  }

  // Build query
  const query = {};
  if (SERIES_ID) {
    query.seriesId = SERIES_ID;
  }

  // Fetch all lectures
  const lectures = await Lecture.find(query)
    .sort({ seriesId: 1, lectureNumber: 1 })
    .lean();

  log(`📚 Found ${lectures.length} lectures to check\n`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const lecture of lectures) {
    const title = lecture.titleArabic;
    const currentSlug = lecture.slug;

    // Generate new slug from title
    let newSlug = generateSlug(title);

    // Check if slug matches
    if (currentSlug === newSlug) {
      skipped++;
      continue;
    }

    // Check for uniqueness (excluding current lecture)
    let suffix = 1;
    let uniqueSlug = newSlug;
    while (await Lecture.exists({ slug: uniqueSlug, _id: { $ne: lecture._id } })) {
      suffix++;
      uniqueSlug = `${newSlug}-${suffix}`;
    }
    newSlug = uniqueSlug;

    log(`📝 ${title.substring(0, 50)}...`);
    log(`   Old: ${currentSlug}`);
    log(`   New: ${newSlug}`);

    if (!DRY_RUN) {
      try {
        await Lecture.updateOne(
          { _id: lecture._id },
          { $set: { slug: newSlug } }
        );
        log(`   ✓ Updated\n`);
        fixed++;
      } catch (err) {
        log(`   ✗ Error: ${err.message}\n`);
        errors++;
      }
    } else {
      log(`   📋 Would update\n`);
      fixed++;
    }
  }

  // Summary
  log('='.repeat(50));
  log('📊 Summary:');
  log(`   Total checked: ${lectures.length}`);
  log(`   Fixed: ${fixed}`);
  log(`   Skipped (already correct): ${skipped}`);
  log(`   Errors: ${errors}`);

  if (DRY_RUN && fixed > 0) {
    log('\n📋 This was a dry run. Run without --dry-run to apply changes.');
  }

  await mongoose.disconnect();
  log('\n✓ Done!\n');

  // Save output to file if specified
  saveOutput();
}

fixSlugs().catch(err => {
  log('Fatal error: ' + err.message);
  saveOutput();
  process.exit(1);
});
