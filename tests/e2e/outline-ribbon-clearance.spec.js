const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { waitForMarkTide, setTheme, renderMarkdown } = require('../helpers/marktide-page');

const review = process.env.MARKTIDE_OUTLINE_VISUAL_DIR;
const rail = '.marktide-heading-rail';
const panel = '.marktide-toc';

async function settle(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter(animation =>
      Number.isFinite(animation.effect.getTiming().iterations)).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function setup(page, theme, width) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await expect(page.locator('#loading-screen')).toBeHidden();
  await setTheme(page, theme);
  if (await page.locator('#close-dropzone').isVisible()) await page.locator('#close-dropzone').click();
  await expect(page.locator('.marktide-heading-marker')).toHaveCount(17);
  await page.evaluate(() => window.MarkTideViewManager.setView('editor-only'));
  await settle(page);
}

async function clearance(page) {
  const button = await page.getByRole('button', { name: 'Expand formatting ribbon', exact: true }).boundingBox();
  const bounds = await page.locator(rail).boundingBox();
  expect(bounds.y - button.y - button.height).toBeGreaterThanOrEqual(8);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  expect(await page.evaluate(box => Boolean(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    ?.closest('.ribbon-toggle')), button)).toBe(true);
}

async function screenshot(page, name) {
  if (!review) return;
  fs.mkdirSync(review, { recursive: true });
  await page.screenshot({ path: path.join(review, `${name}.png`) });
}

for (const touch of [false, true]) test.describe(touch ? 'touch' : 'mouse', () => {
  test.use({ hasTouch: touch, isMobile: touch });
  for (const width of [1081, 1440]) for (const theme of ['light', 'dark']) {
    test(`editor rail clears the collapsed ribbon at ${width}px in ${theme}`, async ({ page }) => {
      await setup(page, theme, width);
      const editorState = () => page.evaluate(() => {
        const editor = window.MarkTideMonaco.getEditor();
        const bounds = document.querySelector('.editor-wrapper').getBoundingClientRect();
        return { x: bounds.x, width: bounds.width, text: editor.getValue(), scroll: editor.getScrollTop() };
      });
      const before = await editorState();
      const initialRail = await page.locator(rail).boundingBox();
      const collapse = page.getByRole('button', { name: 'Collapse formatting ribbon', exact: true });
      if (touch) await collapse.tap();
      else await collapse.click();
      await expect(page.locator('.formatting-ribbon')).toBeHidden();
      await settle(page);
      await clearance(page);
      expect(await editorState()).toEqual(before);
      const expand = page.getByRole('button', { name: 'Expand formatting ribbon', exact: true });
      if (!touch) {
        await expand.hover();
        await page.waitForTimeout(350);
        await expect(page.locator(panel)).toBeHidden();
      }
      await screenshot(page, `collapsed-editor-${width}-${theme}-${touch ? 'touch' : 'mouse'}`);
      await page.keyboard.press('Tab');
      await page.locator('.marktide-heading-marker').first().focus();
      await expect(page.locator(panel)).toBeVisible();
      await settle(page);
      await page.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
      await settle(page);
      await clearance(page);
      const dock = await page.locator(panel).boundingBox();
      const button = await expand.boundingBox();
      expect(dock.x).toBeGreaterThanOrEqual(button.x + button.width);
      await screenshot(page, `collapsed-editor-pinned-${width}-${theme}-${touch ? 'touch' : 'mouse'}`);
      await page.keyboard.press('Escape');
      if (touch) await expand.tap();
      else await expand.click();
      await expect(page.locator('.formatting-ribbon')).toBeVisible();
      await settle(page);
      expect(await page.locator(rail).boundingBox()).toEqual(initialRail);
      expect(await editorState()).toEqual(before);
      await collapse.press('Enter');
      await settle(page);
      await clearance(page);
      await page.evaluate(() => window.MarkTideViewManager.setView('split'));
      await settle(page);
      const preview = await page.locator('.preview-pane').boundingBox();
      expect((await page.locator(rail).boundingBox()).y).toBeCloseTo(preview.y, 0);
      await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
      await settle(page);
      await expect(page.locator('.ribbon-host')).toBeHidden();
      await page.evaluate(() => window.MarkTideViewManager.setView('editor-only'));
      await settle(page);
      await clearance(page);
      await page.setViewportSize({ width: 1080, height: 800 });
      await settle(page);
      await expect(page.locator('.ribbon-host')).toBeHidden();
      const narrowRail = await page.locator(rail).boundingBox();
      const editor = await page.locator('#markdown-editor').boundingBox();
      expect(narrowRail.y).toBeCloseTo(editor.y, 0);
      await page.setViewportSize({ width, height: 800 });
      await settle(page);
      await clearance(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expand.press('Enter');
      await collapse.press('Enter');
      await settle(page);
      await clearance(page);
    });
  }
});

test('the shortened rail still reveals both ends of a long outline', async ({ page }) => {
  await setup(page, 'light', 1081);
  await renderMarkdown(page, '# Start\n\n' + Array.from({ length: 120 }, (_, index) =>
    `## Section ${index + 1}\n\nA paragraph.\n\n`).join(''));
  await page.setViewportSize({ width: 1081, height: 360 });
  await page.getByRole('button', { name: 'Collapse formatting ribbon', exact: true }).press('Enter');
  await settle(page);
  await clearance(page);
  const markers = page.locator('.marktide-heading-marker');
  await markers.first().focus();
  await markers.first().press('End');
  await expect(markers.last()).toBeFocused();
  for (const key of ['Home', 'End', 'Home']) {
    await page.locator('.marktide-heading-marker[aria-current]').press(key);
    await expect.poll(() => page.evaluate(() => {
      const viewport = document.querySelector('.marktide-heading-rail').getBoundingClientRect();
      const marker = document.querySelector('.marktide-heading-marker[aria-current]').getBoundingClientRect();
      return marker.top >= viewport.top && marker.bottom <= viewport.bottom;
    })).toBe(true);
    await clearance(page);
  }
});
