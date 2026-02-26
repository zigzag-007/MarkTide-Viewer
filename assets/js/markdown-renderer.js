// Markdown rendering and processing functionality

class MarkdownRenderer {
  constructor() {
    this.markdownRenderTimeout = null;
    this.RENDER_DELAY = 100;
    this.renderFramePending = false;
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
    // Check if soft line breaks are enabled (default: true for user-friendliness)
    const softLineBreaks = localStorage.getItem('marktide-soft-breaks') !== 'false';
    
    const markedOptions = {
      gfm: true,
      breaks: softLineBreaks, // Enable soft line breaks by default
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
        try {
          return hljs.highlight(code, { 
            language: validLanguage,
            ignoreIllegals: true  // Prevent HTML injection
          }).value;
        } catch (e) {
          // Fallback to escaped plain text
          return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
      },
    });
  }

  // Normalize Word-style list syntax to Markdown-compatible nested lists.
  // Supports:
  // - "1.1 Item" / "1.1.1 Item" -> nested ordered list markers
  // - tab-indented list lines -> 2-space indentation
  normalizeListSyntax(markdownText) {
    if (!markdownText || typeof markdownText !== 'string') return markdownText;

    const LIST_INDENT = '  ';
    const LIST_INDENT_SIZE = LIST_INDENT.length;
    const lines = markdownText.split('\n');
    const normalized = [];
    let inFence = false;

    for (let rawLine of lines) {
      const fenceMatch = rawLine.match(/^\s*(```|~~~)/);
      if (fenceMatch) {
        inFence = !inFence;
        normalized.push(rawLine);
        continue;
      }

      if (inFence) {
        normalized.push(rawLine);
        continue;
      }

      // Convert leading tabs to Markdown list-friendly indentation.
      rawLine = rawLine.replace(/^\t+/, (m) => LIST_INDENT.repeat(m.length));

      // Convert decimal-outline numbering (e.g. 1.1, 2.3.4) to nested ordered lists.
      const m = rawLine.match(/^(\s*)(\d+(?:\.\d+)+)\.?\s+(.*)$/);
      if (m) {
        const leading = m[1] || '';
        const outline = m[2];
        const text = m[3] || '';
        const parts = outline.split('.');
        const outlineDepth = Math.max(1, parts.length - 1);
        const leadingDepth = Math.floor(leading.length / LIST_INDENT_SIZE);
        // Avoid doubling nesting when editor already has indentation
        // and decimal-outline marker at the same depth (e.g. "  1.1. ...").
        const depth = Math.max(outlineDepth, leadingDepth);
        const marker = parts[parts.length - 1] || '1';
        const indent = LIST_INDENT.repeat(depth);
        normalized.push(`${indent}${marker}. ${text}`);
        continue;
      }

      normalized.push(rawLine);
    }

    return normalized.join('\n');
  }

  renderMarkdown() {
    if (!this.initialized) {
      this.init();
    }

    try {
      const markdown = this.normalizeListSyntax(this.markdownEditor.value);
      const html = marked.parse(markdown);
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ADD_TAGS: ['mjx-container'],
        ADD_ATTR: ['id', 'class', 'style']
      });
      this.markdownPreview.innerHTML = sanitizedHtml;

      this.markdownPreview.querySelectorAll("pre code").forEach((block) => {
        try {
          if (!block.classList.contains('mermaid')) {
            // Sanitize content before highlighting to prevent HTML injection
            const content = block.textContent || block.innerText || '';
            block.textContent = content; // This removes any HTML
            hljs.highlightElement(block);
          }
        } catch (e) {
          console.warn("Syntax highlighting failed for a code block:", e);
          // Fallback: ensure content is escaped
          const content = block.textContent || block.innerText || '';
          block.textContent = content;
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
    // Keep method name for backward compatibility, but use frame-throttled
    // rendering so preview updates continuously while typing.
    if (this.renderFramePending) return;
    this.renderFramePending = true;

    requestAnimationFrame(() => {
      this.renderFramePending = false;
      this.renderMarkdown();
    });
  }

  // Toggle soft line breaks setting
  toggleSoftLineBreaks() {
    const currentSetting = localStorage.getItem('marktide-soft-breaks') !== 'false';
    const newSetting = !currentSetting;
    localStorage.setItem('marktide-soft-breaks', newSetting.toString());
    
    // Re-setup marked with new setting
    this.setupMarked();
    
    // Re-render to apply changes
    this.renderMarkdown();
    
    return newSetting;
  }

  // Get current soft line breaks setting
  getSoftLineBreaksSetting() {
    return localStorage.getItem('marktide-soft-breaks') !== 'false';
  }
}

// Create global instance
window.MarkTideRenderer = new MarkdownRenderer();
