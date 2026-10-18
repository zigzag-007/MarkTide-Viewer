const { test, expect } = require('playwright/test');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const longDocument = '# Reading controls\n\n' + Array.from({ length: 45 }, (_, index) =>
  `## Section ${index + 1}\n\nA longer document keeps its usual spacing and readable text. The reader can return to the start without moving the editor.\n\n`).join('');
const control = '.marktide-back-to-top';
const mixedDocument = longDocument + [
  '## Mixed content boundary',
  '```js\nconst longValue = "' + 'content '.repeat(70) + '";\nconsole.log(longValue);\n```',
  '```mermaid\nflowchart LR\n  A[Read] --> B[Review] --> C[Finish]\n```',
  '| Case | Status | Explanation |\n|---|---|---|\n| A | NO MATCH | A readable table row. |\n| B | MATCH | [Read table details](#reading-controls) |',
  '<img src="assets/img/desktop-preview.png" alt="Example screenshot for scrolling review." width="500">',
  '<p><a href="#reading-controls" id="review-link">Read linked details.</a></p>',
  '<p><a href="#reading-controls" id="review-linked-image"><img src="assets/img/desktop-preview.png" alt="Linked screenshot." width="240"></a></p>',
  longDocument,
].join('\n\n');

async function setup(page, context, source = longDocument) {
  await installStandaloneCdnMirror(context);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await page.locator('#close-dropzone').click();
  await renderMarkdown(page, source);
  await expect(page.locator(control)).toHaveCount(1);
}

async function exportPage(page, context, baseURL) {
  const html = await captureHtmlExport(page);
  const exported = await context.newPage();
  await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
  await expect(exported.locator(control)).toHaveCount(1);
  return exported;
}

async function scrollReading(page, top) {
  await page.evaluate(position => {
    const pane = document.querySelector('.preview-pane');
    if (pane && /auto|scroll/.test(getComputedStyle(pane).overflowY)) {
      pane.scrollTo({ top: position, behavior: 'instant' });
    } else window.scrollTo({ top: position, behavior: 'instant' });
  }, top);
}

async function readingPosition(page) {
  return page.evaluate(() => {
    const pane = document.querySelector('.preview-pane');
    return pane && /auto|scroll/.test(getComputedStyle(pane).overflowY)
      ? pane.scrollTop : document.scrollingElement.scrollTop;
  });
}

test('split Preview threshold follows its pane without scrolling the editor or page', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page, context);
  const button = page.getByRole('button', { name: 'Back to top', exact: true });
  await expect(button).toBeHidden();
  await expect(page.locator('.markdown-body ' + control)).toHaveCount(0);
  const height = await page.locator('.preview-pane').evaluate(pane => pane.clientHeight);
  const threshold = Math.max(320, height * 0.75);
  await scrollReading(page, threshold - 2);
  await expect(button).toBeHidden();
  await scrollReading(page, threshold + 2);
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('aria-controls', 'markdown-preview');
  const before = await page.evaluate(() => ({ page: scrollY,
    editor: window.MarkTideMonaco.getEditor().getScrollTop() }));
  const pane = await page.locator('.preview-pane').boundingBox();
  const box = await button.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(pane.x);
  expect(box.x + box.width).toBeLessThanOrEqual(pane.x + pane.width - 12);
  expect(box.y + box.height).toBeLessThanOrEqual(pane.y + pane.height - 12);
  await button.click();
  await expect.poll(() => readingPosition(page)).toBe(0);
  await expect(button).toBeHidden();
  expect(await page.evaluate(() => ({ page: scrollY,
    editor: window.MarkTideMonaco.getEditor().getScrollTop() }))).toEqual(before);
  await expect(page.locator('#markdown-preview h1')).toBeFocused();
});

