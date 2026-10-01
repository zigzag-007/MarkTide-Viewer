const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');
const appendix = require('../helpers/appendix-b');
const { loadFixture } = require('../helpers/fixture-loader');

function extractPages(pdf) {
  const extracted = spawnSync('pdftotext', ['-layout', '-', '-'], { input: pdf, encoding: 'utf8' });
  expect(extracted.status, extracted.error?.message || extracted.stderr).toBe(0);
  return extracted.stdout.split('\f').filter((text) => text.trim());
}

test.beforeEach(() => {
  const probe = spawnSync('pdftotext', ['-v']);
  test.skip(probe.error?.code === 'ENOENT', 'Install Poppler pdftotext for real PDF table checks');
  expect(probe.status, probe.error?.message || probe.stderr?.toString()).toBe(0);
});

async function openPrintDocument(page, context, baseURL, source) {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, source);
  const preparation = await capturePdfPreparation(page, 'Table review', { includeDocumentHtml: true });
  const printPage = await context.newPage();
  await printPage.setViewportSize({ width: 709, height: 1018 });
  await printPage.emulateMedia({ media: 'print' });
  await printPage.setContent(`<!DOCTYPE html>${preparation.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`)}`);
  await printPage.evaluate(() => document.fonts.ready);
  return printPage;
}

test('Appendix B gets readable columns and complete D3 rows in a searchable PDF', async ({ page, context, baseURL }, testInfo) => {
  const printPage = await openPrintDocument(page, context, baseURL, appendix);
  try {
    const metrics = await printPage.locator('table').evaluate(table => ({
      width: table.getBoundingClientRect().width,
      layout: getComputedStyle(table).tableLayout,
      columns: [...table.rows[0].cells].map(cell => cell.getBoundingClientRect().width),
      rows: [...table.rows].map(row => row.getBoundingClientRect().height),
      fontSize: getComputedStyle(table).fontSize,
      padding: getComputedStyle(table.rows[0].cells[0]).padding,
    }));
    expect(metrics.layout).toBe('fixed');
    expect(metrics.width).toBeLessThanOrEqual(697);
    expect(metrics.columns[1]).toBeGreaterThan(130);
    expect(metrics.columns[2]).toBeGreaterThan(100);
    expect(metrics.columns[5]).toBeGreaterThan(110);
    expect(metrics.rows[3]).toBeLessThan(200);
    expect(metrics.fontSize).toBe('12.201px');
    expect(metrics.padding).toBe('3px 4px');
    const measureWrapping = rows => rows.map(row => {
      const lines = node => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return new Set([...range.getClientRects()].filter(rect => rect.width > 0)
          .map(rect => Math.round(rect.top))).size;
      };
      return {
        statuses: [row.cells[3], row.cells[4]].map(lines),
        caseCodes: [...row.cells[0].querySelectorAll('code')].map(lines),
        prose: [row.cells[1], row.cells[2], row.cells[5]].map(lines),
      };
    });
    const wrapping = await printPage.locator('tbody tr').evaluateAll(measureWrapping);
    const previousStyle = await printPage.addStyleTag({ content: `
      .markdown-body table.marktide-print-content-table { font-size: 85% !important; }
      .markdown-body table.marktide-print-content-table th,
      .markdown-body table.marktide-print-content-table td { padding: 3px !important; }
    ` });
    const previousWrapping = await printPage.locator('tbody tr').evaluateAll(measureWrapping);
    await previousStyle.evaluate(style => style.remove());
    wrapping.forEach((row, index) => {
      for (const field of ['statuses', 'caseCodes', 'prose']) {
        row[field].forEach((lines, cellIndex) => {
          expect(lines).toBeLessThanOrEqual(previousWrapping[index][field][cellIndex]);
        });
      }
    });
    const baselineStyle = await printPage.addStyleTag({ content: `
      .markdown-body table.marktide-print-content-table { font-size: 85% !important; }
      .markdown-body table.marktide-print-content-table th,
      .markdown-body table.marktide-print-content-table td { padding: 4px 5px !important; }
    ` });
    const baselineWrapping = await printPage.locator('tbody tr').evaluateAll(measureWrapping);
    if (process.env.MARKTIDE_TABLE_BASELINE_PDF) {
      await printPage.pdf({ preferCSSPageSize: true, printBackground: true,
        path: process.env.MARKTIDE_TABLE_BASELINE_PDF });
    }
    await baselineStyle.evaluate(style => style.remove());
    wrapping.forEach((row, index) => {
      for (const field of ['statuses', 'caseCodes', 'prose']) {
        row[field].forEach((lines, cellIndex) => {
          expect(lines).toBeLessThanOrEqual(baselineWrapping[index][field][cellIndex]);
        });
      }
    });
    expect(wrapping[1].prose[2]).toBeLessThan(baselineWrapping[1].prose[2]);
    await expect(page.locator('#markdown-preview colgroup')).toHaveCount(0);
    const pdf = await printPage.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      path: process.env.MARKTIDE_TABLE_REVIEW_PDF || undefined,
    });
    const rowBreaks = await printPage.locator('tbody tr').evaluateAll(rows => rows.map(row => ({
      height: row.getBoundingClientRect().height,
      keep: row.classList.contains('marktide-print-keep-row'),
    })));
    rowBreaks.forEach(row => expect(row.keep).toBe(row.height <= 240));
    await testInfo.attach('appendix-b.pdf', { body: pdf, contentType: 'application/pdf' });
    const pages = extractPages(pdf);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('Detailed Validation Table');
    expect(pages[1]).toContain('VAL-DNS-C2-TP-');
    expect(pages[1]).toContain('VAL-DNS-FP-01');
    expect(pages[1]).toContain('offline cross-check');
    expect(pages[1]).toContain('Origin and method');
    expect(pages[1]).toContain('unconfirmed.');
    // The page boundary falls between COVERAGE and SLOW, never inside a row.
    expect(pages[0]).toContain('SYN-D2-COVERAGE-');
    expect(pages[0]).toContain('guessing coverage.');
    expect(pages[0]).not.toContain('SYN-D2-SLOW-01');
    expect(pages[1]).toContain('SYN-D2-SLOW-01');
    expect(pages[1]).toContain('neither matches.');
    expect(pages.join('').match(/offline cross-check/g)).toHaveLength(2);
    expect(pages.join('')).not.toMatch(/MATC\s*\n\s*H/);
  } finally {
    await printPage.close();
  }
});

test('small tables, compact wide tables, long tokens and span grids keep existing sizing', async ({ page, context, baseURL }) => {
  const source = `# Table comparisons

