// Import and export functionality for markdown files

class ImportExportManager {
  constructor() {
    this.fileInput = null;
    this.dropzone = null;
    this.closeDropzoneBtn = null;
    this.markdownEditor = null;
  }

  init() {
    this.fileInput = document.getElementById("file-input");
    this.dropzone = document.getElementById("dropzone");
    this.closeDropzoneBtn = document.getElementById("close-dropzone");
    this.markdownEditor = document.getElementById("markdown-editor");
    
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
    const copyMarkdownButton = document.getElementById("copy-markdown-button");

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

    if (copyMarkdownButton) {
      copyMarkdownButton.addEventListener("click", () => {
        try {
          const markdownText = this.markdownEditor.value;
          if (window.MarkTideUtils && window.MarkTideUtils.copyToClipboard) {
            window.MarkTideUtils.copyToClipboard(markdownText);
          }
        } catch (e) {
          console.error("Copy failed:", e);
          alert("Failed to copy Markdown: " + e.message);
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

  handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      const file = files[0];
      const isMarkdownFile =
        file.type === "text/markdown" ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".markdown");
      if (isMarkdownFile) {
        this.importMarkdownFile(file);
      } else {
        alert("Please upload a Markdown file (.md or .markdown)");
      }
    }
  }

  importMarkdownFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.markdownEditor.value = e.target.result;
      if (window.MarkTideRenderer && window.MarkTideRenderer.renderMarkdown) {
        window.MarkTideRenderer.renderMarkdown();
      }
      this.dropzone.style.display = "none";
    };
    reader.readAsText(file);
  }

  downloadMarkdown() {
    const content = this.markdownEditor.value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
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
    
    // Theme-specific styles
    const themeStyles = isDarkMode ? `
        body { 
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: #0F1729 !important;
            color: #E2E8F0 !important;
        }
        .markdown-body {
            background-color: #0F1729 !important;
            color: #E2E8F0 !important;
            color-scheme: dark;
        }
        
        /* Dark mode code highlighting */
        .hljs {
            background: #1E293B !important;
            color: #E2E8F0 !important;
        }
        
        /* Dark mode table styles */
        .markdown-body table {
            background-color: #1E293B !important;
            border-color: #334155 !important;
        }
        
        .markdown-body table tr {
            background-color: #1E293B !important;
            border-top: 1px solid #334155 !important;
        }
        
        .markdown-body table tr:nth-child(2n) {
            background-color: #1E293B !important;
        }
        
        .markdown-body table th, .markdown-body table td {
            border: 1px solid #334155 !important;
            padding: 9px 20px !important;
        }
        
        /* Dark mode code blocks */
        .markdown-body pre {
            background-color: #1E293B !important;
            padding: 6px !important;
        }
        
        .markdown-body code {
            background-color: #1E293B !important;
            color: #E2E8F0 !important;
        }
        
        /* Dark mode horizontal rules */
        .markdown-body hr {
            background-color: #334155 !important;
            border: none !important;
            height: 1px !important;
        }
        
        /* Dark mode blockquotes */
        .markdown-body blockquote {
            color: #94A3B8 !important;
            border-left: 4px solid #4338CA !important;
            background: transparent !important;
        }
        
        /* Dark mode links */
        .markdown-body a {
            color: #4338CA !important;
        }
        
        /* Dark mode headings */
        .markdown-body h1, .markdown-body h2, .markdown-body h3, 
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            color: #E2E8F0 !important;
            border-bottom-color: #334155 !important;
        }
        
        /* Math expressions in dark mode */
        mjx-container {
            color: #E2E8F0 !important;
        }
        
        mjx-math {
            color: #E2E8F0 !important;
        }
        
        /* Fix for transparent images - override github-markdown-css background */
        .markdown-body img {
            background-color: transparent !important;
        }
    ` : `
        body { 
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: #ffffff !important;
            color: #24292e !important;
        }
        .markdown-body {
            background-color: #ffffff !important;
            color: #24292e !important;
            color-scheme: light;
        }
        
        /* Light mode code highlighting */
        .hljs {
            background: #f6f8fa !important;
            color: #24292e !important;
        }
        
        /* Light mode table styles */
        .markdown-body table {
            background-color: #ffffff !important;
            border-color: #e1e4e8 !important;
        }
        
        .markdown-body table tr {
            background-color: #ffffff !important;
            border-top: 1px solid #e1e4e8 !important;
        }
        
        .markdown-body table tr:nth-child(2n) {
            background-color: #f6f8fa !important;
        }
        
        .markdown-body table th, .markdown-body table td {
            border: 1px solid #e1e4e8 !important;
            padding: 9px 20px !important;
        }
        
        /* Light mode code blocks */
        .markdown-body pre {
            background-color: #f6f8fa !important;
            padding: 6px !important;
        }
        
        .markdown-body code {
            background-color: #f6f8fa !important;
            color: #24292e !important;
        }
        
        /* Light mode horizontal rules */
        .markdown-body hr {
            background-color: #e1e4e8 !important;
            border: none !important;
            height: 1px !important;
        }
        
        /* Light mode blockquotes */
        .markdown-body blockquote {
            color: #6a737d !important;
            border-left: 4px solid #dfe2e5 !important;
            background: transparent !important;
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
    
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Markdown</title>
    <link rel="icon" href="https://raw.githubusercontent.com/zigzag-007/MarkTide-Viewer/main/assets/img/icon.jpg" type="image/jpeg">
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
    a.download = `document-${isDarkMode ? 'dark' : 'light'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportAsText() {
    const content = this.markdownEditor.value;
    // Remove markdown formatting for plain text
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // Remove images, keep alt text
      .replace(/^[\s]*[-\*\+]\s+/gm, '• ') // Convert lists to bullets
      .replace(/^[\s]*\d+\.\s+/gm, '• ') // Convert numbered lists to bullets
      .replace(/^>\s+/gm, '') // Remove blockquotes
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/---+/g, ''); // Remove horizontal rules
    
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
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