test('full Preview and fresh HTML share visibility, styles and page scrolling in both themes', async ({ page, context, baseURL }) => {
  test.setTimeout(90_000);
  await setup(page, context);
  await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    const exported = await exportPage(page, context, baseURL);
    try {
      for (const width of [390, 768, 1440]) {
        const styles = [];
        for (const surface of [page, exported]) {
          await surface.setViewportSize({ width, height: 900 });
          await scrollReading(surface, 0);
          await expect(surface.locator(control)).toBeHidden();
          await scrollReading(surface, 800);
          const button = surface.getByRole('button', { name: 'Back to top', exact: true });
          await expect(button).toBeVisible();
          const box = await button.boundingBox();
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.y + box.height).toBeLessThanOrEqual(900);
          styles.push(await button.evaluate(element => {
            const css = getComputedStyle(element);
            return Object.fromEntries(['width', 'height', 'color', 'backgroundColor',
              'border', 'borderRadius', 'boxShadow'].map(key => [key, css[key]]));
          }));
          await button.focus();
          await surface.keyboard.press('Tab');
          await surface.keyboard.press('Shift+Tab');
          await expect(button).toBeFocused();
          await expect(button).toHaveCSS('outline-style', 'solid');
          await surface.keyboard.press('Enter');
          expect(await readingPosition(surface)).toBe(0);
          await expect(button).toBeHidden();
          await expect(surface.locator('.markdown-body h1')).toBeFocused();
          await scrollReading(surface, 800);
          await expect(button).toBeVisible();
          await button.focus();
          await surface.keyboard.press('Space');
          expect(await readingPosition(surface)).toBe(0);
          await expect(button).toBeHidden();
        }
        expect(styles[1]).toEqual(styles[0]);
      }
    } finally { await exported.close(); }
  }
});

test('short documents and near top positions never expose the control', async ({ page, context, baseURL }) => {
  await setup(page, context, '# Short document\n\nA small paragraph.');
  await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
  const exported = await exportPage(page, context, baseURL);
  try {
    for (const surface of [page, exported]) {
      await surface.setViewportSize({ width: 390, height: 844 });
      await scrollReading(surface, 10000);
      await expect(surface.locator(control)).toBeHidden();
      expect(await surface.locator(control).evaluate(element => element.hidden)).toBe(true);
    }
    await renderMarkdown(page, longDocument);
    await scrollReading(page, 900);
    await expect(page.locator(control)).toBeVisible();
    await scrollReading(page, 50);
    await expect(page.locator(control)).toBeHidden();
    await scrollReading(page, 900);
    await renderMarkdown(page, '# Replaced with short content\n\nSmall again.');
    await expect(page.locator(control)).toBeHidden();
  } finally { await exported.close(); }
});

test('pointer activation respects reduced motion and keyboard activation is instant', async ({ page, context, baseURL }) => {
  await setup(page, context);
  const exported = await exportPage(page, context, baseURL);
  try {
    for (const surface of [page, exported]) {
      await surface.evaluate(() => {
        window.topCalls = [];
        const pane = document.querySelector('.preview-pane');
        const target = pane || window;
        const original = target.scrollTo.bind(target);
        target.scrollTo = options => { window.topCalls.push(options.behavior); original(options); };
      });
      for (const reduced of ['reduce', 'no-preference']) {
        await surface.emulateMedia({ reducedMotion: reduced });
        await scrollReading(surface, 1000);
        await expect(surface.locator(control)).toBeVisible();
        await surface.getByRole('button', { name: 'Back to top', exact: true }).click();
        await expect.poll(() => readingPosition(surface)).toBe(0);
        expect(await surface.evaluate(() => window.topCalls.at(-1))).toBe(reduced === 'reduce' ? 'instant' : 'smooth');
        if (reduced === 'reduce') await expect(surface.locator(control)).toHaveCSS('transition-duration', '0s');
      }
      await scrollReading(surface, 1000);
      await expect(surface.locator(control)).toBeVisible();
      await surface.locator(control).focus();
      await surface.keyboard.press('Enter');
      expect(await surface.evaluate(() => window.topCalls.at(-1))).toBe('instant');
    }
  } finally { await exported.close(); }
});

