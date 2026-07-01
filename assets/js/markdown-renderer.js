// Markdown rendering and processing functionality

/** Grok-style wrap (left staggered) / unwrap (centered staggered) icons for code block header */
function marktideWrapButtonHtml() {
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

function marktideEncodeMermaidSource(source) {
  return encodeURIComponent(source || '');
}

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
        return `<div class="mermaid-container" data-mermaid-source="${marktideEncodeMermaidSource(code)}"><div class="mermaid" id="${uniqueId}">${code}</div></div>`;
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
                ${marktideWrapButtonHtml()}
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
                ${marktideWrapButtonHtml()}
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

    marked.setOptions({
      ...markedOptions,
      renderer: this.renderer,
      highlight: function (code, language) {
        if (language === 'mermaid') return code;

        try {
          return window.MarktideCodeHighlight
            ? window.MarktideCodeHighlight.highlight(code, language).value
            : hljs.highlight(code, {
                language: hljs.getLanguage(language) ? language : "plaintext",
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
    const NORMALIZED_LIST_INDENT = '   ';
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
      const m = rawLine.match(/^(\s*)(\d+(?:\.\d+)+)\.?(?:\s+(.*))?$/);
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
        const indent = NORMALIZED_LIST_INDENT.repeat(depth);
        normalized.push(`${indent}${marker}. ${text}`);
        continue;
      }

      normalized.push(rawLine);
    }

    return normalized.join('\n');
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  prepareMarkdownExtensions(markdownText) {
    const abbreviations = [];
    const markPlaceholders = [];
    const displayMathPlaceholders = [];
    const mathPlaceholders = [];
    const lines = String(markdownText || '').split('\n');
    const output = [];
    let inFence = false;
    let displayMathBlock = null;
    const looksLikeInlineMath = (content) => {
      return /^[A-Za-z]$/.test(content) || /\\[A-Za-z]+|[\^_{}=<>+\-*/()]|\b(?:O|Theta|Omega)\s*\(/.test(content);
    };

    lines.forEach((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        output.push(line);
        return;
      }

      if (!inFence) {
        if (displayMathBlock) {
          displayMathBlock.lines.push(line);

          if (line.trim() === displayMathBlock.close) {
            const token = `@@MARKTIDE_DISPLAY_MATH_${displayMathPlaceholders.length}@@`;
            displayMathPlaceholders.push(displayMathBlock.lines.join('\n'));
            output.push(token);
            displayMathBlock = null;
          }

          return;
        }

        const displayMathOpen = line.trim();
        if (
          displayMathOpen.length > 4 &&
          displayMathOpen.startsWith('$$') &&
          displayMathOpen.endsWith('$$')
        ) {
          const token = `@@MARKTIDE_DISPLAY_MATH_${displayMathPlaceholders.length}@@`;
          displayMathPlaceholders.push(line);
          output.push(token);
          return;
        }

        if (
          displayMathOpen.length > 4 &&
          displayMathOpen.startsWith('\\[') &&
          displayMathOpen.endsWith('\\]')
        ) {
          const token = `@@MARKTIDE_DISPLAY_MATH_${displayMathPlaceholders.length}@@`;
          displayMathPlaceholders.push(line);
          output.push(token);
          return;
        }

        if (displayMathOpen === '$$' || displayMathOpen === '\\[') {
          displayMathBlock = {
            close: displayMathOpen === '$$' ? '$$' : '\\]',
            lines: [line]
          };
          return;
        }

        const abbreviationMatch = line.match(/^\s*\*\[([^\]]+)\]:\s+(.+?)\s*$/);
        if (abbreviationMatch) {
          abbreviations.push({
            key: abbreviationMatch[1].trim(),
            title: abbreviationMatch[2].trim()
          });
          return;
        }

        line = line.replace(/(^|[^=])==([^=\n](?:[^\n]*?[^=\n])?)==(?!=)/g, (match, prefix, content) => {
          const token = `@@MARKTIDE_MARK_${markPlaceholders.length}@@`;
          markPlaceholders.push(`<mark>${this.escapeHtml(content)}</mark>`);
          return `${prefix}${token}`;
        });

        line = line.replace(/(^|[^\w\\])\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?![\w])/g, (match, prefix, content) => {
          if (!looksLikeInlineMath(content)) return match;

          const token = `@@MARKTIDE_MATH_${mathPlaceholders.length}@@`;
          mathPlaceholders.push(`\\(${content}\\)`);
          return `${prefix}${token}`;
        });
      }

      output.push(line);
    });

    if (displayMathBlock) {
      output.push(...displayMathBlock.lines);
    }

    return {
      markdown: output.join('\n'),
      abbreviations,
      markPlaceholders,
      displayMathPlaceholders,
      mathPlaceholders
    };
  }

  applyMarkdownExtensions(html, context) {
    let output = context.markPlaceholders.reduce((result, markup, index) => {
      return result.replace(new RegExp(`@@MARKTIDE_MARK_${index}@@`, 'g'), () => markup);
    }, html);

    output = context.mathPlaceholders.reduce((result, math, index) => {
      return result.replace(new RegExp(`@@MARKTIDE_MATH_${index}@@`, 'g'), () => math);
    }, output);

    output = context.displayMathPlaceholders.reduce((result, math, index) => {
      const escapedMath = this.escapeHtml(math);
      const token = `@@MARKTIDE_DISPLAY_MATH_${index}@@`;
      const paragraphPattern = new RegExp(`<p>\\s*${token}\\s*</p>`, 'g');
      return result
        .replace(paragraphPattern, () => escapedMath)
        .replace(new RegExp(token, 'g'), () => escapedMath);
    }, output);

    const abbreviations = context.abbreviations
      .filter((item) => item.key && item.title)
      .sort((a, b) => b.key.length - a.key.length);

    if (!abbreviations.length || typeof document === 'undefined') {
      return output;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = output;

    const pattern = new RegExp(`\\b(${abbreviations.map((item) => this.escapeRegExp(item.key)).join('|')})\\b`, 'g');
    const titles = abbreviations.reduce((map, item) => {
      map[item.key] = item.title;
      return map;
    }, {});

    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('a, abbr, code, pre, script, style, textarea, mjx-container')) {
          return NodeFilter.FILTER_REJECT;
        }

        pattern.lastIndex = 0;
        return pattern.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const textNodes = [];

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      const text = node.nodeValue || '';
      let lastIndex = 0;
      pattern.lastIndex = 0;

      text.replace(pattern, (match, key, offset) => {
        if (offset > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        }

        const abbr = document.createElement('abbr');
        abbr.title = titles[key] || '';
        abbr.textContent = match;
        fragment.appendChild(abbr);
        lastIndex = offset + match.length;
        return match;
      });

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      node.parentNode.replaceChild(fragment, node);
    });

    return wrapper.innerHTML;
  }

  parseMarkdown(markdownText, options = {}) {
    const normalizedMarkdown = this.normalizeListSyntax(markdownText || '');
    const extensionContext = this.prepareMarkdownExtensions(normalizedMarkdown);
    const html = marked.parse(extensionContext.markdown, options);
    return this.applyMarkdownExtensions(html, extensionContext);
  }

  renderMarkdown() {
    if (!this.initialized) {
      this.init();
    }

    try {
      const markdown = this.markdownEditor.value;
      const html = this.parseMarkdown(markdown);
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ADD_TAGS: [
          "mjx-container",
          "svg",
          "line",
          "path",
          "g",
          "circle",
          "rect",
          "mark",
          "abbr",
        ],
        ADD_ATTR: [
          "id",
          "class",
          "style",
          "viewBox",
          "xmlns",
          "width",
          "height",
          "stroke",
          "stroke-width",
          "stroke-linecap",
          "fill",
          "x1",
          "y1",
          "x2",
          "y2",
          "d",
          "aria-hidden",
          "focusable",
          "aria-pressed",
          "aria-label",
          "title",
          "tabindex",
          "role",
          "type",
          "data-marktide-tip",
          "data-mermaid-source",
        ],
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
      
      // Render mermaid diagrams with the current theme.
      if (window.MarkTideMermaid) {
        window.MarkTideMermaid.renderDiagrams(this.markdownPreview).then(() => {
          if (window.MarkTideMermaidToolbar) {
            window.MarkTideMermaidToolbar.enhance(this.markdownPreview);
          }
        });
      }
      
      if (window.MathJax) {
        try {
          const mjPromise = MathJax.typesetPromise([this.markdownPreview]);
          if (mjPromise && typeof mjPromise.then === "function") {
            mjPromise
              .then(() => {
                if (window.MarkTideCodeWrap) {
                  window.MarkTideCodeWrap.scheduleRefresh(this.markdownPreview);
                }
              })
              .catch((err) => {
                console.warn("MathJax typesetting failed:", err);
              });
          }
        } catch (e) {
          console.warn("MathJax rendering failed:", e);
        }
      }

      if (window.MarkTideUtils && window.MarkTideUtils.updateDocumentStats) {
        window.MarkTideUtils.updateDocumentStats();
      }

      if (window.MarkTideCodeWrap) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.MarkTideCodeWrap.scheduleRefresh(this.markdownPreview);
          });
        });
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
