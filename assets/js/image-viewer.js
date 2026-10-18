// Shared PhotoSwipe adapter. Document images keep their original markup and sizes.
(function (global) {
  function createImageViewer(targetWindow, options) {
    const win = targetWindow || global;
    const doc = win.document;
    const settings = options || {};
    let root = null;
    let observer = null;
    let layoutObserver = null;
    let sizeObserver = null;
    let refreshFrame = null;
    let viewer = null;
    let opener = null;
    let background = [];
    const originals = new Map();

    function safeSource(value) {
      if (!value) return '';
      try {
        const url = new win.URL(value, doc.baseURI);
        if (/^https?:$/.test(url.protocol)) return url.href;
        if (url.protocol === 'blob:' && url.origin === win.location.origin) return url.href;
        if (url.protocol === 'file:' && win.location.protocol === 'file:') return url.href;
        if (/^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml);/i.test(value)) return value;
      } catch (error) { return ''; }
      return '';
    }

    function supported(image) {
      if (!root.contains(image) || image.closest('a, button, [role="presentation"], [aria-hidden="true"]')) return false;
      if (image.hasAttribute('alt') && !image.alt.trim()) return false;
      if (/img\.shields\.io|badge/i.test(image.getAttribute('src') || '')
        || image.matches('.badge, .icon, .emoji') || /^(?:icon|logo)$/i.test(image.alt.trim())) return false;
      for (let node = image; node && node !== root; node = node.parentElement) {
        const style = win.getComputedStyle(node);
        if (node.hidden || style.display === 'none' || style.visibility === 'hidden' || node.style.opacity === '0') return false;
      }
      const figure = image.closest('figure');
      const parent = image.parentElement;
      const standalone = image.classList.contains('marktide-content-image')
        || (figure && figure.querySelectorAll('img').length === 1)
        || (['P', 'DIV'].includes(parent.tagName) && Array.from(parent.childNodes).every(node =>
          node === image || node.nodeType === 8 || (node.nodeType === 3 && !node.textContent.trim())));
      return standalone && image.complete && image.naturalWidth > 32 && image.naturalHeight > 32
        && image.getClientRects().length > 0 && Boolean(safeSource(image.currentSrc || image.src));
    }

    function restore(image, attributes) {
      image.classList.remove('marktide-viewable-image');
      Object.entries(attributes).forEach(([name, value]) => {
        if (value === null) image.removeAttribute(name);
        else image.setAttribute(name, value);
      });
    }

    function refresh() {
      if (!root) return;
      if (opener && !root.contains(opener)) close();
      for (const [image, attributes] of originals) {
        if (!supported(image)) { restore(image, attributes); originals.delete(image); }
      }
      root.querySelectorAll('img').forEach(image => {
        if (!supported(image) || originals.has(image) || !win.PhotoSwipe) return;
        originals.set(image, Object.fromEntries(['role', 'tabindex', 'aria-label', 'aria-haspopup']
          .map(name => [name, image.getAttribute(name)])));
        image.classList.add('marktide-viewable-image');
        image.setAttribute('role', 'button');
        image.setAttribute('tabindex', '0');
        image.setAttribute('aria-haspopup', 'dialog');
        image.setAttribute('aria-label', `Open image: ${image.alt.trim() || 'Document image'}`);
      });
    }

    function scheduleRefresh() {
      if (refreshFrame !== null) return;
      refreshFrame = win.requestAnimationFrame(() => { refreshFrame = null; refresh(); });
    }

    function open(image) {
      refresh();
      if (viewer || !originals.has(image) || win.matchMedia('print').matches) return;
      const images = Array.from(root.querySelectorAll('img')).filter(supported);
      const dataSource = images.map(item => ({
        src: safeSource(item.currentSrc || item.src),
        msrc: safeSource(item.currentSrc || item.src),
        width: item.naturalWidth,
        height: item.naturalHeight,
        alt: item.alt,
        element: item,
        caption: item.closest('figure')?.querySelector('figcaption')?.textContent.trim() || '',
      }));
      const reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
      opener = image;
      image.focus({ preventScroll: true });
      const instance = new win.PhotoSwipe({
        dataSource, index: images.indexOf(image), loop: false,
        mainClass: 'marktide-image-viewer', bgOpacity: 1,
        showHideAnimationType: reduced ? 'none' : 'zoom',
        showAnimationDuration: reduced ? 0 : 333, hideAnimationDuration: reduced ? 0 : 333,
        zoomAnimationDuration: reduced ? 0 : 180,
        returnFocus: false, trapFocus: true, escKey: true, arrowKeys: true,
        closeTitle: 'Close image viewer', zoomTitle: 'Zoom image',
        arrowPrevTitle: 'Previous image', arrowNextTitle: 'Next image',
        errorMsg: 'This image could not be loaded.',
        paddingFn: viewport => ({ top: 64, bottom: Math.min(136, viewport.y * 0.25),
          left: viewport.x < 600 ? 12 : 64, right: viewport.x < 600 ? 12 : 64 }),
      });
      viewer = instance;
      // Every gallery image is already loaded. Keep its pixels during transitions.
      instance.addFilter('placeholderSrc', (source, content) => content.data.msrc || source);
      // Do not paint transparent pixels twice after the full image is ready.
      function retirePlaceholder({ content }) {
        const image = content.element;
        const placeholder = content.placeholder?.element;
        if (!placeholder || !(image instanceof win.HTMLImageElement)
          || !image.complete || !image.naturalWidth) return;
        const hide = () => win.requestAnimationFrame(() => {
          if (image.parentElement && content.placeholder?.element === placeholder) {
            placeholder.style.visibility = 'hidden';
          }
        });
        if (image.decode) image.decode().then(hide).catch(() => {});
        else hide();
      }
      instance.on('contentAppendImage', retirePlaceholder);
      instance.on('loadComplete', retirePlaceholder);
      let dismissalRequested = false;
      function dismiss() {
        if (dismissalRequested) return;
        dismissalRequested = true;
        if (instance.opener.isOpening) instance.on('openingAnimationEnd', () => {
          if (viewer === instance) instance.close();
        });
        else instance.close();
      }
      instance.on('uiRegister', () => {
        instance.ui.registerElement({
          name: 'document-caption', order: 9, isButton: false, appendTo: 'root',
          onInit(element) {
            element.setAttribute('aria-live', 'polite');
            element.setAttribute('aria-atomic', 'true');
            element.setAttribute('role', 'region');
            element.setAttribute('aria-label', 'Image caption');
            element.tabIndex = 0;
            instance.on('change', () => {
              const slide = instance.currSlide.data;
              element.textContent = slide.caption || slide.alt || '';
              element.hidden = !element.textContent;
            });
          },
        });
      });
      instance.on('afterInit', () => {
        instance.element.setAttribute('aria-label', 'Document image viewer');
        instance.element.setAttribute('aria-modal', 'true');
        background = Array.from(doc.body.children).filter(child => child !== instance.element)
          .map(child => [child, child.inert]);
        background.forEach(([child]) => { child.inert = true; });
        instance.element.focus({ preventScroll: true });
        // PhotoSwipe binds navigation after opening. Early dismissal still works.
        instance.element.addEventListener('click', event => {
          if (instance.opener.isOpening && event.target.closest('.pswp__button--close')) {
            event.stopImmediatePropagation();
            dismiss();
          }
        }, true);
        instance.element.addEventListener('keydown', event => {
          if (instance.opener.isOpening && event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            dismiss();
          }
        }, true);
      });
      instance.on('destroy', () => {
        background.forEach(([child, inert]) => { child.inert = inert; });
        background = [];
        viewer = null;
        const previous = opener;
        opener = null;
        if (previous?.isConnected) previous.focus({ preventScroll: true });
      });
      instance.init();
    }

    function onClick(event) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const image = event.target.closest('img');
      if (image && originals.has(image)) { event.preventDefault(); open(image); }
    }

    function onKey(event) {
      if (!['Enter', ' '].includes(event.key) || event.repeat || !originals.has(event.target)) return;
      event.preventDefault();
      open(event.target);
    }

    function close() {
      // Rerenders and print need cleanup, not a reader's closing transition.
      if (!viewer) return;
      const instance = viewer;
      instance.options.hideAnimationDuration = 0;
      if (instance.opener.isOpen) instance.destroy();
      else instance.on('openingAnimationEnd', () => instance.destroy());
    }

    function init() {
      if (root) return;
      root = doc.querySelector(settings.rootSelector || '#markdown-preview');
      if (!root) return;
      root.addEventListener('click', onClick);
      root.addEventListener('keydown', onKey);
      root.addEventListener('load', refresh, true);
      root.addEventListener('error', refresh, true);
      win.addEventListener('beforeprint', close);
      win.addEventListener('resize', scheduleRefresh);
      doc.addEventListener('transitionend', scheduleRefresh, true);
      observer = new win.MutationObserver(scheduleRefresh);
      observer.observe(root, { childList: true, subtree: true });
      layoutObserver = new win.MutationObserver(scheduleRefresh);
      for (let node = root; node; node = node.parentElement) {
        layoutObserver.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] });
      }
      sizeObserver = new win.ResizeObserver(scheduleRefresh);
      sizeObserver.observe(root);
      refresh();
    }

    function destroy() {
      close();
      if (!root) return;
      observer.disconnect();
      layoutObserver.disconnect();
      sizeObserver.disconnect();
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      root.removeEventListener('load', refresh, true);
      root.removeEventListener('error', refresh, true);
      win.removeEventListener('beforeprint', close);
      win.removeEventListener('resize', scheduleRefresh);
      doc.removeEventListener('transitionend', scheduleRefresh, true);
      if (refreshFrame !== null) win.cancelAnimationFrame(refreshFrame);
      refreshFrame = null;
      originals.forEach((attributes, image) => restore(image, attributes));
      originals.clear();
      root = null;
    }

    return { init, destroy, refresh, safeSource, get viewer() { return viewer; } };
  }

  global.MarkTideCreateImageViewer = createImageViewer;
  const boot = () => {
    global.MarkTideImageViewer = createImageViewer(global);
    global.MarkTideImageViewer.init();
  };
  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