| Name | Value |
| --- | --- |
| Label | Some ordinary value |

| Name | Description | Status |
| --- | --- | --- |
| Label | Ordinary description | OK |

| Name | Value |
| --- | --- |
| URL | https://example.com/${'long_value/'.repeat(20)} |

| A | B | C | D | E |
| --- | --- | --- | --- | --- |
| One | Two | Three | Four | Five |

<table><thead><tr><th colspan="5">Spanning header</th></tr></thead><tbody>
<tr><td rowspan="2">Label</td><td colspan="2">${'Descriptive words '.repeat(10)}</td><td>Four</td><td>Five</td></tr>
<tr><td>A</td><td>B</td><td>C</td><td>D</td></tr></tbody></table>

<table><colgroup><col span="5"></colgroup><tbody><tr><td>${'Authored columns '.repeat(10)}</td><td>B</td><td>C</td><td>D</td><td>E</td></tr></tbody></table>

| Detection | Behaviour targeted | Mapping | Justification |
| --- | --- | --- | --- |
| **D1** | Office launching PowerShell | **T1059.001** | ${'This is ordinary explanatory text that must keep normal table spacing. '.repeat(3)} |`;
  const printPage = await openPrintDocument(page, context, baseURL, source);
  try {
    const tables = await printPage.locator('table').evaluateAll(tables => tables.map(table => ({
      contentSized: table.classList.contains('marktide-print-content-table'),
      fontSize: getComputedStyle(table).fontSize,
      padding: getComputedStyle(table.rows[0].cells[0]).padding,
      cols: table.querySelectorAll('col').length,
      wrapPoints: table.querySelectorAll('wbr').length,
      rowBreak: getComputedStyle(table.rows[table.rows.length - 1]).breakInside,
      columnCount: table.className,
      width: table.getBoundingClientRect().width,
    })));
    expect(tables).toHaveLength(7);
    tables.forEach(table => {
      expect(table.contentSized).toBe(false);
      expect(table.fontSize).toBe('13.23px');
      expect(table.rowBreak).toBe('auto');
      expect(table.width).toBeLessThanOrEqual(697);
    });
    expect(tables.slice(0, 3).map(table => table.padding)).toEqual(Array(3).fill('6px 12px'));
    expect(tables.slice(3, 6).map(table => table.padding)).toEqual(Array(3).fill('5px 7px'));
    expect(tables[6].padding).toBe('6px 12px');
    expect(tables[2].wrapPoints).toBeGreaterThan(0);
    expect(tables[4].columnCount).toContain('marktide-print-cols-5');
    expect(tables[4].cols).toBe(0);
    expect(tables[5].cols).toBe(1);
    const pages = extractPages(await printPage.pdf({ preferCSSPageSize: true, printBackground: true }));
    expect(pages.join('')).toContain('Spanning header');
    expect(pages.join('')).toContain('Authored columns');
  } finally {
    await printPage.close();
  }
});

test('crowded table after prose keeps complete rows at every PDF boundary', async ({ page, context, baseURL }, testInfo) => {
  const introduction = `## Historical validation artefacts

