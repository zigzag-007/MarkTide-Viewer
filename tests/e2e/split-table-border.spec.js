const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');
const source = require('../helpers/split-table-example');

test.beforeEach(() => {
  for (const command of ['pdftotext', 'pdftoppm']) {
    const probe = spawnSync(command, ['-v']);
    test.skip(probe.error?.code === 'ENOENT', `Install Poppler ${command} for real PDF edge checks`);
    expect(probe.status, probe.error?.message || probe.stderr?.toString()).toBe(0);
  }
});

function words(pdf) {
  const result = spawnSync('pdftotext', ['-bbox', '-', '-'], { input: pdf, encoding: 'utf8' });
  expect(result.status).toBe(0);
  return result.stdout.match(/<page[^>]*>|<word[^>]*>[^<]*<\/word>/g);
}

function bottomBorderCoverage(pdf) {
  const result = spawnSync('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-r', '144', '-'], { input: pdf, maxBuffer: 16 * 1024 * 1024 });
  expect(result.status, result.stderr.toString()).toBe(0);
  const buffer = result.stdout;
  const header = buffer.toString('ascii', 0, 100).match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
  expect(header).not.toBeNull();
  const width = Number(header[1]);
  const height = Number(header[2]);
  const offset = header[0].length;
  // Look at the real raster near the bottom A4 content edge, not DOM bounds.
  const edge = height - Math.round(0.55 * 144);
  let coverage = 0;
  for (let y = edge - 4; y <= edge + 2; y += 1) {
    let painted = 0;
    for (let x = 70; x < width - 70; x += 1) {
      const pixel = offset + (y * width + x) * 3;
      if (buffer[pixel] < 240 && buffer[pixel + 1] < 240 && buffer[pixel + 2] < 240) painted += 1;
    }
    coverage = Math.max(coverage, painted / (width - 140));
  }
  return coverage;
}

for (const separateHeaders of [false, true]) {
  test(`split table closes the page edge without changing text geometry or pagination (${separateHeaders ? 'separate headers' : 'exact supplied header'})`, async ({ page, context, baseURL }, testInfo) => {
    await page.goto('/index.html');
    await waitForMarkTide(page);
    const example = separateHeaders ? source.replace(
      '| Case / sourceOrigin and methodExpected security outcomeV1 actualV2 actualInterpretationEvidence | | | | | | |',
      '| Case / source | Origin and method | Expected security outcome | V1 actual | V2 actual | Interpretation | Evidence |'
    ) : source;
    await renderMarkdown(page, `${'Preceding report content.\n\n'.repeat(8)}${example}`);
    const preparation = await capturePdfPreparation(page, 'Split table', { includeDocumentHtml: true });
    const printed = await context.newPage();
    try {
      await printed.setViewportSize({ width: 709, height: 1018 });
      await printed.emulateMedia({ media: 'print' });
      await printed.setContent(`<!DOCTYPE html>${preparation.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`)}`);
      await printed.evaluate(() => document.fonts.ready);
      const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
        path: process.env.MARKTIDE_SPLIT_REVIEW_DIR ? path.join(process.env.MARKTIDE_SPLIT_REVIEW_DIR, `after-${separateHeaders ? 'headers' : 'exact'}.pdf`) : undefined });
      await testInfo.attach('split-table.pdf', { body: pdf, contentType: 'application/pdf' });
      const text = spawnSync('pdftotext', ['-layout', '-', '-'], { input: pdf, encoding: 'utf8' });
      expect(text.status).toBe(0);
      expect(text.stdout.split('\f').filter(value => value.trim())).toHaveLength(2);
      const baselineStyle = await printed.addStyleTag({ content: '.marktide-print-fragment-edge { display: none !important; }' });
      const baseline = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
        path: process.env.MARKTIDE_SPLIT_REVIEW_DIR ? path.join(process.env.MARKTIDE_SPLIT_REVIEW_DIR, `before-${separateHeaders ? 'headers' : 'exact'}.pdf`) : undefined });
      await baselineStyle.evaluate(element => element.remove());
      expect(words(pdf)).toEqual(words(baseline));
      expect(bottomBorderCoverage(baseline)).toBeLessThan(0.2);
      expect(bottomBorderCoverage(pdf)).toBeGreaterThan(0.95);
      await expect(printed.locator('tfoot.marktide-print-fragment-edge')).toHaveCount(1);
      await printed.pdf({ preferCSSPageSize: true, printBackground: true });
      await expect(printed.locator('tfoot.marktide-print-fragment-edge')).toHaveCount(1);
      await expect(page.locator('.marktide-print-fragment-edge')).toHaveCount(0);
    } finally { await printed.close(); }
  });
}

test('small tables and authored footers keep their original structure', async ({ page, context, baseURL }) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  const authoredGrid = `<table><thead><tr><th>Case</th><th>Method</th><th>Outcome</th><th>Status</th><th>Evidence</th></tr></thead><tbody><tr><td>Large</td><td>${'Tall explanatory text remains readable<br>'.repeat(40)}</td><td>Alert</td><td>MATCH</td><td>Figure 1</td></tr></tbody><tfoot><tr><td>Original footer</td><td>Method summary</td><td>Outcome summary</td><td>Status summary</td><td>Evidence summary</td></tr></tfoot></table>`;
  await renderMarkdown(page, `| Name | Value |\n| --- | --- |\n| Small | Unchanged |\n\n${authoredGrid}`);
  const preparation = await capturePdfPreparation(page, 'Footer review', { includeDocumentHtml: true });
  const printed = await context.newPage();
  try {
    await printed.emulateMedia({ media: 'print' });
    await printed.setContent(`<!DOCTYPE html>${preparation.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`)}`);
    await printed.evaluate(() => document.fonts.ready);
    await expect(printed.locator('table.marktide-print-content-table')).toHaveCount(1);
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    await expect(printed.locator('tfoot.marktide-print-fragment-edge')).toHaveCount(0);
    await expect(printed.locator('tfoot')).toHaveCount(1);
    await expect(printed.locator('tfoot')).toContainText('Original footer');
    const result = spawnSync('pdftotext', ['-raw', '-', '-'], { input: pdf, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Original\s+footer/);
  } finally { await printed.close(); }
});
