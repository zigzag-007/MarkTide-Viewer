// Import and export functionality for markdown files

/** Same markup as preview (markdown-renderer.js) for exported HTML code blocks */
function marktideExportWrapButtonHtml() {
  const wrapSvg =
    '<svg class="wrap-code-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><line x1="1.5" y1="3.5" x2="14" y2="3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="1.5" y1="8" x2="9.5" y2="8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="1.5" y1="12.5" x2="6" y2="12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const unwrapSvg =
    '<svg class="wrap-code-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><line x1="1.75" y1="3.5" x2="14.25" y2="3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="4.25" y1="8" x2="11.75" y2="8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="5.75" y1="12.5" x2="10.25" y2="12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  return (
    '<button type="button" class="wrap-code-btn" aria-hidden="true" tabindex="-1" aria-pressed="false" title="Wrap long lines" aria-label="Wrap long lines" data-marktide-tip="Wrap long lines">' +
    '<span class="wrap-code-icon wrap-code-icon--wrap">' +
    wrapSvg +
    "</span>" +
    '<span class="wrap-code-icon wrap-code-icon--unwrap">' +
    unwrapSvg +
    "</span></button>"
  );
}

function marktideExportEncodeMermaidSource(source) {
  return encodeURIComponent(source || '');
}

function marktideExportMermaidToolbarScript() {
  if (typeof MermaidToolbar !== 'function') return '';

  return `
    ${MermaidToolbar.toString()}
    window.MarkTideMermaidToolbar = new MermaidToolbar();
    window.MarkTideMermaidToolbar.init();
    window.MarkTideMermaidToolbar.enhance(document);
  `;
}

class ImportExportManager {
  constructor() {
    this.fileInput = null;
    this.dropzone = null;
    this.closeDropzoneBtn = null;
    this.markdownEditor = null;
    this.editorPane = null;
  }

