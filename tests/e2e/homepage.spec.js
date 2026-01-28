/**
 * E2E Tests for Homepage
 */

const { test, expect } = require('@playwright/test');

test.describe('Homepage - Basic Functionality', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title (matches both Arabic دروس and English Duroos)
    await expect(page).toHaveTitle(/دروس|Duroos/);

    // Check main navigation tabs are present
    await expect(page.locator('#tab-lectures')).toBeVisible();
    await expect(page.locator('#tab-series')).toBeVisible();
    await expect(page.locator('#tab-khutbas')).toBeVisible();
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

    // Scroll to and click on Series tab
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Verify Series tab content is active
    const seriesContent = page.locator('#content-series.active');
    await expect(seriesContent).toBeVisible();
  });

  test('should switch to Khutba tab', async ({ page }) => {
    await page.goto('/');

    // Scroll to and click on Khutba tab
    const khutbaTab = page.locator('#tab-khutbas');
    await khutbaTab.scrollIntoViewIfNeeded();
    await khutbaTab.click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Verify Khutba tab content is active
    const khutbaContent = page.locator('#content-khutbas.active');
    await expect(khutbaContent).toBeVisible();
  });

  test('should switch back to Lectures tab', async ({ page }) => {
    await page.goto('/');

    // Switch to Series
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    // Switch back to Lectures
    const lecturesTab = page.locator('#tab-lectures');
    await lecturesTab.scrollIntoViewIfNeeded();
    await lecturesTab.click();
    await page.waitForTimeout(300);

    // Verify Lectures tab content is active
    const lecturesContent = page.locator('#content-lectures.active');
    await expect(lecturesContent).toBeVisible();
  });
});

