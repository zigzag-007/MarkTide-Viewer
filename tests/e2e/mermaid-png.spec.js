const { expect, test } = require('playwright/test');
const { renderMarkdown, waitForMarkTide } = require('../helpers/marktide-page');

const markdown = `\`\`\`mermaid
flowchart LR
  LongLabel[A deliberately long label] --> Done[Done]
\`\`\``;

test('Mermaid PNG export creates a padded three scale PNG', async ({ page }) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, markdown);

  const result = await page.evaluate(async () => {
    const svg = document.querySelector('.mermaid svg');
    const toolbar = window.MarkTideMermaidToolbar;
    const clone = toolbar.prepareSvgClone(svg);
    const viewBox = clone.getAttribute('viewBox').split(/\s+/).map(Number);
    const labelWeights = [...clone.querySelectorAll('text, tspan')]
      .map((element) => element.style.fontWeight || element.getAttribute('font-weight'))
      .filter(Boolean);
    const blob = await toolbar.svgToPngBlob(svg);
    await toolbar.ensurePngBlob(blob);
    const signature = [...new Uint8Array(await blob.slice(0, 8).arrayBuffer())];
    const bitmap = await createImageBitmap(blob);
    const dimensions = { height: bitmap.height, width: bitmap.width };
    bitmap.close();

    return {
      dimensions,
      hasForeignObject: Boolean(clone.querySelector('foreignObject')),
      labelWeights,
      signature,
      type: blob.type,
      viewBox,
    };
  });

  expect(result.type).toBe('image/png');
  expect(result.signature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(result.hasForeignObject).toBe(false);
  expect(result.dimensions.width).toBe(Math.ceil(result.viewBox[2]) * 3);
  expect(result.dimensions.height).toBe(Math.ceil(result.viewBox[3]) * 3);
  expect(result.labelWeights).toContain('300');
});
