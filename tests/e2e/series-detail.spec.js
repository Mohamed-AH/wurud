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

    // Navigate to series detail
    const seriesTab = page.locator('#tab-series');
    await seriesTab.scrollIntoViewIfNeeded();
    await seriesTab.click();
    await page.waitForTimeout(300);

    const seriesLink = page.locator('#content-series .series-title a').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForTimeout(500);

      // Content should still be visible and not overflow
      await expect(page.locator('.series-hero')).toBeVisible();

      // Sort chips should wrap properly
      const sortChips = page.locator('.sort-chips');
      if (await sortChips.isVisible()) {
        await expect(sortChips).toBeVisible();
      }
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
    const viewports = [
      { width: 320, height: 568, name: '320px' },
      { width: 375, height: 667, name: '375px' },
      { width: 414, height: 896, name: '414px' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
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

        // Check document scroll width doesn't exceed viewport
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(bodyWidth, `No horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(viewportWidth + 5);

        // Check lecture cards don't overflow
        const lectureCard = page.locator('.lecture-card').first();
        if (await lectureCard.isVisible()) {
          const cardBox = await lectureCard.boundingBox();
          expect(cardBox.x, `Card not cut off left at ${viewport.name}`).toBeGreaterThanOrEqual(0);
          expect(cardBox.x + cardBox.width, `Card not cut off right at ${viewport.name}`).toBeLessThanOrEqual(viewportWidth + 5);
        }

        // Check action buttons are visible and not cut off
        const actionBtns = page.locator('.lecture-actions .btn-play, .lecture-actions .btn-download, .lecture-actions .btn-share-card');
        const btnCount = await actionBtns.count();
        for (let i = 0; i < Math.min(btnCount, 3); i++) {
          const btn = actionBtns.nth(i);
          if (await btn.isVisible()) {
            const btnBox = await btn.boundingBox();
            expect(btnBox.x + btnBox.width, `Action button ${i} not cut off at ${viewport.name}`).toBeLessThanOrEqual(viewportWidth + 5);
          }
        }
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
    const viewports = [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
      { width: 414, height: 896 },
      { width: 768, height: 1024 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
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

        const playBtn = page.locator('.btn-play').first();
        if (await playBtn.isVisible()) {
          // Button should be at least 32x32 for touch accessibility
          const box = await playBtn.boundingBox();
          expect(box.width).toBeGreaterThanOrEqual(32);
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    }
  });
});
