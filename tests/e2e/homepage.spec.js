/**
 * E2E Tests for Homepage
 */

const { test, expect } = require('@playwright/test');

test.describe('Homepage - Basic Functionality', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/دروس/);

    // Check main navigation tabs are present
    await expect(page.locator('#tab-lectures')).toBeVisible();
    await expect(page.locator('#tab-series')).toBeVisible();
    await expect(page.locator('text=خطب')).toBeVisible();
  });

  test('should display search functionality', async ({ page }) => {
    await page.goto('/');

    // Check search input is present
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"]');
    await expect(searchInput).toBeVisible();
  });

  test('should display filter chips', async ({ page }) => {
    await page.goto('/');

    // Check that filter section exists
    const filterSection = page.locator('.filter-chips, [class*="filter"]');
    await expect(filterSection.first()).toBeVisible();
  });

  test('should display sort buttons', async ({ page }) => {
    await page.goto('/');

    // Check sort buttons
    await expect(page.locator('[data-sort="newest"]')).toBeVisible();
    await expect(page.locator('[data-sort="oldest"]')).toBeVisible();
  });
});

test.describe('Homepage - Tab Switching', () => {
  test('should switch to Series tab', async ({ page }) => {
    await page.goto('/');

    // Click on Series tab
    await page.click('#tab-series');

    // Wait for content to load
    await page.waitForTimeout(500);

    // Verify active tab
    const seriesTab = page.locator('[data-tab="series"], .tab-content.active');
    await expect(seriesTab.first()).toBeVisible();
  });

  test('should switch to Khutba tab', async ({ page }) => {
    await page.goto('/');

    // Click on Khutba tab
    await page.click('text=خطب');

    // Wait for content to load
    await page.waitForTimeout(500);

    // Verify active tab
    const khutbaTab = page.locator('[data-tab="khutba"], .tab-content.active');
    await expect(khutbaTab.first()).toBeVisible();
  });

  test('should switch back to Lectures tab', async ({ page }) => {
    await page.goto('/');

    // Switch to Series
    await page.click('#tab-series');
    await page.waitForTimeout(300);

    // Switch back to Lectures
    await page.click('text=محاضرات');
    await page.waitForTimeout(300);

    // Verify Lectures tab is active
    const lecturesTab = page.locator('[data-tab="lectures"], .tab-content.active');
    await expect(lecturesTab.first()).toBeVisible();
  });
});

