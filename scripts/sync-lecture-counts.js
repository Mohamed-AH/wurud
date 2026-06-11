#!/usr/bin/env node
/**
 * Sync Lecture Counts
 *
 * Updates lectureCount on all Series and Sheikh documents to match
 * the actual number of published lectures in the database.
 *
 * Usage:
 *   node scripts/sync-lecture-counts.js [options]
 *
 * Options:
 *   --dry-run        Preview changes without updating
 *   --env <path>     Path to .env file (default: .env)
 */

const argsForEnv = process.argv.slice(2);
const envIndex = argsForEnv.indexOf('--env');
const envPath = envIndex !== -1 ? argsForEnv[envIndex + 1] : '.env';

require('dotenv').config({ path: envPath });

const mongoose = require('mongoose');
const Lecture = require('../models/Lecture');
const Series = require('../models/Series');
const Sheikh = require('../models/Sheikh');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('═'.repeat(60));
  console.log('  SYNC LECTURE COUNTS');
  console.log('═'.repeat(60));
  console.log(`\n  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('  Connected to MongoDB\n');

  // Get actual counts per series
  const seriesCounts = await Lecture.aggregate([
    { $match: { published: true } },
    { $group: { _id: '$seriesId', count: { $sum: 1 } } }
  ]);

  const seriesCountMap = new Map(seriesCounts.map(s => [s._id?.toString(), s.count]));

  // Get all series
  const allSeries = await Series.find({}).select('_id titleArabic lectureCount');

  let seriesUpdated = 0;
  console.log('  Series updates:');

  for (const series of allSeries) {
    const actualCount = seriesCountMap.get(series._id.toString()) || 0;
    const currentCount = series.lectureCount || 0;

    if (actualCount !== currentCount) {
      console.log(`    ${series.titleArabic}: ${currentCount} → ${actualCount}`);
      if (!DRY_RUN) {
        await Series.findByIdAndUpdate(series._id, { lectureCount: actualCount });
      }
      seriesUpdated++;
    }
  }

  if (seriesUpdated === 0) {
    console.log('    All series counts are correct.');
  }

  // Get actual counts per sheikh
  const sheikhCounts = await Lecture.aggregate([
    { $match: { published: true } },
    { $group: { _id: '$sheikhId', count: { $sum: 1 } } }
  ]);

  const sheikhCountMap = new Map(sheikhCounts.map(s => [s._id?.toString(), s.count]));

  // Get all sheikhs
  const allSheikhs = await Sheikh.find({}).select('_id nameArabic lectureCount');

  let sheikhUpdated = 0;
  console.log('\n  Sheikh updates:');

  for (const sheikh of allSheikhs) {
    const actualCount = sheikhCountMap.get(sheikh._id.toString()) || 0;
    const currentCount = sheikh.lectureCount || 0;

    if (actualCount !== currentCount) {
      console.log(`    ${sheikh.nameArabic}: ${currentCount} → ${actualCount}`);
      if (!DRY_RUN) {
        await Sheikh.findByIdAndUpdate(sheikh._id, { lectureCount: actualCount });
      }
      sheikhUpdated++;
    }
  }

  if (sheikhUpdated === 0) {
    console.log('    All sheikh counts are correct.');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Series updated:  ${seriesUpdated}`);
  console.log(`  Sheikhs updated: ${sheikhUpdated}`);

  if (DRY_RUN) {
    console.log('\n  ⚠️  DRY RUN - No changes made.');
  }

  console.log('═'.repeat(60));
  await mongoose.connection.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