The package includes the exact retrieved artefacts used for reproducibility:

- \`Implementation/assessment2_d2_historical_comparison.json\`
- \`Implementation/assessment2_d3_historical_comparison.json\`
- \`Implementation/historical_validation_requests.http\`
- \`Implementation/historical_index_mappings.json\`

The full CSV import Python program is not included. The supplied artefacts contain the retrieved stored reducers, exact Dev Tools search requests and retrieved mappings. No calculated detection finding was imported into the historical indices.

`;
  const printPage = await openPrintDocument(page, context, baseURL, introduction + appendix);
  try {
    const pdf = await printPage.pdf({ preferCSSPageSize: true, printBackground: true,
      path: process.env.MARKTIDE_TABLE_REVIEW_DIR
        ? path.join(process.env.MARKTIDE_TABLE_REVIEW_DIR, 'appendix-after-prose.pdf') : undefined });
    await testInfo.attach('appendix-after-prose.pdf', { body: pdf, contentType: 'application/pdf' });
    const pages = extractPages(pdf);
    expect(pages).toHaveLength(2);
    const rows = [
      ['VAL-PS-FP-01', 'over-breadth.'],
      ['VAL-PS-TP-01', 'retained.'],
      ['198.51.100.23', 'maximum window.'],
      ['203.0.113.50', 'usernames.'],
      ['45.77.88.91', 'usernames.'],
      ['SYN-D2-BENIGN-01', 'scenario.'],
      ['SYN-D2-RESIDUAL-', 'risk.'],
      ['SYN-D2-COVERAGE-', 'coverage.'],
      ['SYN-D2-SLOW-01', 'neither matches.'],
      ['VAL-DNS-C2-TP-', 'offline cross-check'],
      ['VAL-DNS-FP-01', 'unconfirmed.'],
    ];
    rows.forEach(([id, ending]) => {
      const rowPages = pages.filter(text => text.includes(id));
      expect(rowPages).toHaveLength(1);
      expect(rowPages[0]).toContain(ending);
    });
    pages.forEach(text => expect(text).toContain('Origin and method'));
  } finally {
    await printPage.close();
  }
});

test('a crowded wide row taller than a page still splits without losing text', async ({ page, context, baseURL }, testInfo) => {
  const source = `# Oversized row\n\n| Case | Method | Outcome | Status | Evidence |\n| --- | --- | --- | --- | --- |\n| Giant | ${Array.from({length: 100}, (_, i) => `Line ${i} remains searchable`).join('<br>')} | Alert | MATCH | Figure 1 |\n| End | Last row | Done | MATCH | Figure 2 |`;
  const printPage = await openPrintDocument(page, context, baseURL, source);
  try {
    await expect(printPage.locator('.marktide-print-content-table')).toHaveCount(1);
    const height = await printPage.locator('tbody tr').first().evaluate(row => row.getBoundingClientRect().height);
    expect(height).toBeGreaterThan(1018);
    const pdf = await printPage.pdf({ preferCSSPageSize: true, printBackground: true });
    await expect(printPage.locator('tbody tr.marktide-print-keep-row').first()).toContainText('Last row');
    await testInfo.attach('oversized-row.pdf', { body: pdf, contentType: 'application/pdf' });
    const pages = extractPages(pdf);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.length).toBeLessThanOrEqual(4);
    expect(pages[0]).toContain('Oversized row');
    expect(pages.join('')).toContain('Last row');
    expect(pages.join('').match(/remains searchable/g)).toHaveLength(100);
    pages.forEach(pageText => expect(pageText).toContain('remains searchable'));
  } finally {
    await printPage.close();
  }
});

for (const fixture of ['02_tables.md', '02-Tables-old.md']) {
  test(`real PDF keeps ${fixture} tables within print width`, async ({ page, context, baseURL }, testInfo) => {
    const printPage = await openPrintDocument(page, context, baseURL, loadFixture(fixture));
    try {
      const problems = await printPage.locator('table').evaluateAll(tables => tables.flatMap((table, index) => {
        const bounds = table.getBoundingClientRect();
        return bounds.left < -1 || bounds.right > 710 ? [`table ${index} overflows`] : [];
      }));
      expect(problems).toEqual([]);
      const pdf = await printPage.pdf({ preferCSSPageSize: true, printBackground: true,
        path: process.env.MARKTIDE_TABLE_REVIEW_DIR
          ? path.join(process.env.MARKTIDE_TABLE_REVIEW_DIR, `${fixture}.pdf`) : undefined });
      await testInfo.attach(`${fixture}.pdf`, { body: pdf, contentType: 'application/pdf' });
      expect(extractPages(pdf).length).toBeGreaterThan(0);
    } finally {
      await printPage.close();
    }
  });
}
