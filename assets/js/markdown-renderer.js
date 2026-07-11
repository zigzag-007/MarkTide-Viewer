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

    this.renderer = window.MarkTideCodeBlockRenderer
      ? window.MarkTideCodeBlockRenderer.createRenderer({
          enhanced: true,
          includeMermaidSource: true,
        })
      : new marked.Renderer();

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
    const footnotes = [];
    const footnotePlaceholders = [];
    const markPlaceholders = [];
    const displayMathPlaceholders = [];
    const mathPlaceholders = [];
    const lines = String(markdownText || '').split('\n');
    const output = [];
    let inFence = false;
    let displayMathBlock = null;
    let currentFootnote = null;
    const looksLikeInlineMath = (content) => {
      return /^[A-Za-z]$/.test(content) || /\\[A-Za-z]+|[\^_{}=<>+\-*/()]|\b(?:O|Theta|Omega)\s*\(/.test(content);
    };
    const finishFootnote = () => {
      if (!currentFootnote) return;

      while (currentFootnote.lines.length && currentFootnote.lines[currentFootnote.lines.length - 1] === '') {
        currentFootnote.lines.pop();
      }

      footnotes.push(currentFootnote);
      currentFootnote = null;
    };
    const normalizeFootnoteContinuation = (line) => {
      if (line.startsWith('    ')) return line.slice(4);
      if (line.startsWith('\t')) return line.slice(1);
      return line;
    };

    lines.forEach((line) => {
      if (currentFootnote) {
        const nextFootnoteMatch = line.match(/^\[\^([^\]\s]+)\]:\s*(.*)$/);
        if (nextFootnoteMatch) {
          finishFootnote();
          currentFootnote = {
            label: nextFootnoteMatch[1],
            lines: [nextFootnoteMatch[2] || '']
          };
          return;
        }

        if (/^(?: {4}|\t)/.test(line)) {
          currentFootnote.lines.push(normalizeFootnoteContinuation(line));
          return;
        }

        if (/^\s*$/.test(line)) {
          currentFootnote.lines.push('');
          return;
        }

        finishFootnote();
      }

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

        const footnoteDefinitionMatch = line.match(/^\[\^([^\]\s]+)\]:\s*(.*)$/);
        if (footnoteDefinitionMatch) {
          finishFootnote();
          currentFootnote = {
            label: footnoteDefinitionMatch[1],
            lines: [footnoteDefinitionMatch[2] || '']
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

        line = line.replace(/(^|[^\\])\[\^([^\]\s]+)\]/g, (match, prefix, label) => {
          const token = `@@MARKTIDE_FOOTNOTE_REF_${footnotePlaceholders.length}@@`;
          footnotePlaceholders.push(label);
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

    finishFootnote();

    if (displayMathBlock) {
      output.push(...displayMathBlock.lines);
    }

    return {
      markdown: output.join('\n'),
      abbreviations,
      footnotes,
      footnotePlaceholders,
      markPlaceholders,
      displayMathPlaceholders,
      mathPlaceholders
    };
  }

  slugifyFootnoteLabel(label) {
    return String(label || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'note';
  }

  renderFootnoteReference(label, number, duplicateIndex) {
    const slug = this.slugifyFootnoteLabel(label);
    const suffix = duplicateIndex > 1 ? `-${duplicateIndex}` : '';

    return `<sup class="footnote-ref" id="fnref-${slug}${suffix}"><a href="#fn-${slug}" aria-label="Footnote ${number}">[${number}]</a></sup>`;
  }

  renderFootnotes(context, options = {}) {
    if (!context.footnotes.length) return '';

    const referencedLabels = context.footnotePlaceholders.filter((label, index, labels) => {
      return labels.indexOf(label) === index;
    });
    const orderedFootnotes = referencedLabels
      .map((label) => context.footnotes.find((footnote) => footnote.label === label))
      .filter(Boolean);
    const unreferencedFootnotes = context.footnotes.filter((footnote) => {
      return !referencedLabels.includes(footnote.label);
    });
    const footnotes = orderedFootnotes.concat(unreferencedFootnotes);

    if (!footnotes.length) return '';

    const items = footnotes.map((footnote) => {
      const slug = this.slugifyFootnoteLabel(footnote.label);
      const markdown = footnote.lines.join('\n').trim();
      const html = marked.parse(markdown || ' ', options);
      const backref = ` <a href="#fnref-${slug}" class="footnote-backref" aria-label="Back to reference"><span aria-hidden="true">&#8617;</span></a>`;
      const body = html.replace(/<\/p>\s*$/, `${backref}</p>`);
      return `<li id="fn-${slug}">${body}</li>`;
    }).join('\n');

    return `\n<section class="footnotes">\n<hr>\n<ol>\n${items}\n</ol>\n</section>`;
  }

  applyMarkdownExtensions(html, context, options = {}) {
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

    const referencedLabels = context.footnotePlaceholders.filter((label, index, labels) => {
      return labels.indexOf(label) === index;
    });
    const footnoteNumbers = referencedLabels.reduce((map, label, index) => {
      map[label] = index + 1;
      return map;
    }, {});
    const seenReferences = {};

    output = context.footnotePlaceholders.reduce((result, label, index) => {
      seenReferences[label] = (seenReferences[label] || 0) + 1;
      const number = footnoteNumbers[label] || referencedLabels.length + 1;
      const reference = this.renderFootnoteReference(label, number, seenReferences[label]);
      return result.replace(new RegExp(`@@MARKTIDE_FOOTNOTE_REF_${index}@@`, 'g'), () => reference);
    }, output);

    output += this.renderFootnotes(context, options);

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
    return this.applyMarkdownExtensions(html, extensionContext, options);
  }

  renderMarkdown() {
    if (!this.initialized) {
      this.init();
    }

    try {
      const markdown = this.markdownEditor.value;
      const html = this.parseMarkdown(markdown);
      const sanitizedHtml = window.MarkTideSanitizer
        ? window.MarkTideSanitizer.sanitize(html, { mode: 'preview' })
        : DOMPurify.sanitize(html);
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
