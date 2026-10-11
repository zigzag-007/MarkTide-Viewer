const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');

const reviewDirectory = process.env.MARKTIDE_PAGE_NUMBER_REVIEW_DIR;
const captureBaseline = process.env.MARKTIDE_PAGE_NUMBER_BASELINE === '1';
const image = '<img src="/assets/img/icon1.jpg" width="80" height="80" alt="Local image">';
const sample = `Inline \`code\` remains searchable.

| Name | Value |
| --- | --- |
| Sample | A table value |

\`\`\`js
const count = 42;
console.log(count);
\`\`\`

\`\`\`mermaid
flowchart LR
  Start[Start] --> Finish[Finish]
\`\`\`

${image}`;
const documents = {
  single: `# Single sheet\n\n${sample}`,
  long: `# Cover\n\n${sample}\n\n<div style="break-after:page"></div>\n\n`
    + Array.from({ length: 12 }, (_, index) => `## Section ${index + 1}\n\n${sample}\n\n`
      + Array.from({ length: 14 }, (_, paragraph) =>
        `Boundary ${index + 1}.${paragraph + 1}. `
        + 'This paragraph adds flowing content near a page boundary. '.repeat(5)).join('\n\n')
      + '\n\n| Row | Boundary value |\n| --- | --- |\n'
      + Array.from({ length: 18 }, (_, row) => `| ${row + 1} | Table text can cross a page boundary without moving. |`).join('\n'))
      .join('\n\n'),
};

function command(name, argumentsList, input) {
  const result = spawnSync(name, argumentsList, { input, maxBuffer: 64 * 1024 * 1024 });
  expect(result.status, result.error?.message || result.stderr?.toString()).toBe(0);
  return result.stdout;
}

function pages(pdf) {
  const xml = command('pdftotext', ['-bbox', '-', '-'], pdf).toString();
  return [...xml.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)]
    .map(match => ({ width: Number(match[1]), height: Number(match[2]),
      words: [...match[3].matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
        .map(word => ({ x: Number(word[1]), y: Number(word[2]), right: Number(word[3]),
          bottom: Number(word[4]), text: word[5], raw: word[0] })) }));
}

function pixels(pdf, pageNumber) {
  const buffer = command('pdftoppm', ['-f', String(pageNumber), '-l', String(pageNumber),
    '-singlefile', '-r', '72', '-'], pdf);
  const header = buffer.toString('ascii', 0, 100).match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
  expect(header).not.toBeNull();
  return { width: Number(header[1]), height: Number(header[2]), data: buffer.subarray(header[0].length) };
}

test.beforeEach(() => {
  for (const name of ['pdftotext', 'pdftoppm']) {
    const probe = spawnSync(name, ['-v']);
    test.skip(probe.error?.code === 'ENOENT', `Poppler ${name} is required for PDF comparisons`);
  }
});

