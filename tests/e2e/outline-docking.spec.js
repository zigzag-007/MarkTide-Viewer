const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { waitForMarkTide, setTheme } = require('../helpers/marktide-page');

const review = process.env.MARKTIDE_OUTLINE_VISUAL_DIR;
const panel = '.marktide-toc';
const wrapper = '.editor-wrapper';

async function setup(page, theme, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await expect(page.locator('#loading-screen')).toBeHidden();
  await setTheme(page, theme);
  if (await page.locator('#close-dropzone').isVisible()) await page.locator('#close-dropzone').click();
  await expect(page.locator('.marktide-heading-marker')).toHaveCount(17);
}

async function settle(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter(animation =>
      Number.isFinite(animation.effect.getTiming().iterations)).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function open(page, width) {
  if (width < 768) await page.getByRole('button', { name: 'Table of contents', exact: true }).click();
  else if (width < 1200) await page.locator('.marktide-heading-marker[aria-current]').tap();
  else await page.locator('.marktide-heading-rail').hover();
  await expect(page.locator(panel)).toBeVisible();
  await settle(page);
}

function geometry(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, right: box.right };
    };
    return { editor: rect('.editor-wrapper'), preview: rect('#markdown-preview'), pane: rect('.preview-pane'),
      editorPane: rect('.editor-pane'), panel: rect('.marktide-toc'), rail: rect('.marktide-outline') };
  });
}

async function screenshot(page, name) {
  if (!review) return;
  fs.mkdirSync(review, { recursive: true });
  await page.screenshot({ path: path.join(review, `${name}.png`) });
}

for (const width of [390, 768, 1080, 1081, 1440, 1920]) {
  test.describe(`docking at ${width}px`, () => {
    test.use({ hasTouch: width < 1200, isMobile: width < 1200 });
    for (const theme of ['dark', 'light']) test(`pinning preserves the correct content in every view in ${theme}`, async ({ page }) => {
      await setup(page, theme, width);
      for (const view of ['split', 'preview-only', 'editor-only']) {
        await page.evaluate(view => window.MarkTideViewManager.setView(view), view);
        await settle(page);
        const before = await geometry(page);
        await open(page, width);
        if (width < 768) {
          await expect(page.locator('.marktide-toc-header button')).toBeHidden();
          await expect(page.locator(panel)).toHaveAttribute('role', 'dialog');
          const after = await geometry(page);
          expect(after.editor).toEqual(before.editor);
          expect(after.preview).toEqual(before.preview);
          expect(after.panel.x).toBe(0);
          expect(after.panel.width).toBe(width);
        } else {
          await page.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
          await settle(page);
          const after = await geometry(page);
          await expect(page.getByRole('button', { name: 'Unpin table of contents', exact: true })).toHaveAttribute('aria-pressed', 'true');
          if (view === 'split' && width > 1080) {
            expect(after.editor.width).toBeCloseTo(before.editor.width - 262, 0);
            expect(after.editor.x).toBe(before.editor.x);
            expect(after.preview).toEqual(before.preview);
            expect(after.pane).toEqual(before.pane);
            expect(after.editorPane).toEqual(before.editorPane);
            expect(after.panel.right).toBeCloseTo(after.rail.x, 0);
            expect(after.editor.right).toBeLessThanOrEqual(after.panel.x + 1);
          } else if (view === 'split') {
            await expect(page.locator('.marktide-outline')).toHaveClass(/is-floating/);
            expect(after.editor).toEqual(before.editor);
            expect(after.preview).toEqual(before.preview);
          } else {
            await expect(page.locator('.marktide-outline')).not.toHaveClass(/is-floating/);
            expect(after.panel.x).toBeCloseTo(after.rail.x + 40, 0);
            if (view === 'editor-only') {
              expect(after.editor.width).toBeCloseTo(before.editor.width - 262, 0);
              expect(after.editor.x).toBeCloseTo(before.editor.x + 262, 0);
              expect(after.editor.x).toBeGreaterThanOrEqual(after.panel.right - 1);
            } else {
              await expect(page.locator('.preview-pane')).toHaveClass(/marktide-outline-expanded/);
              expect(await page.locator('#markdown-preview').evaluate(root => getComputedStyle(root).marginLeft)).toBe('262px');
              expect(after.preview.width).toBeLessThanOrEqual(before.preview.width);
              expect(after.preview.x).toBeGreaterThanOrEqual(after.panel.right - 1);
            }
          }
          if (view !== 'preview-only') {
            await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().getLayoutInfo().width))
              .toBe(Math.round(after.editor.width));
          }
          await page.locator('.app-header').click({ position: { x: 5, y: 5 } });
          await expect(page.locator(panel)).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await screenshot(page, `${view}-pinned-${width}-${theme}`);
        if (view === 'editor-only') {
          await page.getByRole('link', { name: '✨ Key Features', exact: true }).click();
          await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().getPosition().lineNumber)).toBe(18);
        }
        await page.keyboard.press('Escape');
        await expect(page.locator(panel)).toBeHidden();
        await settle(page);
        const restored = await geometry(page);
        expect(restored.editor).toEqual(before.editor);
        expect(restored.preview).toEqual(before.preview);
        await expect(page.locator(wrapper)).not.toHaveClass(/marktide-outline-split-reserved|marktide-outline-expanded/);
      }
    });
  });
}

for (const theme of ['dark', 'light']) test(`a pinned panel moves safely through views and breakpoints in ${theme}`, async ({ page }) => {
  await setup(page, theme, 1440);
  await open(page, 1440);
  await page.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
  await expect(page.locator(wrapper)).toHaveClass(/marktide-outline-split-reserved/);
  for (const view of ['preview-only', 'editor-only', 'split']) {
    await page.evaluate(view => window.MarkTideViewManager.setView(view), view);
    await settle(page);
    await expect(page.locator(panel)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unpin table of contents', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const box = await geometry(page);
    expect(box.panel.x).toBeGreaterThanOrEqual(0);
    expect(box.panel.right).toBeLessThanOrEqual(1440);
  }
  for (const width of [1081, 1080, 768, 390, 1081, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await settle(page);
    await expect(page.locator(panel)).toBeVisible();
    if (width > 1080) {
      await expect(page.locator(wrapper)).toHaveClass(/marktide-outline-split-reserved/);
      const box = await geometry(page);
      expect(box.panel.right).toBeCloseTo(box.rail.x, 0);
    } else {
      await expect(page.locator(wrapper)).not.toHaveClass(/marktide-outline-split-reserved/);
      await expect(page.locator('.preview-pane')).not.toHaveClass(/marktide-outline-expanded/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.evaluate(() => window.MarkTideOutline.destroy());
  await expect(page.locator(wrapper)).not.toHaveClass(/marktide-outline-split-reserved/);
  await expect(page.locator('.marktide-outline')).toHaveCount(0);
  await page.evaluate(() => window.MarkTideOutline.init());
  await expect(page.locator('.marktide-outline')).toHaveCount(1);
  await expect(page.locator(panel)).toBeHidden();
});
