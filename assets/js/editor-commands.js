// Ribbon, legacy controls and editor shortcuts share these command handlers.
(function (win) {
  const doc = win.document;
  const editing = win.MarkTideMarkdownEditing;
  const commands = new Map();
  const platform = /Mac|iPhone|iPad/.test(win.navigator.platform);
  let editor = null;
  let retained = null;
  let subscriptions = [];
  let events = null;
  let viewObserver = null;
  let ready = null;
  let frame = null;
  let busy = false;
  let composing = false;
  let sourceVersion = null;
  let sourceModel = null;
  let source = '';
  let lineStarts = [];
  let documentBlocks = null;
  let documentCode = null;
  let generation = 0;

  function startsOf(text) {
    const starts = [0];
    for (let index = 0; index < text.length; index++) if (text[index] === '\n') starts.push(index + 1);
    return starts;
  }

  function positionAt(offset, starts) {
    let low = 0, high = starts.length;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (starts[middle] > offset) high = middle;
      else low = middle;
    }
    return { lineNumber: low + 1, column: offset - starts[low] + 1 };
  }

  function register(id, label, options) {
    commands.set(id, { id, label, ...options });
  }

  function context() {
    const model = editor?.getModel();
    if (!model || model.isDisposed()) return null;
    const version = model.getVersionId();
    if (sourceModel !== model || version !== sourceVersion) {
      source = model.getValue().replace(/\r\n/g, '\n');
      lineStarts = startsOf(source);
      sourceModel = model;
      sourceVersion = version;
      documentBlocks = null;
      documentCode = null;
    }
    const selections = editor.getSelections();
    return { editor, model, version, generation, source, selections, positionAt: offset => positionAt(offset, lineStarts),
      blocks: () => documentBlocks || (documentBlocks = editing.blocks(source, win.marked)),
      codeRanges: () => documentCode || (documentCode = editing.codeRanges(source, win.marked)),
      offsets: selections.map(selection => ({
        anchor: lineStarts[selection.selectionStartLineNumber - 1] + selection.selectionStartColumn - 1,
        head: lineStarts[selection.positionLineNumber - 1] + selection.positionColumn - 1,
      })) };
  }

  function unavailable(command, ctx) {
    if (!ctx) return 'The editor is not ready.';
    if (doc.body.classList.contains('preview-only-active')) return 'Switch to an editor view to use this command.';
    if (doc.querySelector('.marktide-image-viewer.pswp--open')) return 'Close the image viewer to use editor commands.';
    if (busy) return 'Another editor command is still running.';
    if (!command.readOnlyAllowed && ctx.editor.getOption(win.monaco.editor.EditorOption.readOnly)) return 'The document is read only.';
    if (!command.execute) return 'This command is still being implemented.';
    return command.unavailable?.(ctx) || '';
  }

  function notify(message) {
    let status = doc.getElementById('editor-command-status');
    if (!status) {
      status = doc.createElement('div');
      status.id = 'editor-command-status';
      status.className = 'editor-command-status';
      status.setAttribute('role', 'status');
      doc.body.append(status);
    }
    status.textContent = message;
    status.hidden = !message;
  }

  function valid(ctx) {
    return generation === ctx.generation && editor === ctx.editor && editor.getModel() === ctx.model && !ctx.model.isDisposed()
      && ctx.model.getVersionId() === ctx.version;
  }

  function apply(ctx, plan) {
    if (!valid(ctx)) throw new Error('The document changed. Please try the command again.');
    if (!plan.edits.length) return;
    const edits = plan.edits.map(edit => {
      const start = ctx.positionAt(edit.from);
      const end = ctx.positionAt(edit.to);
      return { range: new win.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        text: edit.text, forceMoveMarkers: true };
    });
    const nextStarts = startsOf(editing.apply(ctx.source, plan));
    editor.pushUndoStop();
    editor.executeEdits('marktide-command', edits, () => plan.selections.map(selection => {
      const anchor = positionAt(selection.anchor, nextStarts);
      const head = positionAt(selection.head, nextStarts);
      return new win.monaco.Selection(anchor.lineNumber, anchor.column, head.lineNumber, head.column);
    }));
    editor.pushUndoStop();
    editor.focus();
  }

  async function native(ctx, id) {
    const action = ctx.editor.getAction(id);
    ctx.editor.focus();
    if (action) await action.run();
    else if (id === 'undo' || id === 'redo') ctx.editor.trigger('marktide-command', id, null);
    else throw new Error('This editor action is unavailable.');
  }

  function shortcut(command) {
    return platform ? command.macShortcut || '' : command.shortcut || '';
  }

  function inlineState(ctx, type) {
    const values = ctx.offsets.map(selection => {
      const from = Math.min(selection.anchor, selection.head);
      const to = Math.max(selection.anchor, selection.head);
      if (ctx.codeRanges().some(block => editing.codeContains(block, from, ctx.source.length))) return 'false';
      const start = ctx.source.lastIndexOf('\n', from - 1) + 1;
      const next = ctx.source.indexOf('\n', to);
      const end = next < 0 ? ctx.source.length : next;
      const spans = editing.inlineTokens(ctx.source.slice(start, end), win.marked, start).filter(span => span.token.type === type);
      return spans.some(span => span.from <= from && span.to >= to) ? 'true'
        : spans.some(span => span.from < to && span.to > from) ? 'mixed' : 'false';
    });
    return values.every(value => value === 'true') ? 'true' : values.every(value => value === 'false') ? 'false' : 'mixed';
  }

  for (const [id, label, kind, type, key] of [
    ['bold', 'Bold', 'bold', 'strong', 'B'], ['italic', 'Italic', 'italic', 'em', 'I'],
    ['underline', 'Underline', 'underline', 'marktideUnderline', 'U'], ['strike', 'Strikethrough', 'strike', 'del'],
    ['highlight', 'Highlight', 'highlight', 'marktideHighlight'], ['inline-code', 'Inline Code', 'code', 'codespan', '`'],
  ]) register(id, label, {
    shortcut: key ? `Ctrl+${key}` : '', macShortcut: key ? `Cmd+${key}` : '', key,
    execute: ctx => apply(ctx, editing.inline(ctx.source, ctx.offsets, kind, win.marked)),
    state: type ? ctx => inlineState(ctx, type) : () => 'false',
  });

  for (const [id, label, kind] of [
    ['bullet-list', 'Bullet List', 'bullet'], ['numbered-list', 'Numbered List', 'numbered'],
    ['task-list', 'Task List', 'task'], ['blockquote', 'Blockquote', 'quote'],
    ['indent', 'Increase Indent', 'indent'], ['outdent', 'Decrease Indent', 'outdent'],
  ]) register(id, label, { execute: ctx => {
    if (['indent', 'outdent'].includes(kind) && ctx.offsets.every(selection => ctx.blocks().some(block =>
      block.token.type === 'code' && block.from <= selection.head && block.to > selection.head))) {
      return native(ctx, kind === 'indent' ? 'editor.action.indentLines' : 'editor.action.outdentLines');
    }
    apply(ctx, editing.lines(ctx.source, ctx.offsets, kind, win.marked));
  }, state: ['bullet', 'numbered', 'task', 'quote'].includes(kind) ? ctx => {
    const lines = editing.selectedLines(ctx.source, ctx.offsets);
    const pattern = { bullet: /^\s*(?:>\s*)*[-+*]\s+(?!\[[ xX]\])/, numbered: /^\s*(?:>\s*)*\d+[.)]\s/,
      task: /^\s*(?:>\s*)*[-+*]\s+\[[ xX]\]/, quote: /^\s*>/ }[kind];
    const values = lines.map(line => pattern.test(line.text));
    if (lines.some(line => ctx.codeRanges().some(block => block.from <= line.from && block.to > line.from))) return 'false';
    return values.every(Boolean) ? 'true' : values.some(Boolean) ? 'mixed' : 'false';
  } : undefined });

  for (let level = 0; level <= 6; level++) register(level ? `heading-${level}` : 'normal',
    level ? `Heading ${level}` : 'Normal', {
      execute: ctx => apply(ctx, editing.lines(ctx.source, ctx.offsets, 'heading', win.marked, level)),
    });

  register('undo', 'Undo', { shortcut: 'Ctrl+Z', macShortcut: 'Cmd+Z',
    execute: ctx => native(ctx, 'undo'), unavailable: ctx => ctx.model.canUndo() ? '' : 'Nothing to undo.' });
  register('redo', 'Redo', { shortcut: 'Ctrl+Y / Ctrl+Shift+Z', macShortcut: 'Cmd+Shift+Z',
    execute: ctx => native(ctx, 'redo'), unavailable: ctx => ctx.model.canRedo() ? '' : 'Nothing to redo.' });
  register('find', 'Find', { shortcut: 'Ctrl+F', macShortcut: 'Cmd+F', key: 'F', readOnlyAllowed: true,
    execute: ctx => native(ctx, 'actions.find') });
  register('replace', 'Replace', { shortcut: 'Ctrl+H', macShortcut: 'Cmd+Alt+F', key: 'H', macKey: 'F', macAlt: true,
    execute: ctx => native(ctx, 'editor.action.startFindReplaceAction') });

  // These entries keep a stable identity while their connected stage is built.
  for (const [id, label] of [['copy', 'Copy'], ['cut', 'Cut'], ['paste', 'Paste'],
    ['paste-rich', 'Paste with formatting'], ['paste-plain', 'Paste without formatting'],
    ['page-break', 'Page Break'], ['line-break', 'Line Break'],
    ['align-left', 'Align Left'], ['align-center', 'Align Center'], ['align-right', 'Align Right'], ['justify', 'Justify'],
    ['link', 'Link'], ['image', 'Image'], ['code-block', 'Code Block'], ['table', 'Table'], ['clear', 'Clear Formatting']]) {
    register(id, label, {});
  }
  register('line-break', 'Line Break', { shortcut: 'Shift+Enter', macShortcut: 'Shift+Enter',
    execute: ctx => apply(ctx, editing.lineBreak(ctx.source, ctx.offsets, win.marked)) });
  register('page-break', 'Page Break', { shortcut: 'Ctrl+Enter', macShortcut: 'Cmd+Enter',
    execute: ctx => apply(ctx, editing.pageBreak(ctx.source, ctx.offsets, win.marked)) });
  for (const [id, label, value, key] of [['align-left', 'Align Left', 'left'],
    ['align-center', 'Align Center', 'center', 'E'], ['align-right', 'Align Right', 'right'], ['justify', 'Justify', 'justify', 'J']]) {
    register(id, label, { key, shortcut: key ? `Ctrl+${key}` : '', macShortcut: key ? `Cmd+${key}` : '',
      execute: ctx => apply(ctx, editing.alignment(ctx.source, ctx.offsets, value, win.marked)),
      state: ctx => {
        const states = ctx.blocks().filter(block => block.token.type !== 'space' && ctx.offsets.some(selection => {
          const from = Math.min(selection.anchor, selection.head), to = Math.max(selection.anchor, selection.head);
          return from === to ? block.from <= from && block.to > from : block.from < to && block.to > from;
        })).map(block => block.token.alignment || 'left');
        if (!states.length) states.push('left');
        return states.every(state => state === value) ? 'true' : states.some(state => state === value) ? 'mixed' : 'false';
      },
    });
  }
  register('clear', 'Clear Formatting', { execute: ctx => apply(ctx, editing.clear(ctx.source, ctx.offsets, win.marked)) });
  for (const [id, label, handler] of [['link', 'Link', 'link'], ['image', 'Image', 'image'],
    ['code-block', 'Code Block', 'codeBlock'], ['table', 'Table', 'table']]) {
    register(id, label, { key: id === 'link' ? 'K' : undefined, shortcut: id === 'link' ? 'Ctrl+K' : '',
      macShortcut: id === 'link' ? 'Cmd+K' : '', execute: async (ctx, payload) => {
        const plan = await win.MarkTideInsertionTools[handler](ctx, payload);
        if (plan) apply(ctx, plan);
      } });
  }
  for (const [id, label, key] of [['copy', 'Copy', 'C'], ['cut', 'Cut', 'X']]) {
    register(id, label, { shortcut: `Ctrl+${key}`, macShortcut: `Cmd+${key}`, readOnlyAllowed: id === 'copy', execute: async ctx => {
      const plan = await win.MarkTideEditorClipboard.copy(ctx);
      if (id === 'cut') apply(ctx, plan);
    } });
  }
  for (const [id, label, plain] of [['paste', 'Paste', false], ['paste-rich', 'Paste with formatting', false],
    ['paste-plain', 'Paste without formatting', true]]) {
    register(id, label, { shortcut: plain ? 'Ctrl+Shift+V' : 'Ctrl+V', macShortcut: plain ? 'Cmd+Shift+V' : 'Cmd+V',
      execute: async (ctx, payload) => {
        const data = payload || await win.MarkTideEditorClipboard.read(plain);
        const plan = win.MarkTideEditorClipboard.pastePlan(ctx, data, plain);
        apply(ctx, plan);
        if (data.html && !plain && !win.MarkTideEditorClipboard.inCode(ctx) && ctx.offsets.length > 1) {
          notify('Rich paste uses the primary selection. Plain paste supports all selections.');
        }
      } });
  }

  function sync() {
    frame = null;
    const ctx = context();
    ready?.set(Boolean(ctx) && !busy && !composing && !doc.body.classList.contains('preview-only-active'));
    if (ctx && editor?.hasTextFocus()) retained = { model: ctx.model, selections: ctx.selections };
    for (const button of doc.querySelectorAll('[data-editor-command]')) {
      const command = commands.get(button.dataset.editorCommand);
      if (!command) continue;
      button.setAttribute('aria-label', command.label);
      const reason = unavailable(command, ctx);
      button.setAttribute('aria-disabled', String(Boolean(reason)));
      const keys = shortcut(command);
      button.dataset.ribbonTip = `${command.label}${keys ? ' · ' + keys : ''}${reason ? '. ' + reason : ''}`;
      button.removeAttribute('title');
      if (command.state && ctx) button.setAttribute('aria-pressed', command.state(ctx));
      else button.removeAttribute('aria-pressed');
      if (keys) button.setAttribute('aria-keyshortcuts', keys.split(' / ').map(key => key.replace(/Cmd/g, 'Meta').replace(/Ctrl/g, 'Control')).join(' '));
      else button.removeAttribute('aria-keyshortcuts');
      const menuHint = button.querySelector('.command-shortcut');
      if (menuHint) menuHint.textContent = keys;
    }
    const styles = doc.querySelector('.ribbon-styles-trigger');
    if (styles && ctx) {
      const levels = editing.selectedLines(ctx.source, ctx.offsets).map(line => {
        const block = ctx.blocks().find(block => block.from <= line.from && block.to > line.from);
        return block?.token.type === 'heading' ? block.token.depth : 0;
      });
      const level = new Set(levels).size === 1 ? levels[0] : null;
      const label = level === null ? 'Mixed' : level ? `Heading ${level}` : 'Normal';
      styles.querySelector('span').textContent = level && win.innerWidth < 1280 ? `H${level}` : label;
      styles.dataset.ribbonTip = `Styles · ${label}`;
    }
  }

  function schedule() {
    if (frame === null) frame = win.requestAnimationFrame(sync);
  }

  async function execute(id, payload) {
    const command = commands.get(id);
    if (!command) return false;
    if (editor && retained?.model === editor.getModel() && !editor.hasTextFocus()) editor.setSelections(retained.selections);
    const ctx = context();
    const revision = generation;
    const reason = unavailable(command, ctx);
    if (reason) { notify(reason); return false; }
    try {
      notify('');
      busy = true;
      sync();
      await command.execute(ctx, payload);
      return true;
    } catch (error) {
      if (revision === generation) notify(error.message || 'The command could not be completed.');
      return false;
    } finally {
      if (revision === generation) { busy = false; sync(); }
    }
  }

  function keyCommand(event) {
    if (event.isComposing || composing || event.getModifierState?.('AltGraph')) return null;
    const key = event.key.toUpperCase();
    const modifier = platform ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
    if (event.key === 'Enter' && !event.altKey) {
      if (modifier && !event.shiftKey) return commands.get('page-break');
      if (!event.ctrlKey && !event.metaKey && event.shiftKey) return commands.get('line-break');
    }
    if (modifier && !event.altKey) {
      if (key === 'Z') return commands.get(event.shiftKey ? 'redo' : 'undo');
      if (!platform && key === 'Y' && !event.shiftKey) return commands.get('redo');
      if (!event.shiftKey && key === 'C') return commands.get('copy');
      if (!event.shiftKey && key === 'X') return commands.get('cut');
      if (key === 'V') return commands.get(event.shiftKey ? 'paste-plain' : 'paste');
    }
    return [...commands.values()].find(command => command.key && key === (platform ? command.macKey || command.key : command.key)
      && (platform ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
      && !event.shiftKey && event.altKey === Boolean(platform && command.macAlt));
  }

  function ownsKey(event) {
    const command = keyCommand(event);
    return Boolean(editor?.hasTextFocus() && command && !['undo', 'redo', 'copy', 'cut', 'paste', 'paste-plain'].includes(command.id));
  }

  function ribbonKey(event) {
    if (!event.target.closest?.('.ribbon-command, .ribbon-menu-trigger, .ribbon-toggle')) return false;
    const command = keyCommand(event);
    if (!command) return false;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) execute(command.id);
    return true;
  }

  function attach() {
    if (!events) return;
    const next = win.MarkTideMonaco?.getEditor();
    if (!next || editor === next) return;
    subscriptions.forEach(subscription => subscription.dispose());
    subscriptions = [];
    editor = next;
    retained = null;
    ready = editor.createContextKey('marktideCommandReady', true);
    subscriptions.push(editor.onDidChangeCursorSelection(() => {
      retained = { model: editor.getModel(), selections: editor.getSelections() };
      schedule();
    }), editor.onDidChangeModelContent(schedule), editor.onDidChangeModel(() => { retained = null; schedule(); }),
    editor.onDidChangeConfiguration(schedule));
    const keyCodes = { B: 'KeyB', I: 'KeyI', U: 'KeyU', F: 'KeyF', H: 'KeyH', E: 'KeyE', J: 'KeyJ', K: 'KeyK', '`': 'Backquote' };
    for (const command of commands.values()) {
      if (!command.key) continue;
      const key = platform ? command.macKey || command.key : command.key;
      const modifier = win.monaco.KeyMod.CtrlCmd | (platform && command.macAlt ? win.monaco.KeyMod.Alt : 0);
      subscriptions.push(editor.addAction({ id: `marktide.${command.id}`, label: command.label,
        precondition: `editorTextFocus && marktideCommandReady${command.readOnlyAllowed ? '' : ' && !editorReadonly'}`,
        keybindings: [modifier | win.monaco.KeyCode[keyCodes[key]]], run: () => execute(command.id) }));
    }
    for (const [id, modifier] of [['page-break', win.monaco.KeyMod.CtrlCmd], ['line-break', win.monaco.KeyMod.Shift]]) {
      subscriptions.push(editor.addAction({ id: `marktide.${id}`, label: commands.get(id).label,
        precondition: 'editorTextFocus && marktideCommandReady && !editorReadonly', keybindings: [modifier | win.monaco.KeyCode.Enter],
        run: () => execute(id) }));
    }
    schedule();
  }

  function init() {
    if (events) return;
    events = new win.AbortController();
    const options = { signal: events.signal };
    doc.addEventListener('keydown', event => {
      if (!event.repeat || !keyCommand(event)) return;
      if (ownsKey(event) || event.target.closest?.('.ribbon-command, .ribbon-menu-trigger, .ribbon-toggle')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, { ...options, capture: true });
    win.addEventListener('marktide:monaco-ready', () => win.requestAnimationFrame(attach), options);
    doc.addEventListener('compositionstart', () => { composing = true; ready?.set(false); schedule(); }, options);
    doc.addEventListener('compositionend', () => {
      composing = false;
      ready?.set(Boolean(editor?.getModel()) && !busy && !doc.body.classList.contains('preview-only-active'));
      schedule();
    }, options);
    doc.addEventListener('paste', event => {
      if (!editor?.hasTextFocus() || !event.clipboardData || !editor.getDomNode().contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      execute('paste', { text: event.clipboardData.getData('text/plain'), html: event.clipboardData.getData('text/html') });
    }, { ...options, capture: true });
    viewObserver = new win.MutationObserver(schedule);
    viewObserver.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    attach();
  }

  function destroy() {
    generation++;
    busy = false;
    win.MarkTideInsertionTools?.destroy();
    events?.abort();
    events = null;
    viewObserver?.disconnect();
    subscriptions.forEach(subscription => subscription.dispose());
    subscriptions = [];
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null;
    ready?.reset();
    editor = retained = sourceModel = null;
  }

  win.MarkTideCommands = { init, destroy, execute, schedule, ownsKey, ribbonKey, commands,
    byLabel: label => [...commands.values()].find(command => command.label === label) };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
