// Markdown rendering and processing functionality

class MarkdownRenderer {
  constructor() {
    this.markdownRenderTimeout = null;
    this.RENDER_DELAY = 100;
    this.markdownEditor = null;
    this.markdownPreview = null;
    this.renderer = null;
    this.initialized = false;
  }

  init() {
    this.markdownEditor = document.getElementById("markdown-editor");
    this.markdownPreview = document.getElementById("markdown-preview");
    
    this.setupMarked();
    this.initialized = true;
  }

  setupMarked() {
    const markedOptions = {
      gfm: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartypants: false,
      xhtml: false,
      headerIds: true,
      mangle: false,
    };

    this.renderer = new marked.Renderer();
    this.renderer.code = function (code, language) {
      if (language === 'mermaid') {
        const uniqueId = 'mermaid-diagram-' + Math.random().toString(36).substr(2, 9);
        return `<div class="mermaid-container"><div class="mermaid" id="${uniqueId}">${code}</div></div>`;
      }
      
      // Handle batch/bat files
      if (language === 'batch' || language === 'bat' || language === 'cmd') {
        language = 'dos'; // Use DOS highlighting for batch files
      }
      
      const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
      const highlightedCode = hljs.highlight(code, {
        language: validLanguage,
      }).value;
      
      return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
    };

    marked.setOptions({
      ...markedOptions,
      renderer: this.renderer,
      highlight: function (code, language) {
        if (language === 'mermaid') return code;
        
        // Handle batch/bat files
        if (language === 'batch' || language === 'bat' || language === 'cmd') {
          language = 'dos';
        }
        
        const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
        return hljs.highlight(code, { language: validLanguage }).value;
      },
    });
  }

  renderMarkdown() {
    if (!this.initialized) {
      this.init();
    }

    try {
      const markdown = this.markdownEditor.value;
      const html = marked.parse(markdown);
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ADD_TAGS: ['mjx-container'],
        ADD_ATTR: ['id', 'class', 'style']
      });
      this.markdownPreview.innerHTML = sanitizedHtml;

      this.markdownPreview.querySelectorAll("pre code").forEach((block) => {
        try {
          if (!block.classList.contains('mermaid')) {
            hljs.highlightElement(block);
          }
        } catch (e) {
          console.warn("Syntax highlighting failed for a code block:", e);
        }
      });

      if (window.MarkTideUtils && window.MarkTideUtils.processEmojis) {
        window.MarkTideUtils.processEmojis(this.markdownPreview);
      }
      
      // Reinitialize mermaid with current theme before rendering diagrams
      if (window.MarkTideMermaid) {
        window.MarkTideMermaid.initMermaid();
        window.MarkTideMermaid.renderDiagrams(this.markdownPreview);
      }
      
      if (window.MathJax) {
        try {
          MathJax.typesetPromise([this.markdownPreview]).catch((err) => {
            console.warn('MathJax typesetting failed:', err);
          });
        } catch (e) {
          console.warn("MathJax rendering failed:", e);
        }
      }

      if (window.MarkTideUtils && window.MarkTideUtils.updateDocumentStats) {
        window.MarkTideUtils.updateDocumentStats();
      }
    } catch (e) {
      console.error("Markdown rendering failed:", e);
      this.markdownPreview.innerHTML = `<div class="alert alert-danger">
              <strong>Error rendering markdown:</strong> ${e.message}
          </div>
          <pre>${this.markdownEditor.value}</pre>`;
    }
  }

  debouncedRender() {
    clearTimeout(this.markdownRenderTimeout);
    this.markdownRenderTimeout = setTimeout(() => {
      this.renderMarkdown();
    }, this.RENDER_DELAY);
  }
}

// Create global instance
window.MarkTideRenderer = new MarkdownRenderer();