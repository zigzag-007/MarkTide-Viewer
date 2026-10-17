const { expect, test } = require('playwright/test');
const { captureHtmlExport } = require('../helpers/export-capture');
const { monitorPageErrors } = require('../helpers/console-monitor');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const markdown = `# Standalone Export

Inline \`warm code\`.

| Name | Value |
| --- | --- |
| Theme | Shared |

\`\`\`mermaid
flowchart LR
  Start[Start] --> Finish[Finish]
\`\`\`
`;

test.describe('standalone HTML export', () => {
  for (const theme of ['light', 'dark']) {
    test(`opens as a fresh ${theme} document`, async ({ page, context }) => {
      await page.goto('/index.html');
      await waitForMarkTide(page);
      await setTheme(page, theme);
      await renderMarkdown(page, markdown);

      const exportedHtml = await captureHtmlExport(page);
      expect(exportedHtml).toContain(`<html lang="en" data-theme="${theme}">`);
      expect(exportedHtml).toContain('https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js');
      expect(exportedHtml).toContain('window.MarkTideMermaidRenderPromise');

      const unexpectedCdnRequests = await installStandaloneCdnMirror(context);
      const exportPage = await context.newPage();
      const monitor = monitorPageErrors(exportPage);
      try {
        await exportPage.setContent(exportedHtml, { waitUntil: 'load' });
        await exportPage.waitForFunction(() => window.MarkTideMermaidRenderPromise);
        await exportPage.evaluate(() => window.MarkTideMermaidRenderPromise);

        await expect(exportPage.locator('h1')).toHaveText('Standalone Export');
        await expect(exportPage.locator('table')).toBeVisible();
        await expect(exportPage.locator('.mermaid svg')).toHaveCount(1);
        await expect(exportPage.locator('.mermaid-toolbar')).toHaveCount(1);
        await expect(exportPage.locator('html')).toHaveAttribute('data-theme', theme);
        expect(unexpectedCdnRequests).toEqual([]);
        monitor.assertEmpty(expect);
      } finally {
        await exportPage.close();
      }
    });
  }
});
