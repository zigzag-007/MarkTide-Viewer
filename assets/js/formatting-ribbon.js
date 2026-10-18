// The ribbon keeps presentation separate from the shared editor commands.
(function (win) {
  const doc = win.document;
  let ribbon = null;
  let openMenu = null;
  let menuTrigger = null;
  let tooltip = null;
  let tipTimer = null;
  let observer = null;
  let sizeObserver = null;
  let frame = null;
  let host = null;
  let toggle = null;
  let collapsed = false;
  let fold = null;
  let foldRevision = 0;
  let gutterOffset = 0;
  let gutterEditor = null;
  const help = 'ribbon-phase-help';
  const icon = name => name === 'undo' || name === 'redo'
    ? `<svg class="ribbon-history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <g${name === 'redo' ? ' transform="translate(24 0) scale(-1 1)"' : ''}><path d="M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12h-3"/></g></svg>`
    : name === 'text-replace'
      ? `<svg class="ribbon-replace-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 8 4 2l2 6M2.7 6h2.6M14 12v6h2a1.5 1.5 0 0 0 0-3h-2m0-3h1.7a1.5 1.5 0 0 1 0 3M9 4h8l-2-2m2 2-2 2M11 16H3l2-2m-2 2 2 2"/></svg>`
      : `<i class="bi bi-${name}" aria-hidden="true"></i>`;
  const command = (label, name, caption = false) =>
    `<button type="button" class="ribbon-command${caption ? ' ribbon-captioned' : ''}"
      data-ribbon-command="${label}" aria-label="${label}" aria-disabled="true" aria-describedby="${help}"
      data-ribbon-tip="${label}">
      ${icon(name)}${caption ? `<span>${label === 'Clear Formatting' ? 'Clear' : label === 'Code Block' ? 'Code' : label}</span>` : ''}</button>`;
  const group = (name, content, kind = '') => `<div class="ribbon-group ribbon-${name.toLowerCase()}" role="group" aria-label="${name}">
    <div class="ribbon-tools ${kind}">${content}</div><span class="ribbon-group-label">${name}</span></div>`;

  function closeMenu(restoreFocus = false) {
    if (!openMenu) return;
    openMenu.hidden = true;
    menuTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus && !ribbon.hidden) menuTrigger.focus({ preventScroll: true });
    openMenu = null;
    menuTrigger = null;
  }

  function hideTip() {
    win.clearTimeout(tipTimer);
    if (tooltip) tooltip.hidden = true;
  }

  function position(element, trigger) {
    const anchor = trigger.getBoundingClientRect();
    const tableMenu = element.id === 'ribbon-table-menu';
    const edge = tableMenu ? 20 : 8;
    // Keep the table panel and its shadow clear of the scrollbar gutter.
    const width = tableMenu ? Math.min(doc.documentElement.clientWidth, doc.documentElement.getBoundingClientRect().width) : win.innerWidth;
    element.style.maxHeight = `${Math.max(40, win.innerHeight - 16)}px`;
    const bounds = element.getBoundingClientRect();
    const below = win.innerHeight - anchor.bottom - 14;
    const above = anchor.top - 14;
    const useAbove = below < bounds.height && above > below;
    const space = Math.max(40, useAbove ? above : below);
    element.style.maxHeight = `${space}px`;
    const height = Math.min(bounds.height, space);
    element.style.left = `${Math.max(edge, Math.min(anchor.left, width - bounds.width - edge))}px`;
    element.style.top = `${Math.max(8, useAbove ? anchor.top - height - 6 : anchor.bottom + 6)}px`;
  }

  function showTip(button, delay = 0) {
    hideTip();
    const inRibbon = button?.closest('.formatting-ribbon, .ribbon-toggle');
    if (!button?.dataset.ribbonTip || openMenu || inRibbon && (host.hidden || collapsed && button !== toggle)) return;
    tipTimer = win.setTimeout(() => {
      tooltip.textContent = button.dataset.ribbonTip;
      tooltip.hidden = false;
      position(tooltip, button);
    }, delay);
  }

  function showMenu(trigger, keyboard = false, last = false) {
    if (trigger.getAttribute('aria-disabled') === 'true') return;
    hideTip();
    const next = doc.getElementById(trigger.getAttribute('aria-controls'));
    const wasOpen = next === openMenu;
    closeMenu();
    if (wasOpen && !keyboard) return;
    openMenu = next;
    menuTrigger = trigger;
    if (next.id === 'ribbon-table-menu') buildTableGrid(next);
    next.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    position(next, trigger);
    if (keyboard) {
      const entries = next.querySelectorAll('[role="menuitem"], [role="gridcell"], [data-insertion-action="custom-table"]');
      entries[last ? entries.length - 1 : 0].focus({ preventScroll: true });
      if (next.id === 'ribbon-table-menu' && !last) selectTableSize(next, 1, 1);
    }
  }

  function selectTableSize(menu, columns, rows) {
    const grid = menu.querySelector('[role="grid"]');
    const selection = `${columns},${rows}`;
    if (grid.dataset.selection === selection) return;
    grid.dataset.selection = selection;
    menu.querySelector('.ribbon-table-size').textContent = `${columns} × ${rows}`;
    for (const cell of menu.querySelectorAll('[role="gridcell"]')) {
      cell.setAttribute('aria-selected', String(Number(cell.dataset.column) <= columns && Number(cell.dataset.row) <= rows));
      cell.tabIndex = Number(cell.dataset.column) === columns && Number(cell.dataset.row) === rows ? 0 : -1;
    }
    if (!rows) menu.querySelector('[role="gridcell"]').tabIndex = 0;
  }

  function buildTableGrid(menu) {
    const coarse = win.matchMedia('(pointer: coarse)').matches;
    const columns = coarse ? 8 : 10, rows = coarse ? 6 : 8;
    const grid = menu.querySelector('[role="grid"]');
    grid.dataset.selection = '';
    grid.setAttribute('aria-colcount', columns);
    grid.setAttribute('aria-rowcount', rows);
    grid.innerHTML = Array.from({ length: rows }, (_, row) => `<div role="row">${Array.from({ length: columns }, (_, column) =>
      `<button type="button" role="gridcell" tabindex="-1" aria-selected="false" aria-label="${column + 1} ${column ? 'columns' : 'column'}, ${row + 1} ${row ? 'rows' : 'row'}"
        data-column="${column + 1}" data-row="${row + 1}"></button>`).join('')}</div>`).join('');
    selectTableSize(menu, 0, 0);
  }

  function tableKey(event) {
    const cell = event.target.closest('[role="gridcell"]');
    if (!cell) return false;
    const grid = cell.closest('[role="grid"]');
    let column = Number(cell.dataset.column), row = Number(cell.dataset.row);
    const columns = Number(grid.getAttribute('aria-colcount')), rows = Number(grid.getAttribute('aria-rowcount'));
    if (event.key === 'ArrowRight') column++;
    else if (event.key === 'ArrowLeft') column--;
    else if (event.key === 'ArrowDown') row++;
    else if (event.key === 'ArrowUp') row--;
    else if (event.key === 'Home') { column = 1; if (event.ctrlKey) row = 1; }
    else if (event.key === 'End') { column = columns; if (event.ctrlKey) row = rows; }
    else return false;
    event.preventDefault();
    column = Math.max(1, Math.min(columns, column));
    row = Math.max(1, Math.min(rows, row));
    selectTableSize(openMenu, column, row);
    grid.querySelector(`[data-column="${column}"][data-row="${row}"]`).focus();
    return true;
  }

  function setCollapsed(next, animate = false) {
    const revision = ++foldRevision;
    const startHeight = host.getBoundingClientRect().height;
    fold?.cancel();
    fold = null;
    closeMenu();
    hideTip();
    collapsed = next;
    toggle.setAttribute('aria-expanded', String(!next));
    const label = next ? 'Expand formatting ribbon' : 'Collapse formatting ribbon';
    toggle.setAttribute('aria-label', label);
    toggle.dataset.ribbonTip = label;
    toggle.querySelector('i').className = `bi bi-chevron-${next ? 'right' : 'left'}`;
    // Hidden commands leave the focus order as soon as folding starts.
    ribbon.inert = next;
    ribbon.setAttribute('aria-hidden', String(next));
    ribbon.hidden = false;
    const endHeight = next ? 0 : ribbon.getBoundingClientRect().height;
    const moving = animate && !win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Read the starting clip before revealing a previously hidden ribbon.
    if (moving) win.getComputedStyle(ribbon.querySelector('.ribbon-groups')).clipPath;
    host.classList.toggle('ribbon-folding', moving);
    host.classList.toggle('ribbon-collapsed', next);
    const finish = () => {
      if (revision !== foldRevision) return;
      ribbon.hidden = collapsed;
      host.classList.remove('ribbon-folding');
      fold = null;
      win.MarkTideMonaco?.refreshLayout();
      fitGutter();
    };
    if (moving) {
      fold = host.animate([{height:`${startHeight}px`}, {height:`${endHeight}px`}],
        {duration:180, easing:'cubic-bezier(0.32, 0.72, 0, 1)'});
      fold.finished.then(finish, () => {});
    } else finish();
    fitGutter();
  }

  function fitGutter() {
    const content = doc.querySelector('.content-container');
    if (!content) return;
    if (!collapsed || host.hidden) {
      gutterOffset = 0;
      content.style.removeProperty('--ribbon-number-offset');
      toggle.style.removeProperty('width');
      return;
    }
    const editor = win.MarkTideMonaco?.getEditor();
    const numbers = doc.querySelectorAll('.monaco-editor .line-numbers');
    const lines = doc.querySelector('.monaco-editor .view-lines');
    if (!editor || !numbers.length || !lines) return;
    const digits = String(editor.getModel().getLineCount()).length;
    let right = 0;
    let digitWidth = 0;
    for (const number of numbers) {
      if (!number.textContent.trim()) continue;
      const range = doc.createRange();
      range.selectNodeContents(number);
      const bounds = range.getBoundingClientRect();
      right = Math.max(right, bounds.right - gutterOffset);
      digitWidth = Math.max(digitWidth, bounds.width / number.textContent.length);
    }
    if (!digitWidth) return;
    const left = right - digitWidth * digits;
    const room = Math.max(0, lines.getBoundingClientRect().left - right - 8);
    const preferred = win.matchMedia('(pointer: coarse)').matches ? 40 : 32;
    const width = Math.max(24, Math.min(preferred, left + room - 10));
    gutterOffset = Math.max(0, 10 + width - left);
    // Use the empty number gutter without moving document text or wrapping.
    content.style.setProperty('--ribbon-number-offset', `${gutterOffset}px`);
    toggle.style.width = `${width}px`;
  }

  function sync() {
    frame = null;
    const manager = win.MarkTideViewManager;
    if (!ribbon || !manager) return;
    const editor = win.MarkTideMonaco?.getEditor();
    if (editor && editor !== gutterEditor) {
      gutterEditor = editor;
      editor.onDidChangeModelContent(schedule);
      editor.onDidLayoutChange(schedule);
    }
    const eligible = !manager.isMobileLayout();
    doc.body.classList.toggle('ribbon-layout', eligible);
    const hidden = !eligible || doc.body.classList.contains('preview-only-active');
    if (hidden !== host.hidden) {
      const hadFocus = host.contains(doc.activeElement);
      host.hidden = hidden;
      ++foldRevision;
      fold?.cancel();
      fold = null;
      host.classList.remove('ribbon-folding');
      ribbon.hidden = collapsed;
      closeMenu();
      hideTip();
      if (hidden && hadFocus) {
        doc.getElementById(doc.body.classList.contains('preview-only-active') ? 'show-code-button' : 'markdown-editor')?.focus({ preventScroll: true });
      }
      win.MarkTideMonaco?.refreshLayout();
    }
    fitGutter();
  }

  function schedule() {
    if (frame === null) frame = win.requestAnimationFrame(sync);
  }

  function onClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-ribbon-menu')) { showMenu(button, event.detail === 0); return; }
    const action = button.dataset.insertionAction;
    const cell = button.getAttribute('role') === 'gridcell';
    if (action || cell) {
      const id = action?.startsWith('image-') ? 'image' : 'table';
      const payload = cell ? { rows: Number(button.dataset.row), columns: Number(button.dataset.column) }
        : id === 'image' ? { source: action === 'image-file' ? 'file' : 'url' } : undefined;
      closeMenu();
      hideTip();
      win.MarkTideCommands.execute(id, payload);
      return;
    }
    if (button.hasAttribute('data-ribbon-command')) {
      event.preventDefault();
      if (button.getAttribute('aria-disabled') !== 'true') {
        closeMenu();
        hideTip();
        win.MarkTideCommands.execute(button.dataset.editorCommand);
      }
      return;
    }
  }

  function onKey(event) {
    const trigger = event.target.closest('[data-ribbon-menu]');
    if (trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      showMenu(trigger, true, event.key === 'ArrowUp');
      return;
    }
    if (!openMenu) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); return; }
    if (openMenu.id === 'ribbon-table-menu') {
      if (tableKey(event)) return;
      if (event.key === 'Tab') {
        if (event.target === menuTrigger && !event.shiftKey) {
          event.preventDefault();
          openMenu.querySelector('[role="gridcell"][tabindex="0"]').focus();
          return;
        }
        if (event.target.closest('[role="gridcell"]') && !event.shiftKey
          || event.target.closest('[data-insertion-action="custom-table"]') && event.shiftKey) return;
      } else return;
    }
    if (event.key === 'Tab') { closeMenu(true); return; }
    if (!openMenu.contains(event.target)) return;
    const entries = Array.from(openMenu.querySelectorAll('[role="menuitem"]'));
    const current = entries.indexOf(doc.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
      entries[next].focus();
    }
  }

  function init() {
    if (ribbon) return;
    ribbon = doc.createElement('section');
    ribbon.id = 'formatting-ribbon';
    ribbon.className = 'formatting-ribbon';
    ribbon.setAttribute('aria-label', 'Formatting ribbon');
    ribbon.hidden = true;
    const clipboard = command('Undo', 'undo', true) + command('Redo', 'redo', true)
      + `<div class="ribbon-paste">${command('Paste', 'clipboard', true)}<button type="button" class="ribbon-menu-trigger ribbon-paste-arrow"
        data-ribbon-menu="paste" aria-label="Paste options" aria-haspopup="menu" aria-controls="ribbon-paste-menu" aria-expanded="false"
        aria-describedby="${help}" data-ribbon-tip="Paste options. Open the menu.">${icon('chevron-down')}</button></div>`
      + `<div class="ribbon-cut-copy">${command('Cut', 'scissors', true)}${command('Copy', 'copy', true)}</div>`;
    const styles = `<button type="button" class="ribbon-menu-trigger ribbon-styles-trigger" data-ribbon-menu="styles"
      aria-label="Styles" aria-haspopup="menu" aria-controls="ribbon-styles-menu" aria-expanded="false" aria-describedby="${help}"
      data-ribbon-tip="Styles. Open the menu."><span>Normal</span>${icon('chevron-down')}</button>`;
    const text = [['Bold', 'type-bold'], ['Italic', 'type-italic'], ['Underline', 'type-underline'],
      ['Strikethrough', 'type-strikethrough'], ['Highlight', 'highlighter'], ['Inline Code', 'code']];
    const paragraph = [['Bullet List', 'list-ul'], ['Numbered List', 'list-ol'], ['Task List', 'check2-square'],
      ['Blockquote', 'quote'], ['Page Break', 'file-break'], ['Line Break', 'arrow-return-left'],
      ['Align Left', 'text-left'], ['Align Center', 'text-center'], ['Align Right', 'text-right'], ['Justify', 'justify'],
      ['Decrease Indent', 'text-indent-left'], ['Increase Indent', 'text-indent-right']];
    ribbon.innerHTML = `<span id="${help}" class="ribbon-phase-help">Format the source using the retained editor selection.</span>
      <div class="ribbon-groups">${group('Clipboard', clipboard)}${group('Styles', styles)}
      ${group('Text', text.map(([label, name]) => command(label, name)).join(''), 'ribbon-text-grid')}
      ${group('Paragraph', paragraph.map(([label, name]) => command(label, name)).join(''), 'ribbon-paragraph-grid')}
      ${group('Insert', [['Link', 'link-45deg'], ['Image', 'image'], ['Code Block', 'code-square'], ['Table', 'table']]
        .map(([label, name]) => command(label, name, true)).join(''))}
      ${group('Editing', `<div class="ribbon-find-replace">${command('Find', 'search', true)}${command('Replace', 'text-replace', true)}</div>`
        + command('Clear Formatting', 'eraser', true))}</div>
      <div id="ribbon-paste-menu" class="ribbon-menu" role="menu" aria-label="Paste options" hidden></div>
      <div id="ribbon-styles-menu" class="ribbon-menu" role="menu" aria-label="Styles" hidden></div>
      <div id="ribbon-image-menu" class="ribbon-menu ribbon-image-menu" role="menu" aria-label="Image sources" hidden>
        <button type="button" role="menuitem" tabindex="-1" data-insertion-action="image-file">Image from file</button>
        <button type="button" role="menuitem" tabindex="-1" data-insertion-action="image-url">Image from URL</button>
      </div>
      <div id="ribbon-table-menu" class="ribbon-menu ribbon-table-menu" role="dialog" aria-label="Insert table" hidden>
        <output class="ribbon-table-size" id="ribbon-table-size" aria-live="polite" aria-atomic="true">0 × 0</output>
        <div role="grid" aria-label="Table size" aria-multiselectable="true" aria-describedby="ribbon-table-size ribbon-table-hint"></div>
        <p id="ribbon-table-hint" class="ribbon-table-hint">Columns × rows, including the header</p>
        <button type="button" data-insertion-action="custom-table">Insert Custom Table</button>
      </div>
      <span class="ribbon-tooltip" role="tooltip" hidden></span>`;
    for (const [id, labels] of [['ribbon-paste-menu', ['Paste with formatting', 'Paste without formatting']],
      ['ribbon-styles-menu', ['Normal', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6']]]) {
      ribbon.querySelector(`#${id}`).innerHTML = labels.map(label => `<button type="button" role="menuitem" tabindex="-1"
        aria-disabled="true" aria-describedby="${help}" data-ribbon-command="${label}">${label}<span class="command-shortcut"></span></button>`).join('');
    }
    for (const button of ribbon.querySelectorAll('[data-ribbon-command]')) {
      const entry = win.MarkTideCommands.byLabel(button.dataset.ribbonCommand);
      button.dataset.editorCommand = entry.id;
    }
    for (const [id, popup] of [['image', 'menu'], ['table', 'dialog']]) {
      const button = ribbon.querySelector(`[data-editor-command="${id}"]`);
      button.dataset.ribbonMenu = id;
      button.setAttribute('aria-haspopup', popup);
      button.setAttribute('aria-controls', `ribbon-${id}-menu`);
      button.setAttribute('aria-expanded', 'false');
    }
    ribbon.querySelector('[data-ribbon-menu="paste"]').dataset.ribbonTip = 'Paste options';
    ribbon.querySelector('[data-ribbon-menu="styles"]').dataset.ribbonTip = 'Styles';
    host = doc.createElement('div');
    host.className = 'ribbon-host';
    host.hidden = true;
    toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ribbon-toggle';
    toggle.setAttribute('aria-label', 'Collapse formatting ribbon');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-controls', ribbon.id);
    toggle.dataset.ribbonTip = 'Collapse formatting ribbon';
    toggle.innerHTML = icon('chevron-left');
    host.append(toggle, ribbon);
    doc.querySelector('.app-header').after(host);
    tooltip = ribbon.querySelector('.ribbon-tooltip');
    doc.body.append(tooltip);
    ribbon.addEventListener('click', onClick);
    ribbon.addEventListener('keydown', onKey);
    ribbon.addEventListener('pointermove', event => {
      const cell = event.target.closest('[role="gridcell"]');
      if (cell && event.pointerType === 'mouse') selectTableSize(cell.closest('.ribbon-table-menu'), Number(cell.dataset.column), Number(cell.dataset.row));
    });
    ribbon.querySelector('#ribbon-table-menu [role="grid"]').addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && !event.currentTarget.contains(doc.activeElement)) selectTableSize(event.currentTarget.closest('.ribbon-table-menu'), 0, 0);
    });
    doc.addEventListener('pointerover', event => showTip(event.target.closest('[data-ribbon-tip]'), 350));
    doc.addEventListener('pointerout', hideTip);
    doc.addEventListener('focusin', event => showTip(event.target.closest('[data-ribbon-tip]')));
    doc.addEventListener('focusout', hideTip);
    doc.addEventListener('scroll', event => {
      hideTip();
      if (openMenu && !openMenu.contains(event.target)) position(openMenu, menuTrigger);
    }, true);
    toggle.addEventListener('click', event => setCollapsed(!collapsed, event.detail !== 0));
    doc.addEventListener('pointerdown', event => { if (openMenu && !openMenu.contains(event.target)
      && !menuTrigger.contains(event.target)) closeMenu(); });
    doc.addEventListener('focusin', event => { if (openMenu && !ribbon.contains(event.target)) closeMenu(); });
    win.addEventListener('resize', () => { setCollapsed(collapsed); schedule(); });
    observer = new win.MutationObserver(schedule);
    observer.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    // Size the tools from their own surface, ready for a future floating ribbon.
    sizeObserver = new win.ResizeObserver(() => {
      if (!ribbon.hidden) ribbon.style.setProperty('--ribbon-width', `${ribbon.clientWidth}px`);
    });
    sizeObserver.observe(ribbon);
    win.addEventListener('marktide:monaco-ready', schedule, { once: true });
    sync();
    win.MarkTideCommands.schedule();
  }
  win.MarkTideRibbon = { init };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
