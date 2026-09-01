async function waitForMarkTide(page) {
  await page.waitForFunction(() => {
    const editor = document.getElementById('markdown-editor');
    return Boolean(
      window.MarkTideCore?.initialized
      && window.MarkTideRenderer?.initialized
      && editor?.dataset.monacoReady === 'true'
      && window.marked
      && window.DOMPurify
      && window.mermaid
    );
  });
  await page.evaluate(() => document.fonts.ready);
}

async function renderMarkdown(page, markdown) {
  await page.evaluate(async (source) => {
    const editor = document.getElementById('markdown-editor');
    editor.value = source;
    await window.MarkTideRenderer.renderMarkdown();
    await window.MarkTideRenderer.renderPipeline;
  }, markdown);
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function setTheme(page, theme) {
  await page.evaluate((nextTheme) => {
    window.MarkTideTheme.applyTheme(nextTheme, { rerender: false });
  }, theme);
}

module.exports = {
  renderMarkdown,
  setTheme,
  waitForMarkTide,
};
