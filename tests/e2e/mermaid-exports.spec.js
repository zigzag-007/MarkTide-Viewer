const { expect, test } = require('playwright/test');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { loadFixture } = require('../helpers/fixture-loader');
const { collectMermaidGeometry } = require('../helpers/geometry');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const mermaidFixture = loadFixture('03_mermaid_diagrams.md');

test('fresh HTML export renders all 25 Mermaid diagrams without geometry errors', async ({ page, context }) => {
  test.setTimeout(150_000);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await setTheme(page, 'light');
  await renderMarkdown(page, mermaidFixture);
  const exportedHtml = await captureHtmlExport(page);

  const unexpectedCdnRequests = await installStandaloneCdnMirror(context);
  const exportPage = await context.newPage();
  try {
    await exportPage.setContent(exportedHtml, { waitUntil: 'load', timeout: 60_000 });
    await exportPage.waitForFunction(() => window.MarkTideMermaidRenderPromise, null, { timeout: 30_000 });
    await exportPage.evaluate(() => window.MarkTideMermaidRenderPromise);

    const diagrams = await collectMermaidGeometry(exportPage, '.markdown-body');
    expect(diagrams).toHaveLength(25);
    expect(diagrams.filter((diagram) => diagram.isError)).toEqual([]);
    expect(diagrams.filter((diagram) => diagram.toolbarCount !== 1)).toEqual([]);
    expect(diagrams.filter((diagram) => diagram.problems.length > 0)).toEqual([]);
    expect(unexpectedCdnRequests).toEqual([]);
  } finally {
    await exportPage.close();
  }
});

test('PDF preparation renders all 25 Mermaid diagrams without clipped or duplicate labels', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, mermaidFixture);

  const metrics = await capturePdfPreparation(page, 'Mermaid PDF Fixture');
  expect(metrics.mermaidCount).toBe(25);
  expect(metrics.toolbarCount).toBe(0);
  expect(metrics.mermaidGeometry).toHaveLength(25);
  expect(metrics.mermaidGeometry.filter((diagram) => diagram.foreignObjectCount > 0)).toEqual([]);
  expect(metrics.mermaidGeometry.filter((diagram) => diagram.problems.length > 0)).toEqual([]);
});

test('PNG conversion works for every Mermaid engine in the fixture', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, mermaidFixture);

  const results = await page.evaluate(async () => {
    const representativeIndexes = [0, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const diagrams = [...document.querySelectorAll('.mermaid svg')];
    const toolbar = window.MarkTideMermaidToolbar;
    const outputs = [];

    for (const diagramIndex of representativeIndexes) {
      const svg = diagrams[diagramIndex];
      const clone = toolbar.prepareSvgClone(svg);
      const viewBox = clone.getAttribute('viewBox').split(/\s+/).map(Number);
      let blob;
      try {
        blob = await toolbar.svgToPngBlob(svg);
      } catch (error) {
        throw new Error(`PNG conversion failed for fixture diagram ${diagramIndex + 1}: ${error.message}`);
      }
      await toolbar.ensurePngBlob(blob);
      const bitmap = await createImageBitmap(blob);
      outputs.push({
        diagramIndex,
        foreignObjectCount: clone.querySelectorAll('foreignObject').length,
        height: bitmap.height,
        type: blob.type,
        viewBox,
        width: bitmap.width,
      });
      bitmap.close();
    }

    return outputs;
  });

  expect(results).toHaveLength(14);
  results.forEach((result) => {
    expect(result.type).toBe('image/png');
    expect(result.foreignObjectCount).toBe(0);
    expect(result.width).toBe(Math.ceil(result.viewBox[2]) * 3);
    expect(result.height).toBe(Math.ceil(result.viewBox[3]) * 3);
  });
});
