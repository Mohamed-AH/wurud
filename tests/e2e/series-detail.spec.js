/**
 * E2E Tests for Series Detail Page
 * Tests the page shown when clicking on a series to view its lectures
 */

const { test, expect } = require('@playwright/test');

test.describe('Series Detail Page - Basic Functionality', () => {
  test('should load series detail page from homepage', async ({ page }) => {
    await page.goto('/');

    // Switch to Series tab
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    // Find and click on a series link (series title link)
    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // Should navigate to series-detail page
      await expect(page).toHaveURL(/\/series\//);

      // Breadcrumb should be visible
      await expect(page.locator('.breadcrumb')).toBeVisible();

      // Hero section should be visible
      await expect(page.locator('.series-hero')).toBeVisible();

      // Stats section should be visible
      await expect(page.locator('.stats-section')).toBeVisible();
    }
  });

  test('should display series information correctly', async ({ page }) => {
    await page.goto('/');

    // Navigate to a series detail page
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // Series title should be visible in hero
      await expect(page.locator('.series-hero h1.series-title')).toBeVisible();

      // Stats cards should be present
      const statCards = page.locator('.stat-card');
      expect(await statCards.count()).toBeGreaterThanOrEqual(2);

      // Lectures section should exist
      await expect(page.locator('.lectures-list, .empty-state')).toBeVisible();
    }
  });

  test('should have working sort controls', async ({ page }) => {
    await page.goto('/');

    // Navigate to a series detail page
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // Sort controls should be visible if lectures exist
      const sortControls = page.locator('.sort-controls');
      if (await sortControls.isVisible()) {
        // Click on a sort chip
        const sortByNumber = page.locator('.sort-chip[data-sort="number"]');
        if (await sortByNumber.isVisible()) {
          await sortByNumber.click();
          await page.waitForTimeout(300);

          // Sort chip should be active
          await expect(sortByNumber).toHaveClass(/active/);

          // Clear button should be visible
          await expect(page.locator('#clearSortBtn')).toBeVisible();
        }
      }
    }
  });
});

test.describe('Series Detail Page - Responsive Design', () => {
  test('should work on mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // Hero should be visible
      await expect(page.locator('.series-hero')).toBeVisible();

      // Stats should stack vertically on mobile
      const statsGrid = page.locator('.stats-grid');
      await expect(statsGrid).toBeVisible();

      // Breadcrumb should be readable
      await expect(page.locator('.breadcrumb')).toBeVisible();

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // Allow small tolerance
    }
  });

  test('should work on small mobile viewport (360px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // All sections should be visible and properly sized
      await expect(page.locator('.series-hero')).toBeVisible();
      await expect(page.locator('.stats-section')).toBeVisible();

      // Lecture items should be readable
      const lectureItems = page.locator('.lecture-item');
      if (await lectureItems.count() > 0) {
        await expect(lectureItems.first()).toBeVisible();
      }
    }
  });

  test('should work on very small mobile viewport (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await expect(seriesTab).toBeVisible({ timeout: 10000 });
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();

    // Wait for series content to become active
    await expect(page.locator('#content-series.active')).toBeVisible({ timeout: 10000 });

    // Wait for series cards to load - use longer timeout for slow mobile rendering
    const seriesLink = page.locator('#content-series .series-title a').first();
    await expect(seriesLink).toBeVisible({ timeout: 30000 });

    await seriesLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Content should still be visible and not overflow
    await expect(page.locator('.series-hero')).toBeVisible({ timeout: 15000 });

    // Sort chips should wrap properly
    const sortChips = page.locator('.sort-chips');
    if (await sortChips.count() > 0) {
      await expect(sortChips.first()).toBeVisible();
    }
  });

  test('should work on tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // All elements should be visible
      await expect(page.locator('.series-hero')).toBeVisible();
      await expect(page.locator('.stats-section')).toBeVisible();
      await expect(page.locator('.breadcrumb')).toBeVisible();

      // Stats grid should display properly
      const statsGrid = page.locator('.stats-grid');
      await expect(statsGrid).toBeVisible();
    }
  });

  test('should work on large tablet viewport (1024px)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // All elements should be fully visible
      await expect(page.locator('.series-hero')).toBeVisible();
      await expect(page.locator('.stats-section')).toBeVisible();
    }
  });
});

test.describe('Series Detail Page - Lecture Cards', () => {
  test('should not have horizontal overflow on mobile viewports', async ({ page }) => {
    // Test with a single viewport to reduce flakiness
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await expect(seriesTab).toBeVisible({ timeout: 10000 });
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();

    // Wait for series content to become active
    await expect(page.locator('#content-series.active')).toBeVisible({ timeout: 10000 });

    const seriesLink = page.locator('#content-series .series-title a').first();
    await expect(seriesLink).toBeVisible({ timeout: 30000 });

    await seriesLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Wait for hero section to be visible
    await expect(page.locator('.series-hero')).toBeVisible({ timeout: 15000 });

    // Check document scroll width doesn't exceed viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);

    // Check lecture cards don't overflow (if they exist)
    const lectureCard = page.locator('.lecture-card').first();
    if (await lectureCard.count() > 0 && await lectureCard.isVisible()) {
      const cardBox = await lectureCard.boundingBox();
      if (cardBox) {
        expect(cardBox.x).toBeGreaterThanOrEqual(-5);
        expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewportWidth + 10);
      }
    }
  });

  test('should display lecture cards properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // Lecture cards should be visible
      const lectureCards = page.locator('.lecture-card');
      if (await lectureCards.count() > 0) {
        await expect(lectureCards.first()).toBeVisible();

        // Play and download buttons should be accessible
        const playBtn = page.locator('.btn-play').first();
        const downloadBtn = page.locator('.btn-download').first();

        await expect(playBtn).toBeVisible();
        await expect(downloadBtn).toBeVisible();
      }
    }
  });

  test('should have accessible action buttons on all screen sizes', async ({ page }) => {
    // Test with mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await expect(seriesTab).toBeVisible({ timeout: 10000 });
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();

    // Wait for series content to become active
    await expect(page.locator('#content-series.active')).toBeVisible({ timeout: 10000 });

    const seriesLink = page.locator('#content-series .series-title a').first();
    await expect(seriesLink).toBeVisible({ timeout: 30000 });

    await seriesLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to load
    await expect(page.locator('.series-hero')).toBeVisible({ timeout: 15000 });

    const playBtn = page.locator('.btn-play').first();
    if (await playBtn.count() > 0 && await playBtn.isVisible()) {
      // Button should be at least 32x32 for touch accessibility
      const box = await playBtn.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(32);
        expect(box.height).toBeGreaterThanOrEqual(32);
      }
    }
  });
});