test('view changes, resize, rerender and controller cleanup keep one correct control', async ({ page, context }) => {
  await setup(page, context);
  await scrollReading(page, 1000);
  await expect(page.locator(control)).toBeVisible();
  await page.evaluate(() => window.MarkTideViewManager.setView('editor-only'));
  await expect(page.locator(control)).toBeHidden();
  await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
  await scrollReading(page, 1000);
  await expect(page.locator(control)).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  await expect(page.locator(control)).toHaveCSS('width', '44px');
  await renderMarkdown(page, longDocument);
  await expect(page.locator(control)).toHaveCount(1);
  await page.evaluate(async () => {
    await Promise.all(document.querySelector('.preview-pane').getAnimations({ subtree: true })
      .filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
      .map(animation => animation.finished.catch(() => {})));
  });
  const article = page.locator('.markdown-body');
  const before = await article.evaluate(el => ({ html: el.innerHTML, width: el.clientWidth, height: el.scrollHeight }));
  await page.evaluate(() => window.MarkTideBackToTop.destroy());
  await expect(page.locator(control)).toHaveCount(0);
  expect(await article.evaluate(el => ({ html: el.innerHTML, width: el.clientWidth, height: el.scrollHeight }))).toEqual(before);
  await page.evaluate(() => { window.MarkTideBackToTop.init(); window.MarkTideBackToTop.init(); });
  await expect(page.locator(control)).toHaveCount(1);
  await expect(page.locator(control)).toBeVisible();
});

test('mobile touch can return full Preview and HTML to the start', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await setup(page, context);
    await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
    const exported = await exportPage(page, context, baseURL);
    for (const surface of [page, exported]) {
      await scrollReading(surface, 1000);
      const button = surface.getByRole('button', { name: 'Back to top', exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box.width).toBe(44);
      expect(box.height).toBe(44);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
      await button.tap();
      await expect.poll(() => readingPosition(surface)).toBe(0);
      await expect(button).toBeHidden();
    }
  } finally { await context.close(); }
});

test('control is hidden when printing and absent from PDF preparation', async ({ page, context, baseURL }) => {
  await setup(page, context);
  const exported = await exportPage(page, context, baseURL);
  try {
    for (const surface of [page, exported]) {
      await scrollReading(surface, 1000);
      await expect(surface.locator(control)).toBeVisible();
      await surface.emulateMedia({ media: 'print' });
      await expect(surface.locator(control)).toBeHidden();
      await surface.emulateMedia({ media: 'screen' });
      await expect(surface.locator(control)).toBeVisible();
      await expect(surface.locator('.markdown-body ' + control)).toHaveCount(0);
    }
    const prepared = await capturePdfPreparation(page, 'Reading controls PDF isolation', { includeDocumentHtml: true });
    expect(prepared.documentHtml).not.toContain('marktide-back-to-top');
    expect(prepared.documentHtml).not.toContain('MarkTideCreateBackToTopController');
    expect(prepared.documentHtml).toContain('Reading controls');
  } finally { await exported.close(); }
});

