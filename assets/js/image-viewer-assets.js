// Package exact local PhotoSwipe code and readable images into standalone HTML.
(function (win) {
  let bundle = null;
  const vendor = 'assets/vendor/photoswipe/';

  async function request(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Unable to load ${url}`);
      return await response.blob();
    } finally { clearTimeout(timeout); }
  }

  function dataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function getBundle() {
    if (!bundle) bundle = Promise.all([
      request(vendor + 'photoswipe.umd.min.js').then(blob => blob.text()),
      request('assets/vendor/licenses/photoswipe-5.4.4.LICENSE').then(blob => blob.text()),
    ]).catch(error => { bundle = null; throw error; });
    const [source, license] = await bundle;
    const adapter = `window.MarkTideCreateImageViewer = ${win.MarkTideCreateImageViewer.toString()};
      window.MarkTideImageViewer = window.MarkTideCreateImageViewer(window, {rootSelector: '.markdown-body'});
      window.MarkTideImageViewer.init();`;
    return `<script>/* ${license} */\n${source}\n${adapter}`.replace(/<\/script/gi, '<\\/script') + '<\/script>';
  }

  async function prepareExport(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const cache = new Map();
    const failed = new Set();
    async function embed(source) {
      const url = win.MarkTideImageViewer.safeSource(source);
      if (!url || url.startsWith('data:')) return source;
      if (!cache.has(url)) cache.set(url, request(url).then(async blob => {
        if (!/^image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)$/i.test(blob.type)) throw new Error('Not an image');
        return dataUrl(blob);
      }).catch(() => { failed.add(url); return url; }));
      return cache.get(url);
    }
    await Promise.all(Array.from(wrapper.querySelectorAll('img'), async image => {
      const source = image.getAttribute('src');
      if (source) {
        const embedded = await embed(source);
        // Badge CSS identifies its authored src. Keep it while loading offline bytes.
        if (source.includes('img.shields.io') && embedded.startsWith('data:')) {
          image.setAttribute('srcset', embedded + ' 1x');
        } else image.setAttribute('src', embedded);
      }
      // Keep responsive candidates where they are ordinary URL/descriptor pairs.
      const srcset = image.getAttribute('srcset');
      if (srcset && !srcset.includes('data:')) {
        const candidates = await Promise.all(srcset.split(',').map(async candidate => {
          const [url, descriptor] = candidate.trim().split(/\s+/);
          return `${await embed(url)}${descriptor ? ' ' + descriptor : ''}`;
        }));
        image.setAttribute('srcset', candidates.join(', '));
      }
    }));
    if (failed.size) console.warn('Some exported images could not be embedded for offline viewing:', [...failed]);
    return { html: wrapper.innerHTML, script: await getBundle() };
  }

  win.MarkTideImageViewerAssets = { prepareExport };
})(window);
