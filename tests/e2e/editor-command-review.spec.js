const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { waitForMarkTide, setTheme, renderMarkdown } = require('../helpers/marktide-page');
const { capturePdfPreparation } = require('../helpers/export-capture');
const review = process.env.MARKTIDE_COMMAND_REVIEW_DIR;

for (const theme of ['light', 'dark']) for (const width of [1081, 1920]) {
  test('functional toolbar review images at ' + width + ' in ' + theme, async ({ page }) => {
    test.skip(!review, 'Set a review artifact directory to collect screenshots');
    fs.mkdirSync(review, { recursive: true });
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 800 });
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await expect(page.locator('.formatting-ribbon')).toBeVisible();
    await page.evaluate(() => {
      const editor = window.MarkTideMonaco.getEditor();
      editor.setSelection(new monaco.Selection(1, 3, 1, 10));
      editor.focus();
    });
    const bold = page.getByRole('button', { name: 'Bold', exact: true });
    await bold.click();
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await bold.focus();
    await page.screenshot({ path: path.join(review, 'active-focus-' + theme + '-' + width + '.png') });
    await page.getByRole('button', { name: 'Link', exact: true }).hover();
    await expect(page.locator('.ribbon-tooltip')).toContainText('Ctrl+K');
    await page.screenshot({ path: path.join(review, 'hover-' + theme + '-' + width + '.png') });
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    await expect(page.locator('.editor-insertion-dialog')).toBeVisible();
    await page.screenshot({ path: path.join(review, 'link-dialog-' + theme + '-' + width + '.png') });
    await page.keyboard.press('Escape');
  });
}

test('review PDF shows source formatting and a semantic page boundary', async ({ page, context, baseURL }) => {
  test.skip(!review, 'Set a review artifact directory to collect the PDF');
  fs.mkdirSync(review, { recursive: true });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, '# MarkTide Toolbar Review\n\n'
    + '**Bold**, *Italic*, <u>Underline</u>, ~~Strikethrough~~, ==Highlight== and \x60Inline code\x60.\n\n'
    + ':::marktide-align center\n## Centered Markdown\n\nA centered paragraph keeps its Markdown structure.\n:::\n\n'
    + '| Command | Source |\n| --- | --- |\n| Highlight | Equals delimiters |\n| Page Break | Semantic print marker |\n\n'
    + '<!-- marktide-page-break -->\n\n## After the page break\n\nThis content starts on page two.\n\n'
    + '- Parent item\n  - Nested item\n\n> A blockquote with **formatted text**.\n\n'
    + '\x60\x60\x60js\nconst literal = "**code**";\n\x60\x60\x60');
  const prepared = await capturePdfPreparation(page, 'MarkTide Toolbar Review', { includeDocumentHtml: true });
  const printPage = await context.newPage();
  try {
    await printPage.setContent('<!DOCTYPE html>' + prepared.documentHtml.replace('<head>', '<head><base href="' + baseURL + '/">'), { waitUntil: 'load' });
    await printPage.evaluate(() => document.fonts.ready);
    await printPage.pdf({ path: path.join(review, 'toolbar-review.pdf'), preferCSSPageSize: true, printBackground: true });
  } finally { await printPage.close(); }
});
