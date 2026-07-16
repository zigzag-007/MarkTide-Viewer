// Mermaid diagram handling functionality

class MermaidHandler {
  constructor() {
    this.initialized = false;
    this.renderToken = 0;
    this.renderChain = Promise.resolve();
    this.currentTheme = null;
  }

  getSharedHelper() {
    const helper = window.MarkTideMermaidShared;
    if (!helper
      || typeof helper.getMermaidConfig !== 'function'
      || typeof helper.stabilizeMermaidDiagrams !== 'function') {
      throw new Error('Shared Mermaid helper is required for preview rendering.');
    }

    return helper;
  }

  getMermaidConfig(options = {}) {
    return this.getSharedHelper().getMermaidConfig(options);
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
    this.getSharedHelper().stabilizeMermaidDiagrams(container);
  }

}

// Create global instance
window.MarkTideMermaid = new MermaidHandler();
