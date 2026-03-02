/**
 * Translate Miscellaneous Lectures and Friday Sermons
 *
 * This script handles lectures that need individual title translation:
 * - Miscellaneous lectures (محاضرات متفرقة) - each has unique topic
 * - Friday sermons (خطب الجمعة) - each sermon has unique title
 *
 * Unlike series lectures where titles follow pattern "Series Name - Lecture X",
 * these lectures require manual translation of each individual title.
 *
 * Usage:
 *   node scripts/translate-misc-lectures.js --list          # List lectures needing translation
 *   node scripts/translate-misc-lectures.js --dry-run       # Preview changes
 *   node scripts/translate-misc-lectures.js                 # Apply translations
 *
 * Requires: .env file with MONGODB_URI
 */

const mongoose = require('mongoose');
const { Lecture, Series } = require('../models');
const { generateSlugEn } = require('../utils/slugify');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');
const LIST_ONLY = process.argv.includes('--list');

/**
 * Miscellaneous Lectures Translations
 * Key: lectureNumber or shortId, Value: { titleEnglish, slug_en (optional) }
 *
 * Add translations here for each miscellaneous lecture.
 * If slug_en is not provided, it will be auto-generated from titleEnglish.
 */
const MISC_LECTURES_TRANSLATIONS = {
  // Example format:
  // 1: { titleEnglish: "The Importance of Seeking Knowledge" },
  // 2: { titleEnglish: "Etiquettes of the Student of Knowledge", slug_en: "etiquettes-student-knowledge" },
};

/**
 * Friday Sermon Translations
 * Key: lectureNumber or shortId, Value: { titleEnglish, slug_en (optional) }
 *
 * Add translations here for each Friday sermon.
 */
const FRIDAY_SERMON_TRANSLATIONS = {
  // Example format:
  // 1: { titleEnglish: "Sermon on Taqwa (Fear of Allah)" },
  // 2: { titleEnglish: "The Importance of Prayer" },
};

/**
 * Seerah Series Sermon Translations (خطب الجمعة - السيرة الموجزة)
 */
const SEERAH_SERMON_TRANSLATIONS = {
  // Example format:
  // 1: { titleEnglish: "Introduction to the Prophet's Biography" },
};

// Check if a string contains Arabic characters
function hasArabic(str) {
  return /[\u0600-\u06FF]/.test(str || '');
}

