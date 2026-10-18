const { expect, test } = require('playwright/test');
const { waitForMarkTide } = require('../helpers/marktide-page');

test('v1.8.3 badges and announcement match the release candidate', async ({ page }, testInfo) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await expect(page.locator('.app-version-badge')).toHaveText(['v1.8.3', 'v1.8.3']);
  await page.evaluate(() => window.MarkTideWhatsNew.show());
  const dialog = page.locator('.whats-new-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('PhotoSwipe image viewing');
  await expect(dialog).toContainText('Back to top');
  await expect(dialog).not.toContainText('completed improvements');
  await expect(dialog).toHaveCSS('opacity', '1');
  await expect(dialog).toHaveCSS('filter', 'blur(0px)');
  await page.screenshot({ path: testInfo.outputPath('v1.8.3-announcement.png') });
});

test('What’s New hides its scrollbar without disabling scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 320 });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await page.evaluate(() => window.MarkTideWhatsNew.show());

  const dialog = page.locator('.whats-new-dialog');
  await expect(dialog).toBeVisible();

  const initial = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    const webkitScrollbar = getComputedStyle(element, '::-webkit-scrollbar');
    return {
      clientHeight: element.clientHeight,
      overflowY: style.overflowY,
      scrollHeight: element.scrollHeight,
      scrollbarDisplay: webkitScrollbar.display,
      scrollbarWidth: webkitScrollbar.width,
    };
  });

  expect(initial.overflowY).toBe('auto');
  expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight);
  expect(initial.scrollbarDisplay).toBe('none');
  expect(initial.scrollbarWidth).toBe('0px');

  await dialog.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});
