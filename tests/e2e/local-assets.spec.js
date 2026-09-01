const { expect, test } = require('playwright/test');
const { capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');

function monitorLocalAssets(page) {
  const problems = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    const isSecuritySoftwareRequest = url.hostname === 'me.kis.v2.scr.kaspersky-labs.com';
    if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1' && !isSecuritySoftwareRequest) {
      problems.push(`external request: ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`${response.status()} response: ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    problems.push(`failed request: ${request.url()} (${request.failure()?.errorText || 'unknown error'})`);
  });
  return problems;
}

test('Preview startup uses only local application assets', async ({ page }) => {
  const assetProblems = monitorLocalAssets(page);

  await page.goto('/index.html');
  await waitForMarkTide(page);

  expect(assetProblems).toEqual([]);
});

test('Preview lazy libraries and rendered content stay local', async ({ page }) => {
  const assetProblems = monitorLocalAssets(page);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, `# Local runtime

Inline math: $x^2 + y^2 = z^2$.

\`\`\`mermaid
flowchart LR
  Start[Start] --> Finish[Finish]
\`\`\`
`);

  await expect(page.locator('#markdown-preview mjx-container')).toHaveCount(1);
  await expect(page.locator('#markdown-preview .mermaid svg')).toHaveCount(1);
  await page.evaluate(() => window.MarkTideBeautify.ensureLoaded());
  expect(await page.evaluate(() => window.MarkTideBeautify.loaded)).toBe(true);
  expect(assetProblems).toEqual([]);
});

test('PDF preparation uses only local application assets', async ({ page }) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  const assetProblems = monitorLocalAssets(page);
  await renderMarkdown(page, `# Local PDF

Inline \`code\` and math $a^2 + b^2 = c^2$.

\`\`\`mermaid
flowchart LR
  Start[Start] --> Finish[Finish]
\`\`\`
`);

  await capturePdfPreparation(page);

  expect(assetProblems).toEqual([]);
});