  // CSS and JavaScript minification utilities
  minifyCSS(css) {
    return css
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove excess whitespace and newlines
      .replace(/\s+/g, ' ')
      // Remove spaces around certain characters
      .replace(/\s*([{}:;,>+~])\s*/g, '$1')
      // Remove trailing semicolons before closing braces
      .replace(/;}/g, '}')
      // Remove leading/trailing whitespace
      .trim();
  }

  minifyJS(js) {
    return js
      // Remove single-line comments (but preserve URLs and regex)
      .replace(/\/\/(?![^\r\n]*['"`]).*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove excess whitespace and newlines
      .replace(/\s+/g, ' ')
      // Remove spaces around operators and punctuation
      .replace(/\s*([=+\-*/%<>!&|?:;,(){}[\]])\s*/g, '$1')
      // Add back necessary spaces for keywords
      .replace(/}(if|else|for|while|function|var|let|const|return)/g, '} $1')
      .replace(/(if|else|for|while|function|var|let|const|return)([({])/g, '$1 $2')
      // Remove leading/trailing whitespace
      .trim();
  }

  getDecimalOutlineListStyles(textColor) {
    return `
        .markdown-body ol,
        .markdown-body ol ol {
            list-style: none !important;
            padding-left: 2.2em !important;
            margin-left: 0 !important;
            counter-reset: item !important;
        }

        .markdown-body ol li {
            list-style: none !important;
            color: ${textColor} !important;
        }

        .markdown-body ol li::marker {
            content: "" !important;
        }

        .markdown-body ol > li {
            counter-increment: item !important;
            position: relative !important;
        }

        .markdown-body ol > li::before {
            content: counters(item, ".") ". " !important;
            position: absolute !important;
            left: -2.2em !important;
            width: 2.2em !important;
            padding-right: 0.2em !important;
            box-sizing: border-box !important;
            text-align: right !important;
            font-weight: 600 !important;
            color: ${textColor} !important;
        }
    `;
  }

  // SINGLE SOURCE OF TRUTH: plain text conversion used by both copy-as-text and export-as-txt
  generatePlainTextFromMarkdown(markdown) {
    // First, normalize Markdown tables into readable rows
    const convertTables = (text) => {
      const lines = text.split('\n');
      const output = [];
      let buffer = [];
      const isSeparatorRow = (line) => /^(\s*\|)?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+(\|\s*)?$/.test(line.trim());
      const isTableRow = (line) => /\|/.test(line) && !/^\s*\|\s*$/.test(line.trim());
      const flushTable = () => {
        if (buffer.length === 0) return;
        const rows = [];
        for (const raw of buffer) {
          const line = raw.trim();
          if (isSeparatorRow(line)) continue; // skip --- separator row
          // Strip leading/trailing pipe and split
          const cols = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
          if (cols.every(c => c === '')) continue; // skip empty rows like ||||
          rows.push(cols.join(' \u2502 ')); // nice vertical separator
        }
        if (rows.length) {
          output.push(rows.join('\n'));
          output.push(''); // blank line after table
        }
        buffer = [];
      };
      for (const line of lines) {
        if (isTableRow(line)) {
          buffer.push(line);
        } else {
          flushTable();
          output.push(line);
        }
      }
      flushTable();
      return output.join('\n');
    };

    const withTables = convertTables(markdown);

    return withTables
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // Remove images, keep alt text
      .replace(/^[\s]*[-\*\+]\s+/gm, '• ') // Convert lists to bullets
      .replace(/^[\s]*\d+\.\s+/gm, '• ') // Convert numbered lists to bullets
      .replace(/^>\s+/gm, '') // Remove blockquotes
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks (incl. mermaid)
      .replace(/---+/g, '') // Remove horizontal rules
      .trim();
  }

  init() {
    this.fileInput = document.getElementById("file-input");
    this.dropzone = document.getElementById("dropzone");
    this.closeDropzoneBtn = document.getElementById("close-dropzone");
    this.markdownEditor = document.getElementById("markdown-editor");
    this.editorPane = document.querySelector(".editor-pane");
    
    this.setupEventListeners();
    this.setupDragAndDrop();
  }

  // helper to close mobile menu
  closeMobileMenu() {
    document.body.dispatchEvent(new CustomEvent("marktide-mobile-menu-close", { bubbles: true }));

    // Ensure any open mobile export dropdown is closed too.
    const mobileExportButton = document.getElementById("mobile-print-button");
    if (mobileExportButton && window.bootstrap && window.bootstrap.Dropdown) {
      const dropdownInstance = window.bootstrap.Dropdown.getOrCreateInstance(mobileExportButton);
      dropdownInstance.hide();
    }
  }

  setupEventListeners() {
    const importButton = document.getElementById("import-button");
    const mobileImportBtn = document.getElementById("mobile-import-button");
    const copyDropdownBtn = document.getElementById("copy-button");
    const copyAsMarkdown = document.getElementById("copy-as-markdown");
    const copyAsText = document.getElementById("copy-as-text");

    // Export buttons
    const exportMarkdown = document.getElementById("export-markdown");
    const exportHtml = document.getElementById("export-html");
    const exportTxt = document.getElementById("export-txt");
    const exportPdf = document.getElementById("export-pdf");
    
    // Mobile export buttons
    const mobileExportMarkdown = document.getElementById("mobile-export-markdown");
    const mobileExportHtml = document.getElementById("mobile-export-html");
    const mobileExportTxt = document.getElementById("mobile-export-txt");
    const mobileExportPdf = document.getElementById("mobile-export-pdf");

    if (importButton) {
      importButton.addEventListener("click", () => this.fileInput.click());
    }

    if (mobileImportBtn) {
      mobileImportBtn.addEventListener("click", () => this.fileInput.click());
    }

    if (this.fileInput) {
      this.fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          this.importMarkdownFile(file);
        }
        this.fileInput.value = "";
      });
    }

    // Copy dropdown actions (markdown/text)
    if (copyAsMarkdown && copyDropdownBtn) {
      copyAsMarkdown.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          const markdownText = this.markdownEditor.value;
          if (window.MarkTideUtils && window.MarkTideUtils.copyToClipboard) {
            window.MarkTideUtils.copyToClipboard(markdownText, copyDropdownBtn);
          }
        } catch (e) {
          console.error("Copy failed:", e);
          alert("Failed to copy text: " + e.message);
        }
      });
    }

    if (copyAsText && copyDropdownBtn) {
      copyAsText.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          const markdownText = this.markdownEditor.value;
          const plainText = this.generatePlainTextFromMarkdown(markdownText);
          if (window.MarkTideUtils && window.MarkTideUtils.copyToClipboard) {
            window.MarkTideUtils.copyToClipboard(plainText, copyDropdownBtn);
          }
        } catch (e) {
          console.error("Copy failed:", e);
          alert("Failed to copy text: " + e.message);
        }
      });
    }

    if (this.closeDropzoneBtn) {
      this.closeDropzoneBtn.addEventListener("click", (e) => {
        e.stopPropagation(); 
        this.dropzone.style.display = "none";
        this.unhighlightEditor();
        this.refreshLayoutAfterDropzoneChange();
      });
    }

    if (this.dropzone) {
      this.dropzone.addEventListener("click", (e) => {
        if (e.target !== this.closeDropzoneBtn && !this.closeDropzoneBtn.contains(e.target)) {
          this.fileInput.click();
        }
      });
    }

    // Export event listeners
    if (exportMarkdown) {
      exportMarkdown.addEventListener("click", () => {
        this.closeMobileMenu();
        this.downloadMarkdown();
      });
    }
    if (exportHtml) {
      exportHtml.addEventListener("click", () => {
        this.closeMobileMenu();
        this.exportAsHTML();
      });
    }
    if (exportTxt) {
      exportTxt.addEventListener("click", () => {
        this.closeMobileMenu();
        this.exportAsText();
      });
    }
    if (exportPdf) {
      exportPdf.addEventListener("click", () => {
        this.closeMobileMenu();
        this.exportAsPDF();
      });
    }

    // Mobile export event listeners
    if (mobileExportMarkdown) {
      mobileExportMarkdown.addEventListener("click", () => {
        this.closeMobileMenu();
        this.downloadMarkdown();
      });
    }
    if (mobileExportHtml) {
      mobileExportHtml.addEventListener("click", () => {
        this.closeMobileMenu();
        this.exportAsHTML();
      });
    }
    if (mobileExportTxt) {
      mobileExportTxt.addEventListener("click", () => {
        this.closeMobileMenu();
        this.exportAsText();
      });
    }
    if (mobileExportPdf) {
      mobileExportPdf.addEventListener("click", () => {
        this.closeMobileMenu();
        this.exportAsPDF();
      });
    }
  }

  setupDragAndDrop() {
    if (!this.dropzone) return;

    const dropEvents = ["dragenter", "dragover", "dragleave", "drop"];

    dropEvents.forEach((eventName) => {
      this.dropzone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, () => this.highlight(), false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, () => this.unhighlight(), false);
    });

    this.dropzone.addEventListener("drop", (e) => this.handleDrop(e), false);

    // Enable drag & drop directly on the editor area
    if (this.editorPane) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        this.editorPane.addEventListener(eventName, this.preventDefaults, false);
      });

      ["dragenter", "dragover"].forEach((eventName) => {
        this.editorPane.addEventListener(eventName, () => this.highlightEditor(), false);
      });

      ["dragleave", "drop"].forEach((eventName) => {
        this.editorPane.addEventListener(eventName, () => this.unhighlightEditor(), false);
      });

      this.editorPane.addEventListener("drop", (e) => this.handleDrop(e), false);
    }

    // Also guard the textarea itself to avoid default text drop behavior
    if (this.markdownEditor) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        this.markdownEditor.addEventListener(eventName, this.preventDefaults, false);
      });
      ["dragenter", "dragover"].forEach((eventName) => {
        this.markdownEditor.addEventListener(eventName, () => this.highlightEditor(), false);
      });
      ["dragleave", "drop"].forEach((eventName) => {
        this.markdownEditor.addEventListener(eventName, () => this.unhighlightEditor(), false);
      });
      this.markdownEditor.addEventListener("drop", (e) => this.handleDrop(e), false);
    }
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlight() {
    this.dropzone.classList.add("active");
  }

  unhighlight() {
    this.dropzone.classList.remove("active");
  }

  highlightEditor() {
    if (this.editorPane) {
      this.editorPane.classList.add("drop-active");
    }
  }

  unhighlightEditor() {
    if (this.editorPane) {
      this.editorPane.classList.remove("drop-active");
    }
  }

  handleDrop(e) {
    const getDroppedFile = (event) => {
      // Prefer DataTransferItemList when available (more reliable across OS integrations)
      const items = event?.dataTransfer?.items;
      if (items && items.length) {
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          if (item.kind === "file") {
            const f = item.getAsFile();
            if (f) return f;
          }
        }
      }
      const files = event?.dataTransfer?.files;
      if (files && files.length) return files[0];
      return null;
    };

    const file = getDroppedFile(e);
    if (!file) return;

    // Normalize and validate by extension (case-insensitive), as some OSes leave type empty
    const fileName = (file.name || "").trim();
    const lowerName = fileName.toLowerCase();
    const validExtensions = [".md", ".markdown", ".mkdn", ".mdown", ".mkd"]; // accept common md variants
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    const isMarkdownMime = (file.type || "").toLowerCase() === "text/markdown";
    const looksLikeMarkdown = isMarkdownMime || hasValidExt;

    if (looksLikeMarkdown) {
      this.importMarkdownFile(file);
    } else {
      alert(`Please upload a Markdown file (.md or .markdown)\nReceived: "${fileName || "unknown"}"`);
    }
  }

  importMarkdownFile(file) {
    // Warn if replacing existing content
    if (this.markdownEditor && this.markdownEditor.value.trim().length > 0) {
      const proceed = window.confirm(
        `loading "${file.name}" will replace the current editor content. continue?`
      );
      if (!proceed) {
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const importedContent = typeof e.target.result === 'string' ? e.target.result : String(e.target.result ?? '');
      let appliedWithMonaco = false;

      if (window.MarkTideEditor &&
          typeof window.MarkTideEditor.getMonacoEditorAndModel === 'function' &&
          typeof window.MarkTideEditor.applyMonacoTextUpdate === 'function') {
        const context = window.MarkTideEditor.getMonacoEditorAndModel();
        if (context) {
          const { editor, model } = context;
          appliedWithMonaco = window.MarkTideEditor.applyMonacoTextUpdate({
            editor,
            model,
            currentValue: model.getValue(),
            newValue: importedContent,
            selectionStart: 0,
            selectionEnd: 0,
            sourceId: 'import-markdown-file'
          });
        }
      }

      if (!appliedWithMonaco) {
        this.markdownEditor.value = importedContent;
      }
      if (window.MarkTideRenderer && window.MarkTideRenderer.renderMarkdown) {
        window.MarkTideRenderer.renderMarkdown();
      }
      // Close dropzone and clear highlight state
      this.dropzone.style.display = "none";
      if (this.editorPane) {
        this.editorPane.classList.remove('drop-active');
      }
      this.refreshLayoutAfterDropzoneChange();

      // Normalize editor scrolling after import to avoid stale styles
      try {
        const viewMgr = window.MarkTideViewManager;
        const inSplitView = !viewMgr || viewMgr.currentView === 'split';
        const inEditorOnly = viewMgr && viewMgr.currentView === 'editor-only';
        const isMonacoHost = this.markdownEditor && this.markdownEditor.classList.contains('monaco-host');
        if (inSplitView && this.markdownEditor && !isMonacoHost) {
          // Ensure textarea behaves like split view defaults
          this.markdownEditor.classList.remove('native-scrollbars');
          this.markdownEditor.style.height = '100%';
          this.markdownEditor.style.overflow = 'auto';
          this.markdownEditor.style.overflowY = 'auto';
        } else if (inEditorOnly && this.markdownEditor && !isMonacoHost) {
          // Ensure textarea expands in editor-only so page can scroll
          this.markdownEditor.classList.add('native-scrollbars');
          requestAnimationFrame(() => {
            this.markdownEditor.style.height = 'auto';
            this.markdownEditor.style.height = this.markdownEditor.scrollHeight + 'px';
            this.markdownEditor.style.overflow = 'visible';
            this.markdownEditor.style.overflowY = 'visible';
          });
        }
      } catch (err) {
        console.warn('Post-import normalization failed:', err);
      }
    };
    reader.readAsText(file);
  }

  // Recompute editor layout when dropzone visibility changes.
  // Monaco in editor-only mode needs an explicit relayout to avoid clipped overlays.
  refreshLayoutAfterDropzoneChange() {
    try {
      const viewMgr = window.MarkTideViewManager;
      if (!viewMgr || !this.editorPane || !this.markdownEditor) return;

      const isMonacoHost = this.markdownEditor.classList.contains('monaco-host');
      if (!isMonacoHost) {
        if (viewMgr.currentView === 'editor-only' && viewMgr.adjustEditorPaneHeightIfNeeded) {
          viewMgr.adjustEditorPaneHeightIfNeeded();
        }
        return;
      }

      if (window.MarkTideMonaco && window.MarkTideMonaco.refreshLayout) {
        // Temporarily disable layout transitions during dropzone close relayout to avoid visual flashes.
        document.body.classList.add('layout-recalc');

        // Run immediate + multi-frame relayout after height changes settle.
        window.MarkTideMonaco.refreshLayout();
        requestAnimationFrame(() => {
          if (window.MarkTideMonaco && window.MarkTideMonaco.refreshLayout) {
            window.MarkTideMonaco.refreshLayout();
          } else {
            document.body.classList.remove('layout-recalc');
            return;
          }
          requestAnimationFrame(() => {
            if (window.MarkTideMonaco && window.MarkTideMonaco.refreshLayout) {
              window.MarkTideMonaco.refreshLayout();
            } else {
              document.body.classList.remove('layout-recalc');
              return;
            }
            setTimeout(() => {
              if (window.MarkTideMonaco && window.MarkTideMonaco.refreshLayout) {
                window.MarkTideMonaco.refreshLayout();
              }
              document.body.classList.remove('layout-recalc');
            }, 60);
          });
        });
      }
    } catch (err) {
      console.warn('Failed to refresh layout after dropzone change:', err);
      document.body.classList.remove('layout-recalc');
    }
  }

  // Generate smart filename from content
  generateSmartFilename(content, extension = '') {
    // Remove markdown syntax for filename extraction
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Remove images, keep alt text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/[*_~`]/g, '') // Remove formatting
      .replace(/^[>\s-]+/gm, '') // Remove blockquotes and list markers
      .trim();

    // Try to find first heading
    const headingMatch = cleanContent.match(/^#{1,6}\s+(.+)$/m);
    if (headingMatch) {
      return this.sanitizeFilename(headingMatch[1]) + extension;
    }

    // Try to use first non-empty line
    const firstLine = cleanContent.split('\n').find(line => line.trim().length > 0);
    if (firstLine) {
      // Truncate to reasonable length
      const truncated = firstLine.trim().substring(0, 50);
      return this.sanitizeFilename(truncated) + extension;
    }

    // Fallback to timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
    return `document-${timestamp}${extension}`;
  }

  // Clean filename for file system compatibility
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100); // Limit length
  }

  downloadMarkdown() {
    const content = this.markdownEditor.value;
    const filename = this.generateSmartFilename(content, '.md');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportAsHTML() {
    const markdown = this.markdownEditor.value;
    
    // Create an enhanced renderer for HTML export (with copy buttons)
    const exportRenderer = new marked.Renderer();
    exportRenderer.code = function (code, language) {
      if (language === 'mermaid') {
        const uniqueId = 'mermaid-diagram-' + Math.random().toString(36).substr(2, 9);
        return `<div class="mermaid-container" data-mermaid-source="${marktideExportEncodeMermaidSource(code)}"><div class="mermaid" id="${uniqueId}">${code}</div></div>`;
      }
      
      const displayLanguage = language || "text"; // Keep user's original language label
      const uniqueId = 'code-block-' + Math.random().toString(36).substr(2, 9);
      
      try {
        const highlighted = window.MarktideCodeHighlight
          ? window.MarktideCodeHighlight.highlight(code, language)
          : {
              language: hljs.getLanguage(language) ? language : "plaintext",
              value: hljs.highlight(code, { language: hljs.getLanguage(language) ? language : "plaintext", ignoreIllegals: true }).value
            };
        
        return `
          <div class="enhanced-code-block">
            <div class="code-block-header">
              <span class="code-language">${displayLanguage}</span>
              <div class="code-block-header-actions">
                ${marktideExportWrapButtonHtml()}
                <button type="button" class="copy-code-btn" data-code-id="${uniqueId}" title="Copy code" aria-label="Copy code" data-marktide-tip="Copy code">
                  <i class="bi bi-copy"></i>
                </button>
              </div>
            </div>
            <pre><code class="hljs ${highlighted.language}" id="${uniqueId}">${highlighted.value}</code></pre>
          </div>
        `;
      } catch (e) {
        // Fallback to plain text if highlighting fails
        const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
          <div class="enhanced-code-block">
            <div class="code-block-header">
              <span class="code-language">${displayLanguage}</span>
              <div class="code-block-header-actions">
                ${marktideExportWrapButtonHtml()}
                <button type="button" class="copy-code-btn" data-code-id="${uniqueId}" title="Copy code" aria-label="Copy code" data-marktide-tip="Copy code">
                  <i class="bi bi-copy"></i>
                </button>
              </div>
            </div>
            <pre><code class="hljs plaintext" id="${uniqueId}">${escapedCode}</code></pre>
          </div>
        `;
      }
    };
    
    // Use the enhanced renderer for HTML export
    const html = (window.MarkTideRenderer && window.MarkTideRenderer.parseMarkdown)
      ? window.MarkTideRenderer.parseMarkdown(markdown, { renderer: exportRenderer })
      : marked.parse(markdown, { renderer: exportRenderer });
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ADD_TAGS: [
        'mjx-container',
        'svg',
        'line',
        'path',
        'g',
        'circle',
        'rect',
        'marker',
        'defs',
        'pattern',
        'clipPath',
        'mark',
        'abbr',
      ],
      ADD_ATTR: [
        'id',
        'class',
        'style',
        'viewBox',
        'xmlns',
        'width',
        'height',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'fill',
        'x1',
        'y1',
        'x2',
        'y2',
        'd',
        'transform',
        'marker-end',
        'marker-start',
        'aria-hidden',
        'focusable',
        'aria-pressed',
        'aria-label',
        'title',
        'tabindex',
        'role',
        'type',
        'data-marktide-tip',
        'data-code-id',
        'data-mermaid-source',
      ],
    });
    
    // Get current theme
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const isDarkMode = currentTheme === "dark";
    
    // Theme-specific styles - Grok theme
    const themeStyles = isDarkMode ? `
        body { 
            box-sizing: border-box;
            min-width: 200px;
            max-width: 920px;
            margin: 0 auto;
            padding: 45px;
            background-color: #000000 !important;
            color: #e6edf3 !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        }
        .markdown-body {
            background-color: #000000 !important;
            color: #e6edf3 !important;
            color-scheme: dark;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
            max-width: 920px !important;
            font-size: 1.05rem !important;
            line-height: 1.7 !important;
            /* Inline code variables for dark theme */
            --code-inline-bg: #29241E;
            --code-inline-color: #FFD085;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { margin-top: 2rem !important; margin-bottom: 1rem !important; }
        .markdown-body h1 { font-size: 2.1em !important; }
        .markdown-body h2 { font-size: 1.7em !important; }
        .markdown-body h3 { font-size: 1.4em !important; }
        .markdown-body mark { background-color: #fff3a3 !important; color: #24292e !important; padding: 0.08em 0.18em !important; border-radius: 3px !important; }
        .markdown-body abbr[title] { text-decoration: underline dotted currentColor !important; text-underline-offset: 0.18em !important; cursor: help !important; }
        
        /* List styling - Grok-style solid bullets */
        .markdown-body ul {
            list-style-type: disc !important;
            padding-left: 2.2em !important;
        }
        
        .markdown-body ul li::marker {
            color: #e6edf3 !important;
        }
        
        ${this.getDecimalOutlineListStyles('#e6edf3')}
        
        .markdown-body li {
            margin-bottom: 0.25em !important;
        }
        
        .markdown-body li > p {
            margin-top: 0.5em !important;
            margin-bottom: 0.5em !important;
        }
        
        /* Grok dark mode code highlighting */
        .hljs {
            background: #1a1a1a !important;
            color: #e6edf3 !important;
        }
        
        /* Grok dark mode table styles */
        .markdown-body table { background-color: #0f1318 !important; border-color: #30363d !important; }
        .markdown-body table tr { background-color: #0f1318 !important; border-top: 1px solid #30363d !important; }
        .markdown-body table tr:nth-child(2n) { background-color: #141a22 !important; }
        .markdown-body table th, .markdown-body table td { border: 1px solid #30363d !important; padding: 9px 20px !important; }
        
        /* Grok dark mode code blocks */
        .markdown-body pre {
            background-color: #242628 !important;
            border-radius: 6px !important;
            padding: 16px !important;
            margin: 1.5em 0 !important;
            overflow: auto !important;
            font-size: 85% !important;
            line-height: 1.45 !important;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        .markdown-body code:not(pre code) {
            background-color: #29241E;
            color: #FFD085;
            font-family: "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace;
            font-feature-settings: "liga" 1, "calt" 1;
        }
        
        .markdown-body pre code,
        .markdown-body pre code.hljs {
            background-color: #242628 !important;
            color: #e6edf3 !important;
            padding: 0 !important;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        /* Grok dark mode horizontal rules */
        .markdown-body hr {
            background-color: #30363d !important;
            border: none !important;
            height: 2px !important;
            margin: 30px 0 !important;
            opacity: 1 !important;
        }
        
        /* Grok dark mode blockquotes */
        .markdown-body blockquote {
            color: #cccccc !important;
            border-left: 4px solid #4fc3f7 !important;
            background: transparent !important;
        }
        
        .markdown-body blockquote p {
            color: #cccccc !important;
        }
        
        .markdown-body blockquote::before,
        .markdown-body blockquote::after {
            color: #cccccc !important;
        }
        
        /* Grok dark mode links */
        .markdown-body a {
            color: #4fc3f7 !important;
        }
        
        /* Grok dark mode headings */
        .markdown-body h1, .markdown-body h2, .markdown-body h3, 
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            color: #f0f3f6 !important;
            border-bottom-color: #333333 !important;
            font-weight: 900 !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        }
        .markdown-body h1 code, .markdown-body h2 code, .markdown-body h3 code,
        .markdown-body h4 code, .markdown-body h5 code, .markdown-body h6 code {
            font-weight: 900 !important;
        }
        
        /* Bold text styling for Grok dark mode */
        .markdown-body strong,
        .markdown-body b {
            font-weight: 700 !important;
            color: #f0f3f6 !important;
            font-style: normal !important;
        }
        
        /* Handle nested formatting in Grok dark mode */
        .markdown-body strong em,
        .markdown-body strong i,
        .markdown-body b em,
        .markdown-body b i {
            font-weight: 900 !important;
            color: #f0f3f6 !important;
        }
        
        /* Blockquote bold text should be less aggressive */
        .markdown-body blockquote strong,
        .markdown-body blockquote b {
            font-weight: 700 !important;
            color: #cccccc !important;
        }
        
        /* Math expressions in Grok dark mode */
        mjx-container {
            color: #e6edf3 !important;
        }
        
        mjx-math {
            color: #e6edf3 !important;
        }
        
        /* Fix for transparent images - override github-markdown-css background */
        .markdown-body img {
            background-color: transparent !important;
        }

        .markdown-body img[src*="img.shields.io"] {
            display: block !important;
            width: fit-content !important;
            max-width: 100% !important;
            height: auto !important;
            border-radius: 6px !important;
            image-rendering: auto !important;
        }

        .markdown-body p:has(img[src*="img.shields.io"]) {
            margin: 12px 0 !important;
            line-height: 0.75 !important;
        }
    ` : `
        body { 
            box-sizing: border-box;
            min-width: 200px;
            max-width: 920px;
            margin: 0 auto;
            padding: 45px;
            background-color: #ffffff !important;
            color: #24292e !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        }
        .markdown-body {
            background-color: #ffffff !important;
            color: #24292e !important;
            color-scheme: light;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
            max-width: 920px !important;
            font-size: 1.05rem !important;
            line-height: 1.7 !important;
            /* Inline code variables for light theme */
            --code-inline-bg: #FFF8EC;
            --code-inline-color: #8B4500;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { margin-top: 2rem !important; margin-bottom: 1rem !important; }
        .markdown-body h1 { font-size: 2.1em !important; }
        .markdown-body h2 { font-size: 1.7em !important; }
        .markdown-body h3 { font-size: 1.4em !important; }
        .markdown-body mark { background-color: #fff3a3 !important; color: #24292e !important; padding: 0.08em 0.18em !important; border-radius: 3px !important; }
        .markdown-body abbr[title] { text-decoration: underline dotted currentColor !important; text-underline-offset: 0.18em !important; cursor: help !important; }
        
        /* List styling - Grok-style solid bullets */
        .markdown-body ul {
            list-style-type: disc !important;
            padding-left: 2.2em !important;
        }
        
        .markdown-body ul li::marker {
            color: #24292e !important;
        }
        
        ${this.getDecimalOutlineListStyles('#24292e')}
        
        .markdown-body li {
            margin-bottom: 0.25em !important;
        }
        
        .markdown-body li > p {
            margin-top: 0.5em !important;
            margin-bottom: 0.5em !important;
        }
        
        /* Grok light mode code highlighting */
        .hljs {
            background: #f8f9fa !important;
            color: #24292e !important;
        }
        
        /* Grok light mode table styles */
        .markdown-body table { background-color: #ffffff !important; border-color: #e0e0e0 !important; }
        .markdown-body table tr { background-color: #ffffff !important; border-top: 1px solid #e0e0e0 !important; }
        .markdown-body table tr:nth-child(2n) { background-color: #f8f9fa !important; }
        .markdown-body table th, .markdown-body table td { border: 1px solid #e0e0e0 !important; padding: 9px 20px !important; }
        
        /* Grok light mode code blocks */
        .markdown-body pre {
            background-color: #f8f9fa !important;
            border-radius: 6px !important;
            padding: 16px !important;
            margin: 1.5em 0 !important;
            overflow: auto !important;
            font-size: 85% !important;
            line-height: 1.45 !important;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        .markdown-body code:not(pre code) {
            background-color: var(--code-inline-bg) !important;
            color: var(--code-inline-color) !important;
            font-weight: 600 !important;
            border-radius: 3px !important;
            padding: 0.2em 0.4em !important;
            font-family: "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        .markdown-body pre code,
        .markdown-body pre code.hljs {
            background-color: #f8f9fa !important;
            color: #24292e !important;
            padding: 0 !important;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        /* Grok light mode horizontal rules */
        .markdown-body hr {
            background-color: #c9d1d9 !important;
            border: none !important;
            height: 2px !important;
            margin: 30px 0 !important;
            opacity: 1 !important;
        }
        
        /* Grok light mode blockquotes */
        .markdown-body blockquote {
            color: #666666 !important;
            border-left: 4px solid #4fc3f7 !important;
            background: transparent !important;
        }
        
        .markdown-body blockquote p {
            color: #666666 !important;
        }
        
        .markdown-body blockquote::before,
        .markdown-body blockquote::after {
            color: #666666 !important;
        }
        
        /* Light mode links */
        .markdown-body a {
            color: #0366d6 !important;
        }
        
        /* Light mode headings */
        .markdown-body h1, .markdown-body h2, .markdown-body h3, 
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            color: #24292e !important;
            border-bottom-color: #e1e4e8 !important;
            font-weight: 900 !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        }
        .markdown-body h1 code, .markdown-body h2 code, .markdown-body h3 code,
        .markdown-body h4 code, .markdown-body h5 code, .markdown-body h6 code {
            font-weight: 900 !important;
        }
        /* Bold text styling for light mode to match preview */
        .markdown-body strong,
        .markdown-body b {
            font-weight: 700 !important;
            color: #24292e !important;
            font-style: normal !important;
        }
        
        /* Math expressions in light mode */
        mjx-container {
            color: #24292e !important;
        }
        
        mjx-math {
            color: #24292e !important;
        }
        
        /* Fix for transparent images - override github-markdown-css background */
        .markdown-body img {
            background-color: transparent !important;
        }

        .markdown-body img[src*="img.shields.io"] {
            display: block !important;
            width: fit-content !important;
            max-width: 100% !important;
            height: auto !important;
            border-radius: 6px !important;
            image-rendering: auto !important;
        }

        .markdown-body p:has(img[src*="img.shields.io"]) {
            margin: 12px 0 !important;
            line-height: 0.75 !important;
        }
    `;
    
    // Choose appropriate highlight.js theme
    const highlightTheme = window.MarktideHighlightTheme
        ? window.MarktideHighlightTheme.getThemeUrl(isDarkMode)
        : (isDarkMode
            ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai-sublime.min.css"
            : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css");
    const exportHighlightTokenStyles = window.MarktideHighlightTheme
        ? window.MarktideHighlightTheme.getPrintTokenCss()
        : '';
    
    const filename = this.generateSmartFilename(markdown, '.html');
    const documentTitle = this.generateSmartFilename(markdown, '');
    
    // Enhanced code block styles with theme support
    const enhancedCodeBlockStyles = isDarkMode ? `
        /* Enhanced code block styles - Dark Mode */
        .enhanced-code-block {
            background-color: #242628 !important;
            border-radius: 12px;
            margin: 1.5em 0 !important;
            overflow: hidden;
            border: 1px solid #30363d !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
        }

        .enhanced-code-block:hover {
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            transform: translateY(-1px);
        }

        .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 16px;
            background: rgba(255, 255, 255, 0.05) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            font-size: 13px;
            font-weight: 500;
        }

        .code-language {
            color: #ffffff !important;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace;
            text-transform: lowercase;
            opacity: 0.8;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .code-block-header-actions {
            display: flex;
            align-items: center;
            gap: 2px;
        }

        .markdown-body .code-block-header-actions [data-marktide-tip] {
            position: relative;
        }

        .markdown-body .code-block-header-actions [data-marktide-tip]::after {
            content: attr(data-marktide-tip);
            position: absolute;
            top: calc(100% + 6px);
            left: 50%;
            z-index: 60;
            padding: 0.32rem 0.55rem;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 600;
            line-height: 1.2;
            letter-spacing: 0.01em;
            white-space: nowrap;
            color: #f3f4f8;
            background: rgba(22, 24, 30, 0.96);
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.38);
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transform: translateX(-50%) translateY(-3px);
            transition: opacity 0.12s ease, transform 0.12s ease, visibility 0.12s ease;
        }

        @media (hover: hover) and (pointer: fine) {
            .markdown-body .code-block-header-actions [data-marktide-tip]:hover::after {
                opacity: 1;
                visibility: visible;
                transform: translateX(-50%) translateY(0);
            }
        }

        .markdown-body .code-block-header-actions [data-marktide-tip]:focus-visible::after {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(0);
        }

        .markdown-body .wrap-code-btn {
            display: none;
            background: transparent;
            border: none;
            border-radius: 50%;
            color: #ffffff !important;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            align-items: center;
            justify-content: center;
            opacity: 0.6;
            transition: opacity 0.15s ease, transform 0.1s ease;
        }

        .markdown-body .wrap-code-btn.wrap-code-btn--show {
            display: flex;
        }

        .markdown-body .wrap-code-btn:hover {
            opacity: 1;
        }

        .markdown-body .wrap-code-btn:active {
            transform: scale(0.92);
        }

        .markdown-body .wrap-code-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
        }

        .markdown-body .wrap-code-svg {
            width: 16px;
            height: 16px;
            display: block;
        }

        .markdown-body .enhanced-code-block:not(.is-wrapped) .wrap-code-icon--unwrap {
            display: none !important;
        }

        .markdown-body .enhanced-code-block.is-wrapped .wrap-code-icon--wrap {
            display: none !important;
        }

        .markdown-body .enhanced-code-block.is-wrapped > pre {
            overflow-x: hidden;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .markdown-body .enhanced-code-block.is-wrapped > pre code.hljs {
            white-space: pre-wrap !important;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .enhanced-code-block .copy-code-btn {
            background: transparent;
            border: none;
            border-radius: 50%;
            color: #ffffff !important;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            font-size: 16px;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.6;
        }

        .enhanced-code-block .copy-code-btn:hover {
            background: #3a3a3a !important;
            opacity: 1;
        }

        .enhanced-code-block .copy-code-btn:active {
            background: #4a4a4a !important;
            transform: scale(0.9);
            transition: transform 0.1s ease;
        }

        .enhanced-code-block .copy-code-btn.copied {
            background: #3a3a3a !important;
            opacity: 1;
        }

        .enhanced-code-block .copy-code-btn.error { background: rgba(244,67,54,.15) !important; color: #f44336 !important; }

        .enhanced-code-block pre {
            background: transparent !important;
            border-radius: 0;
            padding: 16px;
            margin: 0;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace;
            font-feature-settings: "liga" 1, "calt" 1;
        }
        
        .enhanced-code-block pre code,
        .enhanced-code-block pre code.hljs {
            background: transparent !important;
            padding: 0;
            border-radius: 0;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace;
            font-feature-settings: "liga" 1, "calt" 1;
        }

        /* Override GitHub Markdown CSS margins for enhanced code blocks */
        .markdown-body .enhanced-code-block {
            margin: 1.5em 0 !important;
        }

        .markdown-body .enhanced-code-block pre {
            margin: 0 !important;
        }
    ` : `
        /* Enhanced code block styles - Light Mode */
        .enhanced-code-block {
            background-color: #f6f8fa !important;
            border-radius: 12px;
            margin: 1.5em 0 !important;
            overflow: hidden;
            border: 1px solid #e1e4e8 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
        }

        .enhanced-code-block:hover {
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            transform: translateY(-1px);
        }

        .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 16px;
            background: rgba(0, 0, 0, 0.03) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
            font-size: 13px;
            font-weight: 500;
        }

        .code-language {
            color: #24292e !important;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace;
            text-transform: lowercase;
            opacity: 0.8;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .code-block-header-actions {
            display: flex;
            align-items: center;
            gap: 2px;
        }

        .markdown-body .code-block-header-actions [data-marktide-tip] {
            position: relative;
        }

        .markdown-body .code-block-header-actions [data-marktide-tip]::after {
            content: attr(data-marktide-tip);
            position: absolute;
            top: calc(100% + 6px);
            left: 50%;
            z-index: 60;
            padding: 0.32rem 0.55rem;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 600;
            line-height: 1.2;
            letter-spacing: 0.01em;
            white-space: nowrap;
            color: #f3f4f8;
            background: rgba(22, 24, 30, 0.96);
            border: 1px solid rgba(0, 0, 0, 0.12);
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.38);
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transform: translateX(-50%) translateY(-3px);
            transition: opacity 0.12s ease, transform 0.12s ease, visibility 0.12s ease;
        }

        @media (hover: hover) and (pointer: fine) {
            .markdown-body .code-block-header-actions [data-marktide-tip]:hover::after {
                opacity: 1;
                visibility: visible;
                transform: translateX(-50%) translateY(0);
            }
        }

        .markdown-body .code-block-header-actions [data-marktide-tip]:focus-visible::after {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(0);
        }

        .markdown-body .wrap-code-btn {
            display: none;
            background: transparent;
            border: none;
            border-radius: 50%;
            color: #24292e !important;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            align-items: center;
            justify-content: center;
            opacity: 0.6;
            transition: opacity 0.15s ease, transform 0.1s ease;
        }

        .markdown-body .wrap-code-btn.wrap-code-btn--show {
            display: flex;
        }

        .markdown-body .wrap-code-btn:hover {
            opacity: 1;
        }

        .markdown-body .wrap-code-btn:active {
            transform: scale(0.92);
        }

        .markdown-body .wrap-code-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
        }

        .markdown-body .wrap-code-svg {
            width: 16px;
            height: 16px;
            display: block;
        }

        .markdown-body .enhanced-code-block:not(.is-wrapped) .wrap-code-icon--unwrap {
            display: none !important;
        }

        .markdown-body .enhanced-code-block.is-wrapped .wrap-code-icon--wrap {
            display: none !important;
        }

        .markdown-body .enhanced-code-block.is-wrapped > pre {
            overflow-x: hidden;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .markdown-body .enhanced-code-block.is-wrapped > pre code.hljs {
            white-space: pre-wrap !important;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .enhanced-code-block .copy-code-btn {
            background: transparent;
            border: none;
            border-radius: 50%;
            color: #24292e !important;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            font-size: 16px;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.6;
        }

        .enhanced-code-block .copy-code-btn:hover {
            background: #e0e0e0 !important;
            opacity: 1;
        }

        .enhanced-code-block .copy-code-btn:active {
            background: #d0d0d0 !important;
            transform: scale(0.9);
            transition: transform 0.1s ease;
        }

        .enhanced-code-block .copy-code-btn.copied {
            background: #e0e0e0 !important;
            opacity: 1;
        }

        .enhanced-code-block .copy-code-btn.error { background: rgba(244,67,54,.15) !important; color: #f44336 !important; }

        .enhanced-code-block pre {
            background: transparent !important;
            border-radius: 0;
            padding: 16px;
            margin: 0;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace;
            font-feature-settings: "liga" 1, "calt" 1;
        }
        
        .enhanced-code-block pre code,
        .enhanced-code-block pre code.hljs {
            background: transparent !important;
            padding: 0;
            border-radius: 0;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace;
            font-feature-settings: "liga" 1, "calt" 1;
        }

        /* Override GitHub Markdown CSS margins for enhanced code blocks */
        .markdown-body .enhanced-code-block {
            margin: 1.5em 0 !important;
        }

        .markdown-body .enhanced-code-block pre {
            margin: 0 !important;
        }
    `;

    const codeBlockPreScrollbarStyles = `
        /* hljs: pre>code uses overflow-x:auto — scroll on <pre> so scrollbar styling works */
        .markdown-body pre code.hljs,
        .enhanced-code-block pre code.hljs {
            overflow-x: visible !important;
            overflow-y: visible !important;
        }
        .markdown-body pre,
        .enhanced-code-block > pre {
            scrollbar-width: thin;
            scrollbar-color: transparent transparent;
            scrollbar-gutter: stable;
            transition: scrollbar-color 0.2s ease;
        }
        .markdown-body pre:hover {
            scrollbar-color: rgba(79, 195, 247, 0.55) transparent;
        }
        .markdown-body pre::-webkit-scrollbar,
        .enhanced-code-block > pre::-webkit-scrollbar {
            width: 4px !important;
            height: 4px !important;
            background: transparent !important;
        }
        .markdown-body pre::-webkit-scrollbar-button,
        .enhanced-code-block > pre::-webkit-scrollbar-button {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        .markdown-body pre::-webkit-scrollbar-track,
        .enhanced-code-block > pre::-webkit-scrollbar-track {
            background: transparent !important;
            border: 0 !important;
        }
        .markdown-body pre::-webkit-scrollbar-thumb,
        .enhanced-code-block > pre::-webkit-scrollbar-thumb {
            background: transparent !important;
            border: 0 !important;
            border-radius: 999px !important;
            transition: background-color 0.2s ease;
        }
        .markdown-body pre:hover::-webkit-scrollbar-thumb {
            background: rgba(79, 195, 247, 0.55) !important;
        }
        .markdown-body pre:hover::-webkit-scrollbar-thumb:hover {
            background: rgba(79, 195, 247, 0.8) !important;
        }
        .markdown-body pre::-webkit-scrollbar-corner,
        .enhanced-code-block > pre::-webkit-scrollbar-corner {
            background: transparent !important;
        }
    `;

    const mermaidStyles = `
        /* Mermaid diagram styles */
        .mermaid-container, .mermaid {
            text-align: center;
            margin: 1em 0;
            overflow-x: auto;
            overflow-y: visible;
            max-width: 100%;
        }

        .mermaid-container {
            background: #ffffff;
            border: 1px solid transparent;
            border-radius: 6px;
            padding: 16px;
        }
        
        .mermaid svg {
            display: block;
            max-width: none;
            height: auto;
            margin: 0 auto;
            overflow: visible;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        }

        .mermaid .node rect,
        .mermaid .node circle,
        .mermaid .node ellipse,
        .mermaid .node polygon {
            stroke-width: 1px;
        }

        .mermaid .nodeLabel,
        .mermaid .edgeLabel,
        .mermaid .label,
        .mermaid text {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        }

        .mermaid-toolbar {
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 5;
            display: flex;
            gap: 0.35rem;
            padding: 0.35rem;
            border: 1px solid rgba(255, 255, 255, 0.28);
            border-radius: 10px;
            background: rgba(248, 249, 250, 0.84);
            -webkit-backdrop-filter: blur(12px) saturate(145%);
            backdrop-filter: blur(12px) saturate(145%);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
            transform: translateY(-2px);
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
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            border: 1px solid rgba(255, 255, 255, 0.26);
            border-radius: 8px;
            background: rgba(248, 249, 250, 0.72);
            color: #24292e;
            cursor: pointer;
            transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
            -webkit-backdrop-filter: blur(8px);
            backdrop-filter: blur(8px);
        }

        .mermaid-toolbar-btn:hover,
        .mermaid-modal-btn:hover,
        .mermaid-modal-close:hover {
            border-color: #4fc3f7;
            background: #e8f5fd;
            color: #0288d1;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
            transform: translateY(-1px);
        }

        .mermaid-container[data-mermaid-status]::after {
            content: attr(data-mermaid-status);
            position: absolute;
            top: 11px;
            right: 136px;
            z-index: 6;
            min-height: 30px;
            padding: 0 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.26);
            background: rgba(248, 249, 250, 0.9);
            color: #24292e;
            font-size: 12px;
            font-weight: 600;
            line-height: 30px;
            white-space: nowrap;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
            -webkit-backdrop-filter: blur(8px);
            backdrop-filter: blur(8px);
        }

        .mermaid-modal-overlay {
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

        .mermaid-modal-overlay.open {
            opacity: 1;
            pointer-events: auto;
        }

        .mermaid-modal-stage {
            width: min(92vw, 1300px);
            max-height: 78vh;
            overflow: auto;
            background: #ffffff;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
        }

        .mermaid-modal-content {
            min-width: 100%;
            min-height: 260px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }

        .mermaid-modal-content svg {
            display: block;
            max-width: none;
            height: auto;
            transform-origin: center center;
            transition: transform 0.15s ease;
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
            border: 1px solid rgba(255, 255, 255, 0.28);
            border-radius: 10px;
            background: rgba(248, 249, 250, 0.9);
            -webkit-backdrop-filter: blur(12px) saturate(145%);
            backdrop-filter: blur(12px) saturate(145%);
            box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
        }

        .mermaid-modal-zoom {
            min-width: 48px;
            color: #24292e;
            font-size: 13px;
            font-weight: 600;
            text-align: center;
        }

        .mermaid-modal-divider {
            width: 1px;
            height: 22px;
            margin: 0 4px;
            background: #d0d7de;
        }

        .mermaid-modal-close {
            position: fixed;
            top: 18px;
            right: 18px;
            background: rgba(248, 249, 250, 0.9);
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
    
    const minifiedStyles = this.minifyCSS(themeStyles + enhancedCodeBlockStyles + codeBlockPreScrollbarStyles + mermaidStyles + exportHighlightTokenStyles);

    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentTitle || 'Exported Markdown'}</title>
    <link rel="icon" href="https://raw.githubusercontent.com/zigzag-007/MarkTide-Viewer/main/assets/img/icon.jpg" type="image/jpeg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="${highlightTheme}">
    <style>${minifiedStyles}</style>
</head>
<body>
    <article class="markdown-body">
        ${sanitizedHtml}
    </article>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/dos.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/dockerfile.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/powershell.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js"></script>
    <script>${this.minifyJS(`
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            if (!block.classList.contains('mermaid') && !block.classList.contains('pseudocode')) {
                hljs.highlightElement(block);
            }
        });
        
        // Initialize and render Mermaid diagrams
        const mermaidFontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
        
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            themeVariables: {
                fontFamily: mermaidFontFamily
            },
            securityLevel: 'loose',
            htmlLabels: false,
            flowchart: {
                useMaxWidth: false,
                htmlLabels: false,
                curve: 'basis',
                nodeSpacing: 60,
                rankSpacing: 70
            },
            fontSize: 16
        });

        function getReadableTextColor(fill) {
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
                const rgbMatch = color.match(/^rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/i);
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

        function getNodeFill(shape) {
            const computedFill = window.getComputedStyle(shape).fill;
            return computedFill || shape.getAttribute('fill') || shape.style.fill;
        }

        function improveNodeLabelContrast() {
            document.querySelectorAll('.mermaid svg').forEach((svg) => {
                svg.querySelectorAll('g.node').forEach((node) => {
                    const shape = node.querySelector('rect, polygon, circle, ellipse');
                    if (!shape) return;

                    const fill = getNodeFill(shape);
                    const readableColor = getReadableTextColor(fill);
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

        function setSolidEdgeLabelBackground(rect) {
            rect.setAttribute('fill', '#e8f5e8');
            rect.setAttribute('fill-opacity', '1');
            rect.setAttribute('opacity', '1');
            rect.setAttribute('stroke', 'none');
            rect.style.setProperty('fill', '#e8f5e8', 'important');
            rect.style.setProperty('fill-opacity', '1', 'important');
            rect.style.setProperty('opacity', '1', 'important');
            rect.style.setProperty('stroke', 'none', 'important');
        }

        function stabilizeEdgeLabels() {
            document.querySelectorAll('.mermaid svg').forEach((svg) => {
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

                    edgeLabel.querySelectorAll('rect, .label rect').forEach(setSolidEdgeLabelBackground);

                    if (edgeLabel.parentNode) {
                        edgeLabel.parentNode.appendChild(edgeLabel);
                    }
                });
            });
        }

        function stabilizeMermaidDiagrams() {
            improveNodeLabelContrast();
            stabilizeEdgeLabels();
        }
        
        // Render all mermaid diagrams
        try {
            const mermaidResult = mermaid.run
                ? mermaid.run({ nodes: document.querySelectorAll('.mermaid') })
                : mermaid.init(undefined, document.querySelectorAll('.mermaid'));

            if (mermaidResult && typeof mermaidResult.then === 'function') {
                mermaidResult.then(() => {
                    stabilizeMermaidDiagrams();
                    if (window.MarkTideMermaidToolbar) {
                        window.MarkTideMermaidToolbar.enhance(document);
                    }
                }).catch((e) => console.warn("Mermaid rendering failed:", e));
            } else {
                stabilizeMermaidDiagrams();
                if (window.MarkTideMermaidToolbar) {
                    window.MarkTideMermaidToolbar.enhance(document);
                }
            }
        } catch (e) {
            console.warn("Mermaid rendering failed:", e);
        }
    `)}</script>
    <script>${this.minifyJS(marktideExportMermaidToolbarScript())}</script>
    <script>${this.minifyJS(`
        window.MathJax = {
            tex: {
                inlineMath: [['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
                ignoreHtmlClass: 'tex2jax_ignore',
                processHtmlClass: 'tex2jax_process'
            }
        };
    `)}</script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js"></script>
    <script>${this.minifyJS(`
        class CodeCopyHandler {
            constructor() {
                this.initialized = false;
            }

            init() {
                if (this.initialized) return;
                document.addEventListener('click', this.handleCopyClick.bind(this));
                this.initialized = true;
            }

            handleCopyClick(event) {
                const copyBtn = event.target.closest('.copy-code-btn');
                if (!copyBtn) return;
                event.preventDefault();
                event.stopPropagation();
                const codeId = copyBtn.getAttribute('data-code-id');
                const codeElement = document.getElementById(codeId);
                if (!codeElement) {
                    console.warn('Code element not found for ID:', codeId);
                    return;
                }
                const codeText = codeElement.textContent || codeElement.innerText || '';
                this.copyToClipboard(codeText, copyBtn);
            }

            async copyToClipboard(text, button) {
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text);
                        this.showCopySuccess(button);
                    } else {
                        this.fallbackCopyToClipboard(text, button);
                    }
                } catch (error) {
                    console.error('Copy failed:', error);
                    this.fallbackCopyToClipboard(text, button);
                }
            }

            fallbackCopyToClipboard(text, button) {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                try {
                    textArea.focus();
                    textArea.select();
                    const successful = document.execCommand('copy');
                    if (successful) {
                        this.showCopySuccess(button);
                    } else {
                        this.showCopyError(button);
                    }
                } catch (error) {
                    console.error('Fallback copy failed:', error);
                    this.showCopyError(button);
                } finally {
                    document.body.removeChild(textArea);
                }
            }

            showCopySuccess(button) {
                const originalIcon = button.innerHTML;
                button.classList.add('copied');
                button.innerHTML = '<i class="bi bi-check2"></i>';
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = originalIcon;
                }, 1500);
            }

            showCopyError(button) {
                const originalIcon = button.innerHTML;
                button.classList.add('error');
                button.innerHTML = '<i class="bi bi-exclamation-triangle"></i>';
                setTimeout(() => {
                    button.classList.remove('error');
                    button.innerHTML = originalIcon;
                }, 2000);
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                const copyHandler = new CodeCopyHandler();
                copyHandler.init();
            });
        } else {
            const copyHandler = new CodeCopyHandler();
            copyHandler.init();
        }
    `)}</script>
    <script>${this.minifyJS(`
