const { expect, test } = require('playwright/test');
const { captureHtmlExport } = require('../helpers/export-capture');
const { monitorPageErrors } = require('../helpers/console-monitor');
const { listFixtures, loadFixture } = require('../helpers/fixture-loader');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

test.describe.configure({ mode: 'parallel' });

for (const theme of ['light', 'dark']) {
  test.describe(`complete Markdown fixture Preview and HTML pass, ${theme}`, () => {
    test.setTimeout(90_000);

    for (const fixtureName of listFixtures()) {
      test(`renders ${fixtureName} in ${theme}`, async ({ page, context }) => {
        await page.route('https://**/*', (route) => route.fulfill({ status: 204, body: '' }));
        await page.route('**/x', (route) => route.fulfill({ status: 204, body: '' }));
        const monitor = monitorPageErrors(page);
        const markdown = loadFixture(fixtureName);
        const expectedMermaidCount = [...markdown.matchAll(/^```mermaid\s*$([\s\S]*?)^```\s*$/gm)].length;

        await page.goto('/index.html');
        await waitForMarkTide(page);
        await setTheme(page, theme);
        await renderMarkdown(page, markdown);

        const preview = page.locator('#markdown-preview');
        await expect(preview).not.toBeEmpty();
        await expect(preview).not.toContainText('Error rendering markdown');
        if (expectedMermaidCount > 0) {
          await expect(preview.locator('.mermaid svg')).toHaveCount(expectedMermaidCount);
        }
        monitor.assertEmpty(expect);
        const structure = await preview.evaluate((element) => Object.fromEntries(
          ['h1', 'h2', 'h3', 'table', 'pre', 'mark', 'abbr'].map((selector) =>
            [selector, element.querySelectorAll(selector).length])
        ));
        const html = await captureHtmlExport(page);
        const unexpectedRequests = await installStandaloneCdnMirror(context);
        const exported = await context.newPage();
        await exported.route('**/*', (route) => {
          const request = route.request();
          if (['image', 'media'].includes(request.resourceType()) || request.url().endsWith('/x')) {
            return route.fulfill({ status: 204, body: '' });
          }
          return route.fallback();
        });
        const exportMonitor = monitorPageErrors(exported);
        try {
          await exported.setContent(html, { waitUntil: 'load' });
          await exported.waitForFunction(() => window.MarkTideMermaidRenderPromise);
          await exported.evaluate(() => window.MarkTideMermaidRenderPromise);
          await expect(exported.locator('html')).toHaveAttribute('data-theme', theme);
          const article = exported.locator('.markdown-body');
          await expect(article).not.toBeEmpty();
          await expect(article).not.toContainText('Error rendering markdown');
          for (const [selector, count] of Object.entries(structure)) {
            await expect(article.locator(selector)).toHaveCount(count);
          }
          await expect(article.locator('.mermaid svg')).toHaveCount(expectedMermaidCount);
          expect(unexpectedRequests).toEqual([]);
          exportMonitor.assertEmpty(expect);
        } finally {
          await exported.close();
        }
      });
    }
  });
}
