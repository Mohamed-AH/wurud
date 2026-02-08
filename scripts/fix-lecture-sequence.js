#!/usr/bin/env node
/**
 * Fix Lecture Sequence Script
 *
 * Adds a sortOrder field based on the Excel import order (metadata.serialNo)
 * within each series, so lectures appear in the same order as the Excel.
 *
 * This preserves the original lectureNumber (extracted from title) for display
 * but uses sortOrder for ordering.
 *
 * Usage:
 *   node scripts/fix-lecture-sequence.js --dry-run    # Preview changes
 *   node scripts/fix-lecture-sequence.js              # Apply changes
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Lecture = require('../models/Lecture');
const Series = require('../models/Series');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('======================================================================');
  console.log('  Fix Lecture Sequence for 5feb2026 Import');
  console.log('======================================================================');
  console.log(`\nMode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);

  // Connect to MongoDB
  console.log('\nConnecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Get all series that have lectures from the 5feb2026 batch
  const seriesWithImportedLectures = await Lecture.distinct('seriesId', {
    'metadata.importBatch': '5feb2026'
  });

  console.log(`\nFound ${seriesWithImportedLectures.length} series with imported lectures\n`);

  const stats = {
    seriesProcessed: 0,
    lecturesUpdated: 0,
    errors: []
  };

  for (const seriesId of seriesWithImportedLectures) {
    const series = await Series.findById(seriesId).lean();
    if (!series) continue;

    console.log(`\n--- Series: ${series.titleArabic} ---`);

    // Get all lectures in this series, ordered by:
    // 1. Non-batch lectures first (by their existing sortOrder or lectureNumber)
    // 2. Then batch lectures by S.No

    // First, count and set sortOrder for existing (non-batch) lectures
    const existingLectures = await Lecture.find({
      seriesId: seriesId,
      $or: [
        { 'metadata.importBatch': { $ne: '5feb2026' } },
        { 'metadata.importBatch': { $exists: false } }
      ]
    }).sort({ sortOrder: 1, lectureNumber: 1, createdAt: 1 }).lean();

    let nextSortOrder = existingLectures.length;

    // Update existing lectures to have sortOrder if they don't
    for (let i = 0; i < existingLectures.length; i++) {
      const lecture = existingLectures[i];
      if (lecture.sortOrder === undefined || lecture.sortOrder === null) {
        if (!DRY_RUN) {
          await Lecture.updateOne(
            { _id: lecture._id },
            { $set: { sortOrder: i } }
          );
        }
      }
    }

    // Get all batch lectures ordered by S.No
    const batchLectures = await Lecture.find({
      seriesId: seriesId,
      'metadata.importBatch': '5feb2026'
    }).sort({ 'metadata.serialNo': 1 }).lean();

    if (batchLectures.length === 0) continue;

    console.log(`  Existing lectures: ${existingLectures.length}`);
    console.log(`  Batch lectures to update: ${batchLectures.length}`);
    console.log(`  Starting sortOrder at: ${nextSortOrder}`);

    // Update each batch lecture with sortOrder based on S.No order
    for (let i = 0; i < batchLectures.length; i++) {
      const lecture = batchLectures[i];
      const newSortOrder = nextSortOrder + i;
      const oldSortOrder = lecture.sortOrder;

      if (oldSortOrder !== newSortOrder) {
        console.log(`    S.No ${lecture.metadata?.serialNo}: sortOrder ${oldSortOrder ?? 'null'} → ${newSortOrder} | #${lecture.lectureNumber || '-'} "${lecture.titleArabic.substring(0, 35)}..."`);

        if (!DRY_RUN) {
          try {
            await Lecture.updateOne(
              { _id: lecture._id },
              { $set: { sortOrder: newSortOrder } }
            );
            stats.lecturesUpdated++;
          } catch (error) {
            console.error(`      ERROR: ${error.message}`);
            stats.errors.push({ lectureId: lecture._id, error: error.message });
          }
        } else {
          stats.lecturesUpdated++;
        }
      }
    }

    stats.seriesProcessed++;
  }

  console.log('\n======================================================================');
  console.log('  SUMMARY');
  console.log('======================================================================');
  console.log(`  Series processed: ${stats.seriesProcessed}`);
  console.log(`  Lectures updated: ${stats.lecturesUpdated}`);
  console.log(`  Errors: ${stats.errors.length}`);

  if (DRY_RUN) {
    console.log('\n  DRY RUN - No changes were made.');
    console.log('  Run without --dry-run to apply changes.');
  }

  await mongoose.connection.close();
  console.log('\nDatabase connection closed');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
