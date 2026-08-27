// Import and export functionality for markdown files

function marktideRequireMermaidToolbar() {
  if (typeof MermaidToolbar !== 'function') {
    throw new Error('Shared Mermaid toolbar is required for HTML export.');
  }

  return MermaidToolbar;
}

function marktideExportMermaidToolbarScript() {
  const Toolbar = marktideRequireMermaidToolbar();

  return `
    ${Toolbar.toString()}
    window.MarkTideMermaidToolbar = new MermaidToolbar();
    window.MarkTideMermaidToolbar.init();
  `;
}

function marktideRequireMermaidFactory() {
  if (typeof window.MarkTideCreateMermaidShared !== 'function') {
    throw new Error('Shared Mermaid factory is required for HTML export.');
  }

  return window.MarkTideCreateMermaidShared;
}

function marktideRequireExportAssets() {
  if (!window.MarkTideExportAssets) {
    throw new Error('Shared export assets are required for document export.');
  }

  return window.MarkTideExportAssets;
}

function marktideRequireMarkdownStyles() {
  if (!window.MarkTideMarkdownStyles
    || typeof window.MarkTideMarkdownStyles.getStandaloneStyles !== 'function') {
    throw new Error('Shared Markdown styles are required for HTML export.');
  }

  return window.MarkTideMarkdownStyles;
}

function marktideExportMermaidSharedScript() {
  const createMermaidShared = marktideRequireMermaidFactory();

  return `
    window.MarkTideCreateMermaidShared = ${createMermaidShared.toString()};
    window.MarkTideMermaidShared = window.MarkTideCreateMermaidShared(window);
  `;
}

function marktideExportCodeCopyScript() {
  if (typeof CodeCopyHandler !== 'function') {
    throw new Error('Shared code copy handler is required for HTML export.');
  }

  return `
    ${CodeCopyHandler.toString()}
    function bootCodeCopy() {
      var copyHandler = new CodeCopyHandler();
      copyHandler.init();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootCodeCopy);
    } else {
      bootCodeCopy();
    }
  `;
}

function marktideExportCodeWrapScript() {
  if (typeof window.MarkTideCreateCodeWrapController !== 'function') {
    throw new Error('Shared code wrap controller is required for HTML export.');
  }

  return `
    window.MarkTideCreateCodeWrapController = ${window.MarkTideCreateCodeWrapController.toString()};
    function bootCodeWrap() {
      window.MarkTideCodeWrap = window.MarkTideCreateCodeWrapController(window, {
        rootSelector: '.markdown-body'
      });
      window.MarkTideCodeWrap.init();
      var mermaidReady = window.MarkTideMermaidRenderPromise || Promise.resolve();
      Promise.resolve(mermaidReady).then(function () {
        if (window.MarkTideMathJax && window.MarkTideMathJax.typeset) {
          return window.MarkTideMathJax.typeset(document.body);
        }
        return false;
      }).then(function () {
        window.MarkTideCodeWrap.scheduleRefresh(document.querySelector('.markdown-body'));
      }).catch(function () {});
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootCodeWrap);
    } else {
      bootCodeWrap();
    }
  `;
}

function marktideRequireMathJax() {
  if (!window.MarkTideMathJax
    || typeof window.MarkTideMathJax.getConfigScript !== 'function') {
    throw new Error('Shared MathJax configuration is required for HTML export.');
  }

  return window.MarkTideMathJax;
}

function marktideExportMathJaxConfigScript() {
  return marktideRequireMathJax().getConfigScript();
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
    return js.trim();
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
    if (!window.MarkTideCodeBlockRenderer || !window.MarkTideRenderer || !window.MarkTideSanitizer) {
      throw new Error('Shared Markdown rendering pipeline is required for HTML export.');
    }

    const markdown = this.markdownEditor.value;
    
    const exportRenderer = window.MarkTideCodeBlockRenderer.createRenderer({
      enhanced: true,
      includeMermaidSource: true,
    });
    
    // Use the enhanced renderer for HTML export
    const html = window.MarkTideRenderer.parseMarkdown(markdown, { renderer: exportRenderer });
    const renderedHtml = window.MarkTideRenderer.prepareRenderedHtml(html, { mode: 'html' });
    
    // Get current theme
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const isDarkMode = currentTheme === "dark";
    
    // Shared Markdown document styles used by preview, HTML export, and PDF export.
    const themeStyles = marktideRequireMarkdownStyles().getStandaloneStyles({
      mode: 'html'
    });
    // Choose appropriate highlight.js theme
    if (!window.MarktideHighlightTheme) {
      throw new Error('Shared highlight theme helper is required for HTML export.');
    }

    const highlightTheme = window.MarktideHighlightTheme.getThemeUrl(isDarkMode);
    
    const filename = this.generateSmartFilename(markdown, '.html');
    const documentTitle = this.generateSmartFilename(markdown, '');
    
    const minifiedStyles = this.minifyCSS(themeStyles);
    const exportAssetLinks = marktideRequireExportAssets();
    const fontLinks = exportAssetLinks.getFontLinks();
    const commonStylesheetLinks = exportAssetLinks.getCommonStylesheetLinks({ includeBootstrapIcons: true });
    const mermaidScript = exportAssetLinks.getMermaidScriptTag();
    const mathJaxScript = exportAssetLinks.getMathJaxScriptTag();

    const fullHTML = `<!DOCTYPE html>
<html lang="en" data-theme="${currentTheme || 'light'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentTitle || 'Exported Markdown'}</title>
    <link rel="icon" href="https://raw.githubusercontent.com/zigzag-007/MarkTide-Viewer/main/assets/img/icon.jpg" type="image/jpeg">
    ${fontLinks}
    ${commonStylesheetLinks}
    <link rel="stylesheet" href="${highlightTheme}">
    <style>${minifiedStyles}</style>
</head>
<body>
    <article class="markdown-body">
        ${renderedHtml}
    </article>
    
    ${mermaidScript}
    <script>${this.minifyJS(marktideExportMermaidSharedScript())}</script>
    <script>${this.minifyJS(marktideExportMermaidToolbarScript())}</script>
    <script>${this.minifyJS(`
        window.MarkTideMermaidRenderPromise = window.MarkTideMermaidShared.renderDiagrams(document, { mode: 'html' })
            .catch((e) => console.warn("Mermaid rendering failed:", e))
            .finally(() => window.MarkTideMermaidToolbar.enhance(document));
    `)}</script>
    <script>${this.minifyJS(marktideExportMathJaxConfigScript())}</script>
    ${mathJaxScript}
    <script>${this.minifyJS(marktideExportCodeCopyScript())}</script>
    <script>${this.minifyJS(marktideExportCodeWrapScript())}</script>
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
