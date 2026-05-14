#!/usr/bin/env node
/**
 * Access Test - Verify MongoDB and OCI connectivity
 * Fetches first 5 records from each to confirm access
 *
 * Usage: node scripts/accesstest.js [--env .env.production]
 */

const argsForEnv = process.argv.slice(2);
const envIndex = argsForEnv.indexOf('--env');
const envPath = envIndex !== -1 ? argsForEnv[envIndex + 1] : '.env';

require('dotenv').config({ path: envPath });

async function testAccess() {
  console.log('\n🔍 Access Test\n');

  // Test MongoDB
  console.log('═══════════════════════════════════');
  console.log('📊 MongoDB Test');
  console.log('═══════════════════════════════════');

  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const { Lecture } = require('../models');
    const lectures = await Lecture.find(
      { audioFileName: { $exists: true, $ne: null } },
      'audioFileName titleArabic'
    ).limit(5).lean();

    console.log(`Found ${lectures.length} records:\n`);
    lectures.forEach((l, i) => {
      console.log(`  ${i + 1}. ${l.audioFileName}`);
      if (l.titleArabic) console.log(`     Title: ${l.titleArabic}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ MongoDB: OK\n');
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message, '\n');
  }

  // Test OCI
  console.log('═══════════════════════════════════');
  console.log('☁️  OCI Object Storage Test');
  console.log('═══════════════════════════════════');

  try {
    const oci = require('../config/oci');
    const client = oci.client;

    if (!client) {
      console.log('❌ OCI client not initialized\n');
      return;
    }

    const namespace = oci.getNamespace();
    const bucketName = oci.getBucketName();

    console.log(`Namespace: ${namespace}`);
    console.log(`Bucket: ${bucketName}`);
    console.log(`Region: ${oci.getRegion()}\n`);

    const response = await client.listObjects({
      namespaceName: namespace,
      bucketName: bucketName,
      limit: 5
    });

    const objects = response.listObjects.objects || [];
    console.log(`Found ${objects.length} objects:\n`);

    objects.forEach((obj, i) => {
      const sizeKB = obj.size ? (obj.size / 1024).toFixed(1) + ' KB' : '0 KB';
      console.log(`  ${i + 1}. ${obj.name}`);
      console.log(`     Size: ${sizeKB}`);
    });

    console.log('\n✅ OCI: OK\n');
  } catch (error) {
    console.error('❌ OCI Error:', error.message, '\n');
  }

  console.log('═══════════════════════════════════');
  console.log('Done!');
  console.log('═══════════════════════════════════\n');
}

testAccess().catch(console.error);