(function () {
  var ROOT_SELECTOR = ".markdown-body";
  var DEBOUNCE_MS = 64;
  var debounceId = null;
  function preHasHorizontalOverflow(pre) {
    return Math.ceil(pre.scrollWidth) > Math.floor(pre.clientWidth) + 1;
  }
  function updateBlock(block) {
    var pre = block.querySelector(":scope > pre");
    var btn = block.querySelector(".wrap-code-btn");
    if (!pre || !btn) return;
    var wrapped = block.classList.contains("is-wrapped");
    var show = wrapped || preHasHorizontalOverflow(pre);
    if (show) {
      btn.classList.add("wrap-code-btn--show");
      btn.setAttribute("aria-hidden", "false");
      btn.removeAttribute("tabindex");
    } else {
      btn.classList.remove("wrap-code-btn--show");
      btn.setAttribute("aria-hidden", "true");
      btn.setAttribute("tabindex", "-1");
    }
    btn.setAttribute("aria-pressed", wrapped ? "true" : "false");
    var unwrapLabel = "Unwrap lines";
    var wrapLabel = "Wrap long lines";
    var tip = wrapped ? unwrapLabel : wrapLabel;
    btn.setAttribute("title", tip);
    btn.setAttribute("aria-label", tip);
    btn.setAttribute("data-marktide-tip", tip);
  }
  function refresh(root) {
    if (!root || !root.nodeType) root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    root.querySelectorAll(".enhanced-code-block").forEach(updateBlock);
  }
  function scheduleRefresh(root) {
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(function () {
      debounceId = null;
      requestAnimationFrame(function () {
        refresh(root);
      });
    }, DEBOUNCE_MS);
  }
  function onWrapClick(event) {
    var btn = event.target.closest(".wrap-code-btn");
    if (!btn) return;
    var root = document.querySelector(ROOT_SELECTOR);
    if (!root || !root.contains(btn)) return;
    event.preventDefault();
    event.stopPropagation();
    var block = btn.closest(".enhanced-code-block");
    if (!block) return;
    block.classList.toggle("is-wrapped");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        refresh(root);
      });
    });
  }
  function boot() {
    document.addEventListener("click", onWrapClick);
    var root = document.querySelector(ROOT_SELECTOR);
    if (root && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(function () {
        scheduleRefresh(root);
      }).observe(root);
    }
    window.addEventListener("resize", function () {
      scheduleRefresh(document.querySelector(ROOT_SELECTOR));
    });
    var r = document.querySelector(ROOT_SELECTOR);
    if (r) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          refresh(r);
        });
      });
    }
    if (window.MathJax && window.MathJax.typesetPromise) {
      var p = window.MathJax.typesetPromise([document.body]);
      if (p && typeof p.then === "function") {
        p.then(function () {
          scheduleRefresh(document.querySelector(ROOT_SELECTOR));
        }).catch(function () {});
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
    `)}</script>
</body>
</html>`;
    
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportAsText() {
    const content = this.markdownEditor.value;
    const filename = this.generateSmartFilename(content, '.txt');
    // Use shared converter (same as Copy as Text)
    const plainText = this.generatePlainTextFromMarkdown(content);
    
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportAsPDF() {
    // Use the existing print functionality but save as PDF
    if (window.MarkTidePrintHandler && window.MarkTidePrintHandler.printPreview) {
      const content = this.markdownEditor ? this.markdownEditor.value : '';
      const filename = this.generateSmartFilename(content, '');
      window.MarkTidePrintHandler.printPreview(filename);
    }
  }
}

// Create global instance
window.MarkTideImportExport = new ImportExportManager();