for (const width of [390, 1440]) {
test(`content overlap keeps the button visible and keyboard controls usable at ${width}px`, async ({ page, context, baseURL }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 900 });
  await setup(page, context, mixedDocument);
  const exported = await exportPage(page, context, baseURL);
  try {
    for (const [surface, view] of [[page, 'split'], [page, 'preview-only'], [exported, null]]) {
      if (view) await surface.evaluate(mode => window.MarkTideViewManager.setView(mode), view);
      await surface.evaluate(async () => {
        await window.MarkTideMermaidRenderPromise;
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, img => img.decode().catch(() => {})));
        const pane = document.querySelector('.preview-pane');
        if (pane) await Promise.all(pane.getAnimations({ subtree: true })
          .filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
          .map(animation => animation.finished.catch(() => {})));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await scrollReading(surface, 1000);
      // Let the scroll mode change anchor the new reading surface first.
      await surface.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(surface.locator(control)).toBeVisible();
      const baseline = await surface.locator(control).boundingBox();
      const anchor = await surface.locator(control).getAttribute('style');
      for (const [selector, invisible] of [
        ['.copy-code-btn', false], ['.wrap-code-btn', false],
        ['.mermaid-toolbar-btn', true], ['.mermaid-toolbar-btn', false],
        ['#review-link', false], ['#review-linked-image', false], ['.markdown-body table a', false],
      ]) {
        const action = surface.locator(selector).first();
        const originalStyle = await action.getAttribute('style');
        await surface.evaluate(({ selector, invisible }) => {
          const action = document.querySelector(selector);
          const toolbar = action.closest('.mermaid-toolbar');
          if (toolbar) {
            toolbar.style.transition = 'none';
            toolbar.style.transform = 'none';
            toolbar.style.opacity = invisible ? '0' : '1';
            toolbar.style.pointerEvents = invisible ? 'none' : 'auto';
          }
          const pane = document.querySelector('.preview-pane');
          const scroller = pane && /auto|scroll/.test(getComputedStyle(pane).overflowY)
            ? pane : document.scrollingElement;
          const button = document.querySelector('.marktide-back-to-top').getBoundingClientRect();
          // Force a real overlap, even when normal desktop padding separates them.
          action.style.transition = 'none';
          action.style.display = 'inline-block';
          // The synthetic overlap must not put this control behind its siblings.
          action.style.position = 'relative';
          action.style.zIndex = '10';
          action.style.transform = `translateX(${button.left - action.getBoundingClientRect().left}px)`;
          scroller.scrollTop += action.getBoundingClientRect().top - button.top;
        }, { selector, invisible });
        await expect.poll(() => surface.evaluate(({ selector, target }) => {
          const action = document.querySelector(selector);
          const pane = document.querySelector('.preview-pane');
          const scroller = pane && /auto|scroll/.test(getComputedStyle(pane).overflowY)
            ? pane : document.scrollingElement;
          scroller.scrollTop += action.getBoundingClientRect().top - target;
          return Math.abs(action.getBoundingClientRect().top - target);
        }, { selector, target: baseline.y })).toBeLessThan(1);
        await expect(surface.locator(control), selector).toBeVisible();
        expect(await surface.locator(control).boundingBox()).toEqual(baseline);
        expect(await surface.locator(control).getAttribute('style')).toBe(anchor);
        if (!invisible) {
          // Set keyboard modality without tabbing back into the editor.
          await surface.locator(control).focus();
          await surface.keyboard.press('Shift');
          await action.focus();
          await expect(action).toBeFocused();
          await expect.poll(() => surface.evaluate(selector => {
            const box = document.querySelector(selector).getBoundingClientRect();
            const corner = document.querySelector('.marktide-back-to-top').getBoundingClientRect();
            return box.right > corner.left && box.left < corner.right
              && box.bottom > corner.top && box.top < corner.bottom;
          }, selector)).toBe(false);
          await expect(surface.locator(control)).toBeVisible();
          expect(await surface.locator(control).boundingBox()).toEqual(baseline);
          await action.click({ trial: true });
        }
        await surface.evaluate(({ selector, originalStyle }) => {
          const action = document.querySelector(selector);
          action.blur();
          if (originalStyle === null) action.removeAttribute('style');
          else action.setAttribute('style', originalStyle);
          action.closest('.mermaid-toolbar')?.removeAttribute('style');
          const heading = document.querySelectorAll('.markdown-body h2')[10];
          const pane = document.querySelector('.preview-pane');
          const scroller = pane && /auto|scroll/.test(getComputedStyle(pane).overflowY)
            ? pane : document.scrollingElement;
          scroller.scrollTop += heading.getBoundingClientRect().top - 750;
        }, { selector, originalStyle });
        await expect(surface.locator(control)).toBeVisible();
        expect(await surface.locator(control).boundingBox()).toEqual(baseline);
      }
      await surface.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.id = 'test-reading-dialog';
        overlay.className = 'mermaid-modal-overlay open';
        document.body.appendChild(overlay);
      });
      await expect(surface.locator(control)).toBeHidden();
      await surface.evaluate(() => document.querySelector('#test-reading-dialog').remove());
      await expect(surface.locator(control)).toBeVisible();
    }
  } finally { await exported.close(); }
});
}

