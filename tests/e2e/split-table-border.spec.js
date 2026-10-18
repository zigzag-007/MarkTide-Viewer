const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');
const source = require('../helpers/split-table-example');

test.beforeEach(() => {
  for (const command of ['pdftotext', 'pdftoppm', 'pdffonts']) {
    const probe = spawnSync(command, ['-v']);
    test.skip(probe.error?.code === 'ENOENT', `Install Poppler ${command} for real PDF edge checks`);
    expect(probe.status, probe.error?.message || probe.stderr?.toString()).toBe(0);
  }
});

function words(pdf) {
  const result = spawnSync('pdftotext', ['-bbox', '-', '-'], { input: pdf, encoding: 'utf8' });
  expect(result.status).toBe(0);
  return [...result.stdout.matchAll(/<page[^>]*>([\s\S]*?)<\/page>/g)]
    .map(page => (page[1].match(/<word[^>]*>[^<]*<\/word>/g) || []).sort());
}

function bottomBorderCoverage(pdf, pageNumber = 1) {
  const result = spawnSync('pdftoppm', ['-f', String(pageNumber), '-l', String(pageNumber), '-singlefile', '-r', '144', '-'], { input: pdf, maxBuffer: 16 * 1024 * 1024 });
  expect(result.status, result.stderr.toString()).toBe(0);
  const buffer = result.stdout;
  const header = buffer.toString('ascii', 0, 100).match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
  expect(header).not.toBeNull();
  const width = Number(header[1]);
  const height = Number(header[2]);
  const offset = header[0].length;
  // Require a full line inside the cut, not a clipped hairline at its edge.
  const edge = height - Math.round(0.56 * 144);
  let coverage = 0;
  for (let y = edge - 24; y <= edge - 1; y += 1) {
    let painted = 0;
    for (let x = 70; x < width - 70; x += 1) {
      const pixel = offset + (y * width + x) * 3;
      if ([0, 1, 2].every(channel => Math.abs(buffer[pixel + channel] - 224) <= 10)) painted += 1;
    }
    coverage = Math.max(coverage, painted / (width - 140));
  }
  return coverage;
}

