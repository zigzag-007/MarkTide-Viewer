const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { waitForMarkTide, renderMarkdown, setTheme } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const widths = [320, 375, 390, 430, 600, 601, 767, 768, 769, 810, 1024, 1080, 1081, 1280, 1440, 1920];
const paragraph = 'This guide explains the submitted files and their matching data. The files work together to build a heap, sort the entries and save the results. Keep priorities and names together while checking every step.';
const source = '# DSA Practical 8: Heaps and HeapSort\n\n## Complete viva revision guide\n\n'
  + paragraph + '\n\n**Verified result: all test cases passed.** The dataset contains 7,000 rows.\n\n'
  + Array.from({ length: 24 }, (_, i) => `## Section ${i + 1}: ${i % 2 ? 'Compile and run the test harness' : 'Give one simple sentence for each file'}\n\n`
    + paragraph + '\n\n| File | One sentence to say |\n| --- | --- |\n'
    + '| `Practical8TestHarness.java` | Checks the data structure, sorting, file handling and error cases. |\n'
    + '| `RandomNames7000(1).csv` | Stores 7,000 priority and name pairs. |\n\n'
    + '```bash\njavac DSAHeapEntry.java DSAHeap.java HeapFileIO.java HeapMenu.java Practical8TestHarness.java\n```\n\n').join('');
const review = process.env.MARKTIDE_LAYOUT_REVIEW_DIR;
test.describe.configure({ mode: 'parallel' });

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all([...document.getAnimations()].filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
      .map(animation => animation.finished.catch(() => {})));
  });
}

async function setup(page, context, theme, width, testInfo, height = 1024) {
  await installStandaloneCdnMirror(context);
  await page.setViewportSize({ width, height });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await setTheme(page, theme);
  await renderMarkdown(page, source);
  await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
  await settle(page);
  const downloading = page.waitForEvent('download');
  await page.evaluate(() => window.MarkTideImportExport.exportAsHTML());
  const file = testInfo.outputPath('document.html');
  await (await downloading).saveAs(file);
  const html = fs.readFileSync(file, 'utf8');
  const exported = await context.newPage();
  const errors = [];
  exported.on('pageerror', error => errors.push(error.message));
  await exported.setViewportSize({ width, height });
  await exported.route('**/layout-export.html', route => route.fulfill({ body: html, contentType: 'text/html' }));
  await exported.goto(new URL('/layout-export.html', page.url()).href);
  await settle(exported);
  for (const target of [page, exported]) {
    await target.mouse.move(width - 2, 2);
    await target.keyboard.press('Escape');
    await expect(target.locator('.marktide-toc')).toBeHidden();
  }
  return { exported, html, errors };
}

async function openContents(page, width) {
  if (width < 768) await page.getByRole('button', { name: 'Table of contents', exact: true }).click();
  else {
    await page.locator('.marktide-heading-rail').hover();
    await expect(page.locator('.marktide-toc')).toBeVisible();
  }
  await settle(page);
}

async function pinContents(page, width) {
  await openContents(page, width);
  if (width >= 768) await page.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
  await settle(page);
}

