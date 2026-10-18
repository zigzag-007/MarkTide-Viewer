const { test, expect } = require('playwright/test');
const { waitForMarkTide, setTheme } = require('../helpers/marktide-page');

async function welcome(page, theme) {
  await page.setViewportSize({ width: 1081, height: 800 });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await expect(page.locator('#loading-screen')).toBeHidden();
  await setTheme(page, theme);
  await expect(page.locator('.marktide-heading-marker')).toHaveCount(17);
  await page.clock.install({ time: new Date('2026-10-13T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-13T12:00:01Z'));
}

for (const theme of ['dark', 'light']) {
  test(`hover delay cancels crossings and preserves panel interaction in ${theme}`, async ({ page }) => {
    await welcome(page, theme);
    const panel = page.locator('.marktide-toc');
    const bounds = await page.locator('.marktide-heading-rail').boundingBox();
    const enter = () => page.mouse.move(bounds.x + 15, bounds.y + 100);
    const leave = () => page.mouse.move(bounds.x + bounds.width + 50, bounds.y + 100);
    await leave();
    await enter();
    await page.clock.runFor(80);
    expect(await panel.getAttribute('aria-hidden')).toBe('true');
    await leave();
    await page.clock.runFor(400);
    expect(await panel.getAttribute('aria-hidden')).toBe('true');
    await enter();
    await page.clock.runFor(150);
    await leave();
    await page.clock.runFor(400);
    expect(await panel.getAttribute('aria-hidden')).toBe('true');
    await enter();
    await page.clock.runFor(299);
    expect(await panel.getAttribute('aria-hidden')).toBe('true');
    await page.clock.runFor(1);
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
    await page.clock.runFor(250);
    await page.locator('.marktide-toc-header').hover();
    await page.clock.runFor(250);
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
    await enter();
    await page.clock.runFor(250);
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
    await page.locator('.app-header').hover();
    await page.clock.runFor(139);
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
    await page.clock.runFor(1);
    expect(await panel.getAttribute('aria-hidden')).toBe('true');
    await page.keyboard.press('ArrowRight');
    await page.locator('.marktide-heading-marker').first().focus();
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
    await page.clock.runFor(250);
    await page.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
    await page.locator('.app-header').hover();
    await page.clock.runFor(500);
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
    await page.keyboard.press('Escape');
    expect(await panel.getAttribute('aria-hidden')).toBe('true');
    await enter();
    await page.clock.runFor(100);
    await page.evaluate(() => window.MarkTideOutline.destroy());
    await page.clock.runFor(500);
    await expect(page.locator('.marktide-outline')).toHaveCount(0);
  });
}

test.describe('touch activation', () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const theme of ['dark', 'light']) test(`touch opens immediately and keeps pinning in ${theme}`, async ({ page }) => {
    await welcome(page, theme);
    const panel = page.locator('.marktide-toc');
    await page.locator('.marktide-heading-marker').first().tap();
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
    await page.clock.runFor(250);
    await page.getByRole('button', { name: 'Pin table of contents', exact: true }).tap();
    await page.locator('.app-header').tap();
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
    await page.keyboard.press('Escape');
    expect(await panel.getAttribute('aria-hidden')).toBe('true');
    await page.locator('.marktide-heading-marker').first().tap();
    expect(await panel.getAttribute('aria-hidden')).toBe('false');
  });
});
