/**
 * Date Extraction Script
 *
 * Logic:
 * 1. Match lecture by filename (unique identifier)
 * 2. Try to extract date from iPhone filename format
 * 3. Fallback to DateInGreg column from Excel
 * 4. Convert Gregorian to Hijri using Ummulqura calendar
 *
 * iPhone filename formats commonly seen:
 * - Recording_YYYYMMDD_HHMMSS.mp3
 * - Audio_Recording_YYYYMMDD.m4a
 * - YYYYMMDD_HHMMSS.mp3
 * - lecture_name_YYYYMMDD.mp3
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const moment = require('moment-hijri');
const connectDB = require('../config/database');
const { Lecture } = require('../models');

// Configure moment-hijri to use Ummulqura calendar
moment.updateLocale('en', {
  iMonths: [
    'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
    'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
  ]
});

/**
 * Extract date from iPhone recording filename
 * Supports various iPhone audio recording formats
 *
 * Examples:
 * - "Recording_20240615_143022.mp3" -> 2024-06-15
 * - "Audio_20240615.m4a" -> 2024-06-15
 * - "20240615_143022.mp3" -> 2024-06-15
 * - "lecture_20240615.mp3" -> 2024-06-15
 */
function extractDateFromFilename(filename) {
  if (!filename) return null;

  console.log(`  🔍 Analyzing filename: ${filename}`);

  // Pattern 1: YYYYMMDD format (most common in iPhone recordings)
  // Matches: 20240615, 2024-06-15, 2024_06_15
  const pattern1 = /(\d{4})[-_]?(\d{2})[-_]?(\d{2})/;
  const match1 = filename.match(pattern1);

  if (match1) {
    const [, year, month, day] = match1;
    const dateStr = `${year}-${month}-${day}`;
    const date = new Date(dateStr);

    // Validate the date is reasonable (not in future, not too old)
    const now = new Date();
    const minDate = new Date('2000-01-01');

    if (date >= minDate && date <= now) {
      console.log(`    ✓ Extracted from filename: ${dateStr}`);
      return date;
    }
  }

  console.log(`    ✗ No valid date found in filename`);
  return null;
}

/**
 * Parse date from Excel DateInGreg column
 * Supports multiple formats: DD/MM/YYYY, YYYY-MM-DD, etc.
 */
function parseDateFromExcel(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;

  console.log(`  📊 Parsing Excel date: ${dateStr}`);

  try {
    let gregorianDate = null;

    // Try DD/MM/YYYY format (common in Excel)
    let parsed = moment(dateStr, 'DD/MM/YYYY', true);
    if (parsed.isValid()) {
      gregorianDate = parsed.toDate();
    } else {
      // Try MM/DD/YYYY format
      parsed = moment(dateStr, 'MM/DD/YYYY', true);
      if (parsed.isValid()) {
        gregorianDate = parsed.toDate();
      } else {
        // Try ISO format YYYY-MM-DD
        parsed = moment(dateStr, 'YYYY-MM-DD', true);
        if (parsed.isValid()) {
          gregorianDate = parsed.toDate();
        } else {
          // Try standard parsing
          gregorianDate = new Date(dateStr);
          if (isNaN(gregorianDate.getTime())) {
            gregorianDate = null;
          }
        }
      }
    }

    if (gregorianDate) {
      console.log(`    ✓ Parsed Excel date: ${gregorianDate.toISOString().split('T')[0]}`);
      return gregorianDate;
    }
  } catch (error) {
    console.warn(`    ✗ Could not parse Excel date: ${dateStr}`);
  }

  return null;
}

/**
 * Convert Gregorian date to Hijri using Ummulqura calendar
 */
function convertToHijri(gregorianDate) {
  if (!gregorianDate) return null;

  try {
    // Use moment-hijri with Ummulqura calendar
    const hijriMoment = moment(gregorianDate);
    const hijriDate = hijriMoment.format('iYYYY/iMM/iDD'); // Format: 1445/06/15

    console.log(`    📅 Hijri (Ummulqura): ${hijriDate}`);
    return hijriDate;
  } catch (error) {
    console.warn(`    ✗ Could not convert to Hijri:`, error.message);
    return null;
  }
}

