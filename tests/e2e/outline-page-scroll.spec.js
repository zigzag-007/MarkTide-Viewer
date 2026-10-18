const { test, expect } = require('playwright/test');
const { waitForMarkTide, setTheme } = require('../helpers/marktide-page');

test.describe.configure({ mode: 'parallel' });

async function setup(page, theme, width = 1280, view = 'split') {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await expect(page.locator('#loading-screen')).toBeHidden();
  await setTheme(page, theme);
  if (await page.locator('#close-dropzone').isVisible()) await page.locator('#close-dropzone').click();
  if (view !== 'split') await page.evaluate(mode => window.MarkTideViewManager.setView(mode), view);
  await page.evaluate(async () => {
    await window.MarkTideRenderer.renderPipeline;
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(animation =>
      Number.isFinite(animation.effect.getTiming().iterations)).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.getByRole('heading', { name: 'MarkTide', exact: true }).click();
  await page.mouse.move(width - 1, 1);
  await expect(page.locator('.marktide-heading-marker')).toHaveCount(17);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
}

async function geometry(page) {
  return page.locator('.marktide-outline').evaluate(outline => {
    const editorOnly = document.body.classList.contains('editor-only-active');
    const region = document.querySelector(editorOnly ? '#markdown-editor' : '.preview-pane');
    const bounds = region.getBoundingClientRect();
    const headerBottom = document.querySelector('.app-header').getBoundingClientRect().bottom;
    const top = Math.max(0, headerBottom, bounds.top);
    const rail = outline.getBoundingClientRect();
    const panel = outline.querySelector('.marktide-toc').getBoundingClientRect();
    return { y: scrollY, top: rail.top, expectedTop: Math.round(top),
      bottom: rail.bottom, expectedBottom: Math.max(Math.round(top) + 80, Math.min(innerHeight, bounds.bottom)),
      panelTop: panel.top, regionTop: bounds.top,
      paneScroll: document.querySelector('.preview-pane').scrollTop,
      editorScroll: window.MarkTideMonaco.getEditor().getScrollTop() };
  });
}

async function aligned(page) {
  await expect.poll(async () => {
    const box = await geometry(page);
    return Math.abs(box.top - box.expectedTop) < 1 && Math.abs(box.bottom - box.expectedBottom) < 1;
  }).toBe(true);
}

async function scrollKey(page, key) {
  await page.keyboard.press(key);
  // Finish the browser's smooth scroll before sending another navigation key.
  await page.evaluate(() => new Promise(resolve => {
    let last = scrollY, quietSince = performance.now();
    const check = now => {
      if (scrollY !== last) { last = scrollY; quietSince = now; }
      if (now - quietSince >= 250) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }));
}

for (const theme of ['light', 'dark']) for (const width of [1081, 1280, 1920]) {
  for (const method of ['PageDown', 'page scroll position', 'End and Home']) {
    test(`${method} keeps the split rail aligned at ${width}px in ${theme}`, async ({ page }) => {
      await setup(page, theme, width);
      await aligned(page);
      const initial = await geometry(page);
      if (method === 'page scroll position') {
        // Scrollbar changes reach this same document scroll event path.
        await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
      } else await scrollKey(page, method === 'PageDown' ? 'PageDown' : 'End');
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
      await aligned(page);
      const down = await geometry(page);
      expect(down.top).toBeLessThan(initial.top - 20);
      expect(down.paneScroll).toBe(initial.paneScroll);
      expect(down.editorScroll).toBe(initial.editorScroll);
      // Pointer movement over Preview can trigger an unrelated layout refresh.
      await page.mouse.move(width - 100, 400);
      await page.mouse.move(width - 1, 1);
      await scrollKey(page, 'Home');
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await aligned(page);
      expect((await geometry(page)).top).toBeCloseTo(initial.top, 0);
    });
  }
}

for (const theme of ['light', 'dark']) {
  test(`pinned split TOC follows page scrolling in ${theme}`, async ({ page }) => {
    await setup(page, theme);
    await page.locator('.marktide-heading-rail').hover();
    await page.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
    await page.getByRole('heading', { name: 'MarkTide', exact: true }).click();
    await page.mouse.move(1279, 1);
    for (const key of ['End', 'Home', 'PageDown', 'Home']) {
      await scrollKey(page, key);
      if (key === 'Home') await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      else await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
      await aligned(page);
      await expect(page.getByRole('button', { name: 'Unpin table of contents', exact: true })).toBeVisible();
      await expect.poll(async () => {
        const box = await geometry(page);
        return Math.abs(box.panelTop - box.expectedTop);
      }).toBeLessThan(1);
    }
  });

  for (const width of [375, 390]) {
    test(`mobile reading controls survive End and Home at ${width}px in ${theme}`, async ({ page }) => {
      await setup(page, theme, width);
      const toggle = page.getByRole('button', { name: 'Table of contents', exact: true });
      for (const key of ['End', 'Home']) {
        await scrollKey(page, key);
        if (key === 'Home') await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
        else await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
        await expect(page.locator('.marktide-heading-rail')).toBeHidden();
        await expect(toggle).toBeInViewport();
        await toggle.click();
        await expect(page.getByRole('dialog', { name: 'Table of contents', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.marktide-toc')).toBeHidden();
      }
    });
  }

  test(`End pointer Home restores the rail and open TOC in ${theme}`, async ({ page }) => {
    await setup(page, theme);
    await scrollKey(page, 'End');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
    await page.mouse.move(1100, 400);
    await aligned(page);
    await page.locator('.marktide-heading-rail').hover();
    await expect(page.locator('.marktide-toc')).toBeVisible();
    await expect.poll(async () => {
      const box = await geometry(page);
      return Math.abs(box.panelTop - box.expectedTop);
    }).toBeLessThan(1);
    await scrollKey(page, 'Home');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await aligned(page);
    await expect.poll(async () => {
      const box = await geometry(page);
      return Math.abs(box.panelTop - box.expectedTop);
    }).toBeLessThan(1);
  });

  for (const [width, view] of [[1280, 'preview-only'], [1280, 'editor-only'], [810, 'split'], [810, 'preview-only']]) {
    test(`${view} keeps page scroll alignment at ${width}px in ${theme}`, async ({ page }) => {
      await setup(page, theme, width, view);
      for (const key of ['End', 'Home', 'PageDown', 'Home']) {
        await scrollKey(page, key);
        if (key === 'Home') await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
        else await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
        await aligned(page);
      }
    });
  }
}
