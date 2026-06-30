// Mermaid diagram toolbar and preview modal

class MermaidToolbar {
  constructor() {
    this.modal = null;
    this.modalContent = null;
    this.zoomLabel = null;
    this.activeContainer = null;
    this.zoom = 1;
    this.lastInteractionWasPointer = false;
  }

  init() {
    this.ensureStyles();
    this.ensureModal();
    document.addEventListener('pointerdown', () => {
      this.lastInteractionWasPointer = true;
    }, true);
    document.addEventListener('keydown', () => {
      this.lastInteractionWasPointer = false;
    }, true);
    document.addEventListener('click', (event) => this.handleClick(event));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  ensureStyles() {
    if (document.getElementById('marktide-mermaid-toolbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'marktide-mermaid-toolbar-styles';
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }

  getStyles() {
    return `
      .mermaid-toolbar {
        --marktide-toolbar-text-color: var(--text-color, #24292e);
        --marktide-toolbar-border-color: var(--border-color, #d0d7de);
        --marktide-toolbar-accent-color: var(--accent-color, #4fc3f7);
        --marktide-toolbar-button-bg-rgb: var(--button-bg-rgb, 248, 249, 250);
        --marktide-toolbar-button-hover: var(--button-hover, #e8f5fd);
        --marktide-toolbar-button-border: rgba(255, 255, 255, 0.26);
        position: absolute;
        top: 4px;
        right: 8px;
        z-index: 5;
        display: flex;
        gap: 0.35rem;
        padding: 0.35rem;
        border: 1px solid var(--marktide-toolbar-button-border);
        border-radius: 10px;
        background: rgba(var(--marktide-toolbar-button-bg-rgb), 0.76);
        -webkit-backdrop-filter: blur(12px) saturate(145%);
        backdrop-filter: blur(12px) saturate(145%);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
        transform: translateY(-2px);
      }

      :root[data-theme="dark"] .mermaid-toolbar,
      :root.dark .mermaid-toolbar,
      [data-theme="dark"] .mermaid-toolbar {
        --marktide-toolbar-text-color: var(--text-color, #e6edf3);
        --marktide-toolbar-border-color: var(--border-color, #1a1a1a);
        --marktide-toolbar-accent-color: var(--accent-color, #4fc3f7);
        --marktide-toolbar-button-bg-rgb: var(--button-bg-rgb, 26, 26, 26);
        --marktide-toolbar-button-hover: var(--button-hover, rgba(79, 195, 247, 0.1));
        --marktide-toolbar-button-border: rgba(255, 255, 255, 0.18);
      }

      :root[data-theme="light"] .mermaid-toolbar,
      :root.light .mermaid-toolbar,
      [data-theme="light"] .mermaid-toolbar {
        --marktide-toolbar-text-color: var(--text-color, #000000);
        --marktide-toolbar-border-color: var(--border-color, #e0e0e0);
        --marktide-toolbar-accent-color: var(--accent-color, #4fc3f7);
        --marktide-toolbar-button-bg-rgb: var(--button-bg-rgb, 248, 249, 250);
        --marktide-toolbar-button-hover: var(--button-hover, rgba(79, 195, 247, 0.1));
        --marktide-toolbar-button-border: rgba(0, 0, 0, 0.08);
      }

      .mermaid-container:hover .mermaid-toolbar,
      .mermaid-container:focus-within .mermaid-toolbar {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      .mermaid-toolbar-btn,
      .mermaid-modal-btn,
      .mermaid-modal-close {
        appearance: none;
        -webkit-appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        min-width: 30px;
        min-height: 30px;
        padding: 0;
        border: 1px solid var(--marktide-toolbar-button-border);
        border-radius: 8px;
        background: rgba(var(--marktide-toolbar-button-bg-rgb), 0.7) !important;
        color: var(--marktide-toolbar-text-color) !important;
        cursor: pointer;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 1;
        transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
      }

      .mermaid-toolbar-btn i,
      .mermaid-modal-btn i,
      .mermaid-modal-close i {
        font-size: 1rem;
        line-height: 1;
      }

      .mermaid-toolbar-btn:hover,
      .mermaid-modal-btn:hover,
      .mermaid-modal-close:hover {
        border-color: var(--marktide-toolbar-accent-color) !important;
        background: var(--marktide-toolbar-button-hover) !important;
        color: var(--marktide-toolbar-accent-color) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        transform: translateY(-1px);
      }

      .mermaid-container[data-mermaid-status]::after {
        content: attr(data-mermaid-status);
        position: absolute;
        top: 7px;
        right: 136px;
        z-index: 6;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid var(--marktide-toolbar-button-border);
        background: rgba(var(--marktide-toolbar-button-bg-rgb), 0.84);
        color: var(--marktide-toolbar-text-color);
        font-size: 12px;
        font-weight: 600;
        line-height: 30px;
        white-space: nowrap;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
      }

      .mermaid-modal-overlay {
        --marktide-toolbar-text-color: var(--text-color, #24292e);
        --marktide-toolbar-border-color: var(--border-color, #d0d7de);
        --marktide-toolbar-accent-color: var(--accent-color, #4fc3f7);
        --marktide-toolbar-button-bg-rgb: var(--button-bg-rgb, 248, 249, 250);
        --marktide-toolbar-button-hover: var(--button-hover, #e8f5fd);
        --marktide-toolbar-button-border: rgba(255, 255, 255, 0.26);
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 32px 88px;
        background: rgba(0, 0, 0, 0.82);
        backdrop-filter: blur(3px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }

      :root[data-theme="dark"] .mermaid-modal-overlay,
      :root.dark .mermaid-modal-overlay,
      [data-theme="dark"] .mermaid-modal-overlay {
        --marktide-toolbar-text-color: var(--text-color, #e6edf3);
        --marktide-toolbar-border-color: var(--border-color, #1a1a1a);
        --marktide-toolbar-accent-color: var(--accent-color, #4fc3f7);
        --marktide-toolbar-button-bg-rgb: var(--button-bg-rgb, 26, 26, 26);
        --marktide-toolbar-button-hover: var(--button-hover, rgba(79, 195, 247, 0.1));
        --marktide-toolbar-button-border: rgba(255, 255, 255, 0.18);
      }

      :root[data-theme="light"] .mermaid-modal-overlay,
      :root.light .mermaid-modal-overlay,
      [data-theme="light"] .mermaid-modal-overlay {
        --marktide-toolbar-text-color: var(--text-color, #000000);
        --marktide-toolbar-border-color: var(--border-color, #e0e0e0);
        --marktide-toolbar-accent-color: var(--accent-color, #4fc3f7);
        --marktide-toolbar-button-bg-rgb: var(--button-bg-rgb, 248, 249, 250);
        --marktide-toolbar-button-hover: var(--button-hover, rgba(79, 195, 247, 0.1));
        --marktide-toolbar-button-border: rgba(0, 0, 0, 0.08);
      }

      .mermaid-modal-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }

      .mermaid-modal-stage {
        width: min(92vw, 1300px);
        max-height: 78vh;
        overflow: auto;
        scrollbar-gutter: stable both-edges;
        background: #ffffff;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
      }

      .mermaid-modal-stage,
      .mermaid-modal-stage * {
        box-sizing: border-box;
      }

      .mermaid-modal-content {
        width: 100%;
        min-width: 0;
        min-height: 260px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        overflow: visible;
      }

      .mermaid-modal-content svg {
        display: block;
        max-width: 100%;
        height: auto;
        transform-origin: center center;
        transition: transform 0.15s ease;
      }

      .mermaid-modal-content svg.is-zoomed {
        max-width: none;
      }

      .mermaid-modal-toolbar {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px;
        border: 1px solid var(--marktide-toolbar-button-border);
        border-radius: 10px;
        background: rgba(var(--marktide-toolbar-button-bg-rgb), 0.84);
        -webkit-backdrop-filter: blur(12px) saturate(145%);
        backdrop-filter: blur(12px) saturate(145%);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
      }

      .mermaid-modal-zoom {
        min-width: 48px;
        color: var(--marktide-toolbar-text-color);
        font-size: 13px;
        font-weight: 600;
        text-align: center;
      }

      .mermaid-modal-divider {
        width: 1px;
        height: 22px;
        margin: 0 4px;
        background: var(--marktide-toolbar-border-color);
      }

      .mermaid-modal-close {
        position: fixed;
        top: 18px;
        right: 18px;
        background: rgba(var(--marktide-toolbar-button-bg-rgb), 0.84);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
      }

      @media print {
        .mermaid-toolbar,
        .mermaid-modal-overlay {
          display: none !important;
        }
      }

      @media (max-width: 640px) {
        .mermaid-container[data-mermaid-status]::after {
          top: 50px;
          right: 8px;
        }
      }
    `;
  }

  enhance(root = document) {
    root.querySelectorAll('.mermaid-container').forEach((container) => {
      if (container.dataset.mermaidToolbarReady === 'true') return;
      if (!container.querySelector('.mermaid svg')) return;

      container.dataset.mermaidToolbarReady = 'true';
      container.insertAdjacentHTML('beforeend', this.getToolbarHtml());
    });
  }

  getToolbarHtml() {
    return `
      <div class="mermaid-toolbar" aria-label="Mermaid diagram actions">
        <button type="button" class="mermaid-toolbar-btn" data-mermaid-action="copy" title="Copy Mermaid code" aria-label="Copy Mermaid code" data-marktide-tip="Copy code">
          <i class="bi bi-clipboard"></i>
        </button>
        <button type="button" class="mermaid-toolbar-btn" data-mermaid-action="zoom" title="Open diagram preview" aria-label="Open diagram preview" data-marktide-tip="Preview">
          <i class="bi bi-zoom-in"></i>
        </button>
        <button type="button" class="mermaid-toolbar-btn" data-mermaid-action="download" title="Download diagram image" aria-label="Download diagram image" data-marktide-tip="Download">
          <i class="bi bi-download"></i>
        </button>
      </div>
    `;
  }

  ensureModal() {
    if (this.modal) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="mermaid-modal-overlay" aria-hidden="true">
        <button type="button" class="mermaid-modal-close" data-mermaid-modal-action="close" title="Close preview" aria-label="Close preview">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="mermaid-modal-stage">
          <div class="mermaid-modal-content"></div>
        </div>
        <div class="mermaid-modal-toolbar" aria-label="Mermaid preview actions">
          <button type="button" class="mermaid-modal-btn" data-mermaid-modal-action="zoom-out" title="Zoom out" aria-label="Zoom out">
            <i class="bi bi-dash-lg"></i>
          </button>
          <span class="mermaid-modal-zoom">100%</span>
          <button type="button" class="mermaid-modal-btn" data-mermaid-modal-action="zoom-in" title="Zoom in" aria-label="Zoom in">
            <i class="bi bi-plus-lg"></i>
          </button>
          <span class="mermaid-modal-divider"></span>
          <button type="button" class="mermaid-modal-btn" data-mermaid-modal-action="copy" title="Copy Mermaid code" aria-label="Copy Mermaid code">
            <i class="bi bi-clipboard"></i>
          </button>
          <button type="button" class="mermaid-modal-btn" data-mermaid-modal-action="download" title="Download diagram image" aria-label="Download diagram image">
            <i class="bi bi-download"></i>
          </button>
        </div>
      </div>
    `);

    this.modal = document.querySelector('.mermaid-modal-overlay');
    this.modalContent = this.modal.querySelector('.mermaid-modal-content');
    this.zoomLabel = this.modal.querySelector('.mermaid-modal-zoom');
  }

  handleClick(event) {
    const toolbarButton = event.target.closest('[data-mermaid-action]');
    if (toolbarButton) {
      const container = toolbarButton.closest('.mermaid-container');
      this.runAction(toolbarButton.dataset.mermaidAction, container);
      this.releasePointerFocus(toolbarButton);
      return;
    }

    const modalButton = event.target.closest('[data-mermaid-modal-action]');
    if (modalButton) {
      this.runModalAction(modalButton.dataset.mermaidModalAction);
      this.releasePointerFocus(modalButton);
      return;
    }

    if (event.target === this.modal) {
      this.closeModal();
    }
  }

  runAction(action, container) {
    if (!container) return;

    if (action === 'copy') {
      this.copySource(container);
    } else if (action === 'download') {
      this.downloadDiagram(container);
    } else if (action === 'zoom') {
      this.openModal(container);
    }
  }

  runModalAction(action) {
    if (action === 'close') {
      this.closeModal();
    } else if (action === 'zoom-in') {
      this.setZoom(this.zoom + 0.1);
    } else if (action === 'zoom-out') {
      this.setZoom(this.zoom - 0.1);
    } else if (action === 'copy' && this.activeContainer) {
      this.copySource(this.activeContainer);
    } else if (action === 'download' && this.activeContainer) {
      this.downloadDiagram(this.activeContainer);
    }
  }

  releasePointerFocus(button) {
    if (!this.lastInteractionWasPointer || !button) return;

    window.requestAnimationFrame(() => {
      if (document.activeElement === button) {
        button.blur();
      }
    });
  }

  getSource(container) {
    try {
      return decodeURIComponent(container.dataset.mermaidSource || '');
    } catch (e) {
      return '';
    }
  }

  async copySource(container) {
    const source = this.getSource(container);
    if (!source) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(source);
      } else {
        this.copyWithTextarea(source);
      }
      this.flash(container, 'Copied');
    } catch (e) {
      console.warn('Failed to copy Mermaid source:', e);
    }
  }

  copyWithTextarea(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  async downloadDiagram(container) {
    const svg = container.querySelector('.mermaid svg');
    if (!svg) return;

    const filenameBase = this.getDownloadFilename(container);
    this.flash(container, 'Preparing');

    try {
      const blob = await this.svgToPngBlob(svg);
      await this.ensurePngBlob(blob);
      this.downloadBlob(blob, `${filenameBase}.png`);
      this.flash(container, 'Downloaded');
    } catch (e) {
      if (e && e.name === 'AbortError') {
        this.flash(container, 'Cancelled');
        return;
      }

      console.warn('Failed to download Mermaid diagram:', e);
      try {
        this.downloadSvg(svg, `${filenameBase}.svg`);
        this.flash(container, 'Downloaded SVG');
      } catch (fallbackError) {
        console.warn('Failed to download Mermaid SVG fallback:', fallbackError);
        this.flash(container, 'Download failed');
      }
    }
  }

  downloadSvg(svg, filename) {
    this.downloadBlob(
      new Blob([this.svgToString(svg)], { type: 'image/svg+xml;charset=utf-8' }),
      filename
    );
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  getDownloadFilename(container) {
    const source = this.getSource(container);
    const firstLine = (source.split(/\r?\n/).find((line) => line.trim()) || 'mermaid-diagram').trim();
    const diagramType = firstLine.split(/\s+/)[0] || 'mermaid';
    const safeType = diagramType
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${safeType || 'mermaid'}-diagram`;
  }

  async ensurePngBlob(blob) {
    if (!blob || blob.type !== 'image/png' || blob.size < 8) {
      throw new Error('PNG export produced an invalid image blob');
    }

    const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isPng = pngSignature.every((byte, index) => signature[index] === byte);

    if (!isPng) {
      throw new Error('PNG export produced a non-PNG blob');
    }
  }

  svgToString(svg) {
    const clone = this.prepareSvgClone(svg);
    return new XMLSerializer().serializeToString(clone);
  }

  prepareSvgClone(svg) {
    if (!window.MarkTideMermaidShared) {
      throw new Error('Mermaid export helper is unavailable');
    }

    return window.MarkTideMermaidShared.prepareSvgClone(svg);
  }

  svgToPngBlob(svg) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const exportSvg = this.prepareSvgClone(svg);
      const source = new XMLSerializer().serializeToString(exportSvg);
      const image = new Image();
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const viewBox = exportSvg.getAttribute('viewBox');
      const box = viewBox ? viewBox.split(/\s+/).map(Number) : [];
      const width = Math.ceil(box[2] || exportSvg.getAttribute('width') || 1200);
      const height = Math.ceil(box[3] || exportSvg.getAttribute('height') || 800);
      const fail = (error) => {
        if (settled) return;

        settled = true;
        URL.revokeObjectURL(url);
        reject(error);
      };

      const timer = setTimeout(() => {
        fail(new Error('SVG image export timed out'));
      }, 4000);

      image.onload = () => {
        if (settled) return;

        const canvas = document.createElement('canvas');
        const exportScale = 3;
        canvas.width = width * exportScale;
        canvas.height = height * exportScale;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          clearTimeout(timer);
          URL.revokeObjectURL(url);
          settled = true;
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas export failed'));
          }
        }, 'image/png');
      };

