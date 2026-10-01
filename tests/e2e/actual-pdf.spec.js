const { expect, test } = require('playwright/test');
const { spawnSync } = require('node:child_process');
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

async function generatePreparedPdf({ page, context, baseURL }) {
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
    return pdf;
  } finally {
    await pdfPage.close();
  }
}

test('Chromium generates valid PDF bytes from the prepared document', generatePreparedPdf);

test('PDF headings and paragraphs retain searchable text on every page', async ({ page, context, baseURL }) => {
  const probe = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
  test.skip(probe.error?.code === 'ENOENT', 'Install Poppler pdftotext to check PDF text extraction');
  expect(probe.status, probe.error?.message || probe.stderr).toBe(0);

  const pdf = await generatePreparedPdf({ page, context, baseURL });
  const extracted = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
  expect(extracted.status, extracted.error?.message || extracted.stderr).toBe(0);
  expect(extracted.stdout).toContain('Real PDF Smoke Test');
  expect(extracted.stdout).toContain('warm code');
  const paragraphs = extracted.stdout.match(/A paragraph that adds real page content\./g) || [];
  expect(paragraphs).toHaveLength(80);
  const pages = extracted.stdout.split('\f').filter((text) => text.trim());
  expect(pages.length).toBeGreaterThan(1);
  pages.forEach((text) => expect(text).toContain('A paragraph that adds real page content.'));
});
