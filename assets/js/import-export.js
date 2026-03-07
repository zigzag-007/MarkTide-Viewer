// Import and export functionality for markdown files

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
        return `<div class="mermaid-container"><div class="mermaid" id="${uniqueId}">${code}</div></div>`;
      }
      
      const displayLanguage = language || "text"; // Keep user's original language label
      let highlightLanguage = language;
      
      // Handle batch/bat files
      if (highlightLanguage === 'batch' || highlightLanguage === 'bat' || highlightLanguage === 'cmd') {
        highlightLanguage = 'dos'; // Use DOS highlighting for batch files
      }
      
      const validLanguage = hljs.getLanguage(highlightLanguage) ? highlightLanguage : "plaintext";
      const uniqueId = 'code-block-' + Math.random().toString(36).substr(2, 9);
      
      try {
        const highlightedCode = hljs.highlight(code, {
          language: validLanguage,
          ignoreIllegals: true  // Prevent HTML injection
        }).value;
        
        return `
          <div class="enhanced-code-block">
            <div class="code-block-header">
              <span class="code-language">${displayLanguage}</span>
              <button class="copy-code-btn" data-code-id="${uniqueId}">
                <i class="bi bi-copy"></i>
              </button>
            </div>
            <pre><code class="hljs ${validLanguage}" id="${uniqueId}">${highlightedCode}</code></pre>
          </div>
        `;
      } catch (e) {
        // Fallback to plain text if highlighting fails
        const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
          <div class="enhanced-code-block">
            <div class="code-block-header">
              <span class="code-language">${displayLanguage}</span>
              <button class="copy-code-btn" data-code-id="${uniqueId}">
                <i class="bi bi-copy"></i>
              </button>
            </div>
            <pre><code class="hljs plaintext" id="${uniqueId}">${escapedCode}</code></pre>
          </div>
        `;
      }
    };
    
    // Use the enhanced renderer for HTML export
    const normalizedMarkdown = (window.MarkTideRenderer && window.MarkTideRenderer.normalizeListSyntax)
      ? window.MarkTideRenderer.normalizeListSyntax(markdown)
      : markdown;
    const html = marked.parse(normalizedMarkdown, { renderer: exportRenderer });
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ADD_TAGS: ['mjx-container', 'svg', 'path', 'g', 'marker', 'defs', 'pattern', 'clipPath'],
      ADD_ATTR: ['id', 'class', 'style', 'viewBox', 'd', 'fill', 'stroke', 'transform', 'marker-end', 'marker-start']
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
            color: #ffffff !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        }
        .markdown-body {
            background-color: #000000 !important;
            color: #ffffff !important;
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
        
        /* List styling - Grok-style solid bullets */
        .markdown-body ul {
            list-style-type: disc !important;
            padding-left: 2.2em !important;
        }
        
        .markdown-body ul li::marker {
            color: #ffffff !important;
        }
        
        ${this.getDecimalOutlineListStyles('#ffffff')}
        
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
            color: #ffffff !important;
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
            color: #ffffff !important;
            padding: 0 !important;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        /* Grok dark mode horizontal rules */
        .markdown-body hr {
            background-color: #333333 !important;
            border: none !important;
            height: 1px !important;
            margin: 2em 0 !important;
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
            color: #ffffff !important;
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
            color: #ffffff !important;
            font-style: normal !important;
        }
        
        /* Handle nested formatting in Grok dark mode */
        .markdown-body strong em,
        .markdown-body strong i,
        .markdown-body b em,
        .markdown-body b i {
            font-weight: 900 !important;
            color: #ffffff !important;
        }
        
        /* Blockquote bold text should be less aggressive */
        .markdown-body blockquote strong,
        .markdown-body blockquote b {
            font-weight: 700 !important;
            color: #cccccc !important;
        }
        
        /* Math expressions in Grok dark mode */
        mjx-container {
            color: #ffffff !important;
        }
        
        mjx-math {
            color: #ffffff !important;
        }
        
        /* Fix for transparent images - override github-markdown-css background */
        .markdown-body img {
            background-color: transparent !important;
        }
    ` : `
        body { 
            box-sizing: border-box;
            min-width: 200px;
            max-width: 920px;
            margin: 0 auto;
            padding: 45px;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        }
        .markdown-body {
            background-color: #ffffff !important;
            color: #000000 !important;
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
        
        /* List styling - Grok-style solid bullets */
        .markdown-body ul {
            list-style-type: disc !important;
            padding-left: 2.2em !important;
        }
        
        .markdown-body ul li::marker {
            color: #000000 !important;
        }
        
        ${this.getDecimalOutlineListStyles('#000000')}
        
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
            color: #000000 !important;
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
            color: #000000 !important;
            padding: 0 !important;
            font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        /* Grok light mode horizontal rules */
        .markdown-body hr {
            background-color: #e0e0e0 !important;
            border: none !important;
            height: 1px !important;
            margin: 2em 0 !important;
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
    `;
    
    // Choose appropriate highlight.js theme
    const highlightTheme = isDarkMode 
        ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai-sublime.min.css"
        : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
    
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

    const mermaidStyles = `
        /* Mermaid diagram styles */
        .mermaid-container, .mermaid {
            text-align: center;
            margin: 1em 0;
        }
        
        .mermaid svg {
            max-width: 100%;
            height: auto;
        }
    `;
    
    const minifiedStyles = this.minifyCSS(themeStyles + enhancedCodeBlockStyles + mermaidStyles);

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
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js"></script>
    <script>${this.minifyJS(`
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            if (!block.classList.contains('mermaid')) {
                hljs.highlightElement(block);
            }
        });
        
        // Initialize and render Mermaid diagrams
        const isDarkMode = ${isDarkMode};
        const mermaidTheme = isDarkMode ? 'dark' : 'base';
        
        let themeVariables = {};
        if (isDarkMode) {
            themeVariables = {
                primaryColor: '#30363d',
                primaryTextColor: '#e4e1f0',
                primaryBorderColor: '#8b7cf8',
                lineColor: '#8b7cf8',
                secondaryColor: '#21262d',
                tertiaryColor: '#161b22',
                background: '#1a1625',
                mainBkg: '#21262d',
                secondBkg: '#30363d',
                tertiaryBkg: '#161b22'
            };
        } else {
            themeVariables = {
                primaryColor: '#f9f9f9',
                primaryTextColor: '#24292e',
                primaryBorderColor: '#d1d5da',
                lineColor: '#24292e',
                secondaryColor: '#e8f5e8',
                tertiaryColor: '#fff3e0'
            };
        }
        
        mermaid.initialize({
            startOnLoad: false,
            theme: mermaidTheme,
            themeVariables: themeVariables,
            securityLevel: 'loose',
            flowchart: { useMaxWidth: true, htmlLabels: true },
            fontSize: 16
        });
        
        // Render all mermaid diagrams
        try {
            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        } catch (e) {
            console.warn("Mermaid rendering failed:", e);
        }
    `)}</script>
    <script>${this.minifyJS(`
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
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
      window.MarkTidePrintHandler.printPreview();
    }
  }
}

// Create global instance
window.MarkTideImportExport = new ImportExportManager();
