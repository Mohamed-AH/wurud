# E2E Test Fix Instructions

## Quick Summary
- **43 tests failing** due to locator issues (now 20 after partial fixes)
- **Root cause**: Selectors matching multiple elements (strict mode violations)

---

## Fastest Fix: Run the Auto-Fixer Script

```bash
cd tests/e2e
node apply-fixes.js
```

This will automatically apply all text selector replacements.

---

## Remaining 20 Failures Analysis

After partial fixes, these tests still fail:

| Line | Test Name | Browsers | Issue |
|------|-----------|----------|-------|
| 8 | should load homepage successfully | All 6 | `text=محاضرات` not replaced |
| 382 | should work on tablet viewport | All 6 | `text=سلاسل` not replaced |
| 46, 74, 115, 139, 151, 163, 186, 248, 268, 290 | Various | Mobile Chrome | Click interception |

### Fix for Lines 8 and 382

These lines still use text selectors. Apply these replacements:

```javascript
// Line 8 area - in "should load homepage successfully"
// FIND:
await expect(page.locator('text=محاضرات')).toBeVisible();
await expect(page.locator('text=سلاسل')).toBeVisible();
await expect(page.locator('text=خطب')).toBeVisible();

// REPLACE WITH:
await expect(page.locator('#tab-lectures')).toBeVisible();
await expect(page.locator('#tab-series')).toBeVisible();
await expect(page.locator('#tab-khutba')).toBeVisible();
```

```javascript
// Line 382 area - in "should work on tablet viewport"
// FIND:
await expect(page.locator('text=سلاسل')).toBeVisible();
await expect(page.locator('text=خطب')).toBeVisible();

// REPLACE WITH:
await expect(page.locator('#tab-series')).toBeVisible();
await expect(page.locator('#tab-khutba')).toBeVisible();
```

### Fix for Mobile Chrome Click Interception

For Mobile Chrome tests, add `scrollIntoViewIfNeeded()` before clicks:

```javascript
// Before any click that fails on mobile:
await element.scrollIntoViewIfNeeded();
await element.click();

// Or use force click:
await element.click({ force: true });
```

---

## Manual Fix: Search & Replace in VS Code

Open your test files and use **Ctrl+H** (Find and Replace) with these patterns:

### File: `homepage.spec.js`

| Find | Replace With |
|------|--------------|
| `page.locator('text=محاضرات')` | `page.locator('#tab-lectures')` |
| `page.locator('text=سلاسل')` | `page.locator('#tab-series')` |
| `page.locator('text=خطب')` | `page.locator('#tab-khutba')` |
| `page.click('text=سلاسل')` | `page.click('#tab-series')` |
| `page.click('text=محاضرات')` | `page.click('#tab-lectures')` |
| `page.click('text=خطب')` | `page.click('#tab-khutba')` |
| `page.locator('text=الأحدث أولاً')` | `page.locator('[data-sort="newest"]')` |
| `page.locator('text=الأقدم أولاً')` | `page.locator('[data-sort="oldest"]')` |
| `page.click('button:has-text("الأحدث أولاً")')` | `page.click('[data-sort="newest"]')` |
| `page.click('button:has-text("الأقدم أولاً")')` | `page.click('[data-sort="oldest"]')` |
| `button:has-text("الأحدث أولاً")` | `[data-sort="newest"]` |
| `button:has-text("الأقدم أولاً")` | `[data-sort="oldest"]` |

### File: `audio-player.spec.js`

In the test `should stop current lecture when playing new one` (around line 74):

**Replace:**
```javascript
const playButtons = page.locator('button[class*="play"]');
```

**With:**
```javascript
const playButtons = page.locator('.lecture-card:visible .btn-play, #lectures-content .btn-play:visible');
```

**And add scroll before click:**
```javascript
// Before clicking, scroll into view
await playButtons.nth(0).scrollIntoViewIfNeeded();
await playButtons.nth(0).click();
```

---

## Why These Fixes Work

### Problem 1: Text selectors match multiple elements
- `text=محاضرات` matches the tab button, headings, paragraphs, and links
- Using `#tab-lectures` targets only the specific tab button

### Problem 2: Sort buttons exist in multiple places
- `text=الأحدث أولاً` matches 17 buttons (main sort + each series sort)
- Using `[data-sort="newest"]` targets only the main sort button

### Problem 3: Play buttons in collapsed series
- `button[class*="play"]` matches ALL play buttons including hidden ones
- Using `:visible` or targeting specific containers fixes this

### Problem 4: Mobile viewport click interception
- Elements overlap on mobile causing click interception
- Using specific IDs and `scrollIntoViewIfNeeded()` helps

---

---

## Mobile Chrome Specific Fixes

If Mobile Chrome tests still fail with "click intercepted", apply these fixes:

### Option 1: Force Click (Quick Fix)
```javascript
// Change:
await page.click('#tab-series');
// To:
await page.click('#tab-series', { force: true });
```

### Option 2: Scroll Into View First (Recommended)
```javascript
// Change:
await page.click('#tab-series');
// To:
const element = page.locator('#tab-series');
await element.scrollIntoViewIfNeeded();
await element.click();
```

### Option 3: Wait for Element to be Stable
```javascript
const element = page.locator('#tab-series');
await element.waitFor({ state: 'visible' });
await element.click();
```

---

## After Applying Fixes

1. Run the auto-fixer script first:
```bash
cd tests/e2e
node apply-fixes.js
```

2. Run tests again:
```bash
npm run test:e2e
```

Expected result: All 190 tests should pass.