for (const separateHeaders of [false, true, 'expanded']) {
  test(`split table closes the page edge without changing text geometry or pagination (${separateHeaders === 'expanded' ? 'expanded supplied table' : separateHeaders ? 'separate headers' : 'exact supplied header'})`, async ({ page, context, baseURL }, testInfo) => {
    await page.goto('/index.html');
    await waitForMarkTide(page);
    const example = separateHeaders === 'expanded' ? require('../helpers/split-table-expanded-example') : separateHeaders ? source.replace(
      '| Case / sourceOrigin and methodExpected security outcomeV1 actualV2 actualInterpretationEvidence | | | | | | |',
      '| Case / source | Origin and method | Expected security outcome | V1 actual | V2 actual | Interpretation | Evidence |'
    ) : source;
    await renderMarkdown(page, `${separateHeaders === 'expanded' ? '' : 'Preceding report content.\n\n'.repeat(8)}${example}`);
    const preparation = await capturePdfPreparation(page, 'Split table', { includeDocumentHtml: true });
    const printed = await context.newPage();
    try {
      await printed.goto('/index.html');
      await printed.setViewportSize({ width: 709, height: 1018 });
      await printed.emulateMedia({ media: 'print' });
      await printed.setContent(`<!DOCTYPE html>${preparation.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`)}`);
      await printed.evaluate(() => document.fonts.ready);
      expect(await printed.evaluate(() => document.fonts.check('14px Inter'))).toBe(true);
      const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
        path: process.env.MARKTIDE_SPLIT_REVIEW_DIR ? path.join(process.env.MARKTIDE_SPLIT_REVIEW_DIR, `after-${separateHeaders === 'expanded' ? 'expanded' : separateHeaders ? 'headers' : 'exact'}.pdf`) : undefined });
      await testInfo.attach('split-table.pdf', { body: pdf, contentType: 'application/pdf' });
      const fonts = spawnSync('pdffonts', ['-'], { input: pdf, encoding: 'utf8' });
      expect(fonts.status).toBe(0);
      expect(fonts.stdout).toContain('Inter');
      expect(fonts.stdout).toContain('FiraCode');
      const text = spawnSync('pdftotext', ['-layout', '-', '-'], { input: pdf, encoding: 'utf8' });
      expect(text.status).toBe(0);
      expect(text.stdout.split('\f').filter(value => value.trim())).toHaveLength(separateHeaders === 'expanded' ? 6 : 2);
      const baselineStyle = await printed.addStyleTag({ content: `.marktide-print-fragment-edge,
        .marktide-print-fragment-edge > table > :is(thead, tbody, tfoot) { outline: none !important; }` });
      const baseline = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
        path: process.env.MARKTIDE_SPLIT_REVIEW_DIR ? path.join(process.env.MARKTIDE_SPLIT_REVIEW_DIR, `before-${separateHeaders === 'expanded' ? 'expanded' : separateHeaders ? 'headers' : 'exact'}.pdf`) : undefined });
      await baselineStyle.evaluate(element => element.remove());
      expect(bottomBorderCoverage(baseline)).toBeLessThan(0.2);
      expect(bottomBorderCoverage(pdf)).toBeGreaterThan(0.95);
      if (separateHeaders === 'expanded') {
        for (let pageNumber = 2; pageNumber <= 5; pageNumber += 1) {
          expect(bottomBorderCoverage(pdf, pageNumber), `page ${pageNumber} bottom edge`).toBeGreaterThan(0.95);
        }
      }
      expect(words(pdf)).toEqual(words(baseline));
      await expect(printed.locator('div.marktide-print-fragment-edge')).toHaveCount(1);
      const repeated = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
      expect(words(repeated)).toEqual(words(pdf));
      await expect(printed.locator('tfoot.marktide-print-fragment-edge')).toHaveCount(0);
      await expect(printed.locator('div.marktide-print-fragment-edge')).toHaveCount(1);
      await expect(page.locator('.marktide-print-fragment-edge')).toHaveCount(0);
    } finally { await printed.close(); }
  });
}

test('small tables and authored footers keep their cells, text and pagination', async ({ page, context, baseURL }) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  const authoredGrid = `<table><thead><tr><th>Case</th><th>Method</th><th>Outcome</th><th>Status</th><th>Evidence</th></tr></thead><tbody><tr><td>Large</td><td>${'Tall explanatory text remains readable<br>'.repeat(40)}</td><td>Alert</td><td>MATCH</td><td>Figure 1</td></tr></tbody><tfoot><tr><td>Original footer</td><td>Method summary</td><td>Outcome summary</td><td>Status summary</td><td>Evidence summary</td></tr></tfoot></table>`;
  await renderMarkdown(page, `| Name | Value |\n| --- | --- |\n| Small | Unchanged |\n\n${authoredGrid}`);
  const preparation = await capturePdfPreparation(page, 'Footer review', { includeDocumentHtml: true });
  const printed = await context.newPage();
  try {
    await printed.goto('/index.html');
    await printed.emulateMedia({ media: 'print' });
    await printed.setContent(`<!DOCTYPE html>${preparation.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`)}`);
    await printed.evaluate(() => document.fonts.ready);
    const cells = () => printed.locator('td').evaluateAll(elements => elements.map(cell => ({
      text: cell.textContent, span: [cell.colSpan, cell.rowSpan], padding: getComputedStyle(cell).padding,
      size: getComputedStyle(cell).fontSize, width: cell.getBoundingClientRect().width
    })));
    const before = await cells();
    await expect(printed.locator('table.marktide-print-content-table')).toHaveCount(1);
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(await cells()).toEqual(before);
    await expect(printed.locator('.marktide-print-fragment-edge')).toHaveCount(2);
    await expect(printed.locator('tfoot')).toHaveCount(1);
    await expect(printed.locator('tfoot')).toContainText('Original footer');
    const result = spawnSync('pdftotext', ['-raw', '-', '-'], { input: pdf, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Original\s+footer/);
    await printed.addStyleTag({ content: `.marktide-print-fragment-edge,
      .marktide-print-fragment-edge > table > :is(thead, tbody, tfoot) { outline: none !important; }` });
    const baseline = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(words(pdf)).toEqual(words(baseline));
  } finally { await printed.close(); }
});
