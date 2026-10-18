// Shared screen table scroll hints for Preview and standalone HTML.
(function (global) {
  function createMarkTideTableScrollController(targetWindow, options) {
    const win = targetWindow || global;
    const doc = win.document;
    const rootSelector = (options || {}).rootSelector || '#markdown-preview';
    let root = null;
    let resizeObserver = null;
    let mutationObserver = null;
    let frameId = null;
    let initialized = false;
    const observed = new Set();

    function update(scroll) {
      const table = scroll.querySelector(':scope > table');
      if (!table) return;
      const overflowing = table.getBoundingClientRect().width > scroll.clientWidth + 1;
      const distance = Math.abs(scroll.scrollLeft);
      const atEnd = distance >= scroll.scrollWidth - scroll.clientWidth - 2;
      const state = !overflowing ? 'none' : distance <= 2 ? 'start' : atEnd ? 'end' : 'middle';
      const hint = state === 'start' ? 'Scroll sideways for more columns →'
        : state === 'end' ? '← Scroll back for earlier columns' : '← Scroll sideways →';
      if (scroll.dataset.marktideScrollState === state) return;
      scroll.dataset.marktideScrollState = state;
      scroll.dataset.marktideScrollHint = hint;
    }

    function refresh() {
      if (!root) return;
      const tables = new Set(root.querySelectorAll('.marktide-table-scroll > table'));
      observed.forEach(table => {
        if (!tables.has(table)) {
          resizeObserver?.unobserve(table);
          observed.delete(table);
        }
      });
      tables.forEach(table => {
        update(table.parentElement);
        if (!observed.has(table)) {
          resizeObserver?.observe(table);
          observed.add(table);
        }
      });
    }

    function scheduleRefresh() {
      if (frameId !== null) return;
      frameId = win.requestAnimationFrame(() => {
        frameId = null;
        refresh();
      });
    }

    function onScroll(event) {
      if (event.target.classList?.contains('marktide-table-scroll')) update(event.target);
    }

    function init() {
      if (initialized) return;
      root = doc.querySelector(rootSelector);
      if (!root) return;
      initialized = true;
      root.addEventListener('scroll', onScroll, { capture: true, passive: true });
      root.addEventListener('toggle', scheduleRefresh, true);
      root.addEventListener('load', scheduleRefresh, true);
      win.addEventListener('resize', scheduleRefresh);
      if (win.ResizeObserver) {
        resizeObserver = new win.ResizeObserver(scheduleRefresh);
        resizeObserver.observe(root);
      }
      if (win.MutationObserver) {
        mutationObserver = new win.MutationObserver(scheduleRefresh);
        mutationObserver.observe(root, { childList: true, subtree: true });
      }
      doc.fonts?.ready.then(() => { if (initialized) scheduleRefresh(); });
      scheduleRefresh();
    }

    function destroy() {
      if (!initialized) return;
      initialized = false;
      root.removeEventListener('scroll', onScroll, true);
      root.removeEventListener('toggle', scheduleRefresh, true);
      root.removeEventListener('load', scheduleRefresh, true);
      win.removeEventListener('resize', scheduleRefresh);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      observed.clear();
      if (frameId !== null) win.cancelAnimationFrame(frameId);
      frameId = null;
      root = null;
    }

    return { init, refresh, destroy };
  }

  global.MarkTideCreateTableScrollController = createMarkTideTableScrollController;
  const boot = () => {
    global.MarkTideTableScroll = createMarkTideTableScrollController(global);
    global.MarkTideTableScroll.init();
  };
  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
