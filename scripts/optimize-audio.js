#!/usr/bin/env node
/**
 * Audio Optimization Script
 *
 * Converts audio files to voice-optimized MP3 format using FFmpeg.
 * Achieves 80-90% file size reduction while maintaining speech clarity.
 *
 * Usage:
 *   node scripts/optimize-audio.js <input-dir> <output-dir>
 *
 * Requirements:
 *   - FFmpeg installed and available in PATH
 *
 * Output Format:
 *   - MP3, 64kbps, Mono, 22050 Hz (optimal for voice content)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Audio settings optimized for voice/speech
  codec: 'libmp3lame',
  bitrate: '64k',
  channels: 1,         // Mono
  sampleRate: 22050,   // Good for voice
  format: 'mp3',

  // Supported input formats
  inputFormats: ['.wav', '.mp3', '.m4a', '.aac', '.ogg', '.flac', '.wma']
};

/**
 * Check if FFmpeg is installed
 */
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size in human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert a single audio file
 */
function convertFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-vn',                          // No video
      '-acodec', CONFIG.codec,
      '-ac', CONFIG.channels.toString(),
      '-ar', CONFIG.sampleRate.toString(),
      '-b:a', CONFIG.bitrate,
      '-y',                           // Overwrite output
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args, { stdio: 'pipe' });

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg: ${err.message}`));
    });
  });
}

/**
 * Process all audio files in a directory
 */
async function processDirectory(inputDir, outputDir) {
  // Validate input directory
  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }

  // Find all audio files
  const files = fs.readdirSync(inputDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return CONFIG.inputFormats.includes(ext);
  });

  if (files.length === 0) {
    console.log('⚠️ No audio files found in input directory');
    process.exit(0);
  }

  console.log(`\n🎵 Found ${files.length} audio files to process\n`);
  console.log('Configuration:');
  console.log(`  Codec: ${CONFIG.codec}`);
  console.log(`  Bitrate: ${CONFIG.bitrate}`);
  console.log(`  Channels: ${CONFIG.channels} (Mono)`);
  console.log(`  Sample Rate: ${CONFIG.sampleRate} Hz`);
  console.log('');

  let totalOriginalSize = 0;
  let totalNewSize = 0;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = path.join(inputDir, file);
    const outputName = path.basename(file, path.extname(file)) + '.mp3';
    const outputPath = path.join(outputDir, outputName);

    const originalSize = fs.statSync(inputPath).size;
    totalOriginalSize += originalSize;

    process.stdout.write(`[${i + 1}/${files.length}] Processing: ${file}... `);

    try {
      await convertFile(inputPath, outputPath);

      const newSize = fs.statSync(outputPath).size;
      totalNewSize += newSize;

      const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);

      console.log(`✅ ${formatBytes(originalSize)} → ${formatBytes(newSize)} (-${reduction}%)`);
      successCount++;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Files processed: ${successCount}/${files.length}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Original total: ${formatBytes(totalOriginalSize)}`);
  console.log(`  Optimized total: ${formatBytes(totalNewSize)}`);
  console.log(`  Total reduction: ${((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1)}%`);
  console.log(`  Space saved: ${formatBytes(totalOriginalSize - totalNewSize)}`);
  console.log('='.repeat(60));

  if (successCount > 0) {
    console.log(`\n✅ Optimized files saved to: ${outputDir}`);
    console.log('\nNext step: Upload to OCI Object Storage');
    console.log('  node scripts/upload-to-oci.js ' + outputDir);
  }
}

// Main
async function main() {
  console.log('🎧 Audio Optimization Tool for Voice Content');
  console.log('============================================\n');

  // Check FFmpeg
  if (!checkFFmpeg()) {
    console.error('❌ FFmpeg is not installed or not in PATH');
    console.error('\nPlease install FFmpeg:');
    console.error('  Windows: choco install ffmpeg');
    console.error('  macOS: brew install ffmpeg');
    console.error('  Ubuntu: sudo apt install ffmpeg');
    process.exit(1);
  }
  console.log('✅ FFmpeg found\n');

  // Get directories from command line
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node scripts/optimize-audio.js <input-dir> <output-dir>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/optimize-audio.js /mnt/audio /mnt/audio-optimized');
    console.log('');
    console.log('This will convert all audio files to voice-optimized MP3:');
    console.log('  - 64kbps bitrate (optimal for speech)');
    console.log('  - Mono audio');
    console.log('  - 22050 Hz sample rate');
    console.log('  - Expected 80-90% size reduction');
    process.exit(1);
  }

  const inputDir = path.resolve(args[0]);
  const outputDir = path.resolve(args[1]);

  await processDirectory(inputDir, outputDir);
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
