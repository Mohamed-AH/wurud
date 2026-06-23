#!/usr/bin/env node
/**
 * Quick diagnostic: Check OCI bucket contents and sizes
 */

require('dotenv').config();

const path = require('path');
const oci = require(path.join(__dirname, '..', 'config', 'oci'));

const ARCHIVE_BUCKET = process.argv[2] || 'wurud-archive';

async function checkBuckets() {
  console.log('='.repeat(60));
  console.log('  OCI BUCKET DIAGNOSTIC');
  console.log('='.repeat(60));

  const client = oci.client;
  if (!client) {
    console.error('[ERROR] OCI client not initialized');
    process.exit(1);
  }

  const namespace = oci.getNamespace();
  const sourceBucket = oci.getBucketName();

  console.log(`\n[INFO] Namespace: ${namespace}`);
  console.log(`[INFO] Source bucket: ${sourceBucket}`);
  console.log(`[INFO] Archive bucket: ${ARCHIVE_BUCKET}\n`);

  // Check source bucket
  console.log('-'.repeat(60));
  console.log('  SOURCE BUCKET: ' + sourceBucket);
  console.log('-'.repeat(60));

  try {
    const sourceResponse = await client.listObjects({
      namespaceName: namespace,
      bucketName: sourceBucket,
      limit: 10,
      fields: 'name,size,timeCreated'
    });

    const sourceObjects = sourceResponse.listObjects.objects || [];
    console.log(`  Total objects (first 10): ${sourceObjects.length}`);
    console.log('');

    let totalSize = 0;
    let zeroByteCount = 0;

    for (const obj of sourceObjects.slice(0, 10)) {
      const size = obj.size || 0;
      totalSize += size;
      if (size === 0) zeroByteCount++;
      console.log(`  ${formatBytes(size).padStart(10)} | ${obj.name.substring(0, 50)}`);
    }

    console.log('');
    console.log(`  Zero-byte files: ${zeroByteCount} / ${sourceObjects.length}`);

  } catch (error) {
    console.log(`  [ERROR] ${error.message}`);
  }

  // Check archive bucket
  console.log('\n' + '-'.repeat(60));
  console.log('  ARCHIVE BUCKET: ' + ARCHIVE_BUCKET);
  console.log('-'.repeat(60));

  try {
    const archiveResponse = await client.listObjects({
      namespaceName: namespace,
      bucketName: ARCHIVE_BUCKET,
      fields: 'name,size,timeCreated'
    });

    const archiveObjects = archiveResponse.listObjects.objects || [];
    console.log(`  Total objects: ${archiveObjects.length}`);
    console.log('');

    let totalSize = 0;
    let zeroByteCount = 0;

    for (const obj of archiveObjects) {
      const size = obj.size || 0;
      totalSize += size;
      if (size === 0) zeroByteCount++;
      console.log(`  ${formatBytes(size).padStart(10)} | ${obj.name.substring(0, 50)}`);
    }

    console.log('');
    console.log(`  Zero-byte files: ${zeroByteCount} / ${archiveObjects.length}`);
    console.log(`  Total size: ${formatBytes(totalSize)}`);

  } catch (error) {
    console.log(`  [ERROR] ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

checkBuckets().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