// Generate a unique slug, handling duplicates
async function generateUniqueSlug(baseSlug, lectureId) {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Lecture.findOne({
      slug_en: slug,
      _id: { $ne: lectureId }
    });

    if (!existing) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

async function listLecturesNeedingTranslation() {
  console.log('═'.repeat(80));
  console.log('LECTURES NEEDING INDIVIDUAL TRANSLATION');
  console.log('═'.repeat(80));
  console.log();

  // Find miscellaneous series
  const miscSeries = await Series.findOne({ titleArabic: /محاضرات متفرقة/i });
  if (miscSeries) {
    console.log('📚 MISCELLANEOUS LECTURES (محاضرات متفرقة)');
    console.log('-'.repeat(60));

    const miscLectures = await Lecture.find({ seriesId: miscSeries._id })
      .sort({ lectureNumber: 1 });

    let needsTranslation = 0;
    for (const lecture of miscLectures) {
      const needsEnTitle = !lecture.titleEnglish || hasArabic(lecture.titleEnglish);
      const needsSlug = !lecture.slug_en || hasArabic(lecture.slug_en);

      if (needsEnTitle || needsSlug) {
        needsTranslation++;
        console.log(`\n  ${lecture.lectureNumber || lecture.shortId}. ${lecture.titleArabic}`);
        console.log(`     shortId: ${lecture.shortId}`);
        console.log(`     titleEnglish: ${lecture.titleEnglish || '(missing)'}`);
        console.log(`     slug_en: ${lecture.slug_en || '(missing)'}`);

        // Output format for adding to translations object
        console.log(`     // Add to MISC_LECTURES_TRANSLATIONS:`);
        console.log(`     // ${lecture.shortId}: { titleEnglish: "TRANSLATE: ${lecture.titleArabic}" },`);
      }
    }

    console.log(`\n  Total: ${miscLectures.length} lectures, ${needsTranslation} need translation`);
  }

  // Find Friday sermon series
  const khutbaSeries = await Series.find({
    $or: [
      { titleArabic: /خطب الجمعة/i },
      { tags: 'khutba' }
    ]
  });

  for (const series of khutbaSeries) {
    console.log(`\n\n📚 ${series.titleArabic} (shortId: ${series.shortId})`);
    console.log('-'.repeat(60));

    const sermons = await Lecture.find({ seriesId: series._id })
      .sort({ lectureNumber: 1 });

    let needsTranslation = 0;
    for (const lecture of sermons) {
      const needsEnTitle = !lecture.titleEnglish || hasArabic(lecture.titleEnglish);
      const needsSlug = !lecture.slug_en || hasArabic(lecture.slug_en);

      if (needsEnTitle || needsSlug) {
        needsTranslation++;
        console.log(`\n  ${lecture.lectureNumber || lecture.shortId}. ${lecture.titleArabic}`);
        console.log(`     shortId: ${lecture.shortId}`);
        console.log(`     titleEnglish: ${lecture.titleEnglish || '(missing)'}`);
        console.log(`     slug_en: ${lecture.slug_en || '(missing)'}`);

        // Determine which translation object to use
        const translationObj = series.titleArabic.includes('السيرة') ? 'SEERAH_SERMON_TRANSLATIONS' : 'FRIDAY_SERMON_TRANSLATIONS';
        console.log(`     // Add to ${translationObj}:`);
        console.log(`     // ${lecture.shortId}: { titleEnglish: "TRANSLATE: ${lecture.titleArabic}" },`);
      }
    }

    console.log(`\n  Total: ${sermons.length} sermons, ${needsTranslation} need translation`);
  }

  console.log('\n');
}

async function applyTranslations() {
  console.log('═'.repeat(80));
  console.log('APPLYING TRANSLATIONS' + (DRY_RUN ? ' [DRY RUN]' : ''));
  console.log('═'.repeat(80));
  if (DRY_RUN) console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  console.log();

  let totalUpdated = 0;
  let totalSkipped = 0;
  const errors = [];

  // Process Miscellaneous Lectures
  const miscSeries = await Series.findOne({ titleArabic: /محاضرات متفرقة/i });
  if (miscSeries && Object.keys(MISC_LECTURES_TRANSLATIONS).length > 0) {
    console.log('📚 Processing Miscellaneous Lectures...\n');

    const miscLectures = await Lecture.find({ seriesId: miscSeries._id });

    for (const lecture of miscLectures) {
      // Try to find translation by shortId first, then by lectureNumber
      const translation = MISC_LECTURES_TRANSLATIONS[lecture.shortId] ||
                          MISC_LECTURES_TRANSLATIONS[lecture.lectureNumber];

      if (!translation) {
        continue;
      }

      const updates = {};
      const changes = [];

      // Update titleEnglish
      if (translation.titleEnglish && (!lecture.titleEnglish || hasArabic(lecture.titleEnglish))) {
        updates.titleEnglish = translation.titleEnglish;
        changes.push(`titleEnglish: "${lecture.titleEnglish || '-'}" → "${translation.titleEnglish}"`);
      }

      // Update slug_en
      if (!lecture.slug_en || hasArabic(lecture.slug_en)) {
        const baseSlug = translation.slug_en || generateSlugEn(translation.titleEnglish || lecture.titleArabic);
        const uniqueSlug = await generateUniqueSlug(baseSlug, lecture._id);
        updates.slug_en = uniqueSlug;
        changes.push(`slug_en: "${lecture.slug_en || '-'}" → "${uniqueSlug}"`);
      }

      if (Object.keys(updates).length > 0) {
        try {
          if (!DRY_RUN) {
            await Lecture.updateOne({ _id: lecture._id }, { $set: updates });
          }
          console.log(`${DRY_RUN ? '🔍' : '✅'} Lecture #${lecture.shortId} "${lecture.titleArabic}"`);
          changes.forEach(c => console.log(`   ${c}`));
          console.log();
          totalUpdated++;
        } catch (err) {
          console.log(`❌ Error updating Lecture #${lecture.shortId}: ${err.message}`);
          errors.push({ shortId: lecture.shortId, error: err.message });
        }
      }
    }
  }

  // Process Friday Sermons
  const fridaySermonSeries = await Series.findOne({
    titleArabic: /خطب الجمعة/i,
    titleArabic: { $not: /السيرة/ }
  });

  if (fridaySermonSeries && Object.keys(FRIDAY_SERMON_TRANSLATIONS).length > 0) {
    console.log('📚 Processing Friday Sermons...\n');

    const sermons = await Lecture.find({ seriesId: fridaySermonSeries._id });

    for (const lecture of sermons) {
      const translation = FRIDAY_SERMON_TRANSLATIONS[lecture.shortId] ||
                          FRIDAY_SERMON_TRANSLATIONS[lecture.lectureNumber];

      if (!translation) {
        continue;
      }

      const updates = {};
      const changes = [];

      if (translation.titleEnglish && (!lecture.titleEnglish || hasArabic(lecture.titleEnglish))) {
        updates.titleEnglish = translation.titleEnglish;
        changes.push(`titleEnglish: "${lecture.titleEnglish || '-'}" → "${translation.titleEnglish}"`);
      }

      if (!lecture.slug_en || hasArabic(lecture.slug_en)) {
        const baseSlug = translation.slug_en || generateSlugEn(translation.titleEnglish || lecture.titleArabic);
        const uniqueSlug = await generateUniqueSlug(baseSlug, lecture._id);
        updates.slug_en = uniqueSlug;
        changes.push(`slug_en: "${lecture.slug_en || '-'}" → "${uniqueSlug}"`);
      }

      if (Object.keys(updates).length > 0) {
        try {
          if (!DRY_RUN) {
            await Lecture.updateOne({ _id: lecture._id }, { $set: updates });
          }
          console.log(`${DRY_RUN ? '🔍' : '✅'} Sermon #${lecture.shortId} "${lecture.titleArabic}"`);
          changes.forEach(c => console.log(`   ${c}`));
          console.log();
          totalUpdated++;
        } catch (err) {
          console.log(`❌ Error updating Sermon #${lecture.shortId}: ${err.message}`);
          errors.push({ shortId: lecture.shortId, error: err.message });
        }
      }
    }
  }

  // Process Seerah Sermons
  const seerahSermonSeries = await Series.findOne({ titleArabic: /خطب الجمعة.*السيرة/i });

  if (seerahSermonSeries && Object.keys(SEERAH_SERMON_TRANSLATIONS).length > 0) {
    console.log('📚 Processing Seerah Sermons...\n');

    const sermons = await Lecture.find({ seriesId: seerahSermonSeries._id });

    for (const lecture of sermons) {
      const translation = SEERAH_SERMON_TRANSLATIONS[lecture.shortId] ||
                          SEERAH_SERMON_TRANSLATIONS[lecture.lectureNumber];

      if (!translation) {
        continue;
      }

      const updates = {};
      const changes = [];

      if (translation.titleEnglish && (!lecture.titleEnglish || hasArabic(lecture.titleEnglish))) {
        updates.titleEnglish = translation.titleEnglish;
        changes.push(`titleEnglish: "${lecture.titleEnglish || '-'}" → "${translation.titleEnglish}"`);
      }

      if (!lecture.slug_en || hasArabic(lecture.slug_en)) {
        const baseSlug = translation.slug_en || generateSlugEn(translation.titleEnglish || lecture.titleArabic);
        const uniqueSlug = await generateUniqueSlug(baseSlug, lecture._id);
        updates.slug_en = uniqueSlug;
        changes.push(`slug_en: "${lecture.slug_en || '-'}" → "${uniqueSlug}"`);
      }

      if (Object.keys(updates).length > 0) {
        try {
          if (!DRY_RUN) {
            await Lecture.updateOne({ _id: lecture._id }, { $set: updates });
          }
          console.log(`${DRY_RUN ? '🔍' : '✅'} Seerah Sermon #${lecture.shortId} "${lecture.titleArabic}"`);
          changes.forEach(c => console.log(`   ${c}`));
          console.log();
          totalUpdated++;
        } catch (err) {
          console.log(`❌ Error updating Seerah Sermon #${lecture.shortId}: ${err.message}`);
          errors.push({ shortId: lecture.shortId, error: err.message });
        }
      }
    }
  }

  // Summary
  console.log();
  console.log('═'.repeat(80));
  console.log('SUMMARY' + (DRY_RUN ? ' [DRY RUN]' : ''));
  console.log('═'.repeat(80));
  console.log(`   ${DRY_RUN ? 'Would update' : 'Updated'}: ${totalUpdated} lectures`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`   - Lecture #${e.shortId}: ${e.error}`));
  }

  if (DRY_RUN) console.log('\nRun without --dry-run to apply changes.');

  const totalTranslations = Object.keys(MISC_LECTURES_TRANSLATIONS).length +
                            Object.keys(FRIDAY_SERMON_TRANSLATIONS).length +
                            Object.keys(SEERAH_SERMON_TRANSLATIONS).length;

  if (totalTranslations === 0) {
    console.log('\n⚠️  No translations defined yet.');
    console.log('   Run with --list to see lectures needing translation,');
    console.log('   then add translations to this script.');
  }

  console.log();
}

async function main() {
  try {
    if (!MONGODB_URI) {
      console.log('❌ MONGODB_URI not found in environment.');
      console.log('   Please create a .env file with your MongoDB connection string.');
      console.log('   Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/duroos\n');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    if (LIST_ONLY) {
      await listLecturesNeedingTranslation();
    } else {
      await applyTranslations();
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
