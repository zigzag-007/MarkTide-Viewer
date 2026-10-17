const { expect, test } = require('playwright/test');
const { waitForMarkTide } = require('../helpers/marktide-page');

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
