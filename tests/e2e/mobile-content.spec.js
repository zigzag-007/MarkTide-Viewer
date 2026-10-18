const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { small, reportAppendix, mobileProse } = require('../helpers/screen-tables');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');
const { loadFixture } = require('../helpers/fixture-loader');

const code = `const status = "ready";
const evidence = "https://example.com/evidence/historical_validation/long_reference_with_many_values.json";
console.log(status, evidence);`;
const source = `# Mobile rendering review

${small}

## Service checks

| Service | State | Count | Note |
| --- | --- | ---: | --- |
| Discovery | NO MATCH | 66 | Verified event data |
| Authentication | MATCH | 109 | Historical validation |

## Code sample

\`\`\`javascript
${code}
\`\`\`

${reportAppendix}`;

async function setup(page, context) {
  await installStandaloneCdnMirror(context);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, source);
  await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
  await page.locator('#close-dropzone').click();
}

async function metrics(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.querySelector('.markdown-body').getAnimations({ subtree: true })
      .filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
      .map(animation => animation.finished.catch(() => {})));
  });
  return page.locator('.markdown-body').evaluate(article => {
    const pick = element => {
      const css = getComputedStyle(element);
      return Object.fromEntries(['fontSize', 'lineHeight', 'padding', 'borderRadius', 'boxShadow',
        'marginTop', 'marginBottom', 'whiteSpace', 'color', 'backgroundColor'].map(key => [key, css[key]]));
    };
    const tables = [...article.querySelectorAll('table')].map(table => ({
      ...pick(table), width: table.getBoundingClientRect().width,
      rows: [...table.rows].map(row => row.getBoundingClientRect().height),
      cells: [...table.querySelectorAll('th,td')].map(pick),
    }));
    const block = article.querySelector('.enhanced-code-block');
    return { font: getComputedStyle(article).fontSize,
      overflow: article.scrollWidth - article.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tables, block: pick(block), pre: pick(block.querySelector('pre')),
      code: pick(block.querySelector('code')), header: pick(block.querySelector('.code-block-header')),
      headings: [...article.querySelectorAll('h1,h2')].map(pick),
      columns: article.querySelectorAll('col').length,
    };
  });
}

for (const theme of ['light', 'dark']) {
  test(`mobile tables and code match fresh HTML in ${theme}`, async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);
    await setup(page, context);
    await setTheme(page, theme);
    const html = await captureHtmlExport(page);
    const exported = await context.newPage();
    try {
      await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
      for (const width of [320,390,430,768,1024,1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const current = await metrics(page);
        const articleWidth = await page.locator('.markdown-body').evaluate(el => el.getBoundingClientRect().width);
        await exported.setViewportSize({ width: Math.round(articleWidth), height: 1000 });
        await exported.evaluate(width => { document.body.style.width = `${width}px`; }, articleWidth);
        const fresh = await metrics(exported);
        expect(fresh).toEqual(current);
        expect(current.overflow).toBeLessThanOrEqual(1);
        expect(current.pageOverflow).toBeLessThanOrEqual(1);
        expect(current.tables[0].fontSize).toBe(current.font);
        expect(current.tables[0].cells[0].padding).toBe('6px 13px');
        if (width <= 430) {
          expect(current.tables[1].fontSize).toBe('14px');
          expect(current.tables[2].fontSize).toBe('14px');
          expect(current.tables[1].cells[0].padding).toBe('6px 8px');
          expect(current.pre.fontSize).toBe('13px');
          expect(current.code.fontSize).toBe('13px');
          expect(current.pre.padding).toBe('12px');
          expect(current.block.borderRadius).toBe('8px');
          const statusCell = page.locator('.marktide-table-scroll').nth(1).locator('td').nth(1);
          await expect(statusCell).toHaveCSS('white-space', 'nowrap');
          for (const surface of [page, exported]) {
            const shortCodes = await surface.locator('table .marktide-screen-short-code').evaluateAll(codes =>
              codes.map(code => {
                const range = document.createRange();
                range.selectNodeContents(code);
                return new Set([...range.getClientRects()].map(rect => rect.top)).size;
              }));
            expect(shortCodes.length).toBeGreaterThan(10);
            expect(shortCodes.every(lines => lines === 1)).toBe(true);
          }
        } else if (width >= 1024) {
          expect(current.tables[1].fontSize).toBe(current.font);
          expect(current.pre.padding).toBe('16px');
          expect(current.block.borderRadius).toBe('12px');
        }
        await expect(page.locator('.enhanced-code-block pre code')).toHaveText(code);
        await expect(exported.locator('.enhanced-code-block pre code')).toHaveText(code);
      }
    } finally { await exported.close(); }
  });
}

