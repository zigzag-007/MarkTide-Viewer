const { expect, test } = require('playwright/test');
const { captureHtmlExport } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');

async function getWithRetry(request, url, attempts = 3) {
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastResponse = await request.get(url, { timeout: 30_000 });
      if (lastResponse.ok()) return lastResponse;
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error(`Unable to check ${url}`);
}

test('pinned standalone HTML export CDN resources respond successfully', async ({ page, request }) => {
  test.skip(process.env.MARKTIDE_CDN_HEALTH !== '1', 'Run through npm run test:cdn');
  test.setTimeout(120_000);

  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, '# CDN health\n\n```mermaid\nflowchart LR\n  A --> B\n```');
  const exportedHtml = await captureHtmlExport(page);
  const urls = await page.evaluate((html) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return [
      ...document.querySelectorAll('link[rel="stylesheet"][href], link[rel="icon"][href], script[src]'),
    ].map((element) => element.href || element.src);
  }, exportedHtml);
  const uniqueUrls = urls
    .filter((url, index, list) => list.indexOf(url) === index);

  expect(uniqueUrls.length).toBeGreaterThan(5);
  for (const url of uniqueUrls) {
    const response = await getWithRetry(request, url);
    expect(response.ok(), `${response.status()} ${url}`).toBe(true);
  }
});
