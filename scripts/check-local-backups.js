#!/usr/bin/env node
/**
 * Check Local Backup Files Against Matched List
 * Run this on local PC where backup files are stored
 *
 * Usage: node scripts/check-local-backups.js --matched matched-files.json --backup-dir /path/to/backups
 *
 * Input: matched-files.json from compare-filenames.js (run on Cloud VM)
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);

const matchedIndex = args.indexOf('--matched');
const MATCHED_FILE = matchedIndex !== -1 ? args[matchedIndex + 1] : 'matched-files.json';

const backupDirIndex = args.indexOf('--backup-dir');
const BACKUP_DIR = backupDirIndex !== -1 ? args[backupDirIndex + 1] : null;

if (!BACKUP_DIR) {
  console.error('\n❌ Error: --backup-dir is required');
  console.error('\nUsage:');
  console.error('  node scripts/check-local-backups.js --matched matched-files.json --backup-dir /path/to/backups');
  process.exit(1);
}

if (!fs.existsSync(MATCHED_FILE)) {
  console.error(`\n❌ Error: Matched files list not found: ${MATCHED_FILE}`);
  console.error('Run compare-filenames.js on Cloud VM first to generate this file.');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  console.error(`\n❌ Error: Backup directory not found: ${BACKUP_DIR}`);
  process.exit(1);
}

// Stats
const stats = {
  totalMatched: 0,
  zeroByteFiles: 0,
  foundLocally: 0,
  missingLocally: [],
  readyToRestore: []
};

/**
 * Scan backup directory for audio files
 */
function scanBackupDirectory(dir) {
  const audioExtensions = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac'];
  const files = new Map();

  function scanDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (audioExtensions.includes(ext)) {
            files.set(entry.name, {
              path: fullPath,
              size: fs.statSync(fullPath).size
            });
          }
        }
      }
    } catch (err) {
      console.error(`Warning: Could not scan ${currentDir}: ${err.message}`);
    }
  }

  scanDir(dir);
  return files;
}

/**
 * Normalize filename for matching
 */
function normalizeFilename(filename) {
  return filename.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Find backup match
 */
function findBackupMatch(targetFilename, backupFiles) {
  // Exact match
  if (backupFiles.has(targetFilename)) {
    return { match: targetFilename, ...backupFiles.get(targetFilename), type: 'exact' };
  }

  // Normalized match
  const normalizedTarget = normalizeFilename(targetFilename);
  for (const [backupName, data] of backupFiles) {
    if (normalizeFilename(backupName) === normalizedTarget) {
      return { match: backupName, ...data, type: 'normalized' };
    }
  }

  // Basename match
  const targetBase = path.basename(targetFilename, path.extname(targetFilename));
  for (const [backupName, data] of backupFiles) {
    const backupBase = path.basename(backupName, path.extname(backupName));
    if (normalizeFilename(backupBase) === normalizeFilename(targetBase)) {
      return { match: backupName, ...data, type: 'basename' };
    }
  }

  return null;
}

/**
 * Main
 */
function main() {
  console.log('\n📁 Check Local Backups Against Matched Files');
  console.log('═══════════════════════════════════════════════\n');

  // Load matched files
  console.log(`📋 Loading matched files: ${MATCHED_FILE}`);
  const data = JSON.parse(fs.readFileSync(MATCHED_FILE, 'utf-8'));
  const matchedFiles = data.files || [];
  stats.totalMatched = matchedFiles.length;
  stats.zeroByteFiles = matchedFiles.filter(f => f.isZeroByte).length;
  console.log(`   Total: ${matchedFiles.length} files`);
  console.log(`   Zero-byte (need restore): ${stats.zeroByteFiles}\n`);

  // Scan backup directory
  console.log(`📁 Scanning backup directory: ${BACKUP_DIR}`);
  const backupFiles = scanBackupDirectory(BACKUP_DIR);
  console.log(`   Found: ${backupFiles.size} audio files\n`);

  // Check each matched file
  console.log('🔍 Checking for local backups...\n');

  for (const file of matchedFiles) {
    const match = findBackupMatch(file.filename, backupFiles);

    if (match) {
      stats.foundLocally++;

      if (file.isZeroByte) {
        stats.readyToRestore.push({
          filename: file.filename,
          localPath: match.path,
          localSize: match.size,
          matchType: match.type
        });
      }
    } else {
      stats.missingLocally.push({
        filename: file.filename,
        title: file.title,
        isZeroByte: file.isZeroByte
      });
    }
  }

  // Results
  console.log('═══════════════════════════════════════════════');
  console.log('📊 Results');
  console.log('═══════════════════════════════════════════════\n');

  console.log(`Files in MongoDB+OCI:     ${stats.totalMatched}`);
  console.log(`Zero-byte (corrupted):    ${stats.zeroByteFiles}`);
  console.log(`Found locally:            ${stats.foundLocally}`);
  console.log(`Missing locally:          ${stats.missingLocally.length}`);
  console.log(`Ready to restore:         ${stats.readyToRestore.length}`);

  // Save ready-to-restore list
  if (stats.readyToRestore.length > 0) {
    const restoreData = {
      exportedAt: new Date().toISOString(),
      totalFiles: stats.readyToRestore.length,
      files: stats.readyToRestore
    };
    fs.writeFileSync('ready-to-restore.json', JSON.stringify(restoreData, null, 2));

    const textList = stats.readyToRestore.map(f => f.filename).join('\n');
    fs.writeFileSync('ready-to-restore.txt', textList);

    console.log(`\n✅ Ready to restore:`);
    console.log(`   ready-to-restore.json (${stats.readyToRestore.length} files)`);
    console.log(`   ready-to-restore.txt`);
  }

  // Save missing files
  if (stats.missingLocally.length > 0) {
    const missingZeroByte = stats.missingLocally.filter(f => f.isZeroByte);
    const missingOk = stats.missingLocally.filter(f => !f.isZeroByte);

    fs.writeFileSync('missing-locally.json', JSON.stringify(stats.missingLocally, null, 2));

    console.log(`\n⚠️  Missing locally:`);
    console.log(`   missing-locally.json (${stats.missingLocally.length} files)`);

    if (missingZeroByte.length > 0) {
      console.log(`\n🔴 CRITICAL: ${missingZeroByte.length} zero-byte files have NO local backup:`);
      missingZeroByte.slice(0, 10).forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.filename}`);
      });
      if (missingZeroByte.length > 10) {
        console.log(`   ... and ${missingZeroByte.length - 10} more`);
      }
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  if (stats.readyToRestore.length === stats.zeroByteFiles) {
    console.log('✅ All corrupted files have local backups - ready to restore!');
    console.log('   Run: node scripts/restore-step2-oci.js --filenames ready-to-restore.json --backup-dir ' + BACKUP_DIR);
  } else if (stats.readyToRestore.length > 0) {
    console.log(`⚠️  ${stats.readyToRestore.length}/${stats.zeroByteFiles} corrupted files can be restored`);
  } else {
    console.log('❌ No corrupted files found with local backups');
  }
  console.log('═══════════════════════════════════════════════\n');
}

main();
