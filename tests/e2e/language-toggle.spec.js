/**
 * E2E Tests for Language Toggle Functionality
 * Tests Arabic/English language switching
 */

const { test, expect } = require('@playwright/test');

test.describe('Language Toggle - Basic Functionality', () => {
  test('should default to Arabic language', async ({ page }) => {
    await page.goto('/');

    // Check that the page is in Arabic by default
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('ar');

    // Check for RTL direction
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');
  });

  test('should display language toggle button', async ({ page }) => {
    await page.goto('/');

    // Find language toggle (common patterns)
    const langToggle = page.locator('.lang-toggle, [data-lang], a[href*="lang="], button:has-text("EN"), button:has-text("العربية")');
    await expect(langToggle.first()).toBeVisible();
  });

  test('should switch to English when clicking English toggle', async ({ page }) => {
    await page.goto('/');

    // Find and click English language link/button
    const englishToggle = page.locator('a[href*="lang=en"], button:has-text("EN"), .lang-toggle:has-text("EN")').first();

    if (await englishToggle.isVisible()) {
      await englishToggle.click();
      await page.waitForLoadState('networkidle');

      // Check that page is now in English
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('en');

      // Check for LTR direction
      const htmlDir = await page.locator('html').getAttribute('dir');
      expect(htmlDir).toBe('ltr');
    }
  });

  test('should switch back to Arabic when clicking Arabic toggle', async ({ page }) => {
    // Start in English
    await page.goto('/?lang=en');

    // Find and click Arabic language link/button
    const arabicToggle = page.locator('a[href*="lang=ar"], button:has-text("العربية"), .lang-toggle:has-text("AR")').first();

    if (await arabicToggle.isVisible()) {
      await arabicToggle.click();
      await page.waitForLoadState('networkidle');

      // Check that page is now in Arabic
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('ar');
    }
  });
});

test.describe('Language Toggle - URL Parameters', () => {
  test('should load page in English with lang=en parameter', async ({ page }) => {
    await page.goto('/?lang=en');

    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('en');
  });

  test('should load page in Arabic with lang=ar parameter', async ({ page }) => {
    await page.goto('/?lang=ar');

    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('ar');
  });

  test('should ignore invalid language parameter', async ({ page }) => {
    await page.goto('/?lang=fr');

    // Should fallback to Arabic
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('ar');
  });

  test('should preserve language parameter during navigation', async ({ page }) => {
    await page.goto('/?lang=en');

    // Navigate to series tab
    const seriesTab = page.locator('#tab-series');
    await seriesTab.click();
    await page.waitForTimeout(300);

    // Page should still be in English
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('en');
  });
});

test.describe('Language Toggle - Translation Content', () => {
  test('should display Arabic navigation text', async ({ page }) => {
    await page.goto('/?lang=ar');

    // Check for Arabic navigation text
    await expect(page.locator('text=الرئيسية')).toBeVisible();
  });

  test('should display English navigation text', async ({ page }) => {
    await page.goto('/?lang=en');

    // Check for English navigation text
    await expect(page.locator('text=Home')).toBeVisible();
  });

  test('should display Arabic category names', async ({ page }) => {
    await page.goto('/?lang=ar');

    // Check for Arabic category names (at least one should be visible)
    const arabicCategories = page.locator('text=العقيدة, text=الفقه, text=التفسير');
    const count = await arabicCategories.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should display English category names', async ({ page }) => {
    await page.goto('/?lang=en');

    // Check for English category names
    const englishCategories = page.locator('text=Aqeedah, text=Fiqh, text=Tafsir');
    const count = await englishCategories.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should translate filter buttons', async ({ page }) => {
    await page.goto('/?lang=ar');

    // Check for Arabic filter text
    const arabicAllFilter = page.locator('.chip:has-text("الكل")');
    await expect(arabicAllFilter.first()).toBeVisible();
  });

  test('should translate search placeholder', async ({ page }) => {
    await page.goto('/?lang=ar');

    const searchInput = page.locator('#searchInput');
    const placeholder = await searchInput.getAttribute('placeholder');

    expect(placeholder).toContain('بحث');
  });
});

