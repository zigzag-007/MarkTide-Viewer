const { expect, test } = require('playwright/test');
const { monitorPageErrors } = require('../helpers/console-monitor');
const { listFixtures, loadFixture } = require('../helpers/fixture-loader');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');

test.describe('complete Markdown fixture Preview pass', () => {
  test.setTimeout(90_000);

  for (const fixtureName of listFixtures()) {
    test(`renders ${fixtureName}`, async ({ page }) => {
      await page.route('https://**/*', (route) => route.fulfill({ status: 204, body: '' }));
      await page.route('**/x', (route) => route.fulfill({ status: 204, body: '' }));
      const monitor = monitorPageErrors(page);
      const markdown = loadFixture(fixtureName);
      const expectedMermaidCount = [...markdown.matchAll(/^```mermaid\s*$([\s\S]*?)^```\s*$/gm)].length;

      await page.goto('/index.html');
      await waitForMarkTide(page);
      await renderMarkdown(page, markdown);

      const preview = page.locator('#markdown-preview');
      await expect(preview).not.toBeEmpty();
      await expect(preview).not.toContainText('Error rendering markdown');
      if (expectedMermaidCount > 0) {
        await expect(preview.locator('.mermaid svg')).toHaveCount(expectedMermaidCount);
      }
      monitor.assertEmpty(expect);
    });
  }
});
