const { expect, test } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { loadFixture } = require('../helpers/fixture-loader');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

// Keep the original financial example available without the ignored bug archive.
const financial = `Yes, it is wise to insure the centre. The insurance premium is $10,000 per year, which is less than the ALE of $25,000. The expected annual loss from the cyclone risk exceeds what insurance costs. Taking out insurance is a cost-effective way to transfer this financial risk to an insurer.

**Control A (Training, $150,000/year):**
New ARO = 1 per fortnight = 26/year. SLE unchanged at $10,000.
New ALE = $10,000 × 26 = $260,000
CBA = $650,000 − $260,000 − $150,000 = **+$240,000**

**Control B (Backup and version control, $100,000/year):**
ARO unchanged = 65. New SLE = $5,000.
New ALE = $5,000 × 65 = $325,000
CBA = $650,000 − $325,000 − $100,000 = **+$225,000**

**Decision:** Control A should be selected. Its CBA of $240,000 is higher than Control B at $225,000, meaning it saves more money overall despite the higher annual cost.`;

const typography = loadFixture('01_basic_typography.md').split('## 7.')[1].split('## 10.')[0];
const beautiful = loadFixture('beautiful-markdown.md');
function diagram(title) {
  const section = beautiful.split(`### ${title}`)[1];
  if (!section) throw new Error(`Missing reported diagram: ${title}`);
  return `## ${title}\n\n${section.match(/```mermaid[\s\S]*?```/)[0]}`;
}
const examples = `${financial}\n\n## 7.${typography}\n\n${diagram('The Architecture of a System')}\n\n${diagram('The Life of a Star')}\n\n${diagram('The Mind Map of Science')}`;

async function assertSemantics(article) {
  await expect(article).toContainText('The insurance premium is $10,000 per year, which is less than the ALE of $25,000.');
  await expect(article).toContainText('CBA = $650,000 − $260,000 − $150,000 = +$240,000');
  await expect(article).toContainText('CBA = $650,000 − $325,000 − $100,000 = +$225,000');
  await expect(article.locator('mjx-container')).toHaveCount(0);
  await expect(article.locator('mark')).toHaveCount(2);
  await expect(article.locator('mark').first()).toHaveText('This text should be highlighted');
  await expect(article.locator('abbr[title="HyperText Markup Language"]')).toHaveText(['HTML', 'HTML']);
  await expect(article.locator('abbr[title="World Wide Web Consortium"]')).toHaveText('W3C');
  await expect(article).not.toContainText('*[HTML]:');
  await expect(article.locator('.mermaid svg')).toHaveCount(3);
}

for (const theme of ['light', 'dark']) {
  test(`reported currency, extensions and diagrams in ${theme} Preview and HTML`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await renderMarkdown(page, examples);
    const preview = page.locator('#markdown-preview');
    await assertSemantics(preview);
    await preview.screenshot({ path: testInfo.outputPath(`preview-${theme}.png`) });
    for (let index = 0; index < 3; index += 1) {
      await preview.locator('.mermaid').nth(index).screenshot({ path: testInfo.outputPath(`preview-${theme}-diagram-${index}.png`) });
    }
    const html = await captureHtmlExport(page);
    const unexpectedRequests = await installStandaloneCdnMirror(context);
    const exported = await context.newPage();
    try {
      await exported.setContent(html, { waitUntil: 'load' });
      await exported.waitForFunction(() => window.MarkTideMermaidRenderPromise);
      await exported.evaluate(() => window.MarkTideMermaidRenderPromise);
      await assertSemantics(exported.locator('.markdown-body'));
      await exported.screenshot({ path: testInfo.outputPath(`html-${theme}.png`), fullPage: true });
      expect(unexpectedRequests).toEqual([]);
    } finally {
      await exported.close();
    }
  });
}

test('reported flowchart backgrounds and financial text in a real PDF', async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const probe = spawnSync('pdftoppm', ['-v'], { encoding: 'utf8' });
  test.skip(probe.error?.code === 'ENOENT', 'Poppler is needed for PDF visual evidence');
  expect(probe.status).toBe(0);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, `${diagram('The Architecture of a System')}\n\n${financial}`);
  const preparation = await capturePdfPreparation(page, 'Reported flowchart', { includeDocumentHtml: true });
  expect(preparation.mermaidGeometry).toHaveLength(1);
  expect(preparation.mermaidGeometry[0].problems).toEqual([]);
  expect(preparation.mermaidGeometry[0].foreignObjectCount).toBe(0);
  const pdfPage = await context.newPage();
  try {
    await pdfPage.setContent(`<!DOCTYPE html>${preparation.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`)}`, { waitUntil: 'load' });
    await pdfPage.evaluate(() => document.fonts.ready);
    const backgrounds = await pdfPage.locator('.edgeLabel').evaluateAll((groups) => groups.filter((group) => group.textContent.trim()).map((group) => {
      const text = group.querySelector('text');
      const background = group.querySelector('.marktide-edge-label-bg');
      if (!text || !background) return { label: group.textContent.trim(), covered: false };
      const labelBounds = text.getBoundingClientRect();
      const backgroundBounds = background.getBoundingClientRect();
      const style = getComputedStyle(background);
      return {
        label: group.textContent.trim(),
        covered: backgroundBounds.left <= labelBounds.left + 1
          && backgroundBounds.top <= labelBounds.top + 1
          && backgroundBounds.right >= labelBounds.right - 1
          && backgroundBounds.bottom >= labelBounds.bottom - 1,
        fill: style.fill,
        fillOpacity: style.fillOpacity,
        opacity: style.opacity,
      };
    }));
    expect(backgrounds.map((item) => item.label).sort()).toEqual(['Creative', 'Logical', 'No', 'Unknown', 'Yes']);
    for (const background of backgrounds) {
      expect(background.covered, background.label).toBe(true);
      expect(background.fill).not.toBe('none');
      expect(background.fill).not.toBe('rgba(0, 0, 0, 0)');
      expect(background.fillOpacity).toBe('1');
      expect(background.opacity).toBe('1');
    }
    const pdfPath = testInfo.outputPath('reported-flowchart.pdf');
    const pdf = await pdfPage.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
    const text = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
    expect(text.status, text.stderr).toBe(0);
    for (const label of ['Logical', 'Creative', 'Unknown']) {
      expect(text.stdout.match(new RegExp(label, 'g'))).toHaveLength(1);
    }
    expect(text.stdout.replace(/\s+/g, ' ')).toContain('The insurance premium is $10,000 per year, which is less than the ALE of $25,000.');
    const raster = spawnSync('pdftoppm', ['-png', '-scale-to', '1600', '-singlefile', pdfPath, testInfo.outputPath('reported-flowchart')], { encoding: 'utf8' });
    expect(raster.status, raster.stderr).toBe(0);
  } finally {
    await pdfPage.close();
  }
});
