#!/usr/bin/env node
/**
 * Export Database Data Script
 *
 * Exports all lectures and series data to a readable text format for verification.
 *
 * Usage:
 *   node scripts/export-db-data.js --env .env --output data-export.txt
 *
 * Options:
 *   --env FILE     Path to .env file (default: .env)
 *   --output FILE  Output file path (required)
 *   --format       Output format: txt (default) or json
 */

const fs = require('fs');

// Parse arguments
const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
const envPath = envIndex !== -1 ? args[envIndex + 1] : '.env';
const outputIndex = args.indexOf('--output');
const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;
const formatIndex = args.indexOf('--format');
const format = formatIndex !== -1 ? args[formatIndex + 1] : 'txt';

if (!outputFile) {
  console.error('❌ Error: --output FILE is required');
  console.error('Usage: node scripts/export-db-data.js --env .env --output data-export.txt');
  process.exit(1);
}

require('dotenv').config({ path: envPath });

if (!process.env.MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

const mongoose = require('mongoose');
const Lecture = require('../models/Lecture');
const Series = require('../models/Series');
const Sheikh = require('../models/Sheikh');

async function exportData() {
  console.log('\n📦 Database Export Script');
  console.log('='.repeat(50));

  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected\n');

  // Fetch all data
  console.log('📥 Fetching data...');

  const [series, lectures, sheikhs] = await Promise.all([
    Series.find().lean(),
    Lecture.find().populate('seriesId', 'titleArabic slug').lean(),
    Sheikh.find().lean()
  ]);

  console.log(`   Series: ${series.length}`);
  console.log(`   Lectures: ${lectures.length}`);
  console.log(`   Sheikhs: ${sheikhs.length}`);

  if (format === 'json') {
    // JSON format
    const data = {
      exportDate: new Date().toISOString(),
      stats: {
        series: series.length,
        lectures: lectures.length,
        sheikhs: sheikhs.length
      },
      sheikhs,
      series,
      lectures
    };
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
  } else {
    // Text format for easy verification
    let output = [];

    output.push('='.repeat(80));
    output.push('DATABASE EXPORT - ' + new Date().toISOString());
    output.push('='.repeat(80));
    output.push('');

    // ========== SHEIKHS ==========
    output.push('');
    output.push('█'.repeat(80));
    output.push('SHEIKHS');
    output.push('█'.repeat(80));
    output.push('');

    for (const sheikh of sheikhs) {
      output.push(`ID: ${sheikh._id}`);
      output.push(`Name (AR): ${sheikh.nameArabic}`);
      output.push(`Name (EN): ${sheikh.nameEnglish || '-'}`);
      output.push(`Slug: ${sheikh.slug}`);
      output.push(`Bio: ${(sheikh.bio || '').substring(0, 100)}...`);
      output.push('-'.repeat(40));
    }

    // ========== SERIES ==========
    output.push('');
    output.push('█'.repeat(80));
    output.push('SERIES');
    output.push('█'.repeat(80));
    output.push('');

    // Group series by similarity for easier comparison
    const seriesSorted = [...series].sort((a, b) =>
      (a.titleArabic || '').localeCompare(b.titleArabic || '', 'ar')
    );

    for (const s of seriesSorted) {
      output.push(`ID: ${s._id}`);
      output.push(`Title (AR): ${s.titleArabic}`);
      output.push(`Title (EN): ${s.titleEnglish || '-'}`);
      output.push(`Slug: ${s.slug}`);
      output.push(`Category: ${s.category || '-'}`);
      output.push(`Lecture Count: ${s.lectureCount || 0}`);
      output.push(`Sheikh: ${s.sheikhId || '-'}`);
      output.push('-'.repeat(40));
    }

    // ========== LECTURES BY SERIES ==========
    output.push('');
    output.push('█'.repeat(80));
    output.push('LECTURES (grouped by series)');
    output.push('█'.repeat(80));

    // Group lectures by series
    const lecturesBySeries = new Map();
    const noSeriesLectures = [];

    for (const lec of lectures) {
      const seriesId = lec.seriesId?._id?.toString() || lec.seriesId?.toString() || null;
      if (seriesId) {
        if (!lecturesBySeries.has(seriesId)) {
          lecturesBySeries.set(seriesId, []);
        }
        lecturesBySeries.get(seriesId).push(lec);
      } else {
        noSeriesLectures.push(lec);
      }
    }

    // Create series lookup
    const seriesLookup = new Map(series.map(s => [s._id.toString(), s]));

    // Output lectures by series
    for (const [seriesId, seriesLectures] of lecturesBySeries) {
      const seriesInfo = seriesLookup.get(seriesId);
      output.push('');
      output.push('═'.repeat(80));
      output.push(`SERIES: ${seriesInfo?.titleArabic || 'Unknown'}`);
      output.push(`Series Slug: ${seriesInfo?.slug || 'Unknown'}`);
      output.push(`Series ID: ${seriesId}`);
      output.push('═'.repeat(80));

      // Sort by lecture number
      seriesLectures.sort((a, b) => (a.lectureNumber || 0) - (b.lectureNumber || 0));

      for (const lec of seriesLectures) {
        output.push('');
        output.push(`  Lecture #${lec.lectureNumber || '?'}`);
        output.push(`  ID: ${lec._id}`);
        output.push(`  Title (AR): ${lec.titleArabic}`);
        output.push(`  Title (EN): ${lec.titleEnglish || '-'}`);
        output.push(`  Slug: ${lec.slug}`);
        output.push(`  Audio: ${lec.audioFileName || 'NO AUDIO'}`);
        output.push(`  Duration: ${lec.duration || 0}s`);
        output.push(`  Duration Verified: ${lec.durationVerified ? 'Yes' : 'No'}`);
        output.push(`  Created: ${lec.createdAt || '-'}`);

        // Check for potential issues
        const issues = [];
        if (!lec.lectureNumber) issues.push('NO_LECTURE_NUMBER');
        if (!lec.audioFileName) issues.push('NO_AUDIO');
        if (!lec.slug) issues.push('NO_SLUG');
        if (lec.slug && lec.titleArabic && !lec.slug.includes(lec.lectureNumber?.toString())) {
          // Slug might not match lecture number
          issues.push('SLUG_MAY_NOT_MATCH_NUMBER');
        }

        if (issues.length > 0) {
          output.push(`  ⚠️ ISSUES: ${issues.join(', ')}`);
        }
        output.push('  ' + '-'.repeat(38));
      }
    }

    // Lectures without series
    if (noSeriesLectures.length > 0) {
      output.push('');
      output.push('═'.repeat(80));
      output.push('LECTURES WITHOUT SERIES');
      output.push('═'.repeat(80));

      for (const lec of noSeriesLectures) {
        output.push('');
        output.push(`  ID: ${lec._id}`);
        output.push(`  Title (AR): ${lec.titleArabic}`);
        output.push(`  Slug: ${lec.slug}`);
        output.push(`  Audio: ${lec.audioFileName || 'NO AUDIO'}`);
        output.push(`  ⚠️ NO SERIES ASSIGNED`);
        output.push('  ' + '-'.repeat(38));
      }
    }

    // ========== SUMMARY & POTENTIAL ISSUES ==========
    output.push('');
    output.push('█'.repeat(80));
    output.push('SUMMARY & POTENTIAL ISSUES');
    output.push('█'.repeat(80));
    output.push('');

    // Check for duplicate slugs
    const slugCounts = new Map();
    for (const lec of lectures) {
      const slug = lec.slug;
      slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
    }
    const duplicateSlugs = [...slugCounts.entries()].filter(([_, count]) => count > 1);

    if (duplicateSlugs.length > 0) {
      output.push('⚠️ DUPLICATE SLUGS FOUND:');
      for (const [slug, count] of duplicateSlugs) {
        output.push(`   "${slug}" appears ${count} times`);
        const matching = lectures.filter(l => l.slug === slug);
        for (const m of matching) {
          output.push(`      - ID: ${m._id}, Title: ${m.titleArabic?.substring(0, 50)}`);
        }
      }
      output.push('');
    }

    // Check for duplicate titles within same series
    output.push('Checking for duplicate titles within same series...');
    const titleBySeriesMap = new Map();
    for (const lec of lectures) {
      const key = `${lec.seriesId?._id || 'none'}::${lec.titleArabic}`;
      if (!titleBySeriesMap.has(key)) {
        titleBySeriesMap.set(key, []);
      }
      titleBySeriesMap.get(key).push(lec);
    }
    const duplicateTitles = [...titleBySeriesMap.entries()].filter(([_, lecs]) => lecs.length > 1);

    if (duplicateTitles.length > 0) {
      output.push('⚠️ DUPLICATE TITLES IN SAME SERIES:');
      for (const [key, lecs] of duplicateTitles) {
        output.push(`   Title: "${lecs[0].titleArabic?.substring(0, 60)}..."`);
        for (const l of lecs) {
          output.push(`      - ID: ${l._id}, Slug: ${l.slug}`);
        }
      }
      output.push('');
    }

    // Lectures without audio
    const noAudio = lectures.filter(l => !l.audioFileName);
    output.push(`📊 Lectures without audio: ${noAudio.length}`);

    // Lectures without lecture number
    const noNumber = lectures.filter(l => !l.lectureNumber);
    output.push(`📊 Lectures without lecture number: ${noNumber.length}`);

    // Lectures without series
    output.push(`📊 Lectures without series: ${noSeriesLectures.length}`);

    output.push('');
    output.push('='.repeat(80));
    output.push('END OF EXPORT');
    output.push('='.repeat(80));

    fs.writeFileSync(outputFile, output.join('\n'), 'utf8');
  }

  console.log(`\n✓ Data exported to: ${outputFile}`);

  await mongoose.disconnect();
  console.log('✓ Done!\n');
}

exportData().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
