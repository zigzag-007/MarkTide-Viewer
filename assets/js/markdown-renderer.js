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
    this.renderPipeline = Promise.resolve();
    this.renderVersion = 0;
  }

  init() {
    this.markdownEditor = document.getElementById("markdown-editor");
    this.markdownPreview = document.getElementById("markdown-preview");
    
    this.setupMarked();
    this.initialized = true;
  }

  setupMarked() {
    if (!window.MarkTideCodeBlockRenderer) {
      throw new Error('Shared code block renderer is required for Markdown preview.');
    }

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

    this.renderer = window.MarkTideCodeBlockRenderer.createRenderer({
      enhanced: true,
      includeMermaidSource: true,
    });

    marked.setOptions({
      ...markedOptions,
      renderer: this.renderer,
    });
  }

  createFenceState() {
    return {
      character: '',
      length: 0,
    };
  }

  consumeFencedLine(line, state) {
    const openingMatch = String(line).match(/^ {0,3}(`{3,}|~{3,})(.*)$/);

    if (!state.character) {
      if (!openingMatch) return false;

      const marker = openingMatch[1];
      const info = openingMatch[2] || '';
      if (marker[0] === '`' && info.includes('`')) return false;

      state.character = marker[0];
      state.length = marker.length;
      return true;
    }

    const closingMatch = String(line).match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
    if (closingMatch) {
      const marker = closingMatch[1];
      if (marker[0] === state.character && marker.length >= state.length) {
        state.character = '';
        state.length = 0;
      }
    }

    return true;
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
    const fenceState = this.createFenceState();

    for (let rawLine of lines) {
      if (this.consumeFencedLine(rawLine, fenceState)) {
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
    const fenceState = this.createFenceState();
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

      if (this.consumeFencedLine(line, fenceState)) {
        output.push(line);
        return;
      }

      if (!fenceState.character) {
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
      const html = this.parseMarkdown(markdown || ' ', options);
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

  prepareImageCaptions(wrapper) {
    const normalizeText = (text) => String(text || '').replace(/\s+/g, ' ').trim();
    const isVisible = (element) => {
      if (!element) return false;
      for (let current = element; current && current !== wrapper; current = current.parentElement) {
        if (current.hidden || current.getAttribute('aria-hidden') === 'true'
          || current.style.display === 'none' || current.style.opacity === '0') return false;
      }
      return true;
    };

    wrapper.querySelectorAll('img').forEach((image) => {
      if ((image.getAttribute('src') || '').includes('img.shields.io')) return;
      const alt = normalizeText(image.getAttribute('alt'));
      if (!alt || /^(?:image|img|photo|picture|screenshot|diagram|figure|icon|logo)(?:[\s_-]*\d+)?[.!]?$/i.test(alt)) return;
      if (!isVisible(image)) return;

      const parent = image.parentElement;
      const authoredFigure = image.closest('figure');
      if (authoredFigure && Array.from(authoredFigure.querySelectorAll('figcaption')).some(isVisible)) return;
      const imageOnly = Array.from(parent.childNodes).every((node) => node === image
        || node.nodeType === 8 || (node.nodeType === 3 && !node.textContent.trim()));
      if (parent !== wrapper && !(['P', 'DIV', 'FIGURE'].includes(parent.tagName) && imageOnly)) return;

      // Keep nearby authored captions. A blockquote is always separate content.
      const block = parent === wrapper ? image : parent;
      const hasCaption = (neighbor) => {
        if (!isVisible(neighbor) || neighbor.tagName === 'BLOCKQUOTE') return false;
        const text = normalizeText(neighbor.textContent);
        if (!text) return false;
        const figureLabel = alt.match(/^(?:figure|fig\.?)\s+\d+(?:[.\-]\d+)*/i);
        const labelledCaption = figureLabel && text.toLowerCase().startsWith(figureLabel[0].toLowerCase())
          && /^(?:\s*[.:\-]|\s*$)/.test(text.slice(figureLabel[0].length));
        const italicCaption = neighbor === block.nextElementSibling && neighbor.tagName === 'P'
          && neighbor.children.length === 1 && ['EM', 'I'].includes(neighbor.firstElementChild.tagName)
          && normalizeText(neighbor.firstElementChild.textContent) === text;
        return neighbor.matches('figcaption, .caption, .image-caption, .marktide-image-caption')
          || (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(neighbor.tagName)
            && (text === alt || labelledCaption || italicCaption));
      };
      if (hasCaption(block.previousElementSibling) || hasCaption(block.nextElementSibling)) return;

      const figure = parent.tagName === 'FIGURE' ? parent : document.createElement('figure');
      if (figure !== parent) {
        if (parent !== wrapper) {
          Array.from(parent.attributes).forEach((attribute) => {
            figure.setAttribute(attribute.name, attribute.value);
          });
        }
        block.replaceWith(figure);
        figure.appendChild(image);
      }
      figure.classList.add('marktide-image-figure');
      const caption = document.createElement('figcaption');
      caption.className = 'marktide-image-caption';
      // Alt text stays text, never markup, even after sanitizing the image.
      caption.textContent = alt;
      figure.appendChild(caption);
    });
  }

  prepareScreenTables(wrapper) {
    wrapper.querySelectorAll('table').forEach((table) => {
      const existingScroll = table.parentElement.classList.contains('marktide-table-scroll')
        ? table.parentElement : null;
      table.querySelector(':scope > .marktide-screen-columns')?.remove();
      table.classList.remove('marktide-screen-balanced-table');
      table.classList.remove('marktide-screen-mobile-balanced-table');
      table.style.removeProperty('--marktide-table-min-width');
      table.style.removeProperty('--marktide-table-mobile-min-width');
      const rows = Array.from(table.rows);
      const cells = rows.flatMap((row) => Array.from(row.cells));
      const hasSpans = cells.some((cell) => cell.colSpan !== 1 || cell.rowSpan !== 1);
      const columns = Math.max(0, ...rows.map((row) => row.cells.length));
      const hasAuthoredWidths = table.querySelector('colgroup, col')
        || [table, ...cells].some((element) => element.hasAttribute('width')
          || ['width', 'min-width', 'max-width', 'table-layout'].some((property) =>
            element.style.getPropertyValue(property)));
      const textOf = (cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim();
      const hasProse = cells.some((cell) => textOf(cell).length >= 80
        && textOf(cell).split(/\s+/).length >= 10);
      const hasCrowdedText = cells.some((cell) => textOf(cell).length >= 40
        && textOf(cell).split(/\s+/).length >= 6);
      const hasMedia = table.querySelector('img, svg, pre, mjx-container, table');
      table.classList.toggle('marktide-screen-media-table', Boolean(hasMedia));
      table.classList.toggle('marktide-screen-compact-table',
        (columns >= 5 || (columns === 4 && cells.some((cell) => textOf(cell).length >= 16))
          || (columns === 3 && cells.some((cell) => textOf(cell).length >= 24)))
          && !hasSpans && !hasAuthoredWidths && !hasMedia);
      const authoredWidth = table.getAttribute('width') || '';
      const widthLimit = authoredWidth.endsWith('%') ? 1000 : 8192;
      if (!table.style.width && /^\d+(?:\.\d+)?%?$/.test(authoredWidth)
        && Number.parseFloat(authoredWidth) <= widthLimit) {
        table.style.width = authoredWidth.endsWith('%') ? authoredWidth : `${authoredWidth}px`;
      }

      // Spans and authored widths keep the browser's own column sizing.
      if (columns >= 3 && hasCrowdedText && !hasSpans && !hasAuthoredWidths && !hasMedia
        && rows.every((row) => row.cells.length === columns)) {
        const desktopBalanced = columns >= 5 && hasProse;
        const minimums = Array(columns).fill(3);
        const mobileMinimums = Array(columns).fill(3);
        const lengths = Array(columns).fill(1);
        cells.forEach((cell) => {
          const index = cell.cellIndex;
          const text = textOf(cell);
          const words = text.split(/\s+/);
          lengths[index] = Math.max(lengths[index], text.length);
          const prose = words.length >= 6 && text.length >= 40;
          const wordLength = Math.max(0, ...words.map((word) => Math.min(18, word.length)));
          const codeLength = Math.max(0, ...Array.from(cell.querySelectorAll('code'))
            .map((code) => Math.min(18, (code.textContent || '').length)));
          const shortLength = cell.tagName === 'TH' ? wordLength : Math.min(10, text.length);
          const shortValue = cell.tagName === 'TD' && text.length <= 12
            && words.length <= 2 && !cell.querySelector('br, code');
          const proseWidth = text.length >= 120 ? 11 : text.length >= 80 ? 9 : 8;
          minimums[index] = Math.max(minimums[index], prose ? proseWidth
            : Math.min(9, 0.9 + Math.max(shortLength * 0.5, codeLength * 0.45)));
          mobileMinimums[index] = Math.max(mobileMinimums[index], prose
            ? Math.max(proseWidth, text.length >= 80 ? 12 : 9)
            : Math.max(1.25 + (codeLength ? shortLength * 0.5
              : (shortValue ? shortLength : wordLength) * 0.65),
              1.9 + codeLength * 0.51));
        });
        const total = minimums.reduce((sum, width) => sum + width, 0);
        const mobileTotal = mobileMinimums.reduce((sum, width) => sum + width, 0);
        const weights = lengths.map((length) => Math.sqrt(length));
        const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
        const colgroup = document.createElement('colgroup');
        colgroup.className = 'marktide-screen-columns';
        minimums.forEach((width, index) => {
          const column = document.createElement('col');
          // Reserve readable columns, then give extra room to longer content.
          const share = 0.85 * width / total + 0.15 * weights[index] / weightTotal;
          if (desktopBalanced) column.style.width = `${share * 100}%`;
          column.style.setProperty('--marktide-mobile-column-width',
            `${mobileMinimums[index] / mobileTotal * 100}%`);
          colgroup.appendChild(column);
        });
        table.insertBefore(colgroup, table.firstChild);
        table.classList.add(desktopBalanced ? 'marktide-screen-balanced-table'
          : 'marktide-screen-mobile-balanced-table');
        table.style.setProperty('--marktide-table-min-width', `${Number(total.toFixed(2))}em`);
        table.style.setProperty('--marktide-table-mobile-min-width', `${Number(mobileTotal.toFixed(2))}em`);
      }

      const shortColumns = Array.from({ length: columns }, (_, index) => {
        const bodyCells = rows.filter((row) => row.parentElement.tagName !== 'THEAD')
          .map((row) => row.cells[index]).filter((cell) => cell?.tagName === 'TD');
        return !hasSpans && !hasAuthoredWidths && !hasMedia && bodyCells.length > 0
          && bodyCells.every((cell) => textOf(cell).length <= 12
            && textOf(cell).split(/\s+/).length <= 2 && !cell.querySelector('br, code'));
      });
      cells.forEach((cell) => {
        cell.classList.toggle('marktide-screen-long-value', /\S{24,}/.test(textOf(cell)));
        cell.classList.toggle('marktide-screen-short-value',
          cell.tagName === 'TD' && shortColumns[cell.cellIndex]);
        cell.querySelectorAll('code:not(pre code)').forEach((code) => {
          const text = (code.textContent || '').trim();
          code.classList.toggle('marktide-screen-short-code',
            !hasSpans && !hasAuthoredWidths && !hasMedia && /^\S{1,18}$/.test(text));
        });
      });
      const scroll = existingScroll || document.createElement('div');
      scroll.className = 'marktide-table-scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      const title = table.caption?.textContent || (existingScroll || table).previousElementSibling?.textContent || '';
      scroll.setAttribute('aria-label', `${title.trim().slice(0, 100) || 'Document'} table. Scroll horizontally for more columns.`);
      if (!existingScroll) {
        table.replaceWith(scroll);
        scroll.appendChild(table);
      }
    });
  }

  prepareRenderedHtml(html, options = {}) {
    if (!window.MarkTideSanitizer) {
      throw new Error('Shared sanitizer is required for Markdown rendering.');
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = window.MarkTideSanitizer.sanitize(html, {
      mode: options.mode || 'preview'
    });

    if (window.MarkTideUtils && window.MarkTideUtils.processEmojis) {
      window.MarkTideUtils.processEmojis(wrapper);
    }

    // Keep badges and inline images in place. Only resize standalone images.
    wrapper.querySelectorAll('img').forEach((image) => {
      if ((image.getAttribute('src') || '').includes('img.shields.io')) return;
      const parent = image.parentElement;
      const standalone = parent === wrapper || (parent.tagName === 'P'
        && Array.from(parent.childNodes).every((node) => node === image
          || (node.nodeType === 3 && !node.textContent.trim())));
      if (!standalone) return;

      image.classList.add('marktide-content-image');
      const authoredSize = image.hasAttribute('width') || image.hasAttribute('height')
        || Array.from(image.style).some((property) => /^(?:(?:min|max)-)?(?:width|height)$/.test(property));
      if (!authoredSize) image.classList.add('marktide-default-image');
    });

    this.prepareImageCaptions(wrapper);
    if (options.mode !== 'pdf') this.prepareScreenTables(wrapper);

    return wrapper.innerHTML;
  }

  queuePreviewRender(renderedHtml, shouldEnhance) {
    const renderVersion = ++this.renderVersion;

    this.renderPipeline = this.renderPipeline
      .catch(() => false)
      .then(async () => {
        if (renderVersion !== this.renderVersion) return false;

        const updateContent = () => {
          this.markdownPreview.innerHTML = renderedHtml;
        };
        if (window.MarkTideMathJax && typeof window.MarkTideMathJax.updateContent === 'function') {
          await window.MarkTideMathJax.updateContent(this.markdownPreview, updateContent);
        } else {
          updateContent();
        }

        if (renderVersion !== this.renderVersion || !shouldEnhance) return true;

        if (window.MarkTideMermaid) {
          try {
            await window.MarkTideMermaid.renderDiagrams(this.markdownPreview);
          } catch (error) {
            console.warn('Mermaid rendering failed:', error);
          }
        }

        if (renderVersion !== this.renderVersion) return false;
        if (window.MarkTideMermaidToolbar) {
          window.MarkTideMermaidToolbar.enhance(this.markdownPreview);
        }

        if (window.MarkTideMathJax) {
          try {
            await window.MarkTideMathJax.typeset(this.markdownPreview);
          } catch (error) {
            console.warn('MathJax typesetting failed:', error);
          }
        }

        if (window.MarkTideCodeWrap) {
          window.MarkTideCodeWrap.scheduleRefresh(this.markdownPreview);
        }
        return true;
      });

    return this.renderPipeline;
  }

  renderMarkdown() {
    if (!this.initialized) {
      this.init();
    }

    try {
      const markdown = this.markdownEditor.value;
      const html = this.parseMarkdown(markdown);
      const renderedHtml = this.prepareRenderedHtml(html, { mode: 'preview' });
      const renderPromise = this.queuePreviewRender(renderedHtml, true);

      if (window.MarkTideUtils && window.MarkTideUtils.updateDocumentStats) {
        window.MarkTideUtils.updateDocumentStats();
      }

      return renderPromise;
    } catch (e) {
      console.error("Markdown rendering failed:", e);
      const errorMessage = this.escapeHtml(e && e.message ? e.message : 'Unknown error');
      const markdownSource = this.escapeHtml(this.markdownEditor.value);
      return this.queuePreviewRender(`<div class="alert alert-danger">
              <strong>Error rendering markdown:</strong> ${errorMessage}
          </div>
          <pre>${markdownSource}</pre>`, false);
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
