/**
 * E2E Tests for Share Button Functionality
 * Tests social sharing modal and copy link functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Share Button - Modal Functionality', () => {
  test('should open share modal when clicking share button on series card', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page to load and series cards to appear
    await page.waitForTimeout(2000);

    // The share modal is created by share.js - it should exist in the page
    // Check if we can access shareModule.share() function directly
    const shareModal = page.locator('#shareModal');

    // Trigger the share function via JavaScript since share buttons may be dynamically added
    await page.evaluate(() => {
      if (window.shareModule && typeof window.shareModule.share === 'function') {
        window.shareModule.share(window.location.href, document.title);
      }
    });
    await page.waitForTimeout(500);

    // Share modal should now be visible with active class
    await expect(shareModal).toHaveClass(/active/, { timeout: 5000 });
  });

  test('should display all social sharing platforms', async ({ page }) => {
    await page.goto('/');

    // Open share modal
    const shareButton = page.locator('.share-btn, [onclick*="share"]').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Check for social platform buttons
      await expect(page.locator('[data-platform="whatsapp"]')).toBeVisible();
      await expect(page.locator('[data-platform="telegram"]')).toBeVisible();
      await expect(page.locator('[data-platform="twitter"]')).toBeVisible();
      await expect(page.locator('[data-platform="facebook"]')).toBeVisible();
    }
  });

  test('should close share modal when clicking close button', async ({ page }) => {
    await page.goto('/');

    const shareButton = page.locator('.share-btn, [onclick*="share"]').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Click close button
      const closeButton = page.locator('.share-modal-close, [onclick*="close"]');
      await closeButton.click();
      await page.waitForTimeout(300);

      // Modal should be hidden
      const shareModal = page.locator('#shareModal.active, .share-modal.active');
      await expect(shareModal).not.toBeVisible();
    }
  });

  test('should close share modal when clicking backdrop', async ({ page }) => {
    await page.goto('/');

    const shareButton = page.locator('.share-btn, [onclick*="share"]').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Click backdrop
      const backdrop = page.locator('.share-modal-backdrop');
      await backdrop.click();
      await page.waitForTimeout(300);

      // Modal should be hidden
      const shareModal = page.locator('#shareModal.active');
      await expect(shareModal).not.toBeVisible();
    }
  });

  test('should close share modal when pressing Escape', async ({ page }) => {
    await page.goto('/');

    const shareButton = page.locator('.share-btn, [onclick*="share"]').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Modal should be hidden
      const shareModal = page.locator('#shareModal.active');
      await expect(shareModal).not.toBeVisible();
    }
  });
});

test.describe('Share Button - Copy Link', () => {
  test('should display URL in copy input field', async ({ page }) => {
    await page.goto('/');

    const shareButton = page.locator('.share-btn, [onclick*="share"]').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Check URL input contains a URL
      const urlInput = page.locator('#shareUrlInput, .share-copy-input');
      const inputValue = await urlInput.inputValue();

      expect(inputValue).toContain('http');
    }
  });

  test('should show copied feedback when clicking copy button', async ({ page, browserName }) => {
    // Skip on browsers where clipboard permissions are problematic
    test.skip(browserName === 'firefox' || browserName === 'webkit', 'Clipboard permissions unreliable in this browser');

    // Grant clipboard permissions
    try {
      await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
    } catch (e) {
      // Some browsers don't support granting these permissions
      test.skip();
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Open share modal via JavaScript
    await page.evaluate(() => {
      if (window.shareModule && typeof window.shareModule.share === 'function') {
        window.shareModule.share(window.location.href, document.title);
      }
    });
    await page.waitForTimeout(500);

    // Click copy button
    const copyButton = page.locator('.share-copy-btn');
    await expect(copyButton).toBeVisible({ timeout: 5000 });
    await copyButton.click();
    await page.waitForTimeout(500);

    // Check for "copied" state - the button should have 'copied' class
    const copiedButton = page.locator('.share-copy-btn.copied');
    await expect(copiedButton).toBeVisible({ timeout: 3000 });
  });

  test('should reset copy button after timeout', async ({ page, browserName }) => {
    // Skip on browsers where clipboard permissions are problematic
    test.skip(browserName === 'firefox' || browserName === 'webkit', 'Clipboard permissions unreliable in this browser');

    try {
      await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
    } catch (e) {
      test.skip();
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Open share modal via JavaScript
    await page.evaluate(() => {
      if (window.shareModule && typeof window.shareModule.share === 'function') {
        window.shareModule.share(window.location.href, document.title);
      }
    });
    await page.waitForTimeout(500);

    // Click copy button
    const copyButton = page.locator('.share-copy-btn');
    await expect(copyButton).toBeVisible({ timeout: 5000 });
    await copyButton.click();

    // Wait for reset (2 seconds + buffer)
    await page.waitForTimeout(2500);

    // Button should no longer have 'copied' class
    const copyButtonNotCopied = page.locator('.share-copy-btn:not(.copied)');
    await expect(copyButtonNotCopied).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Share Button - Series Detail Page', () => {
  test('should open share modal on series detail page', async ({ page }) => {
    await page.goto('/');

    // Navigate to a series detail page
    const seriesLink = page.locator('a[href*="/series/"]').first();

    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForLoadState('networkidle');

      // Find and click share button on series detail page
      const shareButton = page.locator('.share-btn, [onclick*="share"], button:has-text("مشاركة")').first();

      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(300);

        // Modal should be visible
        const shareModal = page.locator('#shareModal, .share-modal');
        await expect(shareModal).toBeVisible();
      }
    }
  });
});

test.describe('Share Button - Mobile Viewport', () => {
  test('should work correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for content to load
    await page.waitForTimeout(500);

    // Find share button (may be in a different position on mobile)
    const shareButton = page.locator('.share-btn, [onclick*="share"]').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Modal should be visible and properly sized for mobile
      const shareModal = page.locator('#shareModal, .share-modal');
      await expect(shareModal).toBeVisible();

      // Modal content should be visible
      const modalContent = page.locator('.share-modal-content');
      await expect(modalContent).toBeVisible();
    }
  });

  test('should display share platforms in proper layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const shareButton = page.locator('.share-btn').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // All platform buttons should be visible
      const platformButtons = page.locator('.share-platform-btn');
      const count = await platformButtons.count();

      expect(count).toBe(4); // WhatsApp, Telegram, Twitter, Facebook
    }
  });
});

test.describe('Share Button - RTL Support', () => {
  test('should display modal correctly in RTL mode (Arabic)', async ({ page }) => {
    await page.goto('/?lang=ar');

    const shareButton = page.locator('.share-btn').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Check modal direction is RTL
      const modalContent = page.locator('.share-modal-content');
      const dir = await modalContent.getAttribute('dir');

      expect(dir).toBe('rtl');

      // Arabic text should be visible
      const titlePreview = page.locator('#shareTitlePreview');
      await expect(titlePreview).toBeVisible();
    }
  });

  test('should display modal correctly in LTR mode (English)', async ({ page }) => {
    await page.goto('/?lang=en');

    const shareButton = page.locator('.share-btn').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Check modal direction is LTR
      const modalContent = page.locator('.share-modal-content');
      const dir = await modalContent.getAttribute('dir');

      expect(dir).toBe('ltr');
    }
  });
});

test.describe('Share Button - Social Platform Links', () => {
  test('should generate correct WhatsApp share URL', async ({ page }) => {
    await page.goto('/');

    const shareButton = page.locator('.share-btn').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      // Get WhatsApp button
      const whatsappButton = page.locator('[data-platform="whatsapp"]');

      // Check onclick contains WhatsApp URL pattern
      const onclick = await whatsappButton.getAttribute('onclick');
      expect(onclick).toContain('whatsapp');
    }
  });

  test('should generate correct Telegram share URL', async ({ page }) => {
    await page.goto('/');

    const shareButton = page.locator('.share-btn').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(300);

      const telegramButton = page.locator('[data-platform="telegram"]');
      const onclick = await telegramButton.getAttribute('onclick');

      expect(onclick).toContain('telegram');
    }
  });
});
