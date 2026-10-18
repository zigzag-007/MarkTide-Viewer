// Clipboard HTML is sanitized before the bundled converter reads it.
(function (win) {
  const editing = win.MarkTideMarkdownEditing;
  const safeUrl = (url, image = false) => {
    try { return win.MarkTideInsertionTools.destination(url, image); }
    catch { return ''; }
  };

  function removeLeadingText(node, count) {
    const walker = win.document.createTreeWalker(node, win.NodeFilter.SHOW_TEXT);
    while (count > 0 && walker.nextNode()) {
      const text = walker.currentNode;
      const length = Math.min(count, text.data.length);
      text.data = text.data.slice(length);
      count -= length;
    }
  }

  function wordLists(fragment) {
    const paragraphs = [...fragment.querySelectorAll('p.MsoListParagraph, p.MsoListParagraphCxSpFirst, p.MsoListParagraphCxSpMiddle, p.MsoListParagraphCxSpLast')];
    let last = null, stack = [], parent = null;
    for (const paragraph of paragraphs) {
      const marker = paragraph.textContent.match(/^\s*(?:([0-9]+)[.)]|[\u2022\u00b7\u25cf\u25a0o])\s+/);
      if (!marker) continue;
      const ordered = Boolean(marker[1]);
      const level = Math.max(1, Math.min(8, Number(paragraph.dataset.clipboardListLevel) || 1));
      const tag = ordered ? 'ol' : 'ul';
      if (paragraph.parentNode !== parent || paragraph.previousElementSibling !== last || stack[0]?.tagName.toLowerCase() !== tag) stack = [];
      parent = paragraph.parentNode;
      while (stack.length > level) stack.pop();
      if (!stack.length) {
        const list = win.document.createElement(tag);
        if (ordered) list.start = Number(marker[1]);
        paragraph.before(list);
        stack.push(list);
      }
      while (stack.length < level && stack.at(-1).lastElementChild) {
        const nested = win.document.createElement(tag);
        stack.at(-1).lastElementChild.append(nested);
        stack.push(nested);
      }
      const item = win.document.createElement('li');
      while (paragraph.firstChild) item.append(paragraph.firstChild);
      removeLeadingText(item, marker[0].length);
      stack.at(-1).append(item);
      const list = stack[0];
      paragraph.remove();
      last = list;
    }
  }

  function cellPipes(text) {
    let result = '', backslashes = 0;
    for (const character of text) {
      if (character === '|' && backslashes % 2 === 0) result += '\\';
      result += character;
      backslashes = character === '\\' ? backslashes + 1 : 0;
    }
    return result;
  }

  function convert(html) {
    const parsed = new win.DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('script, style, button, [role="toolbar"], [role="menu"], .code-block-header, .mermaid-controls').forEach(node => node.remove());
    parsed.querySelectorAll('input:not([type="checkbox"])').forEach(node => node.remove());
    for (const element of parsed.querySelectorAll('[style]')) {
      const tags = [];
      if (element.style.fontWeight === 'bold' || Number(element.style.fontWeight) >= 600) tags.push('strong');
      if (element.style.fontStyle === 'italic') tags.push('em');
      if (element.style.textDecoration.includes('underline')) tags.push('u');
      if (element.style.textDecoration.includes('line-through')) tags.push('del');
      for (const tag of tags) {
        const wrapper = win.document.createElement(tag);
        while (element.firstChild) wrapper.append(element.firstChild);
        element.append(wrapper);
      }
    }
    for (const paragraph of parsed.querySelectorAll('p[class*="MsoListParagraph"]')) {
      const level = paragraph.getAttribute('style')?.match(/mso-list\s*:[^;]*\blevel(\d+)/i)?.[1];
      if (level) paragraph.dataset.clipboardListLevel = String(Math.min(8, Number(level)));
    }
    const fragment = win.DOMPurify.sanitize(parsed.body.innerHTML, {
      USE_PROFILES: { html: true }, RETURN_DOM_FRAGMENT: true,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'button', 'select', 'textarea'],
      FORBID_ATTR: ['style', 'id', 'contenteditable', 'title'],
    });
    wordLists(fragment);
    for (const link of fragment.querySelectorAll('a[href]')) {
      const url = safeUrl(link.getAttribute('href'));
      if (url) link.setAttribute('href', url);
      else link.removeAttribute('href');
    }
    for (const image of fragment.querySelectorAll('img')) {
      const url = safeUrl(image.getAttribute('src') || '', true);
      if (url) image.setAttribute('src', url);
      else image.replaceWith(win.document.createTextNode(image.alt || ''));
    }
    const converter = new win.TurndownService({ headingStyle: 'atx', bulletListMarker: '-',
      codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**' });
    converter.use(win.turndownPluginGfm.gfm);
    converter.addRule('marktideStrike', { filter: ['del', 's', 'strike'], replacement: content => `~~${content}~~` });
    converter.addRule('marktideUnderline', { filter: 'u', replacement: content => `<u>${content}</u>` });
    converter.addRule('marktideHighlight', { filter: 'mark', replacement: content => `==${content}==` });
    converter.addRule('marktideCode', { filter: node => node.nodeName === 'PRE', replacement: (content, node) => {
      const text = node.textContent;
      const pair = editing.codeFence(text);
      return '\n\n' + pair.prefix + text.replace(/\n$/, '') + pair.suffix + '\n\n';
    } });
    converter.addRule('marktideTables', { filter: 'table', replacement: (content, table) => {
      const rows = [...table.rows];
      if (!rows.length) return '';
      if (table.querySelector('table, [colspan]:not([colspan="1"]), [rowspan]:not([rowspan="1"])')) {
        return '\n\n' + rows.map(row => [...row.cells].map(cell => editing.escapeText(cell.textContent.trim())).join(' · ')).join('\n\n') + '\n\n';
      }
      const width = Math.max(...rows.map(row => row.cells.length));
      const rowText = cells => '| ' + cells.join(' | ') + ' |';
      const values = rows.map(row => Array.from({ length: width }, (_, index) => row.cells[index]
        ? cellPipes(converter.turndown(row.cells[index].cloneNode(true))).replace(/\n+/g, '<br>') : ''));
      return '\n\n' + [rowText(values[0]), rowText(Array(width).fill('---')), ...values.slice(1).map(rowText)].join('\n') + '\n\n';
    } });
    return converter.turndown(fragment).replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
  }

  function inCode(ctx) {
    return ctx.offsets.some(selection => {
      if (editing.codeRanges(ctx.source, win.marked).some(block => editing.codeContains(block, selection.head, ctx.source.length))) return true;
      const start = selection.head ? ctx.source.lastIndexOf('\n', selection.head - 1) + 1 : 0;
      const next = ctx.source.indexOf('\n', selection.head);
      return editing.inlineTokens(ctx.source.slice(start, next < 0 ? ctx.source.length : next), win.marked, start)
        .some(span => span.token.type === 'codespan' && span.from <= selection.head && span.to >= selection.head);
    });
  }

  function pastePlan(ctx, data, plain = false) {
    const rich = Boolean(data.html && !plain && !inCode(ctx));
    const text = rich ? convert(data.html) || data.text : data.text;
    if (!text) throw new Error('No supported text is available. Image only paste is not supported.');
    return editing.insertion(ctx.source, ctx.offsets, text.replace(/\r\n?/g, '\n'), rich);
  }

  async function read(plain) {
    const clipboard = win.navigator.clipboard;
    if (!clipboard) throw new Error('Clipboard access is unavailable. Use the keyboard paste shortcut.');
    try {
      if (!plain && typeof clipboard.read === 'function') {
        const items = await clipboard.read();
        const data = { text: '', html: '' };
        for (const item of items) {
          if (item.types.includes('text/html') && !data.html) data.html = await (await item.getType('text/html')).text();
          if (item.types.includes('text/plain') && !data.text) data.text = await (await item.getType('text/plain')).text();
        }
        return data;
      }
      if (typeof clipboard.readText !== 'function') throw new Error('Clipboard reading is unavailable.');
      return { text: await clipboard.readText(), html: '' };
    } catch {
      throw new Error('Clipboard access failed. Use the keyboard paste shortcut.');
    }
  }

  function copyTargets(ctx) {
    const allowLine = ctx.editor.getOption(win.monaco.editor.EditorOption.emptySelectionClipboard);
    return ctx.offsets.map((selection, index) => {
      let from = Math.min(selection.anchor, selection.head), to = Math.max(selection.anchor, selection.head);
      if (from === to && allowLine) {
        const line = ctx.selections[index].positionLineNumber;
        const position = ctx.positionAt(from);
        from -= position.column - 1;
        to = from + ctx.model.getLineContent(line).length + (line < ctx.model.getLineCount() ? 1 : 0);
      }
      const text = ctx.source.slice(from, to) + (selection.anchor === selection.head && allowLine
        && ctx.selections[index].positionLineNumber === ctx.model.getLineCount() ? '\n' : '');
      return { from, to, text };
    });
  }

  async function copy(ctx) {
    const targets = copyTargets(ctx);
    const allLines = ctx.offsets.every(selection => selection.anchor === selection.head);
    const copied = allLines ? targets.filter((target, index) => targets.findIndex(other => other.from === target.from && other.to === target.to) === index) : targets;
    const text = copied.map(target => target.text).join(allLines ? '' : '\n');
    if (!text) throw new Error('Select text to copy.');
    if (!win.navigator.clipboard?.writeText) throw new Error('Clipboard writing is unavailable. Use the keyboard copy or cut shortcut.');
    try { await win.navigator.clipboard.writeText(text); }
    catch { throw new Error('Clipboard writing failed. No text was removed. Use the keyboard copy or cut shortcut.'); }
    const ranges = targets.map((target, index) => ({ from: target.from - (ctx.offsets[index].anchor === ctx.offsets[index].head
      && ctx.selections[index].positionLineNumber === ctx.model.getLineCount() && target.from > 0 ? 1 : 0), to: target.to, text: '' }))
      .sort((a, b) => a.from - b.from);
    const edits = [];
    for (const range of ranges) {
      const previous = edits.at(-1);
      if (previous && range.from <= previous.to) previous.to = Math.max(previous.to, range.to);
      else edits.push(range);
    }
    return editing.finish(ctx.source, ctx.offsets, edits);
  }

  win.MarkTideEditorClipboard = { convert, pastePlan, read, copy, inCode };
})(window);
