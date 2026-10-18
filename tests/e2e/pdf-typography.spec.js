const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { capturePdfPreparation, captureHtmlExport } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const source = `# Heading one
## Heading two
### Heading three
#### Heading four
##### Heading five
###### Heading six

Ordinary body paragraph with \`inline code\` remains searchable.

<p id="authored-text" style="font-size:20px">Authored text with <code>authored code</code>.</p>

| Name | Value |
| --- | --- |
| Label | \`table code\` |

\`\`\`js
const unchangedCode = true;
\`\`\`
`;

async function sizes(page) {
  await page.evaluate(() => document.fonts.ready);
  return page.locator('.markdown-body').evaluate(article => {
    const pick = element => {
      const css = getComputedStyle(element);
      return Object.fromEntries(['fontSize', 'lineHeight', 'padding', 'marginTop', 'marginBottom'].map(key => [key, css[key]]));
    };
    return { article: pick(article), paragraph: pick(article.querySelector('p')),
      heads: [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(pick),
      table: pick(article.querySelector('table')), cell: pick(article.querySelector('td')),
      pre: pick(article.querySelector('pre')), code: pick(article.querySelector('pre code')),
      inline: pick(article.querySelector('p code')), tableCode: pick(article.querySelector('td code')) };
  });
}

async function printedDocument(page, context, baseURL, markdown) {
  await renderMarkdown(page, markdown);
  const prepared = await capturePdfPreparation(page, 'PDF typography review', { includeDocumentHtml: true });
  const printed = await context.newPage();
  await printed.emulateMedia({ media: 'print' });
  await printed.setViewportSize({ width: 709, height: 1012 });
  await printed.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`));
  await printed.evaluate(() => document.fonts.ready);
  return printed;
}

test('PDF body, heading sizes and page margins change without shrinking code or tables', async ({ page, context, baseURL }) => {
  await installStandaloneCdnMirror(context);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  const printed = await printedDocument(page, context, baseURL, source);
  try {
    const preview = await sizes(page);
    const current = await sizes(printed);
    expect(current.paragraph.fontSize).toBe('14.42px');
    expect(current.heads.map(heading => heading.fontSize)).toEqual(['29.2px', '21.75px', '18.075px', '14.4px', '12.6625px', '12.295px']);
    expect(current.table.fontSize).toBe('13.23px');
    expect(current.pre.fontSize).toBe('12.495px');
    expect(current.code.fontSize).toBe('12.495px');
    expect(current.inline.fontSize).toBe('12.495px');
    expect(current.tableCode.fontSize).toBe('11.2455px');
    await expect(printed.locator('#authored-text')).toHaveCSS('font-size', '20px');
    await expect(printed.locator('#authored-text code')).toHaveCSS('font-size', '17px');
    expect(current.cell.padding).toBe('6px 12px');
    expect(current.pre.padding).toBe('12px');
    expect(current.pre.marginTop).toBe('18.7425px');
    await printed.evaluate(() => {
      const caption = document.createElement('figcaption');
      caption.className = 'marktide-image-caption';
      caption.textContent = 'Caption sizing probe';
      document.querySelector('.markdown-body').appendChild(caption);
    });
    await expect(printed.locator('figcaption')).toHaveCSS('font-size', '13.23px');
    expect(current.article.padding).toBe('6px');
    expect(current.paragraph.marginBottom).toBe('16px');
    current.heads.forEach((heading, index) => {
      expect(heading.marginTop).toBe(index === 0 ? '0px' : '28px');
      expect(heading.marginBottom).toBe('14px');
    });
    expect(parseFloat(current.paragraph.lineHeight) / parseFloat(current.paragraph.fontSize)).toBeCloseTo(1.4, 4);
    const pageMargins = await printed.evaluate(() => {
      const margins = [];
      const visit = rules => [...rules].forEach(rule => {
        if (rule.type === CSSRule.PAGE_RULE) margins.push(rule.style.margin);
        if (rule.cssRules) visit(rule.cssRules);
      });
      [...document.styleSheets].filter(sheet => sheet.ownerNode.tagName === 'STYLE').forEach(sheet => visit(sheet.cssRules));
      return margins;
    });
    expect(pageMargins).toEqual(['0.56in 0.38in']);
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    const text = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
    expect(text.status).toBe(0);
    expect(text.stdout).toContain('Ordinary body paragraph');
    expect(text.stdout).toContain('unchangedCode');
    expect(await sizes(page)).toEqual(preview);
    const html = await captureHtmlExport(page);
    expect(html).not.toContain('--marktide-print-reference-font-size');
    const exported = await context.newPage();
    try {
      await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
      const screen = await sizes(exported);
      expect(screen.article.fontSize).toBe('16.8px');
      expect(screen.heads[0].fontSize).toBe('35.28px');
    } finally { await exported.close(); }
  } finally { await printed.close(); }
});

test('export the real report for PDF typography review', async ({ page, context, baseURL }, testInfo) => {
  test.skip(!process.env.MARKTIDE_PDF_TYPE_REVIEW_DIR, 'Optional local report review');
  test.setTimeout(120_000);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  const report = fs.readFileSync(path.resolve(__dirname, '../../Report.md'), 'utf8');
  const repo = path.resolve(__dirname, '../..');
  const baseline = spawnSync('git', ['show', 'HEAD:assets/js/print-styles.js'], { cwd: repo, encoding: 'utf8' });
  expect(baseline.status).toBe(0);
  const currentStyles = fs.readFileSync(path.join(repo, 'assets/js/print-styles.js'), 'utf8');
  for (const [name, styles] of [['report-before', baseline.stdout], ['report-after', currentStyles]]) {
    await page.addScriptTag({ content: styles });
    const printed = await printedDocument(page, context, baseURL, report);
    try {
      await printed.waitForFunction(() => [...document.querySelectorAll('img')].every(image => image.complete));
      const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
        path: path.join(process.env.MARKTIDE_PDF_TYPE_REVIEW_DIR, `${name}.pdf`) });
      await testInfo.attach(`${name}.pdf`, { body: pdf, contentType: 'application/pdf' });
      const text = spawnSync('pdftotext', ['-bbox', '-', '-'], { input: pdf, encoding: 'utf8' });
      expect(text.status).toBe(0);
      expect(text.stdout).toContain('Executive');
      expect(text.stdout).toContain('Validation');
    } finally { await printed.close(); }
  }
});
