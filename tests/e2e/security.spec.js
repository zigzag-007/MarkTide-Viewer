const { expect, test } = require('playwright/test');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');

const markdown = `# Sanitizer

<script>window.__marktideUnsafe = true</script>
<iframe src="https://example.com"></iframe>
<style>body { display: none !important; }</style>
<img src="x" onerror="window.__marktideUnsafe = true">
<div id="safe-authored" style="color:#D2571C;font-family:Georgia, serif;font-size:20px;position:fixed;top:0">Safe text</div>
`;

test('Preview blocks executable HTML while keeping approved authored styles', async ({ page }) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, markdown);

  const preview = page.locator('#markdown-preview');
  await expect(preview.locator('script, iframe, style')).toHaveCount(0);
  await expect(preview.locator('[onerror]')).toHaveCount(0);
  await expect(preview.locator('#safe-authored')).toHaveCSS('color', 'rgb(210, 87, 28)');
  await expect(preview.locator('#safe-authored')).toHaveCSS('font-size', '20px');
  await expect(preview.locator('#safe-authored')).not.toHaveCSS('position', 'fixed');
  expect(await page.evaluate(() => window.__marktideUnsafe)).toBeUndefined();
});

test('HTML and PDF exports use the same sanitizer rules', async ({ page }) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, markdown);

  const exportedHtml = await captureHtmlExport(page);
  const htmlMetrics = await page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, 'text/html');
    const article = document.querySelector('.markdown-body');
    const safeAuthored = document.getElementById('safe-authored');
    return {
      unsafeCount: article.querySelectorAll('script, iframe, style, [onerror], [onload]').length,
      authoredStyle: safeAuthored?.getAttribute('style') || '',
    };
  }, exportedHtml);
  const pdfMetrics = await capturePdfPreparation(page);

  expect(htmlMetrics.unsafeCount).toBe(0);
  expect(htmlMetrics.authoredStyle).toContain('color:rgb(210, 87, 28)');
  expect(htmlMetrics.authoredStyle).not.toContain('position');
  expect(pdfMetrics.unsafeArticleMarkupCount).toBe(0);
  expect(await page.evaluate(() => window.__marktideUnsafe)).toBeUndefined();
});