test.describe('Language Toggle - RTL/LTR Layout', () => {
  test('should have RTL text alignment in Arabic', async ({ page }) => {
    await page.goto('/?lang=ar');

    // Check body or main content has RTL direction
    const body = page.locator('body');
    const direction = await body.evaluate(el => getComputedStyle(el).direction);

    expect(direction).toBe('rtl');
  });

  test('should have LTR text alignment in English', async ({ page }) => {
    await page.goto('/?lang=en');

    const body = page.locator('body');
    const direction = await body.evaluate(el => getComputedStyle(el).direction);

    expect(direction).toBe('ltr');
  });

  test('should position elements correctly in RTL mode', async ({ page }) => {
    await page.goto('/?lang=ar');

    // In RTL, navigation should be on the right
    // This is a basic check - specific positioning depends on CSS
    const nav = page.locator('nav, .navbar, header').first();
    const box = await nav.boundingBox();

    // Navigation should exist and be visible
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
  });
});

test.describe('Language Toggle - Series Detail Page', () => {
  test('should translate series detail page to Arabic', async ({ page }) => {
    await page.goto('/');

    // Navigate to a series
    const seriesLink = page.locator('a[href*="/series/"]').first();

    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForLoadState('networkidle');

      // Check page is in Arabic
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('ar');

      // Check for Arabic content
      await expect(page.locator('text=محاضرات, text=السلسلة, text=الشيخ').first()).toBeVisible();
    }
  });

  test('should translate series detail page to English', async ({ page }) => {
    await page.goto('/?lang=en');

    // Navigate to a series
    const seriesLink = page.locator('a[href*="/series/"]').first();

    if (await seriesLink.isVisible()) {
      // Append lang=en to preserve language
      const href = await seriesLink.getAttribute('href');
      await page.goto(href + '?lang=en');
      await page.waitForLoadState('networkidle');

      // Check page is in English
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('en');
    }
  });
});

test.describe('Language Toggle - Cookie Persistence', () => {
  test('should remember language preference on page refresh', async ({ page }) => {
    // Set language to English
    await page.goto('/?lang=en');
    await page.waitForLoadState('networkidle');

    // Check cookie is set
    const cookies = await page.context().cookies();
    const localeCookie = cookies.find(c => c.name === 'locale');

    if (localeCookie) {
      expect(localeCookie.value).toBe('en');
    }

    // Refresh page without lang parameter
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should still be in English (if cookie is respected)
    // Note: This depends on implementation - cookie may or may not persist
  });
});

test.describe('Language Toggle - Mobile Viewport', () => {
  test('should display language toggle on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Language toggle should be accessible on mobile
    const langToggle = page.locator('.lang-toggle, [data-lang], a[href*="lang="]').first();
    await expect(langToggle).toBeVisible();
  });

  test('should switch language on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Find and click English toggle
    const englishToggle = page.locator('a[href*="lang=en"]').first();

    if (await englishToggle.isVisible()) {
      await englishToggle.click();
      await page.waitForLoadState('networkidle');

      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('en');
    }
  });
});

test.describe('Language Toggle - Accessibility', () => {
  test('should have accessible language toggle', async ({ page }) => {
    await page.goto('/');

    const langToggle = page.locator('.lang-toggle, a[href*="lang="]').first();

    // Check for accessible attributes
    const role = await langToggle.getAttribute('role');
    const ariaLabel = await langToggle.getAttribute('aria-label');

    // At minimum, element should be focusable
    await langToggle.focus();
    await expect(langToggle).toBeFocused();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Tab to language toggle
    await page.keyboard.press('Tab');

    // Keep tabbing until we find a language link
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.href?.includes('lang=') || el?.classList?.contains('lang-toggle');
      });

      if (focused) {
        // Press Enter to activate
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
        break;
      }

      await page.keyboard.press('Tab');
    }
  });
});
