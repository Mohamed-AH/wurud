#!/usr/bin/env node
/**
 * Fix Missing Audio Script
 *
 * Diagnoses lectures without audioFileName and helps match them
 * with available audio files.
 *
 * Usage:
 *   node scripts/fix-missing-audio.js                    # List lectures without audio
 *   node scripts/fix-missing-audio.js --list-oci        # Also list OCI files
 *   node scripts/fix-missing-audio.js --match           # Try to suggest matches
 */

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const listOci = args.includes('--list-oci');
  const tryMatch = args.includes('--match');

  console.log('🔍 Missing Audio Diagnosis Tool');
  console.log('================================\n');

  // Connect to MongoDB
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  const { Lecture, Series, Sheikh } = require('../models');

  // Find lectures without audioFileName
  const lecturesWithoutAudio = await Lecture.find({
    $or: [
      { audioFileName: { $exists: false } },
      { audioFileName: null },
      { audioFileName: '' }
    ]
  })
  .populate('sheikhId', 'nameArabic')
  .populate('seriesId', 'titleArabic')
  .lean();

  console.log('='.repeat(60));
  console.log(`📋 LECTURES WITHOUT AUDIO FILE (${lecturesWithoutAudio.length} found)`);
  console.log('='.repeat(60));

  if (lecturesWithoutAudio.length === 0) {
    console.log('\n✅ All lectures have audio files assigned!\n');
  } else {
    lecturesWithoutAudio.forEach((lecture, i) => {
      console.log(`\n${i + 1}. ${lecture.titleArabic}`);
      console.log(`   ID: ${lecture._id}`);
      if (lecture.sheikhId) {
        console.log(`   Sheikh: ${lecture.sheikhId.nameArabic}`);
      }
      if (lecture.seriesId) {
        console.log(`   Series: ${lecture.seriesId.titleArabic}`);
      }
      if (lecture.lectureNumber) {
        console.log(`   Lecture #: ${lecture.lectureNumber}`);
      }
      if (lecture.dateRecordedHijri) {
        console.log(`   Date: ${lecture.dateRecordedHijri}`);
      }
      console.log(`   Created: ${lecture.createdAt ? new Date(lecture.createdAt).toLocaleDateString() : 'N/A'}`);
    });
  }

  // List unassigned OCI files if requested
  if (listOci) {
    console.log('\n' + '='.repeat(60));
    console.log('☁️  CHECKING OCI FOR UNASSIGNED FILES');
    console.log('='.repeat(60));

    try {
      const { listObjects } = require('../utils/ociStorage');
      const ociFiles = await listObjects('', 500);

      // Get all assigned audioFileNames
      const assignedFiles = await Lecture.distinct('audioFileName', {
        audioFileName: { $exists: true, $ne: null, $ne: '' }
      });
      const assignedSet = new Set(assignedFiles.map(f => f.toLowerCase()));

      // Find unassigned OCI files
      const unassignedOci = ociFiles.filter(f => !assignedSet.has(f.name.toLowerCase()));

      console.log(`\nTotal files in OCI: ${ociFiles.length}`);
      console.log(`Assigned to lectures: ${assignedFiles.length}`);
      console.log(`Unassigned (orphan) files: ${unassignedOci.length}`);

      if (unassignedOci.length > 0 && unassignedOci.length <= 50) {
        console.log('\nUnassigned files in OCI:');
        unassignedOci.forEach((f, i) => {
          const sizeMB = (f.size / 1024 / 1024).toFixed(2);
          console.log(`  ${i + 1}. ${f.name} (${sizeMB} MB)`);
        });
      } else if (unassignedOci.length > 50) {
        console.log(`\n(Too many to list - ${unassignedOci.length} files)`);
      }
    } catch (error) {
      console.log('\n⚠️  Could not list OCI files:', error.message);
    }
  }

  // Try to match lectures with files
  if (tryMatch && lecturesWithoutAudio.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('🔗 ATTEMPTING TO MATCH LECTURES WITH FILES');
    console.log('='.repeat(60));

    try {
      const { listObjects } = require('../utils/ociStorage');
      const ociFiles = await listObjects('', 500);
      const ociFileNames = ociFiles.map(f => f.name);

      // Get assigned files to exclude them
      const assignedFiles = await Lecture.distinct('audioFileName', {
        audioFileName: { $exists: true, $ne: null, $ne: '' }
      });
      const assignedSet = new Set(assignedFiles.map(f => f.toLowerCase()));

      // Available files (not assigned)
      const availableFiles = ociFileNames.filter(f => !assignedSet.has(f.toLowerCase()));

      console.log(`\nAvailable unassigned files: ${availableFiles.length}`);

      if (availableFiles.length > 0) {
        console.log('\nSuggested matches based on naming patterns:');
        console.log('(You can manually assign these in the admin panel)\n');

        lecturesWithoutAudio.forEach((lecture, i) => {
          console.log(`${i + 1}. "${lecture.titleArabic}"`);

          // Try to find potential matches based on title keywords or date
          const titleWords = lecture.titleArabic.split(/[\s\-_]+/).filter(w => w.length > 2);

          // Look for files that might match
          const potentialMatches = availableFiles.filter(file => {
            const fileLower = file.toLowerCase();
            // Check if file contains any significant word from title
            return titleWords.some(word => fileLower.includes(word.toLowerCase()));
          }).slice(0, 3);

          if (potentialMatches.length > 0) {
            console.log('   Potential matches:');
            potentialMatches.forEach(m => console.log(`     - ${m}`));
          } else {
            console.log('   No automatic match found');
            console.log(`   Available files to choose from: ${availableFiles.slice(0, 3).join(', ')}${availableFiles.length > 3 ? '...' : ''}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      console.log('\n⚠️  Could not match files:', error.message);
    }
  }

  // Print summary and instructions
  console.log('\n' + '='.repeat(60));
  console.log('💡 HOW TO FIX');
  console.log('='.repeat(60));
  console.log(`
To assign audio files to these lectures:

Option 1: Via Admin Panel
  1. Go to /admin/lectures
  2. Click "Edit" on each lecture
  3. Set the "audioFileName" field to the OCI file name
  4. Save

Option 2: Via MongoDB directly
  db.lectures.updateOne(
    { _id: ObjectId("LECTURE_ID") },
    { $set: {
        audioFileName: "filename.m4a",
        audioUrl: "https://objectstorage.me-jeddah-1.oraclecloud.com/n/axnhmvvtw4ep/b/wurud-audio/o/filename.m4a"
    }}
  )

Option 3: Run upload script with correct filenames
  Rename your audio files to match the expected pattern, then run:
  npm run audio:upload /path/to/files -- --update-db
`);

  await mongoose.disconnect();
  console.log('\n✅ Done');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
