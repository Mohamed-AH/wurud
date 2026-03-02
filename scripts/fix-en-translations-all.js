/**
 * Master Script: Fix All English Translations
 *
 * Runs all phases in sequence:
 * - Phase 1: Fix Sheikh Record
 * - Phase 3: Fix Series Records
 * - Phase 4: Fix Lecture Records
 * - Phase 5: Verify All
 *
 * Run: node scripts/fix-en-translations-all.js
 * Requires: .env file with MONGODB_URI
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS = [
  { name: 'Phase 1: Sheikh', file: 'fix-en-translations-phase1.js' },
  { name: 'Phase 3: Series', file: 'fix-en-translations-phase3.js' },
  { name: 'Phase 4: Lectures', file: 'fix-en-translations-phase4.js' },
  { name: 'Phase 5: Verify', file: 'fix-en-translations-phase5-verify.js' }
];

console.log('═'.repeat(80));
console.log('ENGLISH TRANSLATIONS FIX - ALL PHASES');
console.log('═'.repeat(80));
console.log();

for (const script of SCRIPTS) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Running ${script.name}...`);
  console.log(`${'─'.repeat(80)}\n`);

  try {
    const scriptPath = path.join(__dirname, script.file);
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
  } catch (error) {
    console.log(`\n❌ ${script.name} failed with exit code ${error.status}`);
    if (script.name.includes('Verify')) {
      console.log('   Some issues remain. Review the output above.');
    } else {
      console.log('   Stopping execution.');
      process.exit(1);
    }
  }
}

console.log('\n');
console.log('═'.repeat(80));
console.log('ALL PHASES COMPLETE');
console.log('═'.repeat(80));
