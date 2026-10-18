const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide, setTheme } = require('../helpers/marktide-page');

const marker = '<!-- marktide-page-break -->';
const examples = [
  ['initial', marker + '\n\nOnly content', 1],
  ['final', 'Only content\n\n' + marker, 1],
  ['consecutive', 'Before\n\n' + marker + '\n\n' + marker + '\n\nAfter', 2],
  ['nested', ':::marktide-align center\nBefore\n\n' + marker + '\n\nAfter\n:::', 2],
];

for (const theme of ['light', 'dark']) for (const [name, markdown, pages] of examples) {
  test('semantic page breaks avoid blank pages at ' + name + ' in ' + theme, async ({ page, context, baseURL }) => {
    test.setTimeout(120000);
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await renderMarkdown(page, markdown);
    const preparation = await capturePdfPreparation(page, 'Toolbar Page Break Review', { includeDocumentHtml: true });
    const printPage = await context.newPage();
    try {
      await printPage.setContent('<!DOCTYPE html>' + preparation.documentHtml.replace('<head>', '<head><base href="' + baseURL + '/">'), { waitUntil: 'load' });
      await printPage.evaluate(() => document.fonts.ready);
      const pdf = await printPage.pdf({ preferCSSPageSize: true, printBackground: true });
      const text = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
      expect(text.status, text.stderr).toBe(0);
      const extractedPages = text.stdout.split('\f').filter(text => text.trim());
      expect(extractedPages).toHaveLength(pages);
      if (pages === 2) {
        expect(extractedPages[0]).toContain('Before');
        expect(extractedPages[0]).not.toContain('After');
        expect(extractedPages[1]).toContain('After');
      } else expect(extractedPages[0]).toContain('Only content');
    } finally { await printPage.close(); }
  });
}

for (const theme of ['light', 'dark']) {
  test('fresh HTML preserves toolbar source styles offline in ' + theme, async ({ page, browser }) => {
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await renderMarkdown(page, '# Styled heading\n\n:::marktide-align right\n<u>Underlined</u> and ==**highlighted**==.\n:::\n\n' + marker + '\n\nAfter break');
    const html = await captureHtmlExport(page);
    const offline = await browser.newContext({ offline: true });
    const exported = await offline.newPage();
    try {
      await exported.setContent(html, { waitUntil: 'load' });
      await expect(exported.locator('h1').first()).toHaveText('Styled heading');
      await expect(exported.locator('.marktide-aligned-block')).toHaveCSS('text-align', 'right');
      await expect(exported.locator('u')).toHaveText('Underlined');
      await expect(exported.locator('mark strong')).toHaveText('highlighted');
      await expect(exported.locator('.marktide-page-break')).toHaveCount(1);
      await expect(exported.locator('.formatting-ribbon, .editor-insertion-dialog')).toHaveCount(0);
    } finally { await offline.close(); }
  });
}
