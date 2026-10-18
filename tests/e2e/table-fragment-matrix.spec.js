const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');
const telemetry = require('../helpers/telemetry-table-example');

function pdfWords(pdf) {
  const result = spawnSync('pdftotext', ['-bbox', '-', '-'], { input: pdf, encoding: 'utf8' });
  expect(result.status).toBe(0);
  return [...result.stdout.matchAll(/<page[^>]*>([\s\S]*?)<\/page>/g)]
    .map(page => (page[1].match(/<word[^>]*>[^<]*<\/word>/g) || []).sort());
}

function raster(pdf, pageNumber) {
  const result = spawnSync('pdftoppm', ['-f', String(pageNumber), '-l', String(pageNumber), '-singlefile', '-r', '144', '-'],
    { input: pdf, maxBuffer: 20 * 1024 * 1024 });
  expect(result.status, result.stderr.toString()).toBe(0);
  const bytes = result.stdout;
  const header = bytes.toString('ascii', 0, 100).match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
  expect(header).not.toBeNull();
  return { bytes, width: Number(header[1]), height: Number(header[2]), offset: header[0].length };
}

function lineCoverage(pdf, pageNumber, margin = 0.56) {
  const { bytes, width, height, offset } = raster(pdf, pageNumber);
  const edge = height - Math.round(margin * 144);
  let coverage = 0;
  for (let y = edge - 24; y < edge; y += 1) {
    let painted = 0;
    for (let x = 70; x < width - 70; x += 1) {
      const pixel = offset + (y * width + x) * 3;
      if ([0, 1, 2].every(channel => Math.abs(bytes[pixel + channel] - 224) <= 10)) painted += 1;
    }
    coverage = Math.max(coverage, painted / (width - 140));
  }
  return coverage;
}

function continuationLineCoverage(pdf, pageNumber) {
  const { bytes, width, offset } = raster(pdf, pageNumber);
  const top = Math.round(0.56 * 144);
  let coverage = 0;
  for (let y = top; y < top + 14; y += 1) {
    let painted = 0;
    for (let x = 70; x < width - 70; x += 1) {
      const pixel = offset + (y * width + x) * 3;
      if ([0, 1, 2].every(channel => Math.abs(bytes[pixel + channel] - 224) <= 10)) painted += 1;
    }
    coverage = Math.max(coverage, painted / (width - 140));
  }
  return coverage;
}

function textGapAtCut(pdf, pageNumber, borderY) {
  const image = raster(pdf, pageNumber);
  const line = borderY ?? endingLines(pdf, pageNumber).at(-1);
  expect(line, 'The closing line must exist before measuring its gap').toBeDefined();
  for (let y = line; y > line - 100; y -= 1) {
    for (let x = 70; x < image.width - 70; x += 1) {
      const pixel = image.offset + (y * image.width + x) * 3;
      if ([0, 1, 2].every(channel => image.bytes[pixel + channel] < 150)) return line - y;
    }
  }
  return 100;
}

function endingLines(pdf, pageNumber) {
  const image = raster(pdf, pageNumber);
  const edge = image.height - Math.round(0.56 * 144);
  const lines = [];
  for (let y = edge - 90; y < edge; y += 1) {
    let painted = 0;
    for (let x = 70; x < image.width - 70; x += 1) {
      const pixel = image.offset + (y * image.width + x) * 3;
      if ([0, 1, 2].every(channel => Math.abs(image.bytes[pixel + channel] - 224) <= 10)) painted += 1;
    }
    if (painted / (image.width - 140) > 0.95 && y - (lines.at(-1) || 0) > 3) lines.push(y);
  }
  return lines;
}

function hasTextBetween(pdf, pageNumber, start, end) {
  const image = raster(pdf, pageNumber);
  for (let y = start + 3; y < end - 3; y += 1) {
    for (let x = 70; x < image.width - 70; x += 1) {
      const pixel = image.offset + (y * image.width + x) * 3;
      if ([0, 1, 2].every(channel => image.bytes[pixel + channel] < 150)) return true;
    }
  }
  return false;
}

