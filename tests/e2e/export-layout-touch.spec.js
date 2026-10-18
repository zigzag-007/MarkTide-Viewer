const { test, expect } = require('playwright/test');
const { waitForMarkTide, renderMarkdown, setTheme } = require('../helpers/marktide-page');
const { captureHtmlExport } = require('../helpers/export-capture');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

test.describe.configure({ mode: 'parallel' });
const source = '# Touch layout\n\n' + Array.from({ length: 30 }, (_, i) =>
  `## Reading section ${i + 1}\n\n${'A complete explanation keeps text clear of navigation controls. '.repeat(8)}\n\n`).join('');

for (const theme of ['light', 'dark']) for (const width of [390, 768, 810, 1024]) {
  test(`touch layout and reading controls at ${width}px in ${theme}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true,
      viewport: { width, height: 1024 }, deviceScaleFactor: 2 });
    try {
      await installStandaloneCdnMirror(context);
      const preview = await context.newPage();
      await preview.goto(baseURL);
      await waitForMarkTide(preview);
      if (await preview.getByRole('button', { name: 'Got it', exact: true }).isVisible()) {
        await preview.getByRole('button', { name: 'Got it', exact: true }).tap();
      }
      await setTheme(preview, theme);
      await renderMarkdown(preview, source);
      await preview.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
      const html = await captureHtmlExport(preview);
      const exported = await context.newPage();
      await exported.route('**/touch-export.html', route => route.fulfill({ body: html, contentType: 'text/html' }));
      await exported.goto(baseURL + '/touch-export.html');
      for (const page of [preview, exported]) {
        await page.evaluate(() => document.fonts.ready);
        if (width < 768) await page.getByRole('button', { name: 'Table of contents', exact: true }).tap();
        else await page.locator('.marktide-heading-marker').first().tap();
        await expect(page.locator('.marktide-toc')).toBeVisible();
        if (width >= 768) {
          const pin = page.getByRole('button', { name: 'Pin table of contents', exact: true });
          const box = await pin.boundingBox();
          await expect(pin).toHaveCSS('width', '40px');
          expect(box.width + 0.001).toBeGreaterThanOrEqual(40);
          await pin.tap();
          await expect(page.locator('.marktide-outline')).not.toHaveClass(/is-floating/);
          const gap = await page.locator('.markdown-body').evaluate(article => article.getBoundingClientRect().left
            - document.querySelector('.marktide-toc').getBoundingClientRect().right);
          expect(gap).toBeGreaterThanOrEqual(19);
        }
        await page.locator('.marktide-toc a').nth(12).tap();
        await expect(page.locator('.marktide-toc a[aria-current]')).toHaveText('Reading section 12');
        if (width < 768) await expect(page.locator('.marktide-toc')).toBeHidden();
        await expect(page.getByRole('heading', { name: 'Reading section 12', exact: true })).toBeVisible();
        const top = page.getByRole('button', { name: 'Back to top', exact: true });
        await expect(top).toBeVisible();
        await top.tap();
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      }
      const geometry = page => page.locator('.markdown-body').evaluate(article => ({
        x: article.getBoundingClientRect().left, width: article.getBoundingClientRect().width,
        padding: getComputedStyle(article).padding }));
      expect(await geometry(exported)).toEqual(await geometry(preview));
    } finally { await context.close(); }
  });
}

for (const theme of ['light', 'dark']) for (const width of [390, 810, 1280, 1920]) {
  test(`heading lifecycle restores document gutters at ${width}px in ${theme}`, async ({ page, context, baseURL }) => {
    await installStandaloneCdnMirror(context);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await renderMarkdown(page, 'A small document without headings.');
    await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
    const html = await captureHtmlExport(page);
    const exported = await context.newPage();
    await exported.setViewportSize({ width, height: 900 });
    await exported.route('**/empty-outline-export.html', route => route.fulfill({ body: html, contentType: 'text/html' }));
    await exported.goto(baseURL + '/empty-outline-export.html');
    await expect(exported.locator('.marktide-outline')).toBeHidden();
    await expect(exported.locator('.marktide-html-reading-area')).not.toHaveClass(/marktide-outline-surface/);
    for (const target of [page, exported]) await target.evaluate(() => document.fonts.ready);
    const bounds = target => target.locator('.markdown-body').evaluate(article => ({
      x: article.getBoundingClientRect().x, width: article.getBoundingClientRect().width,
      padding: getComputedStyle(article).padding }));
    expect(await bounds(exported)).toEqual(await bounds(page));
    await exported.evaluate(() => {
      document.querySelector('article').innerHTML = '<h1>Only heading</h1><p>One paragraph.</p>';
      window.MarkTideOutline.refresh();
    });
    await expect(exported.locator('.marktide-heading-marker')).toHaveCount(1);
    await expect(exported.locator('.marktide-html-reading-area')).toHaveClass(/marktide-outline-surface/);
    await exported.evaluate(() => window.MarkTideOutline.destroy());
    await expect(exported.locator('.marktide-html-reading-area')).not.toHaveClass(/marktide-outline-surface|marktide-outline-expanded/);
    await exported.evaluate(() => window.MarkTideOutline.init());
    await expect(exported.locator('.marktide-outline')).toHaveCount(1);
    await expect(exported.locator('.marktide-heading-marker')).toHaveCount(1);
    await exported.close();
  });
}
