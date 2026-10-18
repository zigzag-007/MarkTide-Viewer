// Shared heading navigation for Preview, Monaco and standalone HTML.
(function (global) {
  function createMarkTideOutlineController(targetWindow, options) {
    const win = targetWindow;
    const doc = win.document;
    const settings = options || {};
    const root = doc.querySelector(settings.rootSelector || '#markdown-preview');
    const pane = settings.pageScroll ? null : doc.querySelector('.preview-pane');
    const editorHost = settings.pageScroll ? null : doc.getElementById('markdown-editor');
    const headingSelector = 'h1, h2, h3, h4, h5, h6';
    let navigation = null;
    let panel = null;
    let list = null;
    let track = null;
    let indicator = null;
    let viewportMarker = null;
    let viewportFill = null;
    let viewportOutline = null;
    let pin = null;
    let toggle = null;
    let backdrop = null;
    let items = [];
    let active = -1;
    let frame = null;
    let rebuildPending = false;
    let layoutPending = true;
    let resizeObserver = null;
    let contentObserver = null;
    let viewObserver = null;
    let intersectionObserver = null;
    let observedScroller = undefined;
    let editor = null;
    let editorListeners = [];
    let navigationTimer = null;
    let open = false;
    let pinned = false;
    let keyboardOpen = false;
    let hoverTimer = null;
    let hoverOpenTimer = null;
    let railRevealTarget = null;
    let expanded = false;
    let lastMode = null;
    let suppressFocusOpen = false;
    let skipRailClick = false;
    let pointerType = 'mouse';
    const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = win.matchMedia('(max-width: 767px)');
    const normalize = text => String(text || '').replace(/\s+/g, ' ').trim();
    const lineCount = text => (String(text || '').match(/\n/g) || []).length;

    function sourceHeadings(source) {
      if (!win.marked) return [];
      const entries = [];
      const plain = html => {
        const wrapper = doc.createElement('div');
        wrapper.innerHTML = win.MarkTideSanitizer.sanitize(html, { mode: 'preview' });
        return normalize(wrapper.textContent);
      };
      const walk = (tokens, firstLine) => {
        let line = firstLine;
        for (const token of tokens) {
          if (token.type === 'heading') {
            entries.push({ line, level: token.depth, label: plain(win.marked.parseInline(token.text)) });
          } else if (token.type === 'blockquote') {
            walk(token.tokens, line);
          } else if (token.type === 'list') {
            let itemLine = line;
            for (const item of token.items) {
              walk(item.tokens, itemLine);
              itemLine += lineCount(item.raw);
            }
          } else if (token.type === 'html') {
            const wrapper = doc.createElement('div');
            wrapper.innerHTML = win.MarkTideSanitizer.sanitize(token.raw, { mode: 'preview' });
            const headings = Array.from(wrapper.querySelectorAll(headingSelector));
            let cursor = 0;
            for (const heading of headings) {
              const expression = new RegExp(`<${heading.tagName}\\b[^>]*>[\\s\\S]*?<\\/${heading.tagName}\\s*>`, 'gi');
              expression.lastIndex = cursor;
              let match;
              while ((match = expression.exec(token.raw))) {
                if (plain(match[0]) !== normalize(heading.textContent)) continue;
                entries.push({ line: line + lineCount(token.raw.slice(0, match.index)),
                  level: Number(heading.tagName.slice(1)), label: normalize(heading.textContent) });
                cursor = expression.lastIndex;
                break;
              }
            }
          }
          line += lineCount(token.raw);
        }
      };
      walk(win.marked.lexer(source || ''), 1);
      return entries;
    }

    function state() {
      const editorOnly = Boolean(editorHost && doc.body.classList.contains('editor-only-active'));
      const innerScroll = !editorOnly && pane && /auto|scroll/.test(win.getComputedStyle(pane).overflowY);
      const region = editorOnly ? editorHost : (pane || root);
      const paired = Boolean(editorHost && !editorOnly && !doc.body.classList.contains('preview-only-active'));
      const split = paired && win.innerWidth > 1080;
      return { editorOnly, innerScroll, split, stacked: paired && !split,
        region, scroller: innerScroll ? pane : doc.scrollingElement };
    }

    function bindEditor() {
      const next = win.MarkTideMonaco?.getEditor();
      if (!next || next === editor || !navigation) return;
      editorListeners.forEach(listener => listener.dispose());
      editor = next;
      editorListeners = [
        editor.onDidScrollChange(() => schedule()),
        editor.onDidChangeCursorPosition(event => {
          if (state().editorOnly) setActive(sectionAtLine(event.position.lineNumber), true);
        }),
        editor.onDidLayoutChange(() => schedule(false, true)),
      ];
    }

    function sectionAtLine(line) {
      let index = 0;
      items.forEach((item, candidate) => {
        if (item.line && item.line <= line) index = candidate;
      });
      return index;
    }

    function rebuild() {
      const source = editorHost ? sourceHeadings(editorHost.value) : [];
      let sourceIndex = 0;
      const headings = Array.from(root.querySelectorAll(headingSelector)).filter(heading => {
        if (heading.closest('pre, code, .mermaid, mjx-container')) return false;
        for (let element = heading; element && element !== root; element = element.parentElement) {
          if (element.hidden || element.getAttribute('aria-hidden') === 'true'
            || element.style.display === 'none') return false;
        }
        return true;
      });
      const selected = new Set(headings);
      const ids = new Set(Array.from(doc.querySelectorAll('[id]'))
        .filter(element => !selected.has(element)).map(element => element.id));
      const previousId = items[active]?.id;
      items = headings.map(heading => {
        const label = normalize(heading.textContent) || 'Untitled section';
        const level = Number(heading.tagName.slice(1));
        const base = heading.id || label.normalize('NFKC').toLowerCase()
          .replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';
        let id = base;
        let suffix = 2;
        while (ids.has(id)) id = `${base}-${suffix++}`;
        ids.add(id);
        heading.id = id;
        let match = source.findIndex((entry, index) => index >= sourceIndex
          && entry.level === level && entry.label === label);
        // Math rendering can change the heading's visible text.
        if (match < 0 && heading.querySelector('mjx-container')) {
          match = source.findIndex((entry, index) => index >= sourceIndex && entry.level === level);
        }
        const entry = match >= 0 ? source[match] : null;
        if (entry) sourceIndex = match + 1;
        return { id, label, level, line: entry?.line || null, heading, y: 0, position: 0 };
      });
      list.replaceChildren();
      viewportMarker.style.height = '';
      viewportFill.style.height = '';
      track.replaceChildren(viewportFill, viewportOutline, indicator);
      const stack = [];
      for (const [index, item] of items.entries()) {
        item.y = index * 12;
        while (stack.length && stack.at(-1).level >= item.level) stack.pop();
        const parent = stack.at(-1);
        if (parent && !parent.children) {
          parent.children = doc.createElement('ol');
          parent.row.appendChild(parent.children);
        }
        const row = doc.createElement('li');
        const link = doc.createElement('a');
        link.href = `#${encodeURIComponent(item.id)}`;
        link.textContent = item.label;
        link.title = item.label;
        link.dataset.headingIndex = index;
        row.appendChild(link);
        (parent ? parent.children : list).appendChild(row);
        stack.push({ level: item.level, row, children: null });
        const marker = doc.createElement('button');
        marker.type = 'button';
        marker.dataset.headingIndex = index;
        marker.className = 'marktide-heading-marker';
        marker.style.transform = `translateY(${item.y}px)`;
        marker.style.setProperty('--marker-width', `${markerWidth(item)}px`);
        marker.setAttribute('aria-label', `${item.label}, heading level ${item.level}`);
        marker.title = item.label;
        marker.tabIndex = -1;
        track.appendChild(marker);
        item.link = link;
        item.marker = marker;
      }
      active = -1;
      pane?.classList.toggle('marktide-outline-surface', items.length > 0);
      if (settings.pageScroll) root.classList.toggle('marktide-outline-document', items.length > 0);
      editorHost?.parentElement.classList.toggle('marktide-outline-editor', items.length > 0);
      if (!items.length) { pinned = false; setOpen(false); }
      navigation.hidden = !items.length;
      setActive(Math.max(0, items.findIndex(item => item.id === previousId)), true);
      layoutPending = true;
      observedScroller = undefined;
    }

    function setActive(index, instant = false) {
      if (!items.length) return;
      if (index === active) { revealActiveMarker(instant); return; }
      items[active]?.link.removeAttribute('aria-current');
      items[active]?.marker.removeAttribute('aria-current');
      if (items[active]) items[active].marker.tabIndex = -1;
      active = Math.max(0, Math.min(index, items.length - 1));
      const item = items[active];
      item.link.setAttribute('aria-current', 'location');
      item.marker.setAttribute('aria-current', 'location');
      item.marker.tabIndex = 0;
      indicator.classList.toggle('is-instant', instant);
      positionIndicator(item);
      revealActiveMarker(instant);
      if (open && !panel.matches(':hover')) {
        const top = item.link.offsetTop;
        if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - 40) {
          list.scrollTop = Math.max(0, top - list.clientHeight / 3);
        }
      }
    }

    function positionIndicator(item) {
      const width = markerWidth(item);
      indicator.style.width = `${width}px`;
      indicator.style.left = `${(30 - width) / 2}px`;
      indicator.style.transform = `translateY(${item.y}px)`;
    }

    function revealActiveMarker(instant = false) {
      const viewport = track.parentElement;
      if (!items[active] || mobile.matches || !viewport.clientHeight) return;
      const bounds = viewport.getBoundingClientRect();
      const marker = items[active].marker.getBoundingClientRect();
      const top = bounds.top + viewport.clientTop;
      const bottom = top + viewport.clientHeight;
      // Use the painted position so the rail's padding is included.
      if (marker.top < top + 8 || marker.bottom > bottom - 8) {
        const target = Math.max(0, Math.min(viewport.scrollHeight - viewport.clientHeight,
          viewport.scrollTop + (marker.top + marker.bottom - top - bottom) / 2));
        if (!instant && !motion.matches && railRevealTarget !== null && Math.abs(railRevealTarget - target) < 1) return;
        railRevealTarget = target;
        viewport.scrollTo({ top: target, behavior: instant || motion.matches ? 'instant' : 'smooth' });
      }
    }

    function markerWidth(item) {
      return item.level === 1 ? 18 : item.level === 2 ? 10 : 6;
    }

    function measure(reading) {
      const bounds = reading.region.getBoundingClientRect();
      const header = doc.querySelector('.app-header');
      const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      const top = Math.max(headerBottom, bounds.top, 0);
      const bottom = Math.min(win.innerHeight, bounds.bottom);
      const gutter = expanded ? 302 : 40;
      const left = reading.editorOnly ? bounds.left - gutter
        : !pane ? root.getBoundingClientRect().left - gutter
          : win.innerWidth <= 1080 || reading.innerScroll ? bounds.left
            : root.getBoundingClientRect().left - gutter;
      const pixelScale = win.devicePixelRatio || 1;
      const anchor = Math.round(Math.max(0, left) * pixelScale) / pixelScale;
      const railTop = Math.round(top * pixelScale) / pixelScale;
      navigation.style.left = `${anchor}px`;
      navigation.style.top = `${railTop}px`;
      navigation.style.height = `${Math.max(80, bottom - railTop)}px`;
      const panelLeft = reading.split ? anchor - 262 : anchor + 40;
      navigation.style.setProperty('--outline-panel-left', `${Math.max(0, Math.min(panelLeft, win.innerWidth - 262))}px`);
      const panelTop = mobile.matches ? Math.max(16, headerBottom) : win.innerWidth <= 1080 ? headerBottom : top;
      navigation.style.setProperty('--outline-panel-top', `${panelTop}px`);
      if (mobile.matches) {
        const corner = (reading.innerScroll ? pane : root).getBoundingClientRect();
        const right = reading.editorOnly ? 16 : Math.max(16, win.innerWidth - Math.min(corner.right, win.innerWidth) + 16);
        const bottomInset = reading.innerScroll
          ? Math.max(16, win.innerHeight - Math.min(corner.bottom, win.innerHeight) + 16) : 16;
        navigation.style.setProperty('--outline-control-right', `${right}px`);
        navigation.style.setProperty('--outline-control-bottom', `${bottomInset}px`);
      }
      const origin = root.getBoundingClientRect().top;
      for (const [index, item] of items.entries()) {
        const bounds = item.heading.getBoundingClientRect();
        item.position = reading.editorOnly && editor && item.line
          ? editor.getTopForLineNumber(item.line) : bounds.top - origin;
        item.height = reading.editorOnly && editor && item.line
          ? editor.getTopForLineNumber(Math.min(item.line + 1, editor.getModel().getLineCount())) - item.position || 20
          : bounds.height;
        // Keep section order compact. The range still uses real document offsets.
        item.y = index * 12;
        item.marker.style.transform = `translateY(${item.y}px)`;
      }
      track.style.height = `${Math.max(12, items.length * 12)}px`;
      if (items[active]) positionIndicator(items[active]);
      if (observedScroller !== reading.scroller) {
        intersectionObserver?.disconnect();
        observedScroller = reading.scroller;
        if (win.IntersectionObserver && !reading.editorOnly) {
          intersectionObserver = new win.IntersectionObserver(() => schedule(), {
            root: reading.innerScroll ? pane : null,
          });
          items.forEach(item => intersectionObserver.observe(item.heading));
        }
      }
    }

    function updateViewport(reading) {
      if (!items.length) return;
      const origin = root.getBoundingClientRect().top;
      const start = reading.editorOnly && editor ? editor.getScrollTop()
        : (reading.innerScroll ? pane.getBoundingClientRect().top : 0) - origin;
      const height = reading.editorOnly && editor ? editor.getLayoutInfo().height
        : reading.innerScroll ? pane.clientHeight : win.innerHeight;
      const length = reading.editorOnly && editor ? editor.getContentHeight() : root.scrollHeight;
      const space = items.length * 12;
      // The shaded range represents this viewport, not a fixed heading count.
      const map = position => {
        if (position <= items[0].position) return items[0].y;
        for (let index = 1; index < items.length; index++) {
          const previous = items[index - 1];
          const next = items[index];
          if (position <= next.position) return previous.y + (next.y - previous.y)
            * (position - previous.position) / Math.max(1, next.position - previous.position);
        }
        const last = items.at(-1);
        return last.y + (Math.max(space - 8, last.y) - last.y)
          * Math.min(1, (position - last.position) / Math.max(1, length - last.position));
      };
      const visible = items.filter(item => item.position < start + height && item.position + item.height > start);
      // Show visible headings, with section mapping when none are on screen.
      let top = visible.length ? visible[0].y
        : Math.max(0, Math.min(space - 12, Math.floor(map(start) / 12) * 12));
      let end = visible.length ? visible.at(-1).y + 12
        : Math.min(space, Math.max(top + 12, Math.ceil(map(start + height) / 12) * 12));
      // Two rows keep a small range readable, except in a one heading document.
      const minimum = Math.min(24, space);
      if (end - top < minimum) {
        end = Math.min(space, top + minimum);
        top = Math.max(0, end - minimum);
      }
      const transform = `translateY(${top}px)`;
      const size = `${end - top}px`;
      if (viewportMarker.style.transform === transform && viewportMarker.style.height === size) return;
      viewportMarker.style.transform = transform;
      viewportMarker.style.height = size;
      viewportFill.style.transform = transform;
      viewportFill.style.height = size;
    }

    function refresh() {
      if (!navigation) return;
      bindEditor();
      if (rebuildPending) { rebuildPending = false; rebuild(); }
      const reading = state();
      updateExpanded(reading);
      const modeChanged = lastMode !== reading.editorOnly;
      if (modeChanged) { layoutPending = true; lastMode = reading.editorOnly; }
      const visible = items.length && reading.region.getClientRects().length
        && reading.region.getBoundingClientRect().width > 80;
      navigation.hidden = !visible || Boolean(doc.body.classList.contains('menu-open')
        || doc.querySelector('.mermaid-modal-overlay.open, .whats-new-overlay.open'));
      if (navigation.hidden) return;
      if (layoutPending || !reading.innerScroll) {
        layoutPending = false;
        measure(reading);
      }
      let index = 0;
      if (reading.editorOnly && editor) {
        const top = editor.getScrollTop() + 42;
        items.forEach((item, candidate) => {
          if (item.line && item.position <= top) index = candidate;
        });
      } else {
        const top = reading.innerScroll ? pane.getBoundingClientRect().top + 64
          : Math.max(64, doc.querySelector('.app-header')?.getBoundingClientRect().bottom + 40 || 64);
        items.forEach((item, candidate) => {
          if (item.heading.getBoundingClientRect().top <= top) index = candidate;
        });
        if (reading.scroller.scrollTop > 0 && reading.scroller.scrollTop + reading.scroller.clientHeight
          >= reading.scroller.scrollHeight - 2) index = items.length - 1;
      }
      setActive(index, motion.matches || modeChanged);
      updateViewport(reading);
    }

    function schedule(rebuildNeeded = false, layoutNeeded = false) {
      rebuildPending ||= rebuildNeeded;
      layoutPending ||= layoutNeeded;
      if (frame !== null || !navigation) return;
      frame = win.requestAnimationFrame(() => { frame = null; refresh(); });
    }

    function setOpen(value) {
      win.clearTimeout(hoverTimer);
      win.clearTimeout(hoverOpenTimer);
      open = Boolean(value);
      navigation.classList.toggle('is-open', open);
      panel.hidden = !open;
      panel.inert = !open;
      panel.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
      toggle.title = open ? 'Close table of contents' : 'Table of contents';
      pin.setAttribute('aria-pressed', String(pinned));
      pin.setAttribute('aria-label', pinned ? 'Unpin table of contents' : 'Pin table of contents');
      updateExpanded(state());
      schedule(false, true);
    }

    function updateExpanded(reading) {
      const width = reading.editorOnly || reading.split ? editorHost.closest('.editor-pane').clientWidth
        : (pane || root.parentElement).clientWidth;
      const next = open && pinned && !mobile.matches && !reading.stacked && width >= 502;
      navigation.classList.toggle('is-floating', !next);
      navigation.classList.toggle('is-mobile', mobile.matches);
      pane?.classList.toggle('marktide-outline-expanded', next && !reading.editorOnly && !reading.split);
      if (settings.pageScroll) root.parentElement.classList.toggle('marktide-outline-expanded', next);
      editorHost?.parentElement.classList.toggle('marktide-outline-expanded', next && reading.editorOnly);
      editorHost?.parentElement.classList.toggle('marktide-outline-split-reserved', next && reading.split);
      backdrop.hidden = !open || !mobile.matches;
      doc.documentElement.classList.toggle('marktide-toc-modal-open', open && mobile.matches);
      panel.setAttribute('role', mobile.matches ? 'dialog' : 'navigation');
      if (mobile.matches) panel.setAttribute('aria-modal', 'true');
      else panel.removeAttribute('aria-modal');
      if (expanded !== next) layoutPending = true;
      expanded = next;
    }

    function dismiss(restoreFocus = false) {
      pinned = false;
      keyboardOpen = false;
      setOpen(false);
      if (restoreFocus) {
        suppressFocusOpen = true;
        (mobile.matches ? toggle : items[active]?.marker)?.focus({ preventScroll: true });
        suppressFocusOpen = false;
      }
    }

    function finishNavigation() {
      win.clearTimeout(navigationTimer);
      navigationTimer = null;
      win.MarkTideScrollSync?.endNavigation();
    }

    function pageHeaderInset() {
      const header = doc.querySelector('.app-header');
      if (!header) return 0;
      const position = win.getComputedStyle(header).position;
      if (position === 'sticky') {
        // A sticky header inside another scroll box leaves with that box.
        for (let parent = header.parentElement; parent && parent !== doc.scrollingElement; parent = parent.parentElement) {
          if (/auto|scroll|hidden/.test(win.getComputedStyle(parent).overflowY)) return 0;
        }
      } else if (position !== 'fixed') return 0;
      return Math.max(0, header.getBoundingClientRect().bottom);
    }

    function navigate(index, keyboard, focusTarget = true) {
      const item = items[index];
      if (!item) return;
      if (focusTarget && !pinned && (mobile.matches || keyboard || pointerType === 'touch')) dismiss();
      const reading = state();
      const behavior = motion.matches || keyboard ? 'instant' : 'smooth';
      const sync = win.MarkTideScrollSync;
      if (sync?.syncScrollingEnabled) sync.beginNavigation();
      win.clearTimeout(navigationTimer);
      navigationTimer = win.setTimeout(finishNavigation, behavior === 'instant' ? 80 : 3000);
      if (editor && item.line && (reading.editorOnly || sync?.syncScrollingEnabled)) {
        // Closing the panel changes line wrapping before this jump.
        editor.layout();
        editor.setPosition({ lineNumber: item.line, column: 1 });
        editor.setScrollTop(Math.max(0, editor.getTopForLineNumber(item.line) - 32),
          behavior === 'instant' ? win.monaco.editor.ScrollType.Immediate : win.monaco.editor.ScrollType.Smooth);
        if (reading.editorOnly && focusTarget) editor.focus();
      }
      if (!reading.editorOnly) {
        const top = item.heading.getBoundingClientRect().top + reading.scroller.scrollTop
          - (reading.innerScroll ? pane.getBoundingClientRect().top + 32
            : pageHeaderInset() + 32);
        if (reading.innerScroll) pane.scrollTo({ top: Math.max(0, top), behavior });
        else win.scrollTo({ top: Math.max(0, top), behavior });
        if (keyboard && focusTarget) {
          item.heading.tabIndex = -1;
          item.heading.focus({ preventScroll: true });
        }
      }
      setActive(index, keyboard || motion.matches);
      schedule();
    }

    function onClick(event) {
      const control = event.target.closest('[data-heading-index]');
      if (skipRailClick && event.target.closest('.marktide-heading-rail')) {
        skipRailClick = false;
        event.preventDefault();
        return;
      }
      if (!control && pointerType === 'touch' && event.target.closest('.marktide-heading-rail')) {
        if (!pinned) dismiss();
        return;
      }
      if (!control || !navigation.contains(control)) return;
      event.preventDefault();
      navigate(Number(control.dataset.headingIndex), event.detail === 0);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        dismiss(true);
      }
      const marker = event.target.closest('.marktide-heading-marker');
      if (!marker || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = Number(marker.dataset.headingIndex);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : Math.max(0, Math.min(items.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
      items[index].marker.focus();
      navigate(index, true, false);
    }

    const onScroll = event => {
      if (event.target === doc || event.target === pane || event.target === editorHost) schedule();
    };
    const onResize = () => schedule(false, true);
    const onRendered = () => schedule(true, true);
    const onOutside = event => {
      if (open && (!pinned || mobile.matches) && !navigation.contains(event.target)) dismiss();
    };
    const onEnter = event => {
      if (mobile.matches || event.pointerType === 'touch' || !win.matchMedia('(hover: hover)').matches) return;
      win.clearTimeout(hoverTimer);
      win.clearTimeout(hoverOpenTimer);
      keyboardOpen = false;
      if (open) return;
      hoverOpenTimer = win.setTimeout(() => {
        if (!navigation.hidden && !mobile.matches && navigation.matches(':hover')) setOpen(true);
      }, 300);
    };
    const onLeave = () => {
      win.clearTimeout(hoverTimer);
      win.clearTimeout(hoverOpenTimer);
      if (!pinned && !keyboardOpen) hoverTimer = win.setTimeout(() => setOpen(false), 140);
    };
    const onPointerDown = event => {
      railRevealTarget = null;
      pointerType = event.pointerType;
      skipRailClick = false;
      if (pointerType === 'touch' && !open && event.target.closest('.marktide-heading-rail')) {
        skipRailClick = true;
        keyboardOpen = true;
        setOpen(true);
      }
    };
    const onFocusIn = event => {
      if (!mobile.matches && !suppressFocusOpen && event.target.matches(':focus-visible')) {
        keyboardOpen = true;
        setOpen(true);
      }
    };
    const onFocusOut = event => {
      if (keyboardOpen && !pinned && !navigation.contains(event.relatedTarget)) dismiss();
    };
    const onMotion = () => schedule(false, true);
    const onScrollEnd = event => {
      if (event.target === track?.parentElement) railRevealTarget = null;
      if (event.target === doc || event.target === pane) finishNavigation();
    };

    function init() {
      if (!root || navigation) return;
      navigation = doc.createElement('aside');
      navigation.className = 'marktide-outline';
      navigation.hidden = true;
      navigation.setAttribute('aria-label', 'Document navigation');
      navigation.innerHTML = '<button class="marktide-outline-toggle" type="button" aria-label="Table of contents" aria-expanded="false" aria-controls="marktide-toc"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h2M10 6h10M4 12h2M10 12h7M4 18h2M10 18h10"/></svg></button><div class="marktide-toc-backdrop" hidden></div><nav class="marktide-heading-rail" aria-label="Heading overview"><div class="marktide-rail-track"><span class="marktide-active-marker" aria-hidden="true"></span></div></nav><nav id="marktide-toc" class="marktide-toc" aria-label="Table of contents" hidden><div class="marktide-toc-header"><span>Table of contents</span></div><ol></ol></nav>';
      doc.body.appendChild(navigation);
      toggle = navigation.querySelector('.marktide-outline-toggle');
      panel = navigation.querySelector('.marktide-toc');
      list = panel.querySelector('ol');
      track = navigation.querySelector('.marktide-rail-track');
      indicator = navigation.querySelector('.marktide-active-marker');
      backdrop = navigation.querySelector('.marktide-toc-backdrop');
      track.parentElement.addEventListener('wheel', () => { railRevealTarget = null; }, { passive: true });
      viewportMarker = doc.createElement('span');
      viewportMarker.className = 'marktide-viewport-marker';
      viewportMarker.setAttribute('aria-hidden', 'true');
      viewportFill = doc.createElement('span');
      viewportFill.className = 'marktide-viewport-fill';
      viewportFill.setAttribute('aria-hidden', 'true');
      viewportOutline = doc.createElement('span');
      viewportOutline.className = 'marktide-viewport-outline';
      viewportOutline.setAttribute('aria-hidden', 'true');
      viewportOutline.appendChild(viewportMarker);
      pin = doc.createElement('button');
      pin.type = 'button';
      pin.setAttribute('aria-label', 'Pin table of contents');
      pin.setAttribute('aria-pressed', 'false');
      pin.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 3h8l-1 7 3 4H6l3-4-1-7ZM12 14v7"/></svg>';
      panel.querySelector('.marktide-toc-header').appendChild(pin);
      toggle.addEventListener('click', event => {
        if (open) dismiss();
        else { keyboardOpen = event.detail === 0 || mobile.matches; setOpen(true); }
      });
      pin.addEventListener('click', () => { pinned = !pinned; setOpen(true); });
      backdrop.addEventListener('pointerdown', () => dismiss());
      backdrop.addEventListener('wheel', event => event.preventDefault(), { passive: false });
      navigation.addEventListener('pointerenter', onEnter);
      navigation.addEventListener('pointerleave', onLeave);
      navigation.addEventListener('pointerdown', onPointerDown);
      navigation.addEventListener('focusin', onFocusIn);
      navigation.addEventListener('focusout', onFocusOut);
      navigation.addEventListener('click', onClick);
      doc.addEventListener('keydown', onKeyDown);
      doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
      doc.addEventListener('scrollend', onScrollEnd, true);
      doc.addEventListener('pointerdown', onOutside);
      win.addEventListener('resize', onResize);
      win.addEventListener('marktide:rendered', onRendered);
      win.addEventListener('marktide:monaco-ready', onResize);
      motion.addEventListener('change', onMotion);
      mobile.addEventListener('change', onResize);
      root.addEventListener('load', onResize, true);
      root.addEventListener('toggle', onResize, true);
      pane?.classList.add('marktide-outline-surface');
      if (settings.pageScroll) root.classList.add('marktide-outline-document');
      if (editorHost) editorHost.parentElement.classList.add('marktide-outline-editor');
      contentObserver = new win.MutationObserver(onRendered);
      contentObserver.observe(root, { childList: true, subtree: true });
      viewObserver = new win.MutationObserver(onResize);
      viewObserver.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
      if (pane) viewObserver.observe(pane, { attributes: true, attributeFilter: ['style'] });
      resizeObserver = new win.ResizeObserver(onResize);
      resizeObserver.observe(root);
      if (pane) resizeObserver.observe(pane);
      if (editorHost) resizeObserver.observe(editorHost);
      rebuild();
      schedule(false, true);
      doc.fonts?.ready.then(() => schedule(false, true));
    }

    function destroy() {
      if (!navigation) return;
      finishNavigation();
      win.clearTimeout(hoverTimer);
      win.clearTimeout(hoverOpenTimer);
      if (frame !== null) win.cancelAnimationFrame(frame);
      frame = null;
      resizeObserver?.disconnect();
      contentObserver?.disconnect();
      viewObserver?.disconnect();
      intersectionObserver?.disconnect();
      editorListeners.forEach(listener => listener.dispose());
      editorListeners = [];
      editor = null;
      doc.removeEventListener('scroll', onScroll, true);
      doc.removeEventListener('scrollend', onScrollEnd, true);
      doc.removeEventListener('pointerdown', onOutside);
      doc.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('resize', onResize);
      win.removeEventListener('marktide:rendered', onRendered);
      win.removeEventListener('marktide:monaco-ready', onResize);
      motion.removeEventListener('change', onMotion);
      mobile.removeEventListener('change', onResize);
      root.removeEventListener('load', onResize, true);
      root.removeEventListener('toggle', onResize, true);
      pane?.classList.remove('marktide-outline-surface');
      pane?.classList.remove('marktide-outline-expanded');
      root.classList.remove('marktide-outline-document');
      root.classList.remove('marktide-outline-expanded');
      if (settings.pageScroll) root.parentElement.classList.remove('marktide-outline-expanded');
      editorHost?.parentElement.classList.remove('marktide-outline-editor');
      editorHost?.parentElement.classList.remove('marktide-outline-expanded');
      editorHost?.parentElement.classList.remove('marktide-outline-split-reserved');
      editorHost?.closest('.editor-pane').classList.remove('marktide-outline-reserved');
      doc.documentElement.classList.remove('marktide-toc-modal-open');
      navigation.remove();
      navigation = null;
      items = [];
      active = -1;
      open = false;
      pinned = false;
      keyboardOpen = false;
      expanded = false;
      lastMode = null;
      observedScroller = undefined;
      rebuildPending = false;
      layoutPending = true;
    }

    return { init, destroy, refresh: onRendered, sourceHeadings };
  }

  global.MarkTideCreateOutlineController = createMarkTideOutlineController;
  const boot = () => {
    global.MarkTideOutline = createMarkTideOutlineController(global);
    global.MarkTideOutline.init();
  };
  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