function tableCuts(pdf, colors, margin = 0.56) {
  const stops = (image, rows) => {
    const hit = (x, y) => {
      const at = image.offset + (y * image.width + x) * 3;
      return colors.some(color => color.every((value, channel) => Math.abs(image.bytes[at + channel] - value) <= 15));
    };
    const clusters = [];
    for (let x = 40; x < image.width - 40; x += 1) {
      if (!rows.every(y => [-1, 0, 1].some(offset => hit(x + offset, y)))) continue;
      const previous = clusters.at(-1);
      if (previous && x <= previous.end + 1) previous.end = x;
      else clusters.push({ start: x, end: x });
    }
    return clusters.filter(cluster => cluster.end - cluster.start <= 6).map(cluster => (cluster.start + cluster.end) / 2);
  };
  const pages = pdfWords(pdf);
  const cuts = [];
  let previous = raster(pdf, 1);
  for (let number = 1; number < pages.length; number += 1) {
    const next = raster(pdf, number + 1);
    const bottom = previous.height - Math.round(margin * 144);
    const top = Math.round(margin * 144);
    const endings = stops(previous, [bottom - 40, bottom - 32, bottom - 24]);
    const beginnings = stops(next, [top + 12, top + 20, top + 28]);
    const common = endings.filter(x => beginnings.some(other => Math.abs(other - x) <= 3));
    if (common.length >= 2 && common[0] < 100 && common.at(-1) > previous.width - 100) cuts.push(number);
    previous = next;
  }
  return cuts;
}

function fragmentEdges(pdf, pageNumber, colors) {
  const image = raster(pdf, pageNumber);
  const hit = (x, y) => {
    const at = image.offset + (y * image.width + x) * 3;
    return colors.some(color => color.every((value, channel) => Math.abs(image.bytes[at + channel] - value) <= 15));
  };
  const columns = [];
  // Matrix tables fill print width, so only the outer gutters need scanning.
  for (let x = 40; x < image.width - 40; x += 1) {
    if (x >= 100 && x <= image.width - 100) continue;
    let run = 0;
    for (let y = 40; y < image.height - 40; y += 1) {
      run = hit(x, y) ? run + 1 : 0;
      if (run >= 32) { columns.push(x); break; }
    }
  }
  if (!columns.length) return null;
  const left = columns[0];
  const right = columns.at(-1);
  const sideOffsets = Array.from({ length: 9 }, (_, offset) => offset);
  const rows = [];
  for (let y = 40; y < image.height - 40; y += 1) {
    if (sideOffsets.some(offset => hit(left + offset, y))
      && sideOffsets.some(offset => hit(right - offset, y))) rows.push(y);
  }
  const coverage = (start, end) => {
    let best = 0;
    let borderY = start;
    for (let y = start; y <= end; y += 1) {
      let painted = 0;
      for (let x = left + 8; x <= right - 8; x += 1) if (hit(x, y)) painted += 1;
      const ratio = painted / (right - left - 15);
      if (ratio > best) { best = ratio; borderY = y; }
    }
    return { ratio: best, borderY };
  };
  // The frame can finish below row cells, especially when a rowspan continues.
  const top = coverage(rows[0], rows[0] + 4);
  const bottom = coverage(rows.at(-1) - 4, rows.at(-1));
  return { left, right, top: top.ratio, bottom: bottom.ratio, bottomY: bottom.borderY };
}