for (const width of [390, 1440]) {
  test(`scroll never updates the corner past mixed content at ${width}px`, async ({ page, context, baseURL }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await setup(page, context, mixedDocument);
    const exported = await exportPage(page, context, baseURL);
    try {
      for (const [surface, view] of [[page, 'split'], [page, 'preview-only'], [exported, null]]) {
        if (view) await surface.evaluate(mode => window.MarkTideViewManager.setView(mode), view);
        await surface.evaluate(async () => {
          await window.MarkTideMermaidRenderPromise;
          await document.fonts.ready;
          await Promise.all(Array.from(document.images, img => img.decode().catch(() => {})));
          const pane = document.querySelector('.preview-pane');
          if (pane) await Promise.all(pane.getAnimations().map(animation => animation.finished.catch(() => {})));
        });
        await scrollReading(surface, 1000);
        const button = surface.locator(control);
        await expect(button).toBeVisible();
        const baseline = await button.boundingBox();
        await surface.evaluate(() => {
          const style = document.querySelector('.marktide-back-to-top').style;
          const original = style.setProperty.bind(style);
          window.cornerWrites = [];
          style.setProperty = (name, value, priority) => {
            if (name.startsWith('--marktide-top-')) window.cornerWrites.push({ name, value });
            return original(name, value, priority);
          };
        });
        const points = [
          ['.markdown-body h2', 45], ['.enhanced-code-block', 0], ['.copy-code-btn', 0],
          ['.wrap-code-btn', 0], ['.mermaid-container', 0],
          ['.mermaid-toolbar-btn', 0, false], ['.mermaid-toolbar-btn', 1, false], ['.mermaid-toolbar-btn', 2, false],
          ['.mermaid-toolbar-btn', 0, true], ['.mermaid-toolbar-btn', 1, true], ['.mermaid-toolbar-btn', 2, true],
          ['.markdown-body table', 0], ['.markdown-body table a', 0], ['.marktide-content-image', 0],
          ['#review-link', 0], ['#review-linked-image', 0],
        ];
        const samples = [];
        for (const [selector, index, toolbarVisible] of points) {
          await expect(surface.locator(selector).nth(index)).toHaveCount(1);
          if (toolbarVisible !== undefined) {
            await surface.locator('.mermaid-toolbar').evaluate((toolbar, visible) => {
              toolbar.style.transition = 'none';
              toolbar.style.transform = 'none';
              toolbar.style.opacity = visible ? '1' : '0';
              toolbar.style.pointerEvents = visible ? 'auto' : 'none';
            }, toolbarVisible);
            await expect(surface.locator('.mermaid-toolbar')).toHaveCSS('opacity', toolbarVisible ? '1' : '0');
          }
          for (const offset of [80, 0, -80]) {
            await surface.evaluate(({ selector, index, target }) => {
              const item = document.querySelectorAll(selector)[index];
              const pane = document.querySelector('.preview-pane');
              const scroller = pane && /auto|scroll/.test(getComputedStyle(pane).overflowY)
                ? pane : document.scrollingElement;
              scroller.scrollTo({ top: scroller.scrollTop + item.getBoundingClientRect().top - target,
                behavior: 'instant' });
            }, { selector, index, target: baseline.y + offset });
            await surface.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await expect(button, `${selector} at ${offset}`).toBeVisible();
            const position = await button.boundingBox();
            samples.push({ selector, index, offset, ...position });
            expect(position.x, JSON.stringify(samples)).toBeCloseTo(baseline.x, 1);
            expect(position.y, JSON.stringify(samples)).toBeCloseTo(baseline.y, 1);
          }
        }
        expect(await surface.evaluate(() => window.cornerWrites)).toEqual([]);
        await scrollReading(surface, 1000);
        await expect(button).toBeVisible();
        expect(await button.boundingBox()).toEqual(baseline);
        await button.focus();
        await surface.keyboard.press('Enter');
        await expect.poll(() => readingPosition(surface)).toBe(0);
        await expect(button).toBeHidden();
      }
    } finally { await exported.close(); }
  });

  test(`control stays at the same corner past headings at ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page, context);
    const exported = await exportPage(page, context, baseURL);
    try {
      for (const [surface, view] of [[page, 'split'], [page, 'preview-only'], [exported, null]]) {
        if (view) await surface.evaluate(mode => window.MarkTideViewManager.setView(mode), view);
        await scrollReading(surface, 1000);
        const button = surface.locator(control);
        await expect(button).toBeVisible();
        const baseline = await button.boundingBox();
        for (const index of [10, 15, 20]) {
          for (const offset of [-50, 0, 50]) {
            await surface.evaluate(({ index, target }) => {
              const heading = document.querySelectorAll('.markdown-body h2')[index];
              const pane = document.querySelector('.preview-pane');
              const scroller = pane && /auto|scroll/.test(getComputedStyle(pane).overflowY)
                ? pane : document.scrollingElement;
              scroller.scrollTo({ top: scroller.scrollTop + heading.getBoundingClientRect().top - target,
                behavior: 'instant' });
            }, { index, target: baseline.y + offset });
            // Wait for the scheduled scroll refresh before measuring position.
            await surface.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await expect(button).toBeVisible();
            const box = await button.boundingBox();
            expect(box.x).toBeCloseTo(baseline.x, 1);
            expect(box.y).toBeCloseTo(baseline.y, 1);
            expect(box.width).toBe(44);
            expect(box.height).toBe(44);
          }
        }
        await button.focus();
        await surface.keyboard.press('Enter');
        await expect.poll(() => readingPosition(surface)).toBe(0);
        await expect(button).toBeHidden();
      }
    } finally { await exported.close(); }
  });
}

test('Back to top review artifacts use the real report without changing its layout', async ({ page, context, baseURL }) => {
  test.skip(!process.env.MARKTIDE_TOP_REVIEW_DIR, 'Optional manual review artifacts');
  test.setTimeout(120_000);
  const fs = require('node:fs');
  const path = require('node:path');
  const directory = process.env.MARKTIDE_TOP_REVIEW_DIR;
  fs.mkdirSync(directory, { recursive: true });
  const source = process.env.MARKTIDE_REPORT_SOURCE
    ? fs.readFileSync(path.resolve(__dirname, '../..', process.env.MARKTIDE_REPORT_SOURCE), 'utf8')
    : longDocument;
  await setup(page, context, source);
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    const html = await captureHtmlExport(page);
    fs.writeFileSync(path.join(directory, `report-${theme}.html`),
      html.replace('<head>', '<head><base href="http://127.0.0.1:8080/">'));
    const exported = await exportPage(page, context, baseURL);
    try {
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
        await scrollReading(page, 1200);
        await expect(page.locator(control)).toBeVisible();
        const article = page.locator('.markdown-body');
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(document.querySelector('.preview-pane').getAnimations({ subtree: true })
            .filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
            .map(animation => animation.finished.catch(() => {})));
        });
        const bounds = await article.evaluate(el => ({ width: el.clientWidth, height: el.scrollHeight }));
        await page.screenshot({ path: path.join(directory, `preview-${theme}-${width}.png`) });
        await page.evaluate(() => window.MarkTideBackToTop.destroy());
        expect(await article.evaluate(el => ({ width: el.clientWidth, height: el.scrollHeight }))).toEqual(bounds);
        await page.evaluate(() => window.MarkTideBackToTop.init());
        await exported.setViewportSize({ width, height: 900 });
        await scrollReading(exported, 1200);
        await expect(exported.locator(control)).toBeVisible();
        await exported.screenshot({ path: path.join(directory, `html-${theme}-${width}.png`) });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.evaluate(() => window.MarkTideViewManager.setView('split'));
      await scrollReading(page, 1200);
      await expect(page.locator(control)).toBeVisible();
      await page.screenshot({ path: path.join(directory, `split-${theme}.png`) });
    } finally { await exported.close(); }
  }
  if (process.env.MARKTIDE_REPORT_SOURCE) {
    expect(fs.readFileSync(path.resolve(__dirname, '../..', process.env.MARKTIDE_REPORT_SOURCE), 'utf8')).toBe(source);
  }
});
