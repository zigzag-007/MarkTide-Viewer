const { expect, test } = require('playwright/test');
const { monitorPageErrors } = require('../helpers/console-monitor');
const { loadFixture } = require('../helpers/fixture-loader');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');

const basicFixture = loadFixture('01_basic_typography.md');

test.describe('Markdown Preview', () => {
  for (const theme of ['light', 'dark']) {
    test(`renders the basic fixture in ${theme} mode`, async ({ page }) => {
      const monitor = monitorPageErrors(page);
      await page.goto('/index.html');
      await waitForMarkTide(page);
      await setTheme(page, theme);
      await renderMarkdown(page, basicFixture);

      const preview = page.locator('#markdown-preview');
      await expect(preview.locator('h1').first()).toBeVisible();
      await expect(preview.locator('code').first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(preview).not.toContainText('Error rendering markdown');
      monitor.assertEmpty(expect);
    });
  }
});
