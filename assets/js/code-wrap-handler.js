// Shared wrap / unwrap controller for long fenced code blocks.
(function (global) {
  function createMarkTideCodeWrapController(targetWindow, options) {
    const win = targetWindow || global;
    const doc = win.document;
    const settings = options || {};
    const rootSelector = settings.rootSelector || '#markdown-preview';
    const debounceMs = settings.debounceMs || 64;
    let debounceId = null;
    let resizeObserver = null;
    let initialized = false;

    function frame(callback) {
      const raf = win.requestAnimationFrame || function (fn) { return win.setTimeout(fn, 0); };
      return raf.call(win, callback);
    }

    function getRoot(root) {
      if (root && root.nodeType) return root;
      return doc.querySelector(rootSelector);
    }

    function preHasHorizontalOverflow(pre) {
      return Math.ceil(pre.scrollWidth) > Math.floor(pre.clientWidth) + 1;
    }

    function updateBlock(block) {
      const pre = block.querySelector(':scope > pre');
      const btn = block.querySelector('.wrap-code-btn');
      if (!pre || !btn) return;

      const wrapped = block.classList.contains('is-wrapped');
      const show = wrapped || preHasHorizontalOverflow(pre);

      if (show) {
        btn.classList.add('wrap-code-btn--show');
        btn.setAttribute('aria-hidden', 'false');
        btn.removeAttribute('tabindex');
      } else {
        btn.classList.remove('wrap-code-btn--show');
        btn.setAttribute('aria-hidden', 'true');
        btn.setAttribute('tabindex', '-1');
      }

      const tip = wrapped ? 'Unwrap lines' : 'Wrap long lines';
      btn.setAttribute('aria-pressed', wrapped ? 'true' : 'false');
      btn.setAttribute('title', tip);
      btn.setAttribute('aria-label', tip);
      btn.setAttribute('data-marktide-tip', tip);
    }

    function refresh(root) {
      const el = getRoot(root);
      if (!el) return;
      el.querySelectorAll('.enhanced-code-block').forEach(updateBlock);
    }

    function scheduleRefresh(root) {
      if (debounceId) win.clearTimeout(debounceId);
      debounceId = win.setTimeout(function () {
        debounceId = null;
        frame(function () {
          refresh(root);
        });
      }, debounceMs);
    }

    function onWrapClick(event) {
      const btn = event.target.closest('.wrap-code-btn');
      if (!btn) return;

      const root = getRoot();
      if (!root || !root.contains(btn)) return;

      event.preventDefault();
      event.stopPropagation();

      const block = btn.closest('.enhanced-code-block');
      if (!block) return;

      block.classList.toggle('is-wrapped');
      frame(function () {
        frame(function () {
          refresh(root);
        });
      });
    }

    function init() {
      if (initialized) return;
      initialized = true;

      doc.addEventListener('click', onWrapClick);

      const root = getRoot();
      if (root && typeof win.ResizeObserver !== 'undefined') {
        resizeObserver = new win.ResizeObserver(function () {
          scheduleRefresh(root);
        });
        resizeObserver.observe(root);
      }

      win.addEventListener('resize', function () {
        scheduleRefresh(getRoot());
      });

      if (root) {
        frame(function () {
          frame(function () {
            refresh(root);
          });
        });
      }
    }

    function destroy() {
      if (!initialized) return;
      initialized = false;
      doc.removeEventListener('click', onWrapClick);
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (debounceId) {
        win.clearTimeout(debounceId);
        debounceId = null;
      }
    }

    return {
      destroy,
      init,
      refresh,
      scheduleRefresh,
    };
  }

  global.MarkTideCreateCodeWrapController = createMarkTideCodeWrapController;
  global.MarkTideCodeWrap = createMarkTideCodeWrapController(global, {
    rootSelector: '#markdown-preview',
  });

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', function () {
      global.MarkTideCodeWrap.init();
    });
  } else {
    global.MarkTideCodeWrap.init();
  }
})(window);
