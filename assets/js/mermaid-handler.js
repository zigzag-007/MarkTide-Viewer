// Mermaid diagram handling functionality

class MermaidHandler {
  constructor() {
    this.renderToken = 0;
    this.renderChain = Promise.resolve();
  }

  getSharedHelper() {
    const helper = window.MarkTideMermaidShared;
    if (!helper
      || typeof helper.renderDiagrams !== 'function') {
      throw new Error('Shared Mermaid helper is required for preview rendering.');
    }

    return helper;
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

  async renderDiagrams(container) {
    const renderToken = ++this.renderToken;
    const diagrams = Array.from(container.querySelectorAll('.mermaid'));
    if (!diagrams.length) return;

    const runRender = async () => {
      if (renderToken !== this.renderToken || !container.isConnected) {
        return;
      }

      const currentDiagrams = diagrams.filter((diagram) => {
        return diagram.isConnected && container.contains(diagram) && !diagram.querySelector('svg');
      });

      if (!currentDiagrams.length) return;

      await this.getSharedHelper().renderDiagrams(container, {
        mode: 'preview',
        theme: document.documentElement.getAttribute('data-theme'),
        nodes: currentDiagrams,
      });
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

    } catch (e) {
      if (renderToken !== this.renderToken) {
        return;
      }
      console.warn("Mermaid rendering failed:", e);
    }
  }

}

// Create global instance
window.MarkTideMermaid = new MermaidHandler();
