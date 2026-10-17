const { expect, test } = require('playwright/test');
const { loadFixture } = require('../helpers/fixture-loader');
const { collectMermaidGeometry } = require('../helpers/geometry');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');

const mermaidFixture = loadFixture('03_mermaid_diagrams.md');

test.describe('full Mermaid fixture', () => {
  test.describe.configure({ mode: 'serial' });

  for (const theme of ['light', 'dark']) {
    test(`renders all 25 diagrams without geometry errors in ${theme} mode`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/index.html');
      await waitForMarkTide(page);
      await setTheme(page, theme);
      await renderMarkdown(page, mermaidFixture);

      const diagrams = await collectMermaidGeometry(page);
      expect(diagrams).toHaveLength(25);
      expect(diagrams.filter((diagram) => diagram.isError)).toEqual([]);
      expect(diagrams.filter((diagram) => diagram.toolbarCount !== 1)).toEqual([]);
      expect(
        diagrams.filter((diagram) => diagram.labelCount === 0 && diagram.diagramIndex !== 23)
      ).toEqual([]);
      expect(diagrams[23].labelCount).toBe(0);
      expect(diagrams.filter((diagram) => diagram.problems.length > 0)).toEqual([]);
    });
  }
});
