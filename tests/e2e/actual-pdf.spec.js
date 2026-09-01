const { expect, test } = require('playwright/test');
const { capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');

const markdown = `# Real PDF Smoke Test

Inline \`warm code\`.

| Name | Value |
| --- | --- |
| Long value | https://example.com/a/very/long/path/that/needs/to/wrap/without/cropping |

\`\`\`mermaid
flowchart LR
  Start[A long wrapped start label for PDF testing] --> Finish[Finish]
\`\`\`

${'A paragraph that adds real page content.\n\n'.repeat(80)}
`;

test('Chromium generates valid PDF bytes from the prepared document', async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, markdown);

  const preparation = await capturePdfPreparation(page, 'Real PDF Smoke Test', {
    includeDocumentHtml: true,
  });
  const documentHtml = preparation.documentHtml.replace(
    '<head>',
    `<head><base href="${baseURL}/">`
  );
  const pdfPage = await context.newPage();

  try {
    await pdfPage.setContent(`<!DOCTYPE html>${documentHtml}`, { waitUntil: 'load' });
    await pdfPage.evaluate(() => document.fonts.ready);
    const pdf = await pdfPage.pdf({
      format: 'A4',
      margin: { bottom: '0.38in', left: '0.38in', right: '0.38in', top: '0.55in' },
      printBackground: true,
    });

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(20_000);
    expect(pdf.subarray(pdf.length - 64).toString('latin1')).toContain('%%EOF');
  } finally {
    await pdfPage.close();
  }
});
