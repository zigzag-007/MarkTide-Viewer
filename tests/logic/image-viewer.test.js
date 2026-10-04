const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('PhotoSwipe files remain exact pinned third party resources', () => {
  for (const [file, hash] of [
    ['assets/vendor/photoswipe/photoswipe.umd.min.js', 'ba86fd2dadb31acd8e488540fedb5037c598bf86c63a2a804d5025271af6a323'],
    ['assets/vendor/photoswipe/photoswipe.css', 'b0eaaae0b9de064d25e2f18517b9011a526d9b2142376e1c0febd096cebab9f3'],
    ['assets/vendor/licenses/photoswipe-5.4.4.LICENSE', '2c223af0b21d32240087ee189eb70fd315907b6ade8b561e24265baccd6a98e7'],
  ]) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), hash);
});

test('image viewer allows only safe image sources', () => {
  const window = { URL, location: { origin: 'https://example.com', protocol: 'https:' },
    document: { baseURI: 'https://example.com/report/', readyState: 'loading', addEventListener() {} } };
  vm.runInNewContext(read('assets/js/image-viewer.js'), { window });
  const viewer = window.MarkTideCreateImageViewer(window);
  assert.equal(viewer.safeSource('Evidence/one.png'), 'https://example.com/report/Evidence/one.png');
  assert.equal(viewer.safeSource('https://images.example.org/one.jpg'), 'https://images.example.org/one.jpg');
  assert.equal(viewer.safeSource('data:image/png;base64,YQ=='), 'data:image/png;base64,YQ==');
  for (const url of ['', 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'vbscript:bad',
    'data:text/html,evil', 'file:///secret.png', 'blob:https://other.example/id']) {
    assert.equal(viewer.safeSource(url), '', url);
  }
});

test('image viewer ownership is shared and does not enter PDF', () => {
  const styles = read('assets/js/markdown-styles.js');
  const exporter = read('assets/js/image-viewer-assets.js');
  assert.match(styles, /mode === 'html'[\s\S]*getStylesheet\('assets\/vendor\/photoswipe\/photoswipe.css'\)/);
  assert.match(exporter, /MarkTideCreateImageViewer.toString\(\)/);
  assert.match(exporter, /photoswipe-5.4.4.LICENSE/);
  assert.doesNotMatch(read('assets/js/print-handler.js') + read('assets/js/print-styles.js'), /PhotoSwipe|image-viewer/);
  assert.match(read('assets/css/image-viewer.css'), /@media print[\s\S]*display: none !important/);
});
