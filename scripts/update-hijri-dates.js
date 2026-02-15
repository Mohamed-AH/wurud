/**
 * Update Hijri Dates Script
 * Converts existing dateRecorded values to Hijri dates
 *
 * Usage:
 *   node scripts/update-hijri-dates.js           # Dry run (preview only)
 *   node scripts/update-hijri-dates.js --apply   # Actually apply changes
 */

require('dotenv').config();
const moment = require('moment-hijri');
const connectDB = require('../config/database');
const { Lecture } = require('../models');

// Check for --apply flag
const dryRun = !process.argv.includes('--apply');

async function updateHijriDates() {
  try {
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log('   Run with --apply to actually update the database\n');
    }
    console.log('🚀 Starting Hijri date conversion...\n');

    // Connect to database
    await connectDB();
    console.log('✓ Connected to database\n');

    // Find all lectures with dateRecorded but no dateRecordedHijri
    const lectures = await Lecture.find({
      dateRecorded: { $ne: null },
      $or: [
        { dateRecordedHijri: null },
        { dateRecordedHijri: '' }
      ]
    });

    console.log(`📊 Found ${lectures.length} lectures to update\n`);

    if (lectures.length === 0) {
      console.log('✅ No lectures need Hijri date conversion!\n');
      process.exit(0);
    }

    let updated = 0;
    let errors = 0;

    for (const lecture of lectures) {
      try {
        // Convert Gregorian to Hijri
        const hijriMoment = moment(lecture.dateRecorded);
        const hijriDate = hijriMoment.format('iYYYY/iMM/iDD'); // Format: 1445/06/15

        if (dryRun) {
          // Preview only
          console.log(`  → Would update: ${lecture.titleArabic.substring(0, 50)}...`);
          console.log(`    Gregorian: ${lecture.dateRecorded.toISOString().split('T')[0]}`);
          console.log(`    Hijri: ${hijriDate}\n`);
          updated++;
        } else {
          // Actually update
          lecture.dateRecordedHijri = hijriDate;
          await lecture.save();

          updated++;
          console.log(`  ✓ Updated: ${lecture.titleArabic.substring(0, 50)}...`);
          console.log(`    Gregorian: ${lecture.dateRecorded.toISOString().split('T')[0]}`);
          console.log(`    Hijri: ${hijriDate}\n`);
        }
      } catch (error) {
        errors++;
        console.error(`  ✗ Error ${dryRun ? 'processing' : 'updating'} ${lecture.titleArabic.substring(0, 50)}...`);
        console.error(`    ${error.message}\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(dryRun ? '📈 DRY RUN SUMMARY' : '📈 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total lectures found:   ${lectures.length}`);
    console.log(`${dryRun ? 'Would update' : 'Successfully updated'}:   ${updated}`);
    console.log(`Errors:                 ${errors}`);
    console.log('='.repeat(60));

    if (dryRun) {
      console.log('\n💡 To apply these changes, run:');
      console.log('   node scripts/update-hijri-dates.js --apply\n');
    } else {
      console.log('\n✅ Hijri date conversion completed!\n');
    }

  } catch (error) {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run update
updateHijriDates();
