// Shared reading control for Preview and standalone HTML.
(function (global) {
  function createMarkTideBackToTopController(targetWindow, options) {
    const win = targetWindow || global;
    const doc = win.document;
    const settings = options || {};
    const rootSelector = settings.rootSelector || '#markdown-preview';
    const paneSelector = settings.paneSelector || '.preview-pane';
    let root = null;
    let pane = null;
    let button = null;
    let frameId = null;
    let resizeObserver = null;
    let contentObserver = null;
    let viewObserver = null;
    let positionDirty = true;
    let anchoredInnerScroll = null;
    let paneSize = '';

    function readingState() {
      const paneStyle = pane && win.getComputedStyle(pane);
      const innerScroll = paneStyle && /auto|scroll/.test(paneStyle.overflowY);
      const scroller = innerScroll ? pane : doc.scrollingElement;
      const height = innerScroll ? pane.clientHeight : win.innerHeight;
      const threshold = Math.max(320, height * 0.75);
      return { scroller, height, threshold, innerScroll };
    }

    function refresh() {
      if (!button) return;
      const state = readingState();
      const region = state.innerScroll ? pane : root;
      const bounds = region.getBoundingClientRect();
      const visible = root.getClientRects().length > 0 && bounds.width >= 72
        && bounds.bottom > 72 && bounds.top < win.innerHeight - 72;
      const longDocument = root.scrollHeight > state.height + state.threshold;
      const blocked = doc.body.classList.contains('menu-open')
        || doc.querySelector('.mermaid-modal-overlay.open, .whats-new-overlay.open, dialog[open]');
      button.hidden = !visible || !longDocument || blocked || state.scroller.scrollTop < state.threshold;
      if (button.hidden) return;
      // Only layout changes set the corner. Scrolling never sets its position.
      if (positionDirty || anchoredInnerScroll !== state.innerScroll) {
        const right = Math.max(16, win.innerWidth - Math.min(bounds.right, win.innerWidth) + 16);
        const bottom = state.innerScroll
          ? Math.max(16, win.innerHeight - Math.min(bounds.bottom, win.innerHeight) + 16) : 16;
        button.style.setProperty('--marktide-top-right', `${right}px`);
        button.style.setProperty('--marktide-top-bottom', `${bottom}px`);
        positionDirty = false;
        anchoredInnerScroll = state.innerScroll;
      }
    }

    function scheduleRefresh() {
      if (frameId !== null) return;
      frameId = win.requestAnimationFrame(() => {
        frameId = null;
        refresh();
      });
    }

    function scheduleLayoutRefresh() {
      positionDirty = true;
      scheduleRefresh();
    }

    function onScroll(event) {
      if (event.target === doc || event.target === pane) scheduleRefresh();
    }

    function revealFocusedControl(event) {
      if (!button || button.hidden) return;
      const control = event.target.closest('button, a[href], input, select, textarea, summary');
      if (!control || !control.matches(':focus-visible')) return;
      const box = control.getBoundingClientRect();
      const corner = button.getBoundingClientRect();
      if (box.right <= corner.left || box.left >= corner.right
        || box.bottom <= corner.top || box.top >= corner.bottom) return;
      // Bring keyboard focus clear of the overlay without moving the button.
      const state = readingState();
      const top = state.innerScroll ? pane.getBoundingClientRect().top : 0;
      const distance = box.top - top - (state.height - box.height) / 2;
      if (state.innerScroll) pane.scrollBy({ top: distance, behavior: 'instant' });
      else win.scrollBy({ top: distance, behavior: 'instant' });
    }

    function goToTop(event) {
      const state = readingState();
      const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const behavior = reducedMotion || event.detail === 0 ? 'instant' : 'smooth';
      // Keep keyboard focus at the reading start when the button disappears.
      const start = root.querySelector('h1, h2, h3') || root;
      if (!start.hasAttribute('tabindex')) {
        start.setAttribute('tabindex', '-1');
        start.addEventListener('blur', () => start.removeAttribute('tabindex'), { once: true });
      }
      start.focus({ preventScroll: true });
      if (state.innerScroll) pane.scrollTo({ top: 0, behavior });
      else win.scrollTo({ top: 0, behavior });
      scheduleRefresh();
    }

    function init() {
      if (button) return;
      root = doc.querySelector(rootSelector);
      if (!root) return;
      pane = settings.pageScroll ? null : doc.querySelector(paneSelector);
      button = doc.createElement('button');
      button.type = 'button';
      button.className = 'marktide-back-to-top';
      button.hidden = true;
      button.title = 'Back to top';
      button.setAttribute('aria-label', 'Back to top');
      if (root.id) button.setAttribute('aria-controls', root.id);
      button.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12 6-6 6 6M12 6v12"/></svg>';
      doc.body.appendChild(button);
      button.addEventListener('click', goToTop);
      doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
      win.addEventListener('resize', scheduleLayoutRefresh);
      root.addEventListener('load', scheduleRefresh, true);
      root.addEventListener('toggle', scheduleRefresh, true);
      root.addEventListener('focusin', revealFocusedControl);
      if (win.ResizeObserver) {
        resizeObserver = new win.ResizeObserver(() => {
          if (pane) {
            const state = readingState();
            // Page content height is not a reading viewport resize.
            const size = `${pane.clientWidth}|${state.innerScroll ? pane.clientHeight : 0}`;
            if (size !== paneSize) {
              paneSize = size;
              positionDirty = true;
            }
          }
          scheduleRefresh();
        });
        resizeObserver.observe(root);
        if (pane) resizeObserver.observe(pane);
      }
      if (win.MutationObserver) {
        contentObserver = new win.MutationObserver(scheduleRefresh);
        contentObserver.observe(root, { childList: true, subtree: true });
        viewObserver = new win.MutationObserver(scheduleRefresh);
        viewObserver.observe(doc.body, { childList: true, subtree: true,
          attributes: true, attributeFilter: ['class'] });
        if (pane) viewObserver.observe(pane, { attributes: true, attributeFilter: ['style', 'class'] });
      }
      doc.fonts?.ready.then(() => { if (button) scheduleRefresh(); });
      scheduleRefresh();
    }

    function destroy() {
      if (!button) return;
      doc.removeEventListener('scroll', onScroll, true);
      win.removeEventListener('resize', scheduleLayoutRefresh);
      root.removeEventListener('load', scheduleRefresh, true);
      root.removeEventListener('toggle', scheduleRefresh, true);
      root.removeEventListener('focusin', revealFocusedControl);
      resizeObserver?.disconnect();
      contentObserver?.disconnect();
      viewObserver?.disconnect();
      if (frameId !== null) win.cancelAnimationFrame(frameId);
      frameId = null;
      positionDirty = true;
      anchoredInnerScroll = null;
      paneSize = '';
      button.remove();
      button = null;
      root = null;
      pane = null;
    }

    return { init, refresh, destroy };
  }

  global.MarkTideCreateBackToTopController = createMarkTideBackToTopController;
  const boot = () => {
    global.MarkTideBackToTop = createMarkTideBackToTopController(global);
    global.MarkTideBackToTop.init();
  };
  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
