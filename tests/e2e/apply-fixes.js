/**
 * E2E Test Auto-Fixer Script
 *
 * Run this script from the tests/e2e directory to automatically apply all fixes.
 *
 * Usage:
 *   node apply-fixes.js
 *
 * This will modify homepage.spec.js and audio-player.spec.js in place.
 */

const fs = require('fs');
const path = require('path');

// Text selector replacements for homepage.spec.js
const homepageReplacements = [
  // Tab selectors - locator
  { find: "page.locator('text=محاضرات')", replace: "page.locator('#tab-lectures')" },
  { find: "page.locator('text=سلاسل')", replace: "page.locator('#tab-series')" },
  { find: "page.locator('text=خطب')", replace: "page.locator('#tab-khutba')" },

  // Tab selectors - click
  { find: "page.click('text=محاضرات')", replace: "page.click('#tab-lectures')" },
  { find: "page.click('text=سلاسل')", replace: "page.click('#tab-series')" },
  { find: "page.click('text=خطب')", replace: "page.click('#tab-khutba')" },

  // Sort button selectors - locator
  { find: "page.locator('text=الأحدث أولاً')", replace: "page.locator('[data-sort=\"newest\"]')" },
  { find: "page.locator('text=الأقدم أولاً')", replace: "page.locator('[data-sort=\"oldest\"]')" },

  // Sort button selectors - click with has-text
  { find: "page.click('button:has-text(\"الأحدث أولاً\")')", replace: "page.click('[data-sort=\"newest\"]')" },
  { find: "page.click('button:has-text(\"الأقدم أولاً\")')", replace: "page.click('[data-sort=\"oldest\"]')" },

  // Sort button selectors - locator with has-text
  { find: "page.locator('button:has-text(\"الأحدث أولاً\")')", replace: "page.locator('[data-sort=\"newest\"]')" },
  { find: "page.locator('button:has-text(\"الأقدم أولاً\")')", replace: "page.locator('[data-sort=\"oldest\"]')" },

  // Expect statements with text selectors
  { find: "await expect(page.locator('text=محاضرات'))", replace: "await expect(page.locator('#tab-lectures'))" },
  { find: "await expect(page.locator('text=سلاسل'))", replace: "await expect(page.locator('#tab-series'))" },
  { find: "await expect(page.locator('text=خطب'))", replace: "await expect(page.locator('#tab-khutba'))" },
];

// Replacements for audio-player.spec.js
const audioPlayerReplacements = [
  // Play button selector - use visible filter
  { find: "page.locator('button[class*=\"play\"]')", replace: "page.locator('button.btn-play:visible')" },
  { find: "page.locator(\"button[class*='play']\")", replace: "page.locator('button.btn-play:visible')" },
];

function applyReplacements(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changeCount = 0;

  for (const { find, replace } of replacements) {
    const regex = new RegExp(escapeRegex(find), 'g');
    const matches = content.match(regex);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(regex, replace);
    }
  }

  if (changeCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath}: ${changeCount} replacement(s) applied`);
    return true;
  } else {
    console.log(`ℹ️  ${filePath}: No changes needed (already fixed or patterns not found)`);
    return false;
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  console.log('🔧 E2E Test Auto-Fixer\n');
  console.log('Applying fixes to test files...\n');

  const baseDir = __dirname;

  // Fix homepage.spec.js
  const homepagePath = path.join(baseDir, 'homepage.spec.js');
  applyReplacements(homepagePath, homepageReplacements);

  // Fix audio-player.spec.js
  const audioPlayerPath = path.join(baseDir, 'audio-player.spec.js');
  applyReplacements(audioPlayerPath, audioPlayerReplacements);

  console.log('\n✨ Done! Run your tests again to verify fixes.');
  console.log('   npm run test:e2e');
}

main();