async function printPage(page, context, baseURL, markdown) {
  await renderMarkdown(page, markdown);
  const prepared = await capturePdfPreparation(page, 'Table fragment review', { includeDocumentHtml: true });
  const printed = await context.newPage();
  // Establish the local origin without loading a second editor runtime.
  await printed.goto('/assets/vendor/fonts/inter.css');
  await printed.setViewportSize({ width: 709, height: 1018 });
  await printed.emulateMedia({ media: 'print' });
  await printed.setContent(`<!DOCTYPE html>${prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`)}`);
  await printed.evaluate(() => document.fonts.ready);
  return printed;
}

async function compareUndecorated(printed, pdf, outputPath) {
  const style = await printed.addStyleTag({ content:
    `.marktide-print-fragment-edge, .marktide-print-fragment-edge > table > :is(thead, tbody, tfoot) { outline: none !important; }` });
  const baseline = await printed.pdf({ preferCSSPageSize: true, printBackground: true, path: outputPath });
  await style.evaluate(element => element.remove());
  const current = pdfWords(pdf);
  const previous = pdfWords(baseline);
  expect(current.length).toBe(previous.length);
  current.forEach((words, index) => expect(words, `page ${index + 1} text and geometry`).toEqual(previous[index]));
  return baseline;
}

function cellMetrics(printed) {
  return printed.locator('table').evaluateAll(tables => tables.map(table => ({
    cols: [...table.querySelectorAll('col')].map(col => col.getAttribute('style')),
    cells: [...table.rows].flatMap(row => [...row.cells].map(cell => {
      const css = getComputedStyle(cell);
      return { span: [cell.colSpan, cell.rowSpan], width: cell.getBoundingClientRect().width,
        height: cell.getBoundingClientRect().height, padding: css.padding,
        font: [css.fontFamily, css.fontSize, css.lineHeight], align: css.textAlign,
        border: [css.borderTopWidth, css.borderTopColor] };
    }))
  })));
}

test.beforeEach(async ({ page }) => {
  for (const command of ['pdftotext', 'pdftoppm']) {
    const probe = spawnSync(command, ['-v']);
    test.skip(probe.error?.code === 'ENOENT', `Install Poppler ${command} for real PDF fragment checks`);
    expect(probe.status, probe.error?.message || probe.stderr?.toString()).toBe(0);
  }
  await page.goto('/index.html');
  await waitForMarkTide(page);
});

test('Report telemetry table closes a cut through the moderate D2 row', async ({ page, context, baseURL }, testInfo) => {
  const printed = await printPage(page, context, baseURL, telemetry);
  try {
    await printed.evaluate(() => {
      const article = document.querySelector('.markdown-body');
      const spacer = document.createElement('div');
      article.prepend(spacer);
      const row = article.querySelectorAll('tbody tr')[1];
      const bounds = row.getBoundingClientRect();
      spacer.style.height = `${(297 / 25.4 - 2 * 0.56) * 96 - bounds.top - bounds.height * 0.8}px`;
    });
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
      path: process.env.MARKTIDE_TABLE_MATRIX_REVIEW_DIR
        ? path.join(process.env.MARKTIDE_TABLE_MATRIX_REVIEW_DIR, 'telemetry-after.pdf') : undefined });
    await testInfo.attach('telemetry.pdf', { body: pdf, contentType: 'application/pdf' });
    expect(pdfWords(pdf)).toHaveLength(2);
    expect(lineCoverage(pdf, 1)).toBeGreaterThan(0.95);
    const baseline = await compareUndecorated(printed, pdf,
      process.env.MARKTIDE_TABLE_MATRIX_REVIEW_DIR ? path.join(process.env.MARKTIDE_TABLE_MATRIX_REVIEW_DIR, 'telemetry-before.pdf') : undefined);
    expect(lineCoverage(baseline, 1)).toBeLessThan(0.2);
    const pages = pdfWords(pdf);
    expect(pages[0].some(word => word.includes('>host</word>'))).toBe(true);
    expect(pages[1].some(word => word.includes('>passwords</word>'))).toBe(true);
    await expect(printed.locator('table.marktide-print-content-table')).toHaveCount(0);
  } finally { await printed.close(); }
});

test('PDF table fragments reserve a small text gap without changing fitting tables', async ({ page, context, baseURL }) => {
  const printed = await printPage(page, context, baseURL, telemetry);
  try {
    const fitting = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    const metrics = await cellMetrics(printed);
    const edge = printed.locator('.marktide-print-fragment-edge');
    await expect(edge).toHaveCSS('padding-top', '0px');
    await expect(edge).toHaveCSS('padding-bottom', '7px');
    const unpadded = await printed.addStyleTag({ content: `.marktide-print-fragment-edge {
      padding: 0 !important;
    } .markdown-body .marktide-print-fragment-edge > table { margin-bottom: 0 !important; }` });
    const baseline = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdfWords(fitting)).toEqual(pdfWords(baseline));
    expect(await cellMetrics(printed)).toEqual(metrics);
    await unpadded.evaluate(element => element.remove());
  } finally { await printed.close(); }
});

test('painted PDF cuts leave actual space above the line at tight text positions', async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const printed = await printPage(page, context, baseURL, telemetry);
  try {
    const spacerHeight = await printed.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.id = 'gap-spacer';
      document.querySelector('.markdown-body').prepend(spacer);
      const bounds = document.querySelectorAll('tbody tr')[1].getBoundingClientRect();
      return (297 / 25.4 - 2 * 0.56) * 96 - bounds.top - bounds.height * 0.65;
    });
    const gaps = [];
    const oldGaps = [];
    for (const shift of [0, 3, 6, 9, 12, 15]) {
      await printed.locator('#gap-spacer').evaluate((spacer, height) => { spacer.style.height = `${height}px`; }, spacerHeight + shift);
      const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
      expect(pdfWords(pdf)).toHaveLength(2);
      const gap = textGapAtCut(pdf, 1);
      expect(gap, `Actual text clearance at shift ${shift}px`).toBeGreaterThanOrEqual(4);
      gaps.push(gap);
      const oldStyle = await printed.addStyleTag({ content: `.marktide-print-fragment-edge {
        padding-bottom: 0 !important;
        outline: 1px solid #e0e0e0; outline-offset: -3px;
      } .markdown-body .marktide-print-fragment-edge > table { margin-bottom: 0 !important; }
        .marktide-print-fragment-edge > table > :is(thead, tbody, tfoot) { outline: none !important; }` });
      const oldPdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
      oldGaps.push(textGapAtCut(oldPdf, 1));
      await oldStyle.evaluate(element => element.remove());
    }
    expect(Math.min(...gaps), 'Include a genuinely tight cut, not only loose samples').toBeLessThan(15);
    expect(Math.min(...oldGaps), 'The old version must expose the touching text case').toBeLessThan(4);
    await testInfo.attach('text-clearance.json', {
      body: Buffer.from(JSON.stringify({ shifts: [0, 3, 6, 9, 12, 15], gaps, oldGaps })), contentType: 'application/json'
    });
    if (process.env.MARKTIDE_TABLE_GAP_REVIEW_DIR) {
      const shift = oldGaps.indexOf(Math.min(...oldGaps)) * 3;
      await printed.locator('#gap-spacer').evaluate((spacer, height) => { spacer.style.height = `${height}px`; }, spacerHeight + shift);
      await printed.pdf({ preferCSSPageSize: true, printBackground: true,
        path: path.join(process.env.MARKTIDE_TABLE_GAP_REVIEW_DIR, 'tight-after.pdf') });
      await printed.addStyleTag({ content: `.marktide-print-fragment-edge {
        padding-bottom: 0 !important; outline: 1px solid #e0e0e0; outline-offset: -3px;
      } .markdown-body .marktide-print-fragment-edge > table { margin-bottom: 0 !important; }
        .marktide-print-fragment-edge > table > :is(thead, tbody, tfoot) { outline: none !important; }` });
      await printed.pdf({ preferCSSPageSize: true, printBackground: true,
        path: path.join(process.env.MARKTIDE_TABLE_GAP_REVIEW_DIR, 'tight-before.pdf') });
    }
  } finally { await printed.close(); }
});

test('Report table ends once, without a second empty box below the last visible row', async ({ page, context, baseURL }, testInfo) => {
  const printed = await printPage(page, context, baseURL, telemetry);
  try {
    const height = await printed.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.id = 'ending-spacer';
      document.querySelector('.markdown-body').prepend(spacer);
      const row = document.querySelectorAll('tbody tr')[1].getBoundingClientRect();
      return (297 / 25.4 - 2 * 0.56) * 96 - row.top - 28;
    });
    for (const shift of [0, 2, 4, 6, 8, 10]) {
      await printed.locator('#ending-spacer').evaluate((spacer, value) => { spacer.style.height = `${value}px`; }, height + shift);
      const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
      await testInfo.attach(`ending-${shift}.pdf`, { body: pdf, contentType: 'application/pdf' });
      const lines = endingLines(pdf, 1);
      expect(lines.length, `A closing border at shift ${shift}px`).toBeGreaterThan(0);
      if (lines.length > 1) expect(hasTextBetween(pdf, 1, lines.at(-2), lines.at(-1)),
        `No empty extra ending at shift ${shift}px`).toBe(true);
      expect(textGapAtCut(pdf, 1), `Visible text gap at shift ${shift}px`).toBeGreaterThanOrEqual(4);
      expect(pdfWords(pdf)).toHaveLength(2);
    }
  } finally { await printed.close(); }
});

test('real Report retains visible table cuts with bundled fonts', async ({ page, context, baseURL }, testInfo) => {
  test.skip(!process.env.MARKTIDE_TABLE_MATRIX_REVIEW_DIR, 'Optional local Report review');
  test.setTimeout(180_000);
  const report = fs.readFileSync(path.resolve(__dirname, '../../Report.md'), 'utf8');
  const printed = await printPage(page, context, baseURL, report);
  try {
    await printed.waitForFunction(() => [...document.images].every(image => image.complete));
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
      path: path.join(process.env.MARKTIDE_TABLE_MATRIX_REVIEW_DIR, 'report-after.pdf') });
    await testInfo.attach('report.pdf', { body: pdf, contentType: 'application/pdf' });
    const pages = pdfWords(pdf);
    const telemetryPage = pages.findIndex(words => words.some(word => word.includes('>Telemetry</word>')));
    expect(telemetryPage).toBeGreaterThan(0);
    expect(pages[telemetryPage + 1].some(word => word.includes('>DNS</word>'))).toBe(true);
    expect(lineCoverage(pdf, telemetryPage + 1)).toBeGreaterThan(0.95);
    const lines = endingLines(pdf, telemetryPage + 1);
    if (lines.length > 1) expect(hasTextBetween(pdf, telemetryPage + 1, lines.at(-2), lines.at(-1)),
      'The real Report must not have an empty second ending').toBe(true);
    expect(textGapAtCut(pdf, telemetryPage + 1)).toBeGreaterThanOrEqual(4);
    const baseline = await compareUndecorated(printed, pdf, path.join(process.env.MARKTIDE_TABLE_MATRIX_REVIEW_DIR, 'report-before.pdf'));
    const colors = await printed.locator('table td, table th').evaluateAll(cells => [...new Set(cells
      .map(cell => getComputedStyle(cell).borderBottomColor))].map(color => color.match(/[\d.]+/g).slice(0, 3).map(Number)));
    // Check both sides of every real table cut, not just the supplied sample.
    const cuts = tableCuts(pdf, colors);
    expect(cuts.length, 'The real report must exercise table page cuts').toBeGreaterThan(0);
    // The tiny fragment gap can move a row start, not remove the closing edge.
    const reportEdges = fragmentEdges(pdf, telemetryPage + 1, colors);
    expect(reportEdges.top).toBeGreaterThan(0.95);
    expect(reportEdges.bottom).toBeGreaterThan(0.95);
    for (const number of cuts) {
      expect(lineCoverage(pdf, number), `Report table cut on page ${number}`).toBeGreaterThan(0.95);
      expect(continuationLineCoverage(pdf, number + 1), `Report continuation on page ${number + 1}`).toBeGreaterThan(0.95);
    }
    console.log(`Real Report: ${pages.length} pages, table cuts after pages ${cuts.join(', ')}`);
    await testInfo.attach('report-table-cuts.json', { body: Buffer.from(JSON.stringify({ pages: pages.length, cuts })), contentType: 'application/json' });
  } finally { await printed.close(); }
});

const profiles = [
  { name: 'Inter', family: 'Inter', size: 13.23, margin: 0.56 },
  { name: 'Arial', family: 'Arial', size: 14.5, margin: 0.5 },
  { name: 'Georgia', family: 'Georgia', size: 16, margin: 0.62 },
  { name: 'monospace', family: 'DejaVu Sans Mono', size: 18, margin: 0.7 }
];

const prose = 'A useful explanation keeps event data, expected results, actual results and important limitations readable. ';
const longValue = 'abcdef0123456789'.repeat(6);
const kinds = ['two columns', 'three columns', 'four columns', 'seven columns', 'authored columns', 'spans', 'footer', 'nested', 'borderless'];

function stressSource(kind) {
  const count = kind === 'two columns' ? 2 : kind === 'three columns' ? 3 : kind === 'seven columns' ? 7 : 4;
  const heading = Array.from({ length: count }, (_, column) => `<th>Field ${column + 1}</th>`).join('');
  const attrs = kind === 'borderless' ? ' style="border:none"' : '';
  const rows = Array.from({ length: 8 }, (_, row) => {
    const cells = Array.from({ length: count }, (_, column) => {
      if (kind === 'spans' && row % 2 && column === 0) return '';
      if (kind === 'spans' && row % 2 === 0 && column === 0) return `<td rowspan="2">Group ${row + 1}<br>${prose.repeat(3)}</td>`;
      if (kind === 'spans' && row === 7 && column === 3) return '';
      const span = kind === 'spans' && row === 7 && column === 2 ? ' colspan="2"' : '';
      const value = column === 0 ? `<strong>Row ${row + 1}</strong>` :
        column === count - 1 ? `${prose.repeat(3)}<code>${longValue}</code>` : `${prose.repeat(2)} Row ${row + 1}, field ${column + 1}.`;
      return `<td${span}${attrs}>${value}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  const columns = kind === 'authored columns' ? '<colgroup><col style="width:15%"><col style="width:25%"><col style="width:35%"><col style="width:25%"></colgroup>' : '';
  const footer = kind === 'footer' ? `<tfoot><tr><td colspan="${count}">Authored footer remains unchanged</td></tr></tfoot>` : '';
  const header = kind === 'borderless' ? heading.replaceAll('<th>', '<th style="border:none">') : heading;
  const grid = `<table>${columns}<thead><tr>${header}</tr></thead><tbody>${rows}</tbody>${footer}</table>`;
  if (kind === 'nested') return `# Nested table\n<table><thead><tr><th>Outer context</th><th>Details</th></tr></thead><tbody><tr><td>Nested evidence</td><td>${grid}</td></tr></tbody></table>`;
  return `# ${kind}\n${grid}`;
}

