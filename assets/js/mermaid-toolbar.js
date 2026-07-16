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

  getSharedHelper() {
    const helper = window.MarkTideMermaidShared;
    if (!helper
      || typeof helper.prepareSvgClone !== 'function'
      || typeof helper.sanitizeSvgInteractions !== 'function') {
      throw new Error('Shared Mermaid helper is required for diagram tools.');
    }

    return helper;
  }

  init() {
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
    return this.getSharedHelper().prepareSvgClone(svg);
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
    this.getSharedHelper().sanitizeSvgInteractions(modalSvg);
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