/**
 * Process dates for a single lecture
 */
async function processLecture(lecture, excelRow) {
  console.log(`\n📖 Processing: ${lecture.titleArabic.substring(0, 60)}...`);

  let gregorianDate = null;
  let source = null;

  // Step 1: Try to extract date from filename
  if (lecture.audioFileName) {
    gregorianDate = extractDateFromFilename(lecture.audioFileName);
    if (gregorianDate) {
      source = 'filename';
    }
  }

  // Step 2: Fallback to Excel DateInGreg column
  if (!gregorianDate && excelRow) {
    const excelDate = excelRow.DateInGreg || excelRow.dateInGreg || excelRow.date_in_greg;
    gregorianDate = parseDateFromExcel(excelDate);
    if (gregorianDate) {
      source = 'excel';
    }
  }

  // Step 3: Convert to Hijri if we have a date
  let hijriDate = null;
  if (gregorianDate) {
    hijriDate = convertToHijri(gregorianDate);
  }

  // Step 4: Update lecture if we found dates
  if (gregorianDate || hijriDate) {
    console.log(`  💾 Updating lecture...`);
    console.log(`    Source: ${source}`);
    console.log(`    Gregorian: ${gregorianDate ? gregorianDate.toISOString().split('T')[0] : 'N/A'}`);
    console.log(`    Hijri: ${hijriDate || 'N/A'}`);

    if (gregorianDate) lecture.dateRecorded = gregorianDate;
    if (hijriDate) lecture.dateRecordedHijri = hijriDate;

    await lecture.save();
    return { updated: true, source };
  } else {
    console.log(`  ⊘ No date found - skipping`);
    return { updated: false, source: 'none' };
  }
}

/**
 * Main function
 */
async function extractDates() {
  try {
    console.log('🚀 Starting date extraction...\n');
    console.log('📋 Logic:');
    console.log('  1. Match lecture by filename (unique)');
    console.log('  2. Try to extract date from filename (iPhone format)');
    console.log('  3. Fallback to DateInGreg column from Excel');
    console.log('  4. Convert to Hijri using Ummulqura calendar\n');

    // Connect to database
    await connectDB();
    console.log('✓ Connected to database\n');

    // Load Excel/CSV data (optional - for fallback dates)
    const csvPath = path.join(__dirname, '..', 'lectures_with_dates.csv');
    let excelData = {};

    if (fs.existsSync(csvPath)) {
      console.log(`📂 Loading Excel data from: ${csvPath}\n`);

      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });

      // Index by filename for quick lookup
      rows.forEach(row => {
        const filename = row.audioFileName || row.audio_file_name || row.filename;
        if (filename) {
          excelData[filename] = row;
        }
      });

      console.log(`  Loaded ${rows.length} rows from Excel\n`);
    } else {
      console.log(`⚠️  No Excel file found at: ${csvPath}`);
      console.log(`  Will only extract dates from filenames\n`);
    }

    // Get all lectures with audio files
    const lectures = await Lecture.find({ audioFileName: { $ne: '' } });
    console.log(`📊 Found ${lectures.length} lectures with audio files\n`);

    const stats = {
      total: lectures.length,
      fromFilename: 0,
      fromExcel: 0,
      notFound: 0
    };

    // Process each lecture
    for (const lecture of lectures) {
      const excelRow = excelData[lecture.audioFileName];
      const result = await processLecture(lecture, excelRow);

      if (result.updated) {
        if (result.source === 'filename') stats.fromFilename++;
        else if (result.source === 'excel') stats.fromExcel++;
      } else {
        stats.notFound++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 EXTRACTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total lectures:           ${stats.total}`);
    console.log(`Dates from filename:      ${stats.fromFilename}`);
    console.log(`Dates from Excel:         ${stats.fromExcel}`);
    console.log(`No dates found:           ${stats.notFound}`);
    console.log('='.repeat(60));

    console.log('\n✅ Date extraction completed!\n');

  } catch (error) {
    console.error('\n❌ Extraction failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run extraction
extractDates();
