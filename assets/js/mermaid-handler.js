// Mermaid diagram handling functionality

class MermaidHandler {
  constructor() {
    this.initialized = false;
    this.renderToken = 0;
    this.renderChain = Promise.resolve();
    this.currentTheme = null;
  }

  getDiagramFontFamily() {
    return window.MarkTideMermaidShared
      ? window.MarkTideMermaidShared.getDiagramFontFamily()
      : '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
  }

  getThemeName(theme, mode = 'preview') {
    if (mode === 'pdf') {
      return 'neutral';
    }

    return 'default';
  }

  getThemeVariables() {
    return window.MarkTideMermaidShared
      ? window.MarkTideMermaidShared.getThemeVariables()
      : { fontFamily: this.getDiagramFontFamily() };
  }

  getMermaidConfig(options = {}) {
    if (window.MarkTideMermaidShared) {
      return window.MarkTideMermaidShared.getMermaidConfig(options);
    }

    const mode = options.mode || 'preview';
    const htmlLabels = mode !== 'pdf';

    return {
      startOnLoad: false,
      theme: this.getThemeName(options.theme, mode),
      themeVariables: this.getThemeVariables(),
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
    if (window.MarkTideMermaidShared) {
      window.MarkTideMermaidShared.stabilizeMermaidDiagrams(container);
    }
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
