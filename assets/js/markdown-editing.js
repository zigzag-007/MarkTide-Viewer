// Source edits stay independent of Monaco and the page.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MarkTideMarkdownEditing = api;
})(typeof window === 'object' ? window : this, function () {
  const inlineTypes = { bold: 'strong', italic: 'em', strike: 'del', code: 'codespan',
    underline: 'marktideUnderline', highlight: 'marktideHighlight' };
  const delimiters = { bold: ['**', '**'], italic: ['*', '*'], strike: ['~~', '~~'],
    underline: ['<u>', '</u>'], highlight: ['==', '=='] };
  const installed = new WeakSet();

  function alignmentToken(source) {
    const opening = source.match(/^:::marktide-align (center|right|justify)\n/);
    if (!opening) return;
    let offset = opening[0].length;
    let depth = 1;
    let fence = null;
    for (const line of source.slice(offset).split('\n')) {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      }
      if (!fence) {
        if (/^:::marktide-align (center|right|justify)$/.test(line)) depth++;
        if (line === ':::') depth--;
        if (!depth) {
          const raw = source.slice(0, offset + line.length + (source[offset + line.length] === '\n' ? 1 : 0));
          return { type: 'marktideAlignment', raw, alignment: opening[1],
            text: source.slice(opening[0].length, offset), bodyOffset: opening[0].length };
        }
      }
      offset += line.length + 1;
    }
  }

  function install(marked) {
    if (installed.has(marked)) return;
    installed.add(marked);
    marked.use({ extensions: [
      { name: 'marktideAlignment', level: 'block',
        start: source => source.indexOf(':::marktide-align '),
        tokenizer(source) {
          const token = alignmentToken(source);
          if (token) { token.tokens = this.lexer.blockTokens(token.text); return token; }
        },
        renderer(token) {
          return `<div class="marktide-aligned-block" style="text-align: ${token.alignment};">${this.parser.parse(token.tokens)}</div>\n`;
        },
      },
      { name: 'marktidePageBreak', level: 'block',
        start: source => source.indexOf('<!-- marktide-page-break -->'),
        tokenizer(source) {
          const match = source.match(/^<!-- marktide-page-break --> *(?:\n|$)/);
          if (match) return { type: 'marktidePageBreak', raw: match[0] };
        },
        renderer() { return '<div class="marktide-page-break" role="separator" aria-label="Page break"></div>\n'; },
      },
      ...[['marktideHighlight', '==', '==', 'mark'], ['marktideUnderline', '<u>', '</u>', 'u']].map(([name, prefix, suffix, tag]) => ({
        name, level: 'inline', start: source => source.indexOf(prefix),
        tokenizer(source) {
          if (!source.startsWith(prefix)) return;
          let end = source.indexOf(suffix, prefix.length);
          while (end >= 0 && (source.slice(0, end).match(/\\+$/)?.[0].length || 0) % 2) end = source.indexOf(suffix, end + suffix.length);
          if (end <= prefix.length) return;
          const raw = source.slice(0, end + suffix.length);
          if (raw.includes('\n')) return;
          const text = source.slice(prefix.length, end);
          return { type: name, raw, text, tokens: this.lexer.inlineTokens(text) };
        },
        renderer(token) { return `<${tag}>${this.parser.parseInline(token.tokens)}</${tag}>`; },
      })),
    ] });
  }

  function blocks(source, marked) {
    let offset = 0;
    return marked.lexer(source).map(token => {
      const block = { token, from: offset, to: offset + token.raw.length };
      offset = block.to;
      return block;
    });
  }

  function codeRanges(source, marked) {
    const ranges = [];
    const collect = token => token.type === 'code' ? [token]
      : [...(token.tokens || []), ...(token.items || [])].flatMap(collect);
    for (const block of blocks(source, marked)) {
      const codes = collect(block.token);
      if (!codes.length) continue;
      if (block.token.type === 'code') { ranges.push(block); continue; }
      const rows = selectedLines(source, [{ anchor: block.from, head: block.to }]);
      let cursor = 0;
      for (const code of codes) {
        const wanted = code.raw.replace(/\n+$/, '').split('\n').map(line => line.trimStart());
        const normalize = line => line.replace(/^(?:\s*>\s?)*\s*(?:(?:[-+*]|\d+[.)])\s+)?/, '').trimStart();
        let found = -1;
        for (let index = cursor; index + wanted.length <= rows.length; index++) {
          if (wanted.every((line, offset) => normalize(rows[index + offset].text) === line)) { found = index; break; }
        }
        // Keep the whole container safe if its source mapping is ambiguous.
        if (found < 0) { ranges.push(block); break; }
        const last = rows[found + wanted.length - 1];
        ranges.push({ token: code, from: rows[found].from, to: Math.min(source.length, last.to + 1) });
        cursor = found + wanted.length;
      }
    }
    return ranges;
  }

  function codeContains(block, offset, length) {
    return block.from <= offset && (block.to > offset || block.to === length && offset === length);
  }

  function displayMathRanges(source) {
    const ranges = [];
    let opened = null;
    for (const line of selectedLines(source, [{ anchor: 0, head: source.length }])) {
      const text = line.text.replace(/^(?:\s*>\s?)*\s*(?:(?:[-+*]|\d+[.)])\s+)?/, '');
      if (opened) {
        if (text.trimEnd().endsWith(opened.close)) {
          ranges.push({ from: opened.from, to: line.to });
          opened = null;
        }
      } else if (text.startsWith('$$') || text.startsWith('\\[')) {
        const close = text.startsWith('$$') ? '$$' : '\\]';
        if (text.length > 2 && text.trimEnd().endsWith(close)) ranges.push({ from: line.from, to: line.to });
        else opened = { from: line.from, close };
      }
    }
    if (opened) ranges.push({ from: opened.from, to: source.length });
    return ranges;
  }

  function inlineTokens(source, marked, offset = 0) {
    const spans = [];
    let position = offset;
    for (const token of marked.Lexer.lexInline(source)) {
      const span = { token, from: position, to: position + token.raw.length };
      spans.push(span);
      if (token.tokens && typeof token.text === 'string') {
        const prefix = token.raw.indexOf(token.text);
        if (prefix >= 0) spans.push(...inlineTokens(token.text, marked, position + prefix));
      }
      position = span.to;
    }
    return spans;
  }

  function escapeText(text) {
    return text.replace(/([\\`*_[\]<>~])/g, '\\$1');
  }

  function codePair(text) {
    const runs = text.match(/`+/g) || [];
    const fence = '`'.repeat(Math.max(0, ...runs.map(run => run.length)) + 1);
    const pad = text.startsWith('`') || text.endsWith('`')
      || (text.startsWith(' ') && text.endsWith(' ') && text.trim()) ? ' ' : '';
    return [fence + pad, pad + fence];
  }

  function codeFence(text, language = '') {
    const fence = '`'.repeat(Math.max(3, ...((text.match(/`+/g) || []).map(run => run.length + 1))));
    return { prefix: fence + language + '\n', suffix: '\n' + fence, fence };
  }

  function primary(selections) {
    const selection = selections[0];
    return { from: Math.min(selection.anchor, selection.head), to: Math.max(selection.anchor, selection.head) };
  }

  function replacement(source, selections, target, text, start = text.length, length = 0) {
    return finish(source, selections, [{ ...target, text }],
      [{ from: target.from, start, end: start + length }]);
  }

  function linkTarget(source, selections, marked, image = false) {
    let target = primary(selections);
    let label = source.slice(target.from, target.to), url = '';
    const start = target.from ? source.lastIndexOf('\n', target.from - 1) + 1 : 0;
    const end = source.indexOf('\n', target.to);
    const existing = inlineTokens(source.slice(start, end < 0 ? source.length : end), marked, start)
      .find(span => span.token.type === (image ? 'image' : 'link') && span.from <= target.from && span.to >= target.to);
    if (existing) { target = { from: existing.from, to: existing.to }; label = existing.token.text; url = existing.token.href; }
    return { ...target, label, url };
  }

  function link(source, selections, target, value, url, image = false) {
    const label = value.replace(/\\/g, '\\\\').replace(/([\[\]])/g, '\\$1').replace(/\r?\n/g, ' ');
    return replacement(source, selections, target, `${image ? '!' : ''}[${label}](<${url}>)`, image ? 2 : 1, label.length);
  }

  function codeBlockTarget(source, selections, marked) {
    let target = primary(selections), text = source.slice(target.from, target.to), language = '';
    const existing = blocks(source, marked).find(block => block.token.type === 'code' && block.from <= target.from && block.to >= target.to);
    if (existing) {
      target = { from: existing.from, to: existing.to };
      language = existing.token.lang || '';
      const lines = existing.token.raw.split('\n');
      const opening = lines[0].match(/^ {0,3}(`{3,}|~{3,})/);
      if (opening) {
        let last = lines.length - 1;
        while (last > 0 && !lines[last]) last--;
        const closing = new RegExp(`^ {0,3}${opening[1][0]}{${opening[1].length},} *$`);
        text = lines.slice(1, closing.test(lines[last]) ? last : lines.length).join('\n');
      } else text = existing.token.text;
    }
    return { ...target, text, language };
  }

  function codeBlock(source, selections, target, language) {
    if (!/^[a-z0-9_+#.-]{0,40}$/i.test(language)) throw new Error('Use a short language name with letters and numbers.');
    const pair = codeFence(target.text, language);
    const before = target.from > 0 && source[target.from - 1] !== '\n' ? '\n\n' : '';
    return replacement(source, selections, target, before + pair.prefix + target.text + pair.suffix + '\n\n',
      before.length + pair.prefix.length, target.text.length);
  }

  function table(source, selections, rows, columns, { includesHeader = false } = {}) {
    const bodyRows = includesHeader ? rows - 1 : rows;
    if (!Number.isInteger(rows) || rows < 1 || bodyRows > 20 || !Number.isInteger(columns) || columns < 1 || columns > 12
      || bodyRows * columns > 200) throw new Error('Use up to 20 body rows, 12 columns and 200 body cells.');
    const target = primary(selections);
    const selected = escapeText(source.slice(target.from, target.to)).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
    const row = cells => '| ' + cells.join(' | ') + ' |';
    const lines = [row(Array.from({ length: columns }, (_, index) => !bodyRows && !index && selected ? selected : `Column ${index + 1}`)), row(Array(columns).fill('---'))];
    for (let index = 0; index < bodyRows; index++) lines.push(row(Array.from({ length: columns }, (_, column) => !index && !column ? selected : '')));
    const prefix = target.from > 0 && source[target.from - 1] !== '\n' ? '\n\n' : '';
    return replacement(source, selections, target, prefix + lines.join('\n') + '\n\n');
  }

  function cleanEdits(edits) {
    const ordered = edits.sort((a, b) => a.from - b.from || a.to - b.to);
    const result = [];
    for (const edit of ordered) {
      const previous = result.at(-1);
      if (previous && edit.from === previous.from && edit.to === previous.to && edit.text === previous.text) continue;
      if (previous && edit.from < previous.to) throw new Error('The selected edit targets overlap.');
      result.push(edit);
    }
    return result;
  }

  function mapOffset(offset, edits, affinity = 1) {
    let shift = 0;
    for (const edit of edits) {
      if (offset < edit.from || (offset === edit.from && affinity < 0)) break;
      if (offset <= edit.to) return edit.from + shift + (affinity < 0 ? 0 : edit.text.length);
      shift += edit.text.length - (edit.to - edit.from);
    }
    return offset + shift;
  }

  function finish(source, selections, edits, targets = []) {
    edits = cleanEdits(edits.filter(edit => source.slice(edit.from, edit.to) !== edit.text));
    const nextSelections = selections.map((selection, index) => {
      const target = targets[index];
      const reverse = selection.anchor > selection.head;
      if (target) {
        const start = mapOffset(target.from, edits, -1) + target.start;
        const end = mapOffset(target.from, edits, -1) + target.end;
        return { anchor: reverse ? end : start, head: reverse ? start : end };
      }
      return { anchor: mapOffset(selection.anchor, edits), head: mapOffset(selection.head, edits) };
    });
    return { edits, selections: nextSelections };
  }

  function apply(source, plan) {
    let result = source;
    for (const edit of [...plan.edits].reverse()) result = result.slice(0, edit.from) + edit.text + result.slice(edit.to);
    return result;
  }

  function inline(source, selections, kind, marked) {
    const edits = [];
    const targets = [];
    const documentBlocks = blocks(source, marked);
    const protectedCode = codeRanges(source, marked);
    for (const [index, selection] of selections.entries()) {
      const from = Math.min(selection.anchor, selection.head);
      const to = Math.max(selection.anchor, selection.head);
      const block = documentBlocks.find(item => item.from <= from && item.to > from);
      if (protectedCode.some(block => codeContains(block, from, source.length) || block.from < to && block.to > from)
        || block && ['html', 'table'].includes(block.token.type)) {
        throw new Error('Select prose outside a code block, HTML block or table to format text.');
      }
      const lineStart = from ? source.lastIndexOf('\n', from - 1) + 1 : 0;
      const nextLine = source.indexOf('\n', to);
      const lineEnd = nextLine < 0 ? source.length : nextLine;
      const spans = inlineTokens(source.slice(lineStart, lineEnd), marked, lineStart);
      const type = inlineTypes[kind];
      const existing = spans.filter(span => span.token.type === type
        && span.from <= from && span.to >= to).sort((a, b) => (a.to - a.from) - (b.to - b.from))[0];
      if (existing) {
        const raw = existing.token.raw;
        let left, right;
        if (kind === 'code') {
          const fence = raw.match(/^`+/)[0];
          left = right = fence.length;
          const content = raw.slice(left, -right);
          if (content.startsWith(' ') && content.endsWith(' ') && content.trim()) { left++; right++; }
        } else if (kind === 'underline' || kind === 'highlight') {
          [left, right] = delimiters[kind].map(marker => marker.length);
        } else {
          left = right = kind === 'bold' || kind === 'strike' ? 2 : 1;
        }
        edits.push({ from: existing.from, to: existing.from + left, text: '' },
          { from: existing.to - right, to: existing.to, text: '' });
        continue;
      }
      const pair = delimiters[kind];
      let text = source.slice(from, to);
      if (pair && from === to && from >= pair[0].length && source.slice(from - pair[0].length, from) === pair[0]
        && source.slice(to, to + pair[1].length) === pair[1]) {
        edits.push({ from: from - pair[0].length, to: from, text: '' },
          { from: to, to: to + pair[1].length, text: '' });
        continue;
      }
      if (text.includes('\n')) throw new Error('Use a separate text selection in each paragraph for inline formatting.');
      if (spans.some(span => span.token.type === 'codespan' && span.from < to && span.to > from)) {
        throw new Error('Select text outside inline code to apply this format.');
      }
      if (kind === 'highlight') text = text.replace(/(\\*)==/g,
        (match, slashes) => slashes + (slashes.length % 2 ? '' : '\\') + '==');
      const [prefix, suffix] = kind === 'code' ? codePair(text) : pair;
      edits.push({ from, to, text: prefix + text + suffix });
      targets[index] = { from, start: prefix.length, end: prefix.length + text.length };
    }
    return finish(source, selections, edits, targets);
  }

  function selectedLines(source, selections) {
    const lines = new Map();
    for (const selection of selections) {
      const start = Math.min(selection.anchor, selection.head), end = Math.max(selection.anchor, selection.head);
      let from = start ? source.lastIndexOf('\n', start - 1) + 1 : 0;
      const limit = end > start && source[end - 1] === '\n' ? end - 1 : end;
      while (from <= limit) {
        const next = source.indexOf('\n', from);
        const to = next < 0 ? source.length : next;
        lines.set(from, { from, to, text: source.slice(from, to) });
        if (next < 0) break;
        from = to + 1;
      }
    }
    return [...lines.values()].sort((a, b) => a.from - b.from);
  }

  function lines(source, selections, kind, marked, level = 0) {
    const edits = [];
    const headingMappings = [];
    const convertedHeadings = new Set();
    const documentBlocks = blocks(source, marked);
    const selected = selectedLines(source, selections);
    const protectedCode = codeRanges(source, marked);
    const safe = selected.filter(line => !protectedCode.some(block =>
      block.from <= line.from && block.to > line.from));
    if (!safe.length) throw new Error('Select prose outside code to use this format.');
    const markers = { bullet: '- ', numbered: '1. ', task: '- [ ] ', quote: '> ' };
    const parsed = safe.map(line => ({ ...line,
      prefix: line.text.match(/^(\s*(?:>\s*)*)(?:(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)/),
    }));
    const remove = kind === 'quote' ? safe.every(line => /^\s*>\s?/.test(line.text))
      : ['bullet', 'numbered', 'task'].includes(kind) && parsed.every(line => {
        const raw = line.prefix?.[0] || '';
        return kind === 'task' ? /\[[ xX]\]/.test(raw) : kind === 'numbered' ? /\d+[.)]/.test(raw)
          : /[-+*]\s/.test(raw) && !/\[[ xX]\]/.test(raw);
      });
    const numbers = new Map();
    for (const line of parsed) {
      let text = line.text;
      if (!text.trim() && selected.length > 1) continue;
      if (kind === 'heading') {
        if (/^\s*(?:>|[-+*]\s|\d+[.)]\s)/.test(text)) throw new Error('Heading styles inside lists or quotes are not supported.');
        const block = documentBlocks.find(block => block.from <= line.from && block.to > line.from);
        if (block?.token.type === 'heading' && !/^ {0,3}#/.test(block.token.raw)) {
          if (convertedHeadings.has(block.from)) continue;
          convertedHeadings.add(block.from);
          const underline = block.token.raw.match(/\n {0,3}(?:=+|-+) *\n*$/);
          if (!underline) continue;
          const body = block.token.raw.slice(0, underline.index).replace(/\n/g, ' ');
          edits.push({ from: block.from, to: block.to,
            text: (level ? '#'.repeat(level) + ' ' : '') + body + (block.token.raw.endsWith('\n') ? '\n' : '') });
          headingMappings.push({ from: block.from, to: block.to, length: body.length, prefix: level ? level + 1 : 0 });
          continue;
        }
        const old = text.match(/^ {0,3}#{1,6}\s+/)?.[0] || '';
        const prefix = level ? '#'.repeat(level) + ' ' : '';
        edits.push({ from: line.from, to: line.from + old.length, text: prefix });
        continue;
      }
      if (kind === 'indent' || kind === 'outdent') {
        if (!line.prefix) throw new Error('Paragraph indentation is available for list items. Use Tab inside code.');
        text = kind === 'indent' ? '  ' + text : text.replace(/^ {1,2}/, '');
      } else if (kind === 'quote') text = remove ? text.replace(/^(\s*)>\s?/, '$1') : '> ' + text;
      else {
        const context = line.prefix ? line.prefix[1] : text.match(/^(\s*(?:>\s*)*)/)[0];
        const body = line.prefix ? text.slice(line.prefix[0].length) : text.slice(context.length);
        const number = numbers.has(context) ? numbers.get(context) + 1
          : Number(line.prefix?.[0].match(/(\d+)[.)]/)?.[1]) || 1;
        numbers.set(context, number);
        const checked = line.prefix?.[0].match(/\[([xX ])\]/)?.[1] || ' ';
        const marker = kind === 'numbered' ? `${number}. ` : kind === 'task' ? `- [${checked}] ` : markers[kind];
        text = context + (remove ? '' : marker) + body;
      }
      // Edit only the changed prefix so cursor positions within text survive.
      let prefixLength = 0;
      while (prefixLength < text.length && prefixLength < line.text.length
        && text[text.length - 1 - prefixLength] === line.text[line.text.length - 1 - prefixLength]) prefixLength++;
      edits.push({ from: line.from, to: line.to - prefixLength, text: text.slice(0, text.length - prefixLength) });
    }
    const plan = finish(source, selections, edits);
    const point = offset => {
      const heading = headingMappings.find(heading => heading.from <= offset && heading.to >= offset);
      return heading ? mapOffset(heading.from, plan.edits, -1) + heading.prefix + Math.min(heading.length, offset - heading.from)
        : mapOffset(offset, plan.edits);
    };
    plan.selections = selections.map(selection => ({ anchor: point(selection.anchor), head: point(selection.head) }));
    return plan;
  }

  function insertion(source, selections, text, primaryOnly = false) {
    const targets = [];
    const edits = (primaryOnly ? selections.slice(0, 1) : selections).map((selection, index) => {
      const from = Math.min(selection.anchor, selection.head);
      targets[index] = { from, start: text.length, end: text.length };
      return { from, to: Math.max(selection.anchor, selection.head), text };
    });
    return finish(source, selections, edits, targets);
  }

  function alignment(source, selections, value, marked) {
    const selected = blocks(source, marked).filter(block => block.token.type !== 'space' && selections.some(selection => {
      const start = Math.min(selection.anchor, selection.head);
      const end = Math.max(selection.anchor, selection.head);
      return start === end ? block.from <= start && block.to > start : block.from < end && block.to > start;
    }));
    if (value !== 'left' && selected.length && selected.every(block => block.token.alignment === value)) value = 'left';
    const edits = [];
    const mappings = [];
    for (const block of selected) {
      const token = block.token;
      const alreadyAligned = token.type === 'marktideAlignment';
      if (value === 'left' && !alreadyAligned) continue;
      const body = alreadyAligned ? token.text.replace(/\n$/, '') : token.raw.replace(/\n+$/, '');
      const prefix = value === 'left' ? '' : `:::marktide-align ${value}\n`;
      const trailing = token.raw.match(/\n*$/)[0];
      const text = prefix + body + (value === 'left' ? '' : '\n:::') + trailing;
      edits.push({ from: block.from, to: block.to, text });
      mappings.push({ from: block.from, to: block.to, bodyFrom: block.from + (alreadyAligned ? token.bodyOffset : 0),
        bodyLength: body.length, prefix: prefix.length });
    }
    const plan = finish(source, selections, edits);
    const point = offset => {
      const mapping = mappings.find(mapping => mapping.from <= offset && mapping.to > offset);
      return mapping ? mapOffset(mapping.from, plan.edits, -1) + mapping.prefix
        + Math.max(0, Math.min(mapping.bodyLength, offset - mapping.bodyFrom)) : mapOffset(offset, plan.edits);
    };
    plan.selections = selections.map(selection => ({ anchor: point(selection.anchor), head: point(selection.head) }));
    return plan;
  }

  function lineBreak(source, selections, marked) {
    const documentBlocks = codeRanges(source, marked);
    const edits = [], targets = [];
    for (const [index, selection] of selections.entries()) {
      const from = Math.min(selection.anchor, selection.head);
      const to = Math.max(selection.anchor, selection.head);
      const block = documentBlocks.find(block => codeContains(block, from, source.length));
      const lineStart = from ? source.lastIndexOf('\n', from - 1) + 1 : 0;
      const line = source.slice(lineStart, from);
      const context = line.match(/^(\s*(?:>\s*)*)(?:(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)?/)[0];
      const continuation = context.replace(/(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?$/, marker => ' '.repeat(marker.length));
      const text = block ? '\n' + continuation : '  \n' + continuation;
      edits.push({ from, to, text });
      targets[index] = { from, start: text.length, end: text.length };
    }
    return finish(source, selections, edits, targets);
  }

  function pageBreak(source, selections, marked) {
    const selection = selections[0];
    let from = selection.head;
    if (codeRanges(source, marked).some(block => codeContains(block, from, source.length))) {
      throw new Error('Insert a page break outside code.');
    }
    const block = blocks(source, marked).find(block => block.from < from && block.to > from && block.token.type !== 'space');
    if (block) from = block.to;
    const before = source.slice(0, from), after = source.slice(from);
    if (before.trimEnd().endsWith('<!-- marktide-page-break -->') || after.trimStart().startsWith('<!-- marktide-page-break -->')) {
      throw new Error('A page break already exists here.');
    }
    const prefix = before && !before.endsWith('\n\n') ? before.endsWith('\n') ? '\n' : '\n\n' : '';
    const text = prefix + '<!-- marktide-page-break -->\n\n';
    return finish(source, selections, [{ from, to: from, text }], [{ from, start: text.length, end: text.length }]);
  }

  function clear(source, selections, marked) {
    const documentBlocks = blocks(source, marked);
    const protectedCode = codeRanges(source, marked);
    const protectedMath = displayMathRanges(source);
    const ranges = selections.map(selection => {
      const from = Math.min(selection.anchor, selection.head), to = Math.max(selection.anchor, selection.head);
      const block = documentBlocks.find(block => block.from <= from && block.to > from);
      return from === to && block ? { from: block.from, to: block.to } : { from, to };
    });
    const covered = (from, to) => ranges.some(range => range.from <= from && range.to >= to);
    const edits = [];
    const plain = tokens => tokens.map(token => {
      if (['strong', 'em', 'del', 'link', 'marktideHighlight', 'marktideUnderline'].includes(token.type)) return plain(token.tokens || []);
      if (['codespan', 'image'].includes(token.type)) return escapeText(token.text);
      return token.raw;
    }).join('');
    function stripInline(text, offset) {
      const math = [...text.matchAll(/(?<!\\)\$(?!\$)[^\n$]+(?<!\\)\$|\\\([^\n]*?\\\)|\\\[[^\n]*?\\\]/g)]
        .map(match => ({ from: offset + match.index, to: offset + match.index + match[0].length }));
      let position = offset;
      for (const token of marked.Lexer.lexInline(text)) {
        const end = position + token.raw.length;
        if (math.some(span => span.from < end && span.to > position)) { position = end; continue; }
        const contentAt = typeof token.text === 'string' ? token.raw.indexOf(token.text) : -1;
        const bodyFrom = position + contentAt;
        const bodyTo = bodyFrom + (token.text?.length || 0);
        if (covered(position, end) && ['codespan', 'link', 'image'].includes(token.type)) {
          edits.push({ from: position, to: end,
            text: token.type === 'link' ? plain(token.tokens || []) : escapeText(token.text) });
        } else if (['strong', 'em', 'del', 'marktideHighlight', 'marktideUnderline'].includes(token.type)
          && contentAt >= 0) {
          if (covered(bodyFrom, bodyTo)) edits.push({ from: position, to: bodyFrom, text: '' }, { from: bodyTo, to: end, text: '' });
          stripInline(token.text, bodyFrom);
        }
        position = end;
      }
    }
    for (const block of documentBlocks) {
      if (['code', 'html', 'table', 'def', 'marktidePageBreak'].includes(block.token.type)
        || /^\s*(?:\$\$|\\\[|\[\^|\*\[)/.test(block.token.raw)) continue;
      if (block.token.type === 'marktideAlignment' && covered(block.from, block.to)) {
        edits.push({ from: block.from, to: block.from + block.token.bodyOffset, text: '' },
          { from: block.from + block.token.bodyOffset + block.token.text.length, to: block.to, text: '' });
      }
      let offset = block.from;
      for (const line of block.token.raw.split('\n')) {
        if (protectedCode.some(code => code.from <= offset && code.to > offset)
          || protectedMath.some(math => math.from <= offset && math.to >= offset)) { offset += line.length + 1; continue; }
        if (/^:::/.test(line)) { offset += line.length + 1; continue; }
        const prefix = line.match(/^ {0,3}(?:#{1,6}\s+|(?:>\s*)+|(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)/)?.[0] || '';
        if (prefix && covered(offset + prefix.length, offset + line.length)) edits.push({ from: offset, to: offset + prefix.length, text: '' });
        if (block.token.type === 'heading' && /^ {0,3}(?:=+|-+)\s*$/.test(line) && covered(block.from, block.to)) {
          edits.push({ from: offset, to: Math.min(block.to, offset + line.length + 1), text: '' });
        } else stripInline(line.slice(prefix.length), offset + prefix.length);
        offset += line.length + 1;
      }
    }
    return finish(source, selections, edits);
  }

  return { install, alignmentToken, blocks, inlineTokens, inline, lines, insertion, alignment, lineBreak, pageBreak,
    clear, apply, finish, mapOffset, escapeText, codePair, selectedLines, codeRanges,
    codeFence, linkTarget, link, codeBlockTarget, codeBlock, table, codeContains };
});