for (const [name, markdown] of Object.entries(documents)) {
  test(`${name} PDF numbers every page without changing content or pagination`, async ({ page, context, baseURL }, testInfo) => {
    test.setTimeout(180_000);
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await renderMarkdown(page, markdown);
    const prepared = await capturePdfPreparation(page, 'Numbering review', { includeDocumentHtml: true });
    expect(prepared.mermaidCount).toBe(name === 'single' ? 1 : 13);
    const printed = await context.newPage();
    try {
      await printed.goto('/index.html');
      await printed.emulateMedia({ media: 'print' });
      await printed.setContent(`<!DOCTYPE html>${prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`)}`);
      await printed.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode()));
      });
      const settings = { preferCSSPageSize: true, printBackground: true };
      const pdf = await printed.pdf(settings);
      const actual = pages(pdf);
      if (name === 'single') expect(actual).toHaveLength(1);
      if (name === 'long') expect(actual.length).toBeGreaterThanOrEqual(10);
      if (reviewDirectory) {
        fs.mkdirSync(reviewDirectory, { recursive: true });
        fs.writeFileSync(path.join(reviewDirectory, `${captureBaseline ? 'baseline' : 'updated'}-${name}.pdf`), pdf);
      }
      if (captureBaseline) return;
      await testInfo.attach(`${name}.pdf`, { body: pdf, contentType: 'application/pdf' });
      for (const [index, sheet] of actual.entries()) {
        expect(sheet.width).toBeCloseTo(595.28, 0);
        expect(sheet.height).toBeCloseTo(841.89, 0);
        const footer = sheet.words.filter(word => word.y > sheet.height - 0.56 * 72);
        expect(footer.map(word => word.text)).toEqual([String(index + 1), 'Page']);
        expect(footer[0].x).toBeGreaterThan(sheet.width - 85);
        expect(footer[0].right).toBeLessThan(footer[1].x);
        expect(footer[1].right).toBeLessThanOrEqual(sheet.width - 0.38 * 72 + 1);
        expect(footer.every(word => word.bottom < sheet.height - 8)).toBe(true);
      }
      const withMetadata = name === 'single'
        ? await printed.pdf({ ...settings, displayHeaderFooter: true }) : null;
      const withoutBackground = name === 'single'
        ? await printed.pdf({ ...settings, printBackground: false }) : null;
      // Disable only generated margin content for an identical content comparison.
      await printed.evaluate(() => {
        const visit = rules => {
          for (const rule of rules) {
            if (rule.type === CSSRule.PAGE_RULE) {
              for (const margin of rule.cssRules) margin.style.content = 'none';
            } else if (rule.cssRules) visit(rule.cssRules);
          }
        };
        for (const sheet of document.styleSheets) {
          try { visit(sheet.cssRules); } catch (error) {
            if (error.name !== 'SecurityError') throw error;
          }
        }
      });
      const baseline = reviewDirectory && fs.existsSync(path.join(reviewDirectory, `baseline-${name}.pdf`))
        ? fs.readFileSync(path.join(reviewDirectory, `baseline-${name}.pdf`)) : await printed.pdf(settings);
      const before = pages(baseline);
      expect(actual).toHaveLength(before.length);
      for (let index = 0; index < actual.length; index += 1) {
        const content = actual[index].words.filter(word => word.y <= actual[index].height - 0.56 * 72);
        const previousContent = before[index].words.filter(word => word.y <= before[index].height - 0.56 * 72);
        expect(content.map(word => word.raw)).toEqual(previousContent.map(word => word.raw));
        const previousFooter = before[index].words.filter(word => word.y > before[index].height - 0.56 * 72);
        if (previousFooter.length) {
          expect(actual[index].words.filter(word => word.y > actual[index].height - 0.56 * 72))
            .toEqual(previousFooter);
        }
        const originalPixels = pixels(baseline, index + 1);
        const updatedPixels = pixels(pdf, index + 1);
        expect(updatedPixels.width).toBe(originalPixels.width);
        expect(updatedPixels.height).toBe(originalPixels.height);
        const contentEnd = Math.floor(updatedPixels.height - 0.56 * 72) * updatedPixels.width * 3;
        expect(updatedPixels.data.subarray(0, contentEnd).equals(originalPixels.data.subarray(0, contentEnd))).toBe(true);
        const footer = actual[index].words.filter(word => word.y > actual[index].height - 0.56 * 72);
        const separator = [];
        for (let y = Math.floor(footer[0].y - 1); y <= Math.ceil(footer[0].bottom + 1); y += 1) {
          for (let x = Math.ceil(footer[0].right + 1); x < Math.floor(footer[1].x - 1); x += 1) {
            const offset = (y * updatedPixels.width + x) * 3;
            const channels = [...updatedPixels.data.subarray(offset, offset + 3)];
            if (Math.max(...channels) < 200 && Math.min(...channels) > 30
              && Math.max(...channels) - Math.min(...channels) < 25) separator.push({ x, y });
          }
        }
        expect(separator.length).toBeGreaterThanOrEqual(6);
        expect(Math.max(...separator.map(pixel => pixel.x)) - Math.min(...separator.map(pixel => pixel.x))).toBeLessThanOrEqual(1);
        expect(Math.max(...separator.map(pixel => pixel.y)) - Math.min(...separator.map(pixel => pixel.y))).toBeLessThanOrEqual(9);
        // The rule stays inside the margin and runs across both footer boxes.
        const ruleRows = [];
        for (let y = Math.floor(footer[0].y - 12); y < Math.floor(footer[0].y); y += 1) {
          let greyPixels = 0;
          for (let x = Math.ceil(0.38 * 72); x < Math.floor(updatedPixels.width - 0.38 * 72); x += 1) {
            const offset = (y * updatedPixels.width + x) * 3;
            const channels = [...updatedPixels.data.subarray(offset, offset + 3)];
            if (Math.min(...channels) >= 210 && Math.max(...channels) < 255
              && Math.max(...channels) - Math.min(...channels) <= 2) greyPixels += 1;
          }
          if (greyPixels > (updatedPixels.width - 2 * 0.38 * 72) * 0.98) ruleRows.push(y);
        }
        expect(ruleRows.length).toBeGreaterThanOrEqual(1);
        expect(ruleRows.length).toBeLessThanOrEqual(2);
        expect(footer[0].y - Math.max(...ruleRows)).toBeGreaterThanOrEqual(6);
        expect(Math.min(...separator.map(pixel => pixel.y)) - Math.max(...ruleRows)).toBeGreaterThanOrEqual(5);
      }
      if (name === 'single') {
        // Browser metadata is controlled by the print dialog, not the document.
        const metadata = pages(withMetadata);
        expect(metadata).toHaveLength(actual.length);
        await testInfo.attach('browser-headers-enabled.pdf', { body: withMetadata, contentType: 'application/pdf' });
        if (reviewDirectory) fs.writeFileSync(path.join(reviewDirectory, 'browser-headers-enabled.pdf'), withMetadata);
        expect(metadata[0].words.filter(word => word.y < 30).map(word => word.text))
          .toEqual(expect.arrayContaining(['Numbering', 'review']));
        expect(metadata[0].words.filter(word => word.y > metadata[0].height - 0.56 * 72)
          .map(word => word.text)).toEqual(['1', 'Page']);
        expect(metadata[0].words.filter(word => word.y >= 30)).toEqual(actual[0].words);
        expect(pages(withoutBackground)).toEqual(actual);
        const normal = pixels(pdf, 1);
        const noBackground = pixels(withoutBackground, 1);
        const marginStart = Math.ceil(normal.height - 0.56 * 72) * normal.width * 3;
        expect(noBackground.data.subarray(marginStart).equals(normal.data.subarray(marginStart))).toBe(true);
      }
    } finally { await printed.close(); }
  });
}
