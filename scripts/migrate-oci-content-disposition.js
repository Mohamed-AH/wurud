#!/usr/bin/env node
/**
 * Migrate OCI Objects to Include Content-Disposition Header
 *
 * This script updates all audio objects in OCI to include the
 * Content-Disposition: attachment header, enabling direct PAR downloads
 * with proper "Save As" dialog behavior.
 *
 * Usage:
 *   node scripts/migrate-oci-content-disposition.js [--dry-run] [--limit N] [--env FILE]
 *
 * Options:
 *   --dry-run   Show what would be updated without making changes
 *   --limit N   Process only N objects (for testing)
 *   --env FILE  Path to .env file (default: .env)
 *   --verbose   Show detailed progress
 *
 * Examples:
 *   node scripts/migrate-oci-content-disposition.js --dry-run --limit 5
 *   node scripts/migrate-oci-content-disposition.js --env .env.production
 */

// Parse --env argument first
const argsForEnv = process.argv.slice(2);
const envIndex = argsForEnv.indexOf('--env');
const envPath = envIndex !== -1 ? argsForEnv[envIndex + 1] : '.env';

require('dotenv').config({ path: envPath });

// Verify required environment variables
const requiredEnvVars = ['OCI_NAMESPACE', 'OCI_BUCKET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('\n❌ Error: Missing required environment variables:', missingVars.join(', '));
  console.error('\nRequired variables:');
  console.error('  OCI_NAMESPACE  - OCI Object Storage namespace');
  console.error('  OCI_BUCKET     - OCI bucket name');
  console.error('  OCI_PRIVATE_KEY or OCI_CONFIG_FILE - Authentication');
  console.error('\nUsage:');
  console.error('  node scripts/migrate-oci-content-disposition.js --env .env.production --dry-run\n');
  process.exit(1);
}

const path = require('path');
const oci = require('../config/oci');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;

// Stats
const stats = {
  total: 0,
  updated: 0,
  skipped: 0,
  errors: 0
};

/**
 * Get content disposition header value for a filename
 */
function getContentDisposition(objectName) {
  // Extract just the filename without path
  const filename = path.basename(objectName);
  // Use attachment to force download
  return `attachment; filename="${filename}"`;
}

/**
 * Check if object already has content-disposition set
 */
async function hasContentDisposition(client, namespace, bucketName, objectName) {
  try {
    const response = await client.headObject({
      namespaceName: namespace,
      bucketName: bucketName,
      objectName: objectName
    });

    // Check if content-disposition is already set
    return !!response.contentDisposition;
  } catch (error) {
    if (error.statusCode === 404) {
      return null; // Object doesn't exist
    }
    throw error;
  }
}

/**
 * Update object metadata by copying to itself with new headers
 * OCI requires copy-to-self to update metadata
 */
async function updateObjectMetadata(client, namespace, bucketName, objectName) {
  const contentDisposition = getContentDisposition(objectName);

  // In OCI, to update metadata you copy the object to itself
  // Using CopyObject with metadataDirective: 'REPLACE'
  const copyObjectRequest = {
    namespaceName: namespace,
    bucketName: bucketName,
    copyObjectDetails: {
      sourceObjectName: objectName,
      destinationRegion: oci.getRegion(),
      destinationNamespace: namespace,
      destinationBucket: bucketName,
      destinationObjectName: objectName,
      // New metadata
      destinationObjectMetadata: {
        'content-disposition': contentDisposition
      }
    }
  };

  try {
    const response = await client.copyObject(copyObjectRequest);
    return {
      success: true,
      workRequestId: response.opcWorkRequestId
    };
  } catch (error) {
    // If copyObject doesn't support content-disposition directly,
    // we need to use a different approach - re-upload with headers
    throw error;
  }
}

/**
 * Alternative: Update using putObject with streaming copy
 * Some OCI operations require downloading and re-uploading
 */
