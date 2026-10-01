const { test, expect } = require('playwright/test');
const path = require('node:path');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const markdown = `The data supplied by the lecturer [9] was checked before analysis. Sysmon has **1,871 rows** with SHA256 prefix \`8e63716475101747\`. Authentication has **696 rows** with SHA256 \`a3acc3e7c47b28bba6070f8c87a5ef0477623ce5a4962ba1b62d9bf16ed3f700\`. DNS has **907 rows** with SHA256 \`3b0851f3d0474630e18c51e2babce20e6befc537af6a401b680a3ae62d4520bb\`.

Ordinary inline code: \`const value = 42\`.

Wrapped code: \`${'abcdef0123456789 '.repeat(12).trim()}\`.

\`\`\`js
const value = 42;
console.log(value);
\`\`\`
`;

async function measure(page) {
  await page.evaluate(() => document.fonts.ready);
  return page.locator('.markdown-body').evaluate(article => {
    const codes = [...article.querySelectorAll('code:not(pre code)')];
    const wrapped = codes[codes.length - 1];
    const rects = [...wrapped.getClientRects()];
    const gaps = rects.slice(1).map((rect, index) => rect.top - rects[index].bottom);
    const properties = ['fontSize', 'lineHeight', 'color', 'backgroundColor', 'paddingLeft', 'paddingRight'];
    const pick = element => Object.fromEntries(properties.map(property => [property, getComputedStyle(element)[property]]));
    return {
      codes: codes.map(pick), gaps,
      verticalPadding: codes.flatMap(code => ['paddingTop', 'paddingBottom'].map(property =>
        parseFloat(getComputedStyle(code)[property]) / parseFloat(getComputedStyle(code).fontSize))),
      horizontalPadding: codes.flatMap(code => ['paddingLeft', 'paddingRight'].map(property =>
        parseFloat(getComputedStyle(code)[property]) / parseFloat(getComputedStyle(code).fontSize))),
      paragraphs: [...article.querySelectorAll('p')].map(p => ({
        height: p.getBoundingClientRect().height, margin: getComputedStyle(p).margin,
        ratio: parseFloat(getComputedStyle(p).lineHeight) / parseFloat(getComputedStyle(p).fontSize),
      })),
      block: { ...pick(article.querySelector('pre code')), padding: getComputedStyle(article.querySelector('pre code')).padding,
        height: article.querySelector('pre').getBoundingClientRect().height },
    };
  });
}

async function checkSpacing(page, name, testInfo) {
  const current = await measure(page);
  expect(current.gaps.length).toBeGreaterThan(0);
  current.gaps.forEach(gap => expect(gap).toBeGreaterThan(1));
  current.verticalPadding.forEach(padding => expect(padding).toBeCloseTo(0.1, 4));
  current.horizontalPadding.forEach(padding => expect(padding).toBeCloseTo(0.4, 4));
  current.paragraphs.forEach(p => expect(p.ratio).toBeCloseTo(1.4, 4));
  const baseline = await page.addStyleTag({ content:
    '.markdown-body code:not(pre code) { padding-top: 0.2em; padding-bottom: 0.2em; }' });
  const previous = await measure(page);
  expect(current.codes).toEqual(previous.codes);
  expect(current.paragraphs).toEqual(previous.paragraphs);
  expect(current.block).toEqual(previous.block);
  current.gaps.forEach((gap, index) => expect(gap).toBeGreaterThan(previous.gaps[index] + 2));
  await baseline.evaluate(style => style.remove());
  const screenshot = await page.locator('.markdown-body').screenshot({
    path: process.env.MARKTIDE_INLINE_REVIEW_DIR
      ? path.join(process.env.MARKTIDE_INLINE_REVIEW_DIR, `${name}.png`) : undefined,
  });
  await testInfo.attach(`${name}.png`, { body: screenshot, contentType: 'image/png' });
}

for (const theme of ['light', 'dark']) {
  test(`inline code separates wrapped highlights in Preview and HTML, ${theme}`, async ({ page, context, baseURL }, testInfo) => {
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await renderMarkdown(page, markdown);
    await page.addStyleTag({ content: '.markdown-body { max-width: 710px; }' });
    await checkSpacing(page, `preview-${theme}`, testInfo);
    await installStandaloneCdnMirror(context);
    const html = await captureHtmlExport(page);
    const exported = await context.newPage();
    try {
      await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
      await exported.setViewportSize({ width: 800, height: 600 });
      await checkSpacing(exported, `html-${theme}`, testInfo);
      await exported.setViewportSize({ width: 390, height: 844 });
      await checkSpacing(exported, `html-mobile-${theme}`, testInfo);
    } finally {
      await exported.close();
    }
  });
}

test('PDF shares the inline code gap without changing code blocks', async ({ page, context, baseURL }, testInfo) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, markdown);
  const prepared = await capturePdfPreparation(page, 'Inline code review', { includeDocumentHtml: true });
  const printed = await context.newPage();
  try {
    await printed.setViewportSize({ width: 709, height: 1018 });
    await printed.emulateMedia({ media: 'print' });
    await printed.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`));
    await checkSpacing(printed, 'pdf-layout', testInfo);
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
      path: process.env.MARKTIDE_INLINE_REVIEW_DIR
        ? path.join(process.env.MARKTIDE_INLINE_REVIEW_DIR, 'inline-code.pdf') : undefined });
    await testInfo.attach('inline-code.pdf', { body: pdf, contentType: 'application/pdf' });
  } finally {
    await printed.close();
  }
});