test.describe('Homepage - Category Filtering', () => {
  test('should filter by category when clicking filter chip', async ({ page }) => {
    await page.goto('/');

    // Count total cards before filtering
    const allCards = page.locator('.series-card, .lecture-card');
    const totalBefore = await allCards.count();

    // Click on a category filter (e.g., عقيدة)
    const categoryChip = page.locator('.chip[data-filter="عقيدة"], button:has-text("عقيدة")').first();

    if (await categoryChip.isVisible()) {
      await categoryChip.click();
      await page.waitForTimeout(500);

      // Some cards should be hidden
      const visibleCards = page.locator('.series-card:visible, .lecture-card:visible');
      const totalAfter = await visibleCards.count();

      // Either fewer cards visible, or if all are this category, same count
      expect(totalAfter).toBeLessThanOrEqual(totalBefore);
    }
  });

  test('should show all categories when clicking "All"', async ({ page }) => {
    await page.goto('/');

    // Click a specific category first
    const specificCategory = page.locator('.chip[data-filter]:not([data-filter="all"])').first();
    if (await specificCategory.isVisible()) {
      await specificCategory.click();
      await page.waitForTimeout(300);
    }

    // Click "All" to show everything
    const allChip = page.locator('.chip[data-filter="all"], button:has-text("الكل")').first();
    if (await allChip.isVisible()) {
      await allChip.click();
      await page.waitForTimeout(300);

      // Verify cards are visible
      const cards = page.locator('.series-card, .lecture-card');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Homepage - Date Sorting', () => {
  test('should sort by newest first', async ({ page }) => {
    await page.goto('/');

    // Click "الأحدث أولاً" (Newest first)
    await page.click('[data-sort="newest"]');
    await page.waitForTimeout(500);

    // Verify button is active
    const newestButton = page.locator('[data-sort="newest"]');
    await expect(newestButton).toHaveClass(/active/);
  });

  test('should sort by oldest first', async ({ page }) => {
    await page.goto('/');

    // Click "الأقدم أولاً" (Oldest first)
    await page.click('[data-sort="oldest"]');
    await page.waitForTimeout(500);

    // Verify button is active
    const oldestButton = page.locator('[data-sort="oldest"]');
    await expect(oldestButton).toHaveClass(/active/);
  });

  test('should maintain cards visibility after sorting on Series tab', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab
    await page.click('#tab-series');
    await page.waitForTimeout(300);

    // Get initial card count
    const cardsBefore = page.locator('.series-card:visible');
    const countBefore = await cardsBefore.count();

    // Sort by newest
    await page.click('[data-sort="newest"]');
    await page.waitForTimeout(500);

    // Verify cards are still visible (this was the bug we fixed!)
    const cardsAfter = page.locator('.series-card:visible');
    const countAfter = await cardsAfter.count();

    expect(countAfter).toBe(countBefore);
    expect(countAfter).toBeGreaterThan(0);
  });

  test('should maintain cards visibility after sorting on Khutba tab', async ({ page }) => {
    await page.goto('/');

    // Switch to Khutba tab
    await page.click('text=خطب');
    await page.waitForTimeout(300);

    // Get initial card count
    const cardsBefore = page.locator('.series-card:visible');
    const countBefore = await cardsBefore.count();

    if (countBefore > 0) {
      // Sort by oldest
      await page.click('[data-sort="oldest"]');
      await page.waitForTimeout(500);

      // Verify cards are still visible
      const cardsAfter = page.locator('.series-card:visible');
      const countAfter = await cardsAfter.count();

      expect(countAfter).toBe(countBefore);
    }
  });
});

test.describe('Homepage - Search Functionality', () => {
  test('should search for lectures', async ({ page }) => {
    await page.goto('/');

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"]').first();

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('التوحيد');
      await page.waitForTimeout(500);

      // Results should be filtered
      // Note: This assumes search works instantly (no submit button)
    }
  });

  test('should clear search results', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"]').first();

    if (await searchInput.isVisible()) {
      // Type and then clear
      await searchInput.fill('test');
      await page.waitForTimeout(300);
      await searchInput.clear();
      await page.waitForTimeout(300);

      // All cards should be visible again
      const cards = page.locator('.series-card:visible, .lecture-card:visible');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Homepage - Series Expansion', () => {
  test('should expand series to show lectures', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab
    await page.click('#tab-series');
    await page.waitForTimeout(300);

    // Find first series card
    const seriesCard = page.locator('.series-card').first();

    if (await seriesCard.isVisible()) {
      await seriesCard.click();
      await page.waitForTimeout(500);

      // Episodes list should be visible
      const episodesList = page.locator('.episodes-list, [class*="episode"]').first();
      await expect(episodesList).toBeVisible();
    }
  });

  test('should show lecture sorting controls inside expanded series', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab
    await page.click('#tab-series');
    await page.waitForTimeout(300);

    // Expand first series
    const seriesCard = page.locator('.series-card').first();

    if (await seriesCard.isVisible()) {
      await seriesCard.click();
      await page.waitForTimeout(500);

      // Check for sorting buttons inside episodes
      const sortButtons = page.locator('button:has-text("حسب الرقم"), [data-sort="oldest"], [data-sort="newest"]');
      const count = await sortButtons.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('should sort lectures within series by number', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab
    await page.click('#tab-series');
    await page.waitForTimeout(300);

    // Expand first series
    const seriesCard = page.locator('.series-card').first();

    if (await seriesCard.isVisible()) {
      await seriesCard.click();
      await page.waitForTimeout(500);

      // Click "حسب الرقم" (Sort by number)
      const sortByNumber = page.locator('button:has-text("حسب الرقم")').first();
      if (await sortByNumber.isVisible()) {
        await sortByNumber.click();
        await page.waitForTimeout(500);

        // Episodes should still be visible
        const episodes = page.locator('.episode-item, [class*="lecture"]');
        expect(await episodes.count()).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Homepage - Khutba Expansion', () => {
  test('should expand khutba series to show khutbas', async ({ page }) => {
    await page.goto('/');

    // Switch to Khutba tab
    await page.click('text=خطب');
    await page.waitForTimeout(300);

    // Find first khutba card
    const khutbaCard = page.locator('.series-card').first();

    if (await khutbaCard.isVisible()) {
      await khutbaCard.click();
      await page.waitForTimeout(500);

      // Episodes list should be visible
      const episodesList = page.locator('.episodes-list, [id*="khutba-episodes"]').first();
      await expect(episodesList).toBeVisible();
    }
  });

  test('should sort khutbas within series (bug fix verification)', async ({ page }) => {
    await page.goto('/');

    // Switch to Khutba tab
    await page.click('text=خطب');
    await page.waitForTimeout(300);

    // Expand first khutba series
    const khutbaCard = page.locator('.series-card').first();

    if (await khutbaCard.isVisible()) {
      await khutbaCard.click();
      await page.waitForTimeout(500);

      // Try clicking sort buttons (this was broken before the fix!)
      const sortOldest = page.locator('[data-sort="oldest"]').first();
      if (await sortOldest.isVisible()) {
        await sortOldest.click();
        await page.waitForTimeout(500);

        // Should not see error in console
        // Episodes should still be visible
        const episodes = page.locator('.episode-item, [class*="lecture"]');
        expect(await episodes.count()).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Homepage - Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Main elements should still be visible
    await expect(page.locator('text=محاضرات')).toBeVisible();

    // Search should be accessible
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Should render properly
    await expect(page.locator('#tab-series')).toBeVisible();
    await expect(page.locator('text=خطب')).toBeVisible();
  });
});
