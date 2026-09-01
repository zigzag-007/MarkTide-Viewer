const { expect, test } = require('playwright/test');
const { capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');

const markdown = `# PDF Styling

Inline \`warm code\` remains readable.

<div id="authored-style" style="color:#D2571C;font-family:Georgia, serif;font-size:20px">Authored style</div>

\`\`\`mermaid
flowchart LR
  Start[Start] --> Finish[Finish]
\`\`\`
`;

test('PDF preparation preserves approved shared styles and cleans up', async ({ page }) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, markdown);

  const originalTitle = await page.title();
  const metrics = await capturePdfPreparation(page);

  expect(metrics.inlineCode).toEqual({
    backgroundColor: 'rgb(255, 248, 236)',
    color: 'rgb(139, 69, 0)',
    fontWeight: '600',
  });
  expect(metrics.authored.color).toBe('rgb(210, 87, 28)');
  expect(metrics.authored.fontFamily).toContain('Georgia');
  expect(metrics.authored.fontSize).toBe('20px');
  expect(metrics.mermaidCount).toBe(1);
  expect(metrics.toolbarCount).toBe(0);
  await expect(page.locator('iframe[style*="-1000px"]')).toHaveCount(0);
  await expect(page).toHaveTitle(originalTitle);
});
