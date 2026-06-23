// Mermaid diagram handling functionality

class MermaidHandler {
  constructor() {
    this.initialized = false;
    this.renderToken = 0;
    this.renderChain = Promise.resolve();
    this.currentTheme = null;
  }

  getDiagramFontFamily() {
    return '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
  }

  getThemeName(theme, mode = 'preview') {
    if (mode === 'pdf') {
      return 'neutral';
    }

    return 'default';
  }

  getThemeVariables() {
    return {
      fontFamily: this.getDiagramFontFamily()
    };
  }

  getMermaidConfig(options = {}) {
    const mode = options.mode || 'preview';
    const theme = options.theme || document.documentElement.getAttribute("data-theme") || 'light';
    const htmlLabels = mode !== 'pdf';

    return {
      startOnLoad: false,
      theme: this.getThemeName(theme, mode),
      themeVariables: this.getThemeVariables(theme, mode),
      securityLevel: 'loose',
      htmlLabels: htmlLabels,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: htmlLabels,
        curve: 'basis',
        nodeSpacing: 60,
        rankSpacing: 70
      },
      fontSize: 16
    };
  }

  getReadableTextColor(fill) {
    if (!fill || fill === 'none' || fill.startsWith('url(')) {
      return null;
    }

    const namedColors = {
      black: '#000000',
      white: '#ffffff',
      red: '#ff0000',
      orange: '#ffa500',
      yellow: '#ffff00',
      green: '#008000',
      blue: '#0000ff',
      purple: '#800080',
      gray: '#808080',
      grey: '#808080'
    };

    let color = fill.trim().toLowerCase();
    color = namedColors[color] || color;

    let red;
    let green;
    let blue;

    const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex.split('').map((part) => part + part).join('');
      }
      red = parseInt(hex.slice(0, 2), 16);
      green = parseInt(hex.slice(2, 4), 16);
      blue = parseInt(hex.slice(4, 6), 16);
    } else {
      const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (!rgbMatch) {
        return null;
      }
      red = Number(rgbMatch[1]);
      green = Number(rgbMatch[2]);
      blue = Number(rgbMatch[3]);
    }

    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance < 0.48 ? '#ffffff' : '#24292e';
  }

  getNodeFill(shape) {
    const computedFill = window.getComputedStyle(shape).fill;
    return computedFill || shape.getAttribute('fill') || shape.style.fill;
  }

  improveNodeLabelContrast(container) {
    container.querySelectorAll('.mermaid svg').forEach((svg) => {
      const diagram = svg.closest('.mermaid');
      if (!diagram || diagram.dataset.mermaidType !== 'flowchart') return;

      svg.querySelectorAll('g.node').forEach((node) => {
        const shape = node.querySelector('rect, polygon, circle, ellipse');
        if (!shape) return;

        const fill = this.getNodeFill(shape);
        const readableColor = this.getReadableTextColor(fill);
        if (!readableColor) return;

        shape.setAttribute('stroke', '#24292e');
        shape.setAttribute('stroke-width', '1');
        shape.style.setProperty('stroke', '#24292e', 'important');
        shape.style.setProperty('stroke-width', '1px', 'important');

        node.querySelectorAll('text, tspan, .nodeLabel, .label, foreignObject div, foreignObject span, foreignObject p').forEach((label) => {
          label.setAttribute('fill', readableColor);
          label.style.setProperty('color', readableColor, 'important');
          label.style.setProperty('fill', readableColor, 'important');
        });
      });
    });
  }

  setSolidEdgeLabelBackground(rect) {
    rect.setAttribute('fill', '#e8f5e8');
    rect.setAttribute('fill-opacity', '1');
    rect.setAttribute('opacity', '1');
    rect.setAttribute('stroke', 'none');
    rect.style.setProperty('fill', '#e8f5e8', 'important');
    rect.style.setProperty('fill-opacity', '1', 'important');
    rect.style.setProperty('opacity', '1', 'important');
    rect.style.setProperty('stroke', 'none', 'important');
  }

  stabilizeEdgeLabels(container) {
    container.querySelectorAll('.mermaid svg').forEach((svg) => {
      svg.querySelectorAll('.edgeLabel').forEach((edgeLabel) => {
        const labelText = (edgeLabel.textContent || '').trim();
        if (!labelText) return;

        edgeLabel.style.setProperty('background-color', '#e8f5e8', 'important');
        edgeLabel.style.setProperty('color', '#24292e', 'important');

        edgeLabel.querySelectorAll('foreignObject').forEach((foreignObject) => {
          const width = Number(foreignObject.getAttribute('width')) || 0;
          const height = Number(foreignObject.getAttribute('height')) || 0;
          if (width > 0) {
            foreignObject.setAttribute('x', '-4');
            foreignObject.setAttribute('width', String(width + 8));
          }
          if (height > 0) {
            foreignObject.setAttribute('y', '-2');
            foreignObject.setAttribute('height', String(height + 4));
          }
          foreignObject.style.setProperty('overflow', 'visible', 'important');
        });

        edgeLabel.querySelectorAll('foreignObject div, foreignObject span, foreignObject p').forEach((labelPart) => {
          labelPart.style.setProperty('display', 'inline-block', 'important');
          labelPart.style.setProperty('padding', '0 2px', 'important');
          labelPart.style.setProperty('line-height', '1.25', 'important');
          labelPart.style.setProperty('background-color', '#e8f5e8', 'important');
          labelPart.style.setProperty('color', '#24292e', 'important');
          labelPart.style.setProperty('box-decoration-break', 'clone', 'important');
          labelPart.style.setProperty('-webkit-box-decoration-break', 'clone', 'important');
        });

        edgeLabel.querySelectorAll('rect, .label rect').forEach((rect) => {
          this.setSolidEdgeLabelBackground(rect);
        });

        if (edgeLabel.parentNode) {
          edgeLabel.parentNode.appendChild(edgeLabel);
        }
      });
    });
  }

  markDiagramTypes(container) {
    container.querySelectorAll('.mermaid').forEach((diagram) => {
      if (diagram.dataset.mermaidType) return;

      const source = (diagram.textContent || '').trim().toLowerCase();
      const firstLine = source.split(/\r?\n/)[0] || '';
      const diagramType = firstLine.split(/\s+/)[0] || 'unknown';
      diagram.dataset.mermaidType = diagramType === 'graph' ? 'flowchart' : diagramType;
    });
  }

  async waitForStableLayout(container) {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn("Mermaid font readiness check failed:", e);
      }
    }

    await new Promise((resolve) => requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    }));

    if (container && container.offsetWidth === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  initMermaid() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (this.initialized && this.currentTheme === currentTheme) {
      return;
    }

    mermaid.initialize(this.getMermaidConfig({
      mode: 'preview',
      theme: currentTheme
    }));

    this.currentTheme = currentTheme;
    this.initialized = true;
  }

  async renderDiagrams(container) {
    const renderToken = ++this.renderToken;
    const diagrams = Array.from(container.querySelectorAll('.mermaid'));
    if (!diagrams.length) return;

    const runRender = async () => {
      if (renderToken !== this.renderToken || !container.isConnected) {
        return;
      }

      this.initMermaid();

      const currentDiagrams = diagrams.filter((diagram) => {
        return diagram.isConnected && container.contains(diagram) && !diagram.querySelector('svg');
      });

      if (!currentDiagrams.length) return;

      const renderResult = mermaid.run
        ? mermaid.run({ nodes: currentDiagrams })
        : mermaid.init(undefined, currentDiagrams);

      if (renderResult && typeof renderResult.then === 'function') {
        await renderResult;
      }
    };

    try {
      this.markDiagramTypes(container);
      await this.waitForStableLayout(container);

      if (renderToken !== this.renderToken || !container.isConnected) {
        return;
      }

      this.renderChain = this.renderChain.catch(() => {}).then(runRender);
      await this.renderChain;

      if (renderToken !== this.renderToken || !container.isConnected) {
        return;
      }

      this.afterRender(container);
    } catch (e) {
      if (renderToken !== this.renderToken) {
        return;
      }
      console.warn("Mermaid rendering failed:", e);
    }
  }

  afterRender(container) {
    this.improveNodeLabelContrast(container);
    this.stabilizeEdgeLabels(container);
  }

  // Get theme variables for print mode (always light)
  getPrintThemeVariables() {
    return this.getThemeVariables('light', 'pdf');
  }

  initForPrint(printWindow) {
    printWindow.mermaid.initialize(this.getMermaidConfig({
      mode: 'pdf',
      theme: 'light'
    }));
  }
}

// Create global instance
window.MarkTideMermaid = new MermaidHandler();
