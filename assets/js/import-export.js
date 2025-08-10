// Import and export functionality for markdown files

class ImportExportManager {
  constructor() {
    this.fileInput = null;
    this.dropzone = null;
    this.closeDropzoneBtn = null;
    this.markdownEditor = null;
    this.editorPane = null;
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
    const mobileMenuPanel = document.getElementById("mobile-menu-panel");
    const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
    if (mobileMenuPanel) {
      mobileMenuPanel.classList.remove("active");
    }
    if (mobileMenuOverlay) {
      mobileMenuOverlay.classList.remove("active");
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
      this.markdownEditor.value = e.target.result;
      if (window.MarkTideRenderer && window.MarkTideRenderer.renderMarkdown) {
        window.MarkTideRenderer.renderMarkdown();
      }
      // Close dropzone and clear highlight state
      this.dropzone.style.display = "none";
      if (this.editorPane) {
        this.editorPane.classList.remove('drop-active');
      }

      // Normalize editor scrolling after import to avoid stale styles
      try {
        const viewMgr = window.MarkTideViewManager;
        const inSplitView = !viewMgr || viewMgr.currentView === 'split';
        const inEditorOnly = viewMgr && viewMgr.currentView === 'editor-only';
        if (inSplitView && this.markdownEditor) {
          // Ensure textarea behaves like split view defaults
          this.markdownEditor.classList.remove('native-scrollbars');
          this.markdownEditor.style.height = '100%';
          this.markdownEditor.style.overflow = 'auto';
          this.markdownEditor.style.overflowY = 'auto';
        } else if (inEditorOnly && this.markdownEditor) {
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
    const html = marked.parse(markdown);
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
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { margin-top: 2rem !important; margin-bottom: 1rem !important; }
        .markdown-body h1 { font-size: 2.1em !important; }
        .markdown-body h2 { font-size: 1.7em !important; }
        .markdown-body h3 { font-size: 1.4em !important; }
        
        /* List styling - Grok-style solid bullets */
        .markdown-body ul {
            list-style-type: disc !important;
        }
        
        .markdown-body ul li::marker {
            color: #ffffff !important;
        }
        
        .markdown-body ol {
            list-style-type: decimal !important;
            padding-left: 2em !important;
            counter-reset: section !important;
        }
        
        .markdown-body ol li::marker {
            color: #ffffff !important;
            font-weight: 600 !important;
        }
        
        .markdown-body ol li {
            color: #ffffff !important;
        }
        
        /* Handle decimal point numbering (e.g., 2.1) */
        .markdown-body ol > li {
            counter-increment: section !important;
        }
        
        .markdown-body ol > li > ol > li {
            counter-increment: subsection !important;
        }
        
        .markdown-body ol > li > ol > li:before {
            content: counter(section) "." counter(subsection) " " !important;
            float: left !important;
            margin-left: -2.5em !important;
        }
        
        /* Nested list styling */
        .markdown-body ol ol {
            list-style-type: none !important;
            counter-reset: subsection !important;
        }
        
        .markdown-body ol ol ol {
            list-style-type: lower-roman !important;
        }
        
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
            font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        .markdown-body code:not(pre code) {
            background-color: #29241E !important;
            color: #FFD085 !important;
            padding: 0.2em 0.4em !important;
            border-radius: 3px !important;
            font-size: 85% !important;
            font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        .markdown-body pre code,
        .markdown-body pre code.hljs {
            background-color: #242628 !important;
            color: #ffffff !important;
            padding: 0 !important;
            font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
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
        
        /* Bold text styling for Grok dark mode */
        .markdown-body strong,
        .markdown-body b {
            font-weight: 900 !important;
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
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { margin-top: 2rem !important; margin-bottom: 1rem !important; }
        .markdown-body h1 { font-size: 2.1em !important; }
        .markdown-body h2 { font-size: 1.7em !important; }
        .markdown-body h3 { font-size: 1.4em !important; }
        
        /* List styling - Grok-style solid bullets */
        .markdown-body ul {
            list-style-type: disc !important;
        }
        
        .markdown-body ul li::marker {
            color: #000000 !important;
        }
        
        .markdown-body ol {
            list-style-type: decimal !important;
            padding-left: 2em !important;
            counter-reset: section !important;
        }
        
        .markdown-body ol li::marker {
            color: #000000 !important;
            font-weight: 600 !important;
        }
        
        .markdown-body ol li {
            color: #000000 !important;
        }
        
        /* Handle decimal point numbering (e.g., 2.1) */
        .markdown-body ol > li {
            counter-increment: section !important;
        }
        
        .markdown-body ol > li > ol > li {
            counter-increment: subsection !important;
        }
        
        .markdown-body ol > li > ol > li:before {
            content: counter(section) "." counter(subsection) " " !important;
            float: left !important;
            margin-left: -2.5em !important;
        }
        
        /* Nested list styling */
        .markdown-body ol ol {
            list-style-type: none !important;
            counter-reset: subsection !important;
        }
        
        .markdown-body ol ol ol {
            list-style-type: lower-roman !important;
        }
        
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
            font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        .markdown-body code:not(pre code) {
            background-color: #FFF8EC !important;
            color: #8B4500 !important;
            font-weight: 600 !important;
            font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
            font-feature-settings: "liga" 1, "calt" 1 !important;
        }
        
        .markdown-body pre code,
        .markdown-body pre code.hljs {
            background-color: #f8f9fa !important;
            color: #000000 !important;
            padding: 0 !important;
            font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
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
    <link rel="stylesheet" href="${highlightTheme}">
    <style>
        ${themeStyles}
        
        /* Mermaid diagram styles */
        .mermaid-container, .mermaid {
            text-align: center;
            margin: 1em 0;
        }
        
        .mermaid svg {
            max-width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
    <article class="markdown-body">
        ${sanitizedHtml}
    </article>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js"></script>
    <script>
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            if (!block.classList.contains('mermaid')) {
                hljs.highlightElement(block);
            }
        });
        
        // Initialize and render Mermaid diagrams
        const isDarkMode = ${isDarkMode}
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
    </script>
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
                ignoreHtmlClass: 'tex2jax_ignore',
                processHtmlClass: 'tex2jax_process'
            }
        };
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js"></script>
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