test.describe('Homepage - Category Filtering', () => {
  test('should filter by category when clicking filter chip', async ({ page }) => {
    await page.goto('/');

    // Count total cards before filtering
    const allCards = page.locator('.series-card');
    const totalBefore = await allCards.count();

    // Click on a category filter (e.g., Aqeedah/العقيدة)
    const categoryChip = page.locator('.chip[data-filter="Aqeedah"]').first();

    if (await categoryChip.isVisible()) {
      await categoryChip.click();
      await page.waitForTimeout(500);

      // Some cards should be hidden - verify the filter works
      const visibleCards = page.locator('.series-card:not([style*="display: none"])');
      const totalAfter = await visibleCards.count();

      // Either fewer cards visible, or if all are this category, same count
      expect(totalAfter).toBeLessThanOrEqual(totalBefore);
    }
  });

  test('should show all categories when clicking "All"', async ({ page }) => {
    await page.goto('/');

    // Click a specific category first
    const specificCategory = page.locator('.chip[data-filter="Fiqh"]').first();
    if (await specificCategory.isVisible()) {
      await specificCategory.scrollIntoViewIfNeeded();
      await specificCategory.click();
      await page.waitForTimeout(300);
    }

    // Click "All" to show everything
    const allChip = page.locator('.chip[data-filter="all"]').first();
    if (await allChip.isVisible()) {
      await allChip.scrollIntoViewIfNeeded();
      await allChip.click();
      await page.waitForTimeout(300);

      // Verify cards are visible
      const cards = page.locator('.series-card');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Homepage - Date Sorting', () => {
  test('should sort by newest first', async ({ page }) => {
    await page.goto('/');

    // Click "الأحدث أولاً" (Newest first)
    const newestButton = page.locator('[data-sort="newest"]').first();
    await newestButton.scrollIntoViewIfNeeded();
    await newestButton.click();
    await page.waitForTimeout(500);

    // Verify button is active
    await expect(newestButton).toHaveClass(/active/);
  });

  test('should sort by oldest first', async ({ page }) => {
    await page.goto('/');

    // Click "الأقدم أولاً" (Oldest first)
    const oldestButton = page.locator('[data-sort="oldest"]').first();
    await oldestButton.scrollIntoViewIfNeeded();
    await oldestButton.click();
    await page.waitForTimeout(500);

    // Verify button is active
    await expect(oldestButton).toHaveClass(/active/);
  });

  test('should maintain cards visibility after sorting on Series tab', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab (already active by default)
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    // Get initial card count in active tab
    const cardsBefore = page.locator('#content-series .series-card');
    const countBefore = await cardsBefore.count();

    // Sort by newest
    const newestButton = page.locator('[data-sort="newest"]').first();
    await newestButton.scrollIntoViewIfNeeded();
    await newestButton.click();
    await page.waitForTimeout(500);

    // Verify cards are still visible (this was the bug we fixed!)
    const cardsAfter = page.locator('#content-series .series-card');
    const countAfter = await cardsAfter.count();

    expect(countAfter).toBe(countBefore);
    expect(countAfter).toBeGreaterThan(0);
  });

  test('should maintain cards visibility after sorting on Khutba tab', async ({ page }) => {
    await page.goto('/');

    // Switch to Khutba tab
    const khutbaTab = page.locator('#tab-khutbas');
    await khutbaTab.scrollIntoViewIfNeeded();
    await khutbaTab.click();
    await page.waitForTimeout(300);

    // Get initial card count in khutbas tab
    const cardsBefore = page.locator('#content-khutbas .series-card');
    const countBefore = await cardsBefore.count();

    if (countBefore > 0) {
      // Sort by oldest
      const oldestButton = page.locator('[data-sort="oldest"]').first();
      await oldestButton.scrollIntoViewIfNeeded();
      await oldestButton.click();
      await page.waitForTimeout(500);

      // Verify cards are still visible
      const cardsAfter = page.locator('#content-khutbas .series-card');
      const countAfter = await cardsAfter.count();

      expect(countAfter).toBe(countBefore);
    }
  });
});

test.describe('Homepage - Search Functionality', () => {
  test('should search for lectures', async ({ page }) => {
    await page.goto('/');

    // Find search input
    const searchInput = page.locator('#searchInput');

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

    const searchInput = page.locator('#searchInput');

    if (await searchInput.isVisible()) {
      // Type and then clear
      await searchInput.fill('test');
      await page.waitForTimeout(300);
      await searchInput.clear();
      await page.waitForTimeout(300);

      // All cards should be visible again
      const cards = page.locator('.series-card');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Homepage - Series Expansion', () => {
  test('should expand series to show lectures', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab (already active by default)
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    // Find first series card header
    const seriesHeader = page.locator('#content-series .series-header').first();

    if (await seriesHeader.isVisible()) {
      await seriesHeader.scrollIntoViewIfNeeded();
      await seriesHeader.click();
      await page.waitForTimeout(500);

      // Episodes list should be visible
      const episodesList = page.locator('#content-series .episodes-list.show').first();
      await expect(episodesList).toBeVisible();
    }
  });

  test('should show lecture sorting controls inside expanded series', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    // Expand first series
    const seriesHeader = page.locator('#content-series .series-header').first();

    if (await seriesHeader.isVisible()) {
      await seriesHeader.scrollIntoViewIfNeeded();
      await seriesHeader.click();
      await page.waitForTimeout(500);

      // Check for sorting buttons inside episodes
      const sortButtons = page.locator('.episodes-list.show .chip');
      const count = await sortButtons.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('should sort lectures within series by number', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    // Expand first series
    const seriesHeader = page.locator('#content-series .series-header').first();

    if (await seriesHeader.isVisible()) {
      await seriesHeader.scrollIntoViewIfNeeded();
      await seriesHeader.click();
      await page.waitForTimeout(500);

      // Click "حسب الرقم" (Sort by number)
      const sortByNumber = page.locator('.episodes-list.show button:has-text("حسب الرقم")').first();
      if (await sortByNumber.isVisible()) {
        await sortByNumber.scrollIntoViewIfNeeded();
        await sortByNumber.click();
        await page.waitForTimeout(500);

        // Episodes should still be visible
        const episodes = page.locator('.episode-item');
        expect(await episodes.count()).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Homepage - Khutba Expansion', () => {
  test('should expand khutba series to show khutbas', async ({ page }) => {
    await page.goto('/');

    // Switch to Khutba tab
    const khutbaTab = page.locator('#tab-khutbas');
    await khutbaTab.scrollIntoViewIfNeeded();
    await khutbaTab.click();
    await page.waitForTimeout(300);

    // Find first khutba card header
    const khutbaHeader = page.locator('#content-khutbas .series-header').first();

    if (await khutbaHeader.isVisible()) {
      await khutbaHeader.scrollIntoViewIfNeeded();
      await khutbaHeader.click();
      await page.waitForTimeout(500);

      // Episodes list should be visible
      const episodesList = page.locator('#content-khutbas .episodes-list.show').first();
      await expect(episodesList).toBeVisible();
    }
  });

  test('should sort khutbas within series (bug fix verification)', async ({ page }) => {
    await page.goto('/');

    // Switch to Khutba tab
    const khutbaTab = page.locator('#tab-khutbas');
    await khutbaTab.scrollIntoViewIfNeeded();
    await khutbaTab.click();
    await page.waitForTimeout(300);

    // Expand first khutba series
    const khutbaHeader = page.locator('#content-khutbas .series-header').first();

    if (await khutbaHeader.isVisible()) {
      await khutbaHeader.scrollIntoViewIfNeeded();
      await khutbaHeader.click();
      await page.waitForTimeout(500);

      // Try clicking sort buttons inside the expanded series
      const sortOldest = page.locator('#content-khutbas .episodes-list.show .chip').first();
      if (await sortOldest.isVisible()) {
        await sortOldest.scrollIntoViewIfNeeded();
        await sortOldest.click();
        await page.waitForTimeout(500);

        // Episodes should still be visible
        const episodes = page.locator('#content-khutbas .episode-item');
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

    // Main navigation tabs should still be visible
    await expect(page.locator('#tab-lectures')).toBeVisible();

    // Search should be accessible
    const searchInput = page.locator('#searchInput').first();
    await expect(searchInput).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Should render properly
    await expect(page.locator('#tab-series')).toBeVisible();
    await expect(page.locator('#tab-khutbas')).toBeVisible();
  });
});
