# E2E Test Fix Instructions

## Quick Summary
- **43 tests failing** due to locator issues
- **Root cause**: Selectors matching multiple elements (strict mode violations)

---

## Quick Fix: Search & Replace in VS Code

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

## After Applying Fixes

Run tests again:
```bash
npm run test:e2e
```

Expected result: All 190 tests should pass.