      image.onerror = () => {
        clearTimeout(timer);
        fail(new Error('SVG image load failed'));
      };

      image.src = url;
    });
  }

  openModal(container) {
    const svg = container.querySelector('.mermaid svg');
    if (!svg) return;

    this.activeContainer = container;
    this.zoom = 1;
    this.modalContent.innerHTML = '';
    const modalSvg = svg.cloneNode(true);
    if (window.MarkTideMermaidShared && window.MarkTideMermaidShared.sanitizeSvgInteractions) {
      window.MarkTideMermaidShared.sanitizeSvgInteractions(modalSvg);
    }
    this.modalContent.appendChild(modalSvg);
    this.setZoom(this.zoom);
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');
  }

  closeModal() {
    if (!this.modal) return;

    this.modal.classList.remove('open');
    this.modal.setAttribute('aria-hidden', 'true');
    this.modalContent.innerHTML = '';
    this.activeContainer = null;
  }

  setZoom(value) {
    this.zoom = Math.min(3, Math.max(0.5, Number(value.toFixed(2))));
    this.zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    const svg = this.modalContent.querySelector('svg');
    if (svg) {
      svg.classList.toggle('is-zoomed', this.zoom > 1);
      svg.style.transform = `scale(${this.zoom})`;
    }
  }

  flash(container, message) {
    container.dataset.mermaidStatus = message;
    setTimeout(() => {
      delete container.dataset.mermaidStatus;
    }, 1200);
  }
}

window.MarkTideMermaidToolbar = new MermaidToolbar();
window.MarkTideMermaidToolbar.init();