test('mobile code supports touch, keyboard, wrapping and exact copying', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 },
    hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  try {
    await setup(page, context);
    const html = await captureHtmlExport(page);
    const exported = await context.newPage();
    await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
    for (const surface of [page, exported]) {
      const block = surface.locator('.enhanced-code-block');
      const pre = block.locator('pre');
      await expect(block.locator('.copy-code-btn')).toHaveCSS('width', '44px');
      await expect(block.locator('.wrap-code-btn')).toHaveCSS('height', '44px');
      await expect(pre).toHaveAttribute('tabindex', '0');
      await pre.focus();
      await surface.keyboard.press('ArrowRight');
      await expect.poll(() => pre.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      await block.locator('.wrap-code-btn').tap();
      await expect(block).toHaveClass(/is-wrapped/);
      expect(await pre.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await expect(block.locator('code')).toHaveText(code);
      await block.locator('.wrap-code-btn').tap();
      await expect(block).not.toHaveClass(/is-wrapped/);
      await block.locator('.copy-code-btn').tap();
      await expect(block.locator('.copy-code-btn')).toHaveClass(/copied/);
      await expect(block.locator('code')).toHaveText(code);
    }
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
  } finally { await context.close(); }
});

test('report prose columns stay readable without changing small tables', async ({ page, context, baseURL }) => {
  await setup(page, context);
  await renderMarkdown(page, mobileProse);
  const html = await captureHtmlExport(page);
  const exported = await context.newPage();
  try {
    await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
    for (const width of [320, 390, 430, 768, 1440]) {
      for (const surface of [page, exported]) {
        await surface.setViewportSize({ width, height: 900 });
        await surface.evaluate(() => document.fonts.ready);
        const sizes = await surface.locator('.marktide-table-scroll').evaluateAll(wrappers =>
          wrappers.map(wrapper => {
            const table = wrapper.querySelector('table');
            return { scroll: wrapper.scrollWidth - wrapper.clientWidth,
              font: getComputedStyle(table).fontSize,
              padding: getComputedStyle(table.querySelector('td')).padding,
              rows: [...table.rows].map(row => row.getBoundingClientRect().height),
              columns: [...table.rows[0].cells].map(cell => cell.getBoundingClientRect().width) };
          }));
        if (width <= 430) {
          expect(sizes[0].scroll).toBeGreaterThan(0);
          expect(sizes[1].scroll).toBeGreaterThan(0);
          expect(sizes[0].rows[1]).toBeLessThan(250);
          expect(sizes[1].rows[2]).toBeLessThan(350);
          expect(sizes[1].columns[3]).toBeGreaterThan(150);
          expect(sizes[0].font).toBe('14px');
          expect(sizes[1].font).toBe('14px');
          expect(sizes[2].font).toBe('16px');
        }
        expect(sizes[2].scroll).toBe(0);
        expect(sizes[2].padding).toBe('6px 13px');
        await expect(surface.locator('table').last()).not.toHaveClass(/marktide-screen-compact/);
        expect(await surface.evaluate(() => document.documentElement.scrollWidth
          - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      }
    }
  } finally { await exported.close(); }
});

test('table scroll hints follow overflow, resizing, details and cleanup', async ({ page, context, baseURL }) => {
  await setup(page, context);
  const html = await captureHtmlExport(page);
  const exported = await context.newPage();
  try {
    await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
    for (const surface of [page, exported]) {
      await surface.setViewportSize({ width: 390, height: 900 });
      const smallTable = surface.locator('.marktide-table-scroll').first();
      const wide = surface.locator('.marktide-table-scroll').last();
      await expect(smallTable).toHaveAttribute('data-marktide-scroll-state', 'none');
      await expect(wide).toHaveAttribute('data-marktide-scroll-state', 'start');
      await expect(wide).toHaveAttribute('data-marktide-scroll-hint', /more columns/);
      expect(await wide.evaluate(el => getComputedStyle(el, '::before').display)).toBe('block');
      await wide.evaluate(el => { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; });
      await expect(wide).toHaveAttribute('data-marktide-scroll-state', 'middle');
      await wide.evaluate(el => { el.scrollLeft = el.scrollWidth; });
      await expect(wide).toHaveAttribute('data-marktide-scroll-state', 'end');
      await surface.setViewportSize({ width: 1440, height: 900 });
      await expect(wide).toHaveAttribute('data-marktide-scroll-state', 'none');
      expect(await wide.evaluate(el => getComputedStyle(el, '::before').display)).toBe('none');
      await surface.emulateMedia({ media: 'print' });
      expect(await wide.evaluate(el => getComputedStyle(el, '::before').display)).toBe('none');
      await surface.emulateMedia({ media: 'screen' });
    }
    await renderMarkdown(page, `<details><summary>Open table</summary>\n\n${reportAppendix}\n\n</details>`);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('summary').click();
    await expect(page.locator('.marktide-table-scroll')).toHaveAttribute('data-marktide-scroll-state', 'start');
    await renderMarkdown(page, small);
    await expect(page.locator('.marktide-table-scroll')).toHaveAttribute('data-marktide-scroll-state', 'none');
    await page.evaluate(() => { window.MarkTideTableScroll.destroy(); window.MarkTideTableScroll.init(); });
    await expect(page.locator('.marktide-table-scroll')).toHaveAttribute('data-marktide-scroll-state', 'none');
  } finally { await exported.close(); }
});

test('mobile visual comparison artifacts', async ({ page, context, baseURL }) => {
  test.skip(!process.env.MARKTIDE_MOBILE_REVIEW_DIR, 'Optional manual review artifacts');
  test.setTimeout(120_000);
  await setup(page, context);
  const directory = process.env.MARKTIDE_MOBILE_REVIEW_DIR;
  const phase = process.env.MARKTIDE_MOBILE_REVIEW_PHASE || 'after';
  for (const theme of ['light','dark']) {
    await setTheme(page, theme);
    const html = await captureHtmlExport(page);
    fs.writeFileSync(`${directory}/${phase}-${theme}.html`, html);
    for (const width of [390,768,1440]) {
      await page.setViewportSize({ width, height: 1100 });
      const current = await metrics(page);
      if (phase === 'after' && fs.existsSync(`${directory}/before-${theme}-${width}.json`)) {
        const baseline = JSON.parse(fs.readFileSync(`${directory}/before-${theme}-${width}.json`, 'utf8'));
        expect(current.headings).toEqual(baseline.headings);
        expect(current.tables[0]).toEqual(baseline.tables[0]);
        if (width >= 768) {
          expect(current.tables).toEqual(baseline.tables);
          // Compare settled styles, not the earlier resize transition snapshot.
          const oldRules = await page.addStyleTag({ content: `
            .markdown-body .enhanced-code-block pre { padding:16px; font-size:85%; line-height:1.45; }
            .markdown-body .enhanced-code-block pre code { font-size:inherit; }
          ` });
          const settledBaseline = await metrics(page);
          expect(current.pre).toEqual(settledBaseline.pre);
          expect(current.code).toEqual(settledBaseline.code);
          await oldRules.evaluate(element => element.remove());
        } else {
          expect(current.code.color).toBe(baseline.code.color);
          expect(current.tables[1].rows[1]).toBeLessThan(baseline.tables[1].rows[1]);
        }
      }
      fs.writeFileSync(`${directory}/${phase}-${theme}-${width}.json`, JSON.stringify(current));
      await page.locator('#markdown-preview').screenshot({ path: `${directory}/${phase}-${theme}-${width}.png` });
    }
  }
  const prepared = await capturePdfPreparation(page, 'Mobile print isolation', { includeDocumentHtml: true });
  const printed = await context.newPage();
  try {
    await printed.emulateMedia({ media: 'print' });
    await printed.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`));
    await printed.evaluate(() => document.fonts.ready);
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true, path: `${directory}/${phase}-code.pdf` });
    const geometry = input => {
      const text = spawnSync('pdftotext', ['-bbox', '-', '-'], { input, encoding: 'utf8' });
      expect(text.status).toBe(0);
      return text.stdout.replace(/<head>[\s\S]*?<\/head>/, '');
    };
    await printed.evaluate(() => {
      for (const sheet of document.styleSheets) {
        if (sheet.ownerNode.tagName !== 'STYLE') continue;
        for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
          if (sheet.cssRules[index].media?.mediaText.startsWith('screen')) sheet.deleteRule(index);
        }
      }
    });
    const withoutScreenRules = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(geometry(pdf)).toBe(geometry(withoutScreenRules));
    if (phase === 'after' && fs.existsSync(`${directory}/before-code.pdf`)) {
      expect(geometry(pdf)).toBe(geometry(fs.readFileSync(`${directory}/before-code.pdf`)));
    }
  } finally { await printed.close(); }
});

test('mobile code fixture keeps all source, highlighting and local scrolling', async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  await setup(page, context);
  await renderMarkdown(page, loadFixture('04_syntax_highlighting.md'));
  const original = await page.locator('.enhanced-code-block code').allTextContents();
  expect(original.length).toBeGreaterThan(20);
  const html = await captureHtmlExport(page);
  const exported = await context.newPage();
  try {
    await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
    for (const width of [320,390,430,768]) {
      for (const surface of [page, exported]) {
        await surface.setViewportSize({ width, height: 900 });
        expect(await surface.locator('.enhanced-code-block code').allTextContents()).toEqual(original);
        expect(await surface.locator('code.hljs span').count()).toBeGreaterThan(100);
        const overflow = await surface.locator('.markdown-body').evaluate(article => ({
          article: article.scrollWidth - article.clientWidth,
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          blocks: [...article.querySelectorAll('.enhanced-code-block')]
            .filter(block => block.getBoundingClientRect().right > article.getBoundingClientRect().right + 1).length,
        }));
        expect(overflow.article).toBeLessThanOrEqual(1);
        expect(overflow.page).toBeLessThanOrEqual(1);
        expect(overflow.blocks).toBe(0);
      }
    }
  } finally { await exported.close(); }
});

test('real report tables and code remain readable across screen widths', async ({ page, context, baseURL }) => {
  test.skip(!process.env.MARKTIDE_REPORT_SOURCE, 'Optional user report workflow check');
  test.setTimeout(180_000);
  const report = fs.readFileSync(path.resolve(__dirname, '../..', process.env.MARKTIDE_REPORT_SOURCE), 'utf8');
  await setup(page, context);
  await renderMarkdown(page, report);
  const codes = await page.locator('.enhanced-code-block code').allTextContents();
  expect(codes.length).toBeGreaterThan(5);
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    const html = await captureHtmlExport(page);
    if (process.env.MARKTIDE_MOBILE_REVIEW_DIR) {
      const filename = `${process.env.MARKTIDE_MOBILE_REVIEW_DIR}/report-${theme}.html`;
      fs.writeFileSync(filename, html.replace('<head>', `<head><base href="${baseURL}/">`));
    }
    const exported = await context.newPage();
    try {
      await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
      for (const width of [320,390,430,768,1024,1440]) {
        await page.setViewportSize({ width, height: 900 });
        await metrics(page);
        const articleWidth = await page.locator('.markdown-body').evaluate(el => el.getBoundingClientRect().width);
        await exported.setViewportSize({ width: Math.round(articleWidth), height: 900 });
        await exported.evaluate(width => { document.body.style.width = `${width}px`; }, articleWidth);
        await metrics(exported);
        const measureReport = async surface => surface.locator('.markdown-body').evaluate(article => ({
          overflow: article.scrollWidth - article.clientWidth,
          tables: [...article.querySelectorAll('table')].map(table => ({
            width: table.getBoundingClientRect().width,
            rows: [...table.rows].map(row => row.getBoundingClientRect().height),
            font: getComputedStyle(table).fontSize,
            text: table.textContent,
            cellOverflow: [...table.querySelectorAll('th,td')].flatMap(cell => {
              const range = document.createRange();
              range.selectNodeContents(cell);
              const box = cell.getBoundingClientRect();
              return [...range.getClientRects()].filter(rect => rect.width > 0
                && (rect.left < box.left - 1 || rect.right > box.right + 1));
            }).length,
          })),
        }));
        const preview = await measureReport(page);
        const fresh = await measureReport(exported);
        expect(preview.overflow).toBeLessThanOrEqual(1);
        expect(fresh.overflow).toBeLessThanOrEqual(1);
        expect(fresh.tables).toEqual(preview.tables);
        preview.tables.forEach(table => expect(table.cellOverflow).toBe(0));
        if (width <= 430) {
          expect(preview.tables[0].rows[1]).toBeLessThan(250);
          expect(preview.tables[3].rows[2]).toBeLessThan(350);
          const splitWords = await page.locator('table').first().evaluate(table =>
            [...table.querySelectorAll('strong')].flatMap(strong => {
              const walker = document.createTreeWalker(strong, NodeFilter.SHOW_TEXT);
              const broken = [];
              while (walker.nextNode()) {
                const node = walker.currentNode;
                for (const match of node.textContent.matchAll(/[A-Za-z]+/g)) {
                  const range = document.createRange();
                  range.setStart(node, match.index);
                  range.setEnd(node, match.index + match[0].length);
                  if (range.getClientRects().length > 1) broken.push(match[0]);
                }
              }
              return broken;
            }));
          expect(splitWords).toEqual([]);
        }
        expect(await exported.locator('.enhanced-code-block code').allTextContents()).toEqual(codes);
        if (process.env.MARKTIDE_MOBILE_REVIEW_DIR && [390,768,1440].includes(width)) {
          const directory = process.env.MARKTIDE_MOBILE_REVIEW_DIR;
          fs.writeFileSync(`${directory}/report-${theme}-${width}.json`, JSON.stringify(preview));
          for (const [label, locator] of [
            ['hypotheses', page.locator('.marktide-table-scroll').nth(0)],
            ['summary', page.locator('.marktide-table-scroll').nth(2)],
            ['code', page.locator('.enhanced-code-block').nth(3)],
            ['appendix', page.locator('.marktide-table-scroll').last()],
          ]) {
            await locator.scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${directory}/report-${theme}-${width}-${label}.png` });
          }
        }
      }
      await page.setViewportSize({ width: 1100, height: 900 });
      await page.evaluate(() => window.MarkTideViewManager.setView('split'));
      await metrics(page);
      const splitWidth = await page.locator('.markdown-body').evaluate(el => el.getBoundingClientRect().width);
      await exported.setViewportSize({ width: Math.round(splitWidth), height: 900 });
      await exported.evaluate(width => { document.body.style.width = `${width}px`; }, splitWidth);
      expect(await metrics(exported)).toEqual(await metrics(page));
      await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
    } finally { await exported.close(); }
  }
});