for (const profile of profiles) {
  for (const kind of kinds) {
    test(`matrix ${profile.name}: ${kind}, three page positions`, async ({ page, context, baseURL }, testInfo) => {
      test.setTimeout(120_000);
      const printed = await printPage(page, context, baseURL, stressSource(kind));
      try {
        await printed.addStyleTag({ content: `@page { margin: ${profile.margin}in 0.38in; }
          .markdown-body, .markdown-body table { font-family: "${profile.family}" !important; font-size: ${profile.size}px !important; }
          .markdown-body h1 { font-family: "${profile.family}" !important; font-size: ${profile.size * 2.2}px !important; }` });
        await printed.evaluate(() => document.fonts.ready);
        const colors = await printed.locator('td, th').evaluateAll(cells => [...new Set(cells
          .map(cell => getComputedStyle(cell).borderBottomColor))].map(color => color.match(/[\d.]+/g).slice(0, 3).map(Number)));
        await printed.evaluate(() => {
          const spacer = document.createElement('div');
          spacer.id = 'matrix-spacer';
          document.querySelector('.markdown-body').prepend(spacer);
        });
        for (const position of [0, 0.35, 0.75]) {
          await printed.locator('#matrix-spacer').evaluate((spacer, height) => { spacer.style.height = `${height}px`; },
            (297 / 25.4 - 2 * profile.margin) * 96 * position);
          const metrics = await cellMetrics(printed);
          const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
          const pages = pdfWords(pdf);
          await testInfo.attach(`position-${position}.pdf`, { body: pdf, contentType: 'application/pdf' });
          for (let pageNumber = 1; pageNumber <= pages.length; pageNumber += 1) {
            if (kind === 'borderless') continue;
            const edges = fragmentEdges(pdf, pageNumber, colors);
            const label = `${profile.name}, ${kind}, position ${position}, page ${pageNumber}`;
            if (!edges) expect(pages[pageNumber - 1], `${label} has no table fragment`).toHaveLength(0);
            else {
              expect(edges.right - edges.left, `${label} table width`).toBeGreaterThan(1000);
              expect(edges.top, `${label} top border`).toBeGreaterThan(0.95);
              expect(edges.bottom, `${label} bottom border`).toBeGreaterThan(0.95);
              const image = raster(pdf, pageNumber);
              const pageEdge = image.height - Math.round(profile.margin * 144);
              if (pageNumber < pages.length && edges.bottomY > pageEdge - 100) {
                expect(textGapAtCut(pdf, pageNumber, edges.bottomY), `${label} text clearance`).toBeGreaterThanOrEqual(4);
              }
            }
          }
          expect(await cellMetrics(printed)).toEqual(metrics);
          await compareUndecorated(printed, pdf);
          const repeated = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
          expect(pdfWords(repeated)).toEqual(pages);
          if (kind === 'borderless') await expect(printed.locator('.marktide-print-fragment-edge')).toHaveCount(0);
          else await expect(printed.locator('.marktide-print-fragment-edge')).toHaveCount(kind === 'nested' ? 2 : 1);
          expect(await printed.locator('tfoot').count()).toBe(kind === 'footer' ? 1 : 0);
        }
        await expect(page.locator('.marktide-print-fragment-edge')).toHaveCount(0);
      } finally { await printed.close(); }
    });
  }
}
