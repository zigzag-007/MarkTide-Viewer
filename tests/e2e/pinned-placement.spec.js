const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { waitForMarkTide, renderMarkdown, setTheme } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const paragraph = 'This guide keeps priorities and names together while checking every step. The document keeps its existing reading width, text size and spacing as the window becomes wider.';
const source = '# DSA Practical 8: Heaps and HeapSort\n\n## Complete viva revision guide\n\n' + paragraph
  + '\n\n**Verified result: all test cases passed.**\n\n'
  + Array.from({ length: 18 }, (_, i) => `## Section ${i + 1}\n\n${paragraph}\n\n`
    + '| File | Purpose |\n| --- | --- |\n| Heap.java | Keeps the heap in order. |\n\n'
    + '```text\nPriority: 90 60 80 20 40 70 50\n```\n\n').join('');

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect.getTiming().iterations))
      .map(a => a.finished.catch(() => {})));
  });
}

async function setup(page, context, info, theme, width) {
  await installStandaloneCdnMirror(context);
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await setTheme(page, theme);
  await renderMarkdown(page, source);
  await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
  await settle(page);
  const downloading = page.waitForEvent('download');
  await page.evaluate(() => window.MarkTideImportExport.exportAsHTML());
  const file = info.outputPath('document.html');
  await (await downloading).saveAs(file);
  const html = fs.readFileSync(file, 'utf8');
  const exported = await context.newPage();
  await exported.setViewportSize({ width, height: 1000 });
  await exported.route('**/placement-export.html', route => route.fulfill({ body: html, contentType: 'text/html' }));
  await exported.goto(new URL('/placement-export.html', page.url()).href);
  await settle(exported);
  return exported;
}

async function pin(page) {
  await page.locator('.marktide-heading-rail').hover();
  await page.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
  await page.mouse.move(0, 0);
  await settle(page);
}

async function measure(page) {
  return page.locator('.markdown-body').evaluate(article => {
    const rect = article.getBoundingClientRect(), css = getComputedStyle(article);
    const parent = article.parentElement, bounds = parent.getBoundingClientRect(), style = getComputedStyle(parent);
    const left = element => element?.getBoundingClientRect().left ?? null;
    return { x: rect.left, width: rect.width, height: rect.height, margin: parseFloat(css.marginLeft),
      available: parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      max: parseFloat(css.maxWidth), font: css.fontSize, padding: css.padding,
      rail: left(document.querySelector('.marktide-outline')), panel: left(document.querySelector('.marktide-toc')),
      header: left(document.querySelector('.app-header')), surface: bounds.left,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      blocks: [...article.querySelectorAll('h1,h2,p,table,.enhanced-code-block')].map(node => {
        const r = node.getBoundingClientRect(), s = getComputedStyle(node);
        return { x: r.left - rect.left, y: r.top - rect.top, width: r.width, height: r.height, font: s.fontSize, line: s.lineHeight };
      }) };
  });
}

async function screenshot(page, name) {
  const folder = process.env.MARKTIDE_PINNED_REVIEW_DIR;
  if (!folder) return;
  fs.mkdirSync(folder, { recursive: true });
  await page.screenshot({ path: path.join(folder, name + '.png'), animations: 'disabled' });
}

function sameDocument(a, b) {
  for (const key of ['width', 'height']) expect(b[key], key).toBeCloseTo(a[key], 0);
  expect(b.font).toBe(a.font);
  expect(b.padding).toBe(a.padding);
  expect(b.blocks).toEqual(a.blocks);
}

for (const theme of ['light', 'dark']) {
  for (const width of [1081, 1280, 1440, 1600, 1920, 2560, 3440]) {
    test(`bounded pinned document placement at ${width}px in ${theme}`, async ({ page, context }, info) => {
      const exported = await setup(page, context, info, theme, width);
      const unpinned = await measure(page), originalExport = await measure(exported);
      await screenshot(page, `${theme}-${width}-unpinned-preview`);
      await screenshot(exported, `${theme}-${width}-unpinned-export`);
      for (const target of [page, exported]) await pin(target);
      const preview = await measure(page), html = await measure(exported);
      await screenshot(page, `${theme}-${width}-pinned-preview`);
      await screenshot(exported, `${theme}-${width}-pinned-export`);
      for (const m of [preview, html]) {
        const shift = Math.min(160, Math.max(0, (m.available - 262 - m.max - 64) / 3));
        expect(m.margin).toBeCloseTo(262 + shift, 0);
        expect(m.x - m.panel - 262).toBeLessThanOrEqual(180.5);
        expect(m.overflow).toBeLessThanOrEqual(1);
      }
      expect(html.x).toBeCloseTo(preview.x, 0);
      expect(html.rail).toBeCloseTo(preview.rail, 0);
      expect(html.panel).toBeCloseTo(preview.panel, 0);
      expect(preview.header).toBe(unpinned.header);
      sameDocument(preview, html);
      if (preview.width === unpinned.width) sameDocument(unpinned, preview);
      for (const target of [page, exported]) {
        await target.evaluate(() => scrollTo(0, 1400));
        await settle(target);
        const scrolled = await measure(target);
        expect(scrolled.x).toBeCloseTo(preview.x, 0);
        expect(scrolled.panel).toBeCloseTo(preview.panel, 0);
        const corner = await target.getByRole('button', { name: 'Back to top', exact: true }).boundingBox();
        expect(corner.x + corner.width).toBeCloseTo(scrolled.x + scrolled.width - 16, 0);
        await screenshot(target, `${theme}-${width}-pinned-${target === page ? 'preview' : 'export'}-scrolled`);
        await target.getByRole('button', { name: 'Unpin table of contents', exact: true }).click();
        await target.keyboard.press('Escape');
        await settle(target);
        const restored = await measure(target);
        expect(restored.x).toBeCloseTo((target === page ? unpinned : originalExport).x, 0);
      }
      await exported.close();
    });
  }

  test(`pinned placement grows continuously and keeps navigation anchored in ${theme}`, async ({ page, context }, info) => {
    test.setTimeout(120_000);
    const exported = await setup(page, context, info, theme, 1280);
    for (const target of [page, exported]) {
      await pin(target);
      const anchor = await measure(target);
      const outerSpace = 1280 - anchor.available;
      const start = Math.round(262 + anchor.max + 64 + outerSpace);
      const end = start + 480;
      let previous = null;
      for (const width of [1240, 1280, start - 1, start, start + 1, 1440, 1600,
        end - 1, end, end + 1, 1920, 2560, 3440, 1920, 1280]) {
        await target.setViewportSize({ width, height: 1000 });
        await settle(target);
        const current = await measure(target);
        expect(current.rail).toBeCloseTo(anchor.rail, 0);
        expect(current.panel).toBeCloseTo(anchor.panel, 0);
        expect(current.header).toBe(anchor.header);
        expect(current.overflow).toBeLessThanOrEqual(1);
        const shift = Math.min(160, Math.max(0, (current.available - 262 - current.max - 64) / 3));
        expect(current.margin).toBeCloseTo(262 + shift, 0);
        if (previous && Math.abs(width - previous.width) <= 2)
          expect(Math.abs(current.x - previous.x)).toBeLessThanOrEqual(1);
        previous = { width, x: current.x };
      }
    }
    await exported.close();
  });
}