async function updateObjectWithReupload(client, namespace, bucketName, objectName) {
  const contentDisposition = getContentDisposition(objectName);

  // Get the object
  const getResponse = await client.getObject({
    namespaceName: namespace,
    bucketName: bucketName,
    objectName: objectName
  });

  // Re-upload with new headers
  const putResponse = await client.putObject({
    namespaceName: namespace,
    bucketName: bucketName,
    objectName: objectName,
    putObjectBody: getResponse.value,
    contentLength: getResponse.contentLength,
    contentType: getResponse.contentType,
    contentDisposition: contentDisposition,
    cacheControl: 'public, max-age=31536000',
    opcMeta: getResponse.opcMeta
  });

  return {
    success: true,
    etag: putResponse.eTag
  };
}

/**
 * List all objects in the bucket with pagination
 */
async function listAllObjects(client, namespace, bucketName) {
  const allObjects = [];
  let nextStartWith = null;

  do {
    const response = await client.listObjects({
      namespaceName: namespace,
      bucketName: bucketName,
      limit: 1000,
      start: nextStartWith
    });

    const objects = response.listObjects.objects || [];
    allObjects.push(...objects.filter(obj => obj && obj.name));

    nextStartWith = response.listObjects.nextStartWith;
  } while (nextStartWith);

  return allObjects;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('\n🚀 OCI Content-Disposition Migration');
  console.log('=====================================');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ LIVE'}`);
  if (LIMIT) console.log(`Limit: ${LIMIT} objects`);
  console.log('');

  // Initialize OCI client
  const client = oci.client;
  if (!client) {
    console.error('❌ Failed to initialize OCI client');
    process.exit(1);
  }

  const namespace = oci.getNamespace();
  const bucketName = oci.getBucketName();

  console.log(`📦 Bucket: ${bucketName}`);
  console.log(`🌍 Region: ${oci.getRegion()}`);
  console.log('');

  // List all objects
  console.log('📋 Listing objects...');
  let objects;
  try {
    objects = await listAllObjects(client, namespace, bucketName);
  } catch (error) {
    console.error('❌ Failed to list objects:', error.message);
    process.exit(1);
  }

  console.log(`   Found ${objects.length} objects\n`);

  // Apply limit if specified
  if (LIMIT && objects.length > LIMIT) {
    objects = objects.slice(0, LIMIT);
    console.log(`   Processing first ${LIMIT} objects\n`);
  }

  stats.total = objects.length;

  // Process each object
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const progress = `[${i + 1}/${objects.length}]`;

    try {
      // Check if already has content-disposition
      const hasHeader = await hasContentDisposition(client, namespace, bucketName, obj.name);

      if (hasHeader === null) {
        console.log(`${progress} ⏭️  ${obj.name} - Object not found, skipping`);
        stats.skipped++;
        continue;
      }

      if (hasHeader) {
        if (VERBOSE) {
          console.log(`${progress} ✅ ${obj.name} - Already has content-disposition`);
        }
        stats.skipped++;
        continue;
      }

      // Update the object
      if (DRY_RUN) {
        console.log(`${progress} 🔍 ${obj.name} - Would set: ${getContentDisposition(obj.name)}`);
        stats.updated++;
      } else {
        console.log(`${progress} ⬆️  ${obj.name} - Updating...`);

        try {
          // Try copyObject first (more efficient)
          await updateObjectMetadata(client, namespace, bucketName, obj.name);
          console.log(`${progress} ✅ ${obj.name} - Updated via copy`);
        } catch (copyError) {
          // Fall back to re-upload method
          if (VERBOSE) {
            console.log(`${progress} ⚠️  Copy failed, trying re-upload: ${copyError.message}`);
          }
          await updateObjectWithReupload(client, namespace, bucketName, obj.name);
          console.log(`${progress} ✅ ${obj.name} - Updated via re-upload`);
        }

        stats.updated++;
      }
    } catch (error) {
      console.error(`${progress} ❌ ${obj.name} - Error: ${error.message}`);
      stats.errors++;
    }
  }

  // Print summary
  console.log('\n=====================================');
  console.log('📊 Migration Summary');
  console.log('=====================================');
  console.log(`Total objects:  ${stats.total}`);
  console.log(`Updated:        ${stats.updated}`);
  console.log(`Skipped:        ${stats.skipped}`);
  console.log(`Errors:         ${stats.errors}`);

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.');
  }

  console.log('');
}

// Run migration
migrate()
  .then(() => {
    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
