async function collectMermaidGeometry(page, rootSelector = '#markdown-preview') {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    const containers = [...root.querySelectorAll('.mermaid-container')];

    return containers.map((container, diagramIndex) => {
      const svg = container.querySelector('.mermaid svg');
      if (!svg) {
        return { diagramIndex, problems: ['missing SVG'] };
      }

      const problems = [];
      const role = svg.getAttribute('aria-roledescription') || '';
      const isError = role.toLowerCase() === 'error' || Boolean(svg.querySelector('#error-icon'));
      const viewBox = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
      const svgBounds = svg.getBoundingClientRect();
      const labelKeys = new Set();

      if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
        problems.push('invalid viewBox');
      }
      if (svgBounds.width <= 0 || svgBounds.height <= 0) {
        problems.push('empty rendered bounds');
      }

      [...svg.querySelectorAll('text, foreignObject')].forEach((label) => {
        const text = (label.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return;

        const bounds = label.getBoundingClientRect();
        const tolerance = 2;
        if (
          bounds.left < svgBounds.left - tolerance
          || bounds.top < svgBounds.top - tolerance
          || bounds.right > svgBounds.right + tolerance
          || bounds.bottom > svgBounds.bottom + tolerance
        ) {
          problems.push(`cropped label: ${text.slice(0, 60)}`);
        }

        const key = [
          text,
          Math.round(bounds.x * 2) / 2,
          Math.round(bounds.y * 2) / 2,
          Math.round(bounds.width * 2) / 2,
          Math.round(bounds.height * 2) / 2,
        ].join('|');
        if (labelKeys.has(key)) {
          problems.push(`duplicate label: ${text.slice(0, 60)}`);
        }
        labelKeys.add(key);
      });

      return {
        diagramIndex,
        isError,
        labelCount: labelKeys.size,
        problems: [...new Set(problems)],
        role,
        toolbarCount: container.querySelectorAll('.mermaid-toolbar').length,
      };
    });
  }, rootSelector);
}

module.exports = {
  collectMermaidGeometry,
};