async function metrics(page) {
  return page.locator('.markdown-body').evaluate(article => {
    const rect = article.getBoundingClientRect(), style = getComputedStyle(article);
    const pane = article.parentElement.getBoundingClientRect();
    const rail = document.querySelector('.marktide-heading-rail').getBoundingClientRect();
    const panel = document.querySelector('.marktide-toc').getBoundingClientRect();
    const box = node => { const r = node.getBoundingClientRect(), css = getComputedStyle(node);
      return { x: r.left - rect.left, y: r.top - rect.top, width: r.width, height: r.height,
        font: css.fontSize, line: css.lineHeight, color: css.color }; };
    return { x: rect.left, width: rect.width, padding: style.padding, max: style.maxWidth,
      inset: rect.top - pane.top, font: style.fontSize, line: style.lineHeight,
      blocks: [...article.querySelectorAll('h1,h2,p,table,.enhanced-code-block')].map(box),
      railLeft: rail.left, railWidth: rail.width, railRight: rail.right,
      panelLeft: panel.left, panelWidth: panel.width, panelRight: panel.right,
      expanded: article.parentElement.classList.contains('marktide-outline-expanded'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      contentLeft: rect.left + parseFloat(style.paddingLeft) };
  });
}

function sameLayout(preview, exported, width) {
  expect(exported.overflow).toBeLessThanOrEqual(1);
  expect(preview.overflow).toBeLessThanOrEqual(1);
  for (const field of ['x', 'width', 'inset']) expect(exported[field], field).toBeCloseTo(preview[field], 0);
  for (const field of ['padding', 'max', 'font', 'line', 'expanded']) expect(exported[field], field).toBe(preview[field]);
  expect(exported.blocks.length).toBe(preview.blocks.length);
  const differences = exported.blocks.flatMap((block, i) => ['x', 'y', 'width', 'height']
    .filter(field => Math.abs(block[field] - preview.blocks[i][field]) >= 0.5)
    .map(field => ({ block: i, field, preview: preview.blocks[i][field], export: block[field] })));
  expect(differences, 'Every document block keeps its position and size').toEqual([]);
  const styles = blocks => blocks.map(({ font, line, color }) => ({ font, line, color }));
  expect(styles(exported.blocks)).toEqual(styles(preview.blocks));
  if (width >= 768) {
    expect(exported.railLeft).toBeCloseTo(preview.railLeft, 0);
    expect(exported.contentLeft - exported.railRight).toBeGreaterThanOrEqual(16);
    if (exported.expanded) expect(exported.contentLeft - exported.panelRight).toBeGreaterThanOrEqual(16);
  }
}

async function capture(page, name) {
  if (!review) return;
  fs.mkdirSync(review, { recursive: true });
  await page.screenshot({ path: path.join(review, name + '.png'), animations: 'disabled' });
}

for (const theme of ['light', 'dark']) for (const width of widths) for (const pinned of [false, true]) {
  test(`preview and export match at ${width}px ${theme} ${pinned ? 'pinned' : 'unpinned'}`, async ({ page, context }, testInfo) => {
    test.setTimeout(90_000);
    const { exported, html, errors } = await setup(page, context, theme, width, testInfo);
    if (pinned) {
      await pinContents(page, width);
      await pinContents(exported, width);
    }
    for (const target of [page, exported]) {
      if (pinned) await expect(target.locator('.marktide-toc')).toBeVisible();
      else await expect(target.locator('.marktide-toc')).toBeHidden();
      await target.mouse.move(width - 2, 2);
      await settle(target);
    }
    const previewMetrics = await metrics(page), exportMetrics = await metrics(exported);
    await testInfo.attach('layout-measurements', { body: JSON.stringify({ preview: previewMetrics, export: exportMetrics }, null, 2), contentType: 'application/json' });
    sameLayout(previewMetrics, exportMetrics, width);
    if (pinned && width >= 768) {
      expect((await metrics(exported)).panelLeft).toBeCloseTo((await metrics(page)).panelLeft, 0);
    }
    if (width < 768 && pinned) {
      await expect(exported.getByRole('navigation', { name: 'Table of contents' })).toHaveCount(0);
      await expect(exported.getByRole('dialog', { name: 'Table of contents' })).toBeVisible();
      await page.keyboard.press('Escape');
      await exported.keyboard.press('Escape');
    }
    if ([390, 768, 810, 1280, 1920].includes(width)) {
      const name = `${theme}-${width}-${pinned ? 'pinned' : 'unpinned'}`;
      await capture(page, name + '-preview-top');
      await capture(exported, name + '-export-top');
      if (review) fs.writeFileSync(path.join(review, name + '.html'), html);
    }
    for (const fraction of [0.3, 0.7]) {
      for (const target of [page, exported]) {
        await target.evaluate(f => scrollTo(0, document.querySelector('.markdown-body').getBoundingClientRect().top
          + scrollY + document.querySelector('.markdown-body').scrollHeight * f), fraction);
        await target.mouse.move(width - 2, 2);
        await settle(target);
      }
      sameLayout(await metrics(page), await metrics(exported), width);
      const top = target => target.getByRole('button', { name: 'Back to top', exact: true }).boundingBox();
      const a = await top(page), b = await top(exported);
      expect(b.x).toBeCloseTo(a.x, 0);
      expect(b.y).toBeCloseTo(a.y, 0);
      expect(await exported.locator('.marktide-toc a[aria-current]').textContent())
        .toBe(await page.locator('.marktide-toc a[aria-current]').textContent());
    }
    if ([390, 768, 810, 1280, 1920].includes(width)) {
      await capture(page, `${theme}-${width}-${pinned}-preview-scrolled`);
      await capture(exported, `${theme}-${width}-${pinned}-export-scrolled`);
    }
    await exported.getByRole('button', { name: 'Back to top', exact: true }).focus();
    await exported.keyboard.press('Enter');
    await expect.poll(() => exported.evaluate(() => scrollY)).toBe(0);
    await expect(exported.locator('.markdown-body h1')).toBeFocused();
    expect(errors).toEqual([]);
    await exported.close();
  });
}

for (const theme of ['light', 'dark']) for (const [width, height] of [[844, 390], [1024, 768], [1080, 810], [1920, 1080]]) {
  test(`landscape layout at ${width}x${height} in ${theme}`, async ({ page, context }, testInfo) => {
    const { exported } = await setup(page, context, theme, width, testInfo, height);
    sameLayout(await metrics(page), await metrics(exported), width);
    for (const target of [page, exported]) await pinContents(target, width);
    sameLayout(await metrics(page), await metrics(exported), width);
    for (const target of [page, exported]) {
      await target.evaluate(() => scrollTo(0, document.querySelector('.markdown-body').scrollHeight / 2));
      await settle(target);
      const rail = await target.locator('.marktide-heading-rail').boundingBox();
      expect(rail.y).toBe(0);
      expect(rail.height).toBe(height);
      const corner = await target.getByRole('button', { name: 'Back to top', exact: true }).boundingBox();
      expect(corner.y + corner.height).toBe(height - 16);
    }
    await exported.close();
  });
}

for (const theme of ['light', 'dark']) {
  for (const width of [1280, 1920]) test(`visible corner follows pin changes at ${width}px in ${theme}`, async ({ page, context }, testInfo) => {
    const { exported } = await setup(page, context, theme, width, testInfo);
    for (const target of [page, exported]) {
      await target.evaluate(() => scrollTo(0, 1200));
      await expect(target.getByRole('button', { name: 'Back to top', exact: true })).toBeVisible();
      for (const pinned of [true, false]) {
        if (pinned) await pinContents(target, width);
        else {
          await target.getByRole('button', { name: 'Unpin table of contents', exact: true }).click();
          await target.keyboard.press('Escape');
        }
        await settle(target);
        const expected = await target.locator('.markdown-body').evaluate(article => article.getBoundingClientRect().right - 16);
        await expect.poll(async () => {
          const box = await target.getByRole('button', { name: 'Back to top', exact: true }).boundingBox();
          return box.x + box.width;
        }).toBeCloseTo(expected, 0);
      }
    }
    await exported.close();
  });

  test(`resize and pin transitions preserve layout in ${theme}`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000);
    const { exported } = await setup(page, context, theme, 1280, testInfo);
    await pinContents(page, 1280);
    await pinContents(exported, 1280);
    for (const width of [1920, 1081, 1080, 810, 768, 767, 390, 320, 810, 1280]) {
      for (const target of [page, exported]) {
        await target.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
        await settle(target);
      }
      sameLayout(await metrics(page), await metrics(exported), width);
      for (const target of [page, exported]) {
        const panel = await target.locator('.marktide-toc').boundingBox();
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.x + panel.width).toBeLessThanOrEqual(width);
      }
    }
    for (const target of [page, exported]) {
      await target.getByRole('button', { name: 'Unpin table of contents', exact: true }).click();
      await target.keyboard.press('Escape');
      await settle(target);
    }
    sameLayout(await metrics(page), await metrics(exported), 1280);
    await exported.close();
  });

  test(`keyboard heading navigation and mobile sheet match in ${theme}`, async ({ page, context }, testInfo) => {
    const { exported } = await setup(page, context, theme, 810, testInfo);
    for (const target of [page, exported]) {
      await openContents(target, 810);
      const link = target.locator('.marktide-toc a').nth(12);
      const label = await link.textContent();
      await link.focus();
      await target.keyboard.press('Enter');
      await expect(target.getByRole('heading', { name: label, exact: true })).toBeFocused();
      await expect(target.locator('.marktide-toc')).toBeHidden();
      const heading = await target.getByRole('heading', { name: label, exact: true }).boundingBox();
      expect(heading.x).toBeGreaterThanOrEqual(76);
      expect(heading.y).toBeGreaterThanOrEqual(0);
      await target.setViewportSize({ width: 390, height: 844 });
      await settle(target);
      await openContents(target, 390);
      await expect(target.getByRole('dialog', { name: 'Table of contents' })).toBeVisible();
      await expect(target.getByRole('button', { name: 'Pin table of contents', exact: true })).toBeHidden();
      await target.keyboard.press('Escape');
      await expect(target.locator('.marktide-toc')).toBeHidden();
      await expect(target.getByRole('button', { name: 'Table of contents', exact: true })).toBeFocused();
    }
    sameLayout(await metrics(page), await metrics(exported), 390);
    await exported.close();
  });
}
