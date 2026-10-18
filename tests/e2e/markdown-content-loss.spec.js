const { expect, test } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const fixture = require('../helpers/markdown-content-loss.json');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

async function checkReproduction(article) {
  await expect(article.locator('h1')).toHaveText('Terminal Test Cases - Title <Title>');
  await expect(article.locator('h1,h2,h3')).toHaveCount(9);
  await expect(article.locator('p')).toHaveCount(14);
  await expect(article.locator('li')).toHaveCount(7);
  await expect(article.locator('pre code')).toHaveText([
    'java StudentGraderTest.java', 'java StudentGrader.java',
    'javac *.java\njava StudentGrader', 'Exact terminal output',
  ]);
  await expect(article.locator('title')).toHaveCount(0);
  await expect(article.locator('li').last()).toHaveText('Error handling and unusual but realistic situations');
}

for (const theme of ['light', 'dark']) {
  test(`complete unchanged reproduction survives Preview and fresh HTML in ${theme}`, async ({ page, context }) => {
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await renderMarkdown(page, fixture.markdown);
    await checkReproduction(page.locator('#markdown-preview'));

    const html = await captureHtmlExport(page);
    await installStandaloneCdnMirror(context);
    const exported = await context.newPage();
    try {
      await exported.setContent(html, { waitUntil: 'load' });
      await checkReproduction(exported.locator('.markdown-body'));
      await expect(exported.locator('html')).toHaveAttribute('data-theme', theme);
    } finally {
      await exported.close();
    }
  });
}

test('real PDF keeps every heading, paragraph, list item and code sample', async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  const probe = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
  test.skip(probe.error?.code === 'ENOENT', 'Poppler is required for PDF text verification');
  expect(probe.status).toBe(0);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, fixture.markdown);
  await installStandaloneCdnMirror(context);
  const prepared = await capturePdfPreparation(page, 'Content loss verification', { includeDocumentHtml: true });
  const printed = await context.newPage();
  try {
    await printed.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`),
      { waitUntil: 'load' });
    await printed.evaluate(() => document.fonts.ready);
    await checkReproduction(printed.locator('.markdown-body'));
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const result = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
    expect(result.status).toBe(0);
    const text = result.stdout.replace(/\s+/g, '');
    const blocks = await printed.locator('.markdown-body').evaluate(article =>
      [...article.querySelectorAll('h1,h2,h3,p,li,pre')].map(node => node.textContent.replace(/\s+/g, '')));
    for (const block of blocks) expect(text).toContain(block);
  } finally {
    await printed.close();
  }
});

test('intentional HTML and sanitizing remain shared across all surfaces', async ({ page, context }) => {
  const source = '# Intentional HTML\n\n<div id="authored" style="color: red"><strong>Still bold</strong><br><em>Still italic</em></div>\n\n'
    + '<details open><summary>More</summary><p>Details text</p></details>\n\n'
    + 'A <span title="<Title>">label</span> and <Name>.\n\n'
    + '<script>window.__unsafePlaceholder = true</script>\n\n## Later\n\nFinal paragraph.';
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, source);
  async function check(article) {
    await expect(article.locator('#authored strong')).toHaveText('Still bold');
    await expect(article.locator('#authored em')).toHaveText('Still italic');
    await expect(article.locator('details[open] summary')).toHaveText('More');
    await expect(article.locator('span[title="<Title>"]')).toHaveText('label');
    await expect(article).toContainText('and <Name>.');
    await expect(article.locator('h2')).toHaveText('Later');
    await expect(article.locator('script')).toHaveCount(0);
  }
  await check(page.locator('#markdown-preview'));
  const html = await captureHtmlExport(page);
  await installStandaloneCdnMirror(context);
  const exported = await context.newPage();
  try {
    await exported.setContent(html, { waitUntil: 'load' });
    await check(exported.locator('.markdown-body'));
    const prepared = await capturePdfPreparation(page, 'Intentional HTML', { includeDocumentHtml: true });
    await exported.setContent(prepared.documentHtml, { waitUntil: 'load' });
    await check(exported.locator('.markdown-body'));
  } finally {
    await exported.close();
  }
});
