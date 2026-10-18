const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const vendorRoot = path.join(root, 'assets', 'vendor');
const resolveRoot = (relativePath) => path.join(root, relativePath);

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

test('pinned local vendor files are present and nonempty', () => {
  const requiredFiles = [
    'assets/vendor/bootstrap/bootstrap.min.css',
    'assets/vendor/bootstrap/bootstrap.bundle.min.js',
    'assets/vendor/bootstrap-icons/bootstrap-icons.min.css',
    'assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2',
    'assets/vendor/dompurify/purify.min.js',
    'assets/vendor/highlight/highlight.min.js',
    'assets/vendor/marked/marked.min.js',
    'assets/vendor/mathjax/tex-mml-chtml.min.js',
    'assets/vendor/mermaid/mermaid.min.js',
    'assets/vendor/monaco/vs/loader.min.js',
    'assets/vendor/monaco/vs/editor/editor.main.js',
    'assets/vendor/monaco/vs/base/worker/workerMain.js',
    'assets/vendor/prettier/standalone.mjs',
    'assets/vendor/prettier/plugins/markdown.mjs',
    'assets/vendor/photoswipe/photoswipe.umd.min.js',
    'assets/vendor/photoswipe/photoswipe.css',
  ];

  requiredFiles.forEach((relativePath) => {
    const absolutePath = resolveRoot(relativePath);
    assert.ok(fs.existsSync(absolutePath), `missing vendor file: ${relativePath}`);
    assert.ok(fs.statSync(absolutePath).size > 0, `empty vendor file: ${relativePath}`);
  });
});

test('redistributed vendor packages include their license notices', () => {
  const licenseRoot = resolveRoot('assets/vendor/licenses');
  const expectedLicenses = [
    'alpinejs-3.14.1.LICENSE',
    'bootstrap-5.3.2.LICENSE',
    'bootstrap-icons-1.11.3.LICENSE',
    'dompurify-3.0.9.LICENSE',
    'emoji-toolkit-9.0.1.LICENSE',
    'fira-code-font.LICENSE',
    'github-markdown-css-5.3.0.LICENSE',
    'hamburgers-1.2.1.LICENSE',
    'highlight.js-11.9.0.LICENSE',
    'inter-font.LICENSE',
    'jetbrains-mono-font.LICENSE',
    'marked-9.1.6.LICENSE',
    'mathjax-3.2.2.LICENSE',
    'mermaid-11.15.0.LICENSE',
    'monaco-editor-0.52.2.LICENSE',
    'prettier-3.2.5.LICENSE',
    'photoswipe-5.4.4.LICENSE',
  ];

  assert.deepEqual(fs.readdirSync(licenseRoot).sort(), expectedLicenses.sort());
  expectedLicenses.forEach((name) => {
    assert.ok(fs.statSync(path.join(licenseRoot, name)).size > 0, `empty vendor license: ${name}`);
  });
});

test('local vendor stylesheets resolve every relative file URL', () => {
  const stylesheets = listFiles(vendorRoot).filter((filePath) => filePath.endsWith('.css'));

  stylesheets.forEach((stylesheet) => {
    const css = fs.readFileSync(stylesheet, 'utf8');
    const urls = [...css.matchAll(/url\((['"]?)(.*?)\1\)/g)].map((match) => match[2].trim());
    urls
      .filter((url) => url && !/^(?:data:|https?:|#)/i.test(url))
      .forEach((url) => {
        const cleanUrl = url.split(/[?#]/)[0];
        const target = path.resolve(path.dirname(stylesheet), cleanUrl);
        assert.ok(fs.existsSync(target), `missing CSS asset for ${path.relative(root, stylesheet)}: ${url}`);
      });
  });
});

test('MathJax and Monaco dependent runtime files are complete', () => {
  const mathJaxSource = fs.readFileSync(resolveRoot('assets/vendor/mathjax/tex-mml-chtml.min.js'), 'utf8');
  const mathJaxFonts = [...new Set(mathJaxSource.match(/MathJax_[A-Za-z0-9-]+\.woff/g) || [])];
  const mathJaxFontRoot = resolveRoot('assets/vendor/mathjax/output/chtml/fonts/woff-v2');
  assert.ok(mathJaxFonts.length >= 20, 'MathJax font references were not detected');
  mathJaxFonts.forEach((fontName) => {
    assert.ok(fs.existsSync(path.join(mathJaxFontRoot, fontName)), `missing MathJax font: ${fontName}`);
  });

  const languageRoot = resolveRoot('assets/vendor/monaco/vs/basic-languages');
  const languageModules = listFiles(languageRoot)
    .filter((filePath) => filePath.endsWith('.js') && !filePath.endsWith('.min.js'));
  assert.ok(languageModules.length >= 81, `only ${languageModules.length} Monaco language modules were found`);
});

test('main application runtime tags do not depend on remote libraries', () => {
  const index = fs.readFileSync(resolveRoot('index.html'), 'utf8');
  assert.doesNotMatch(index, /<script[^>]+src=["']https?:\/\//i);
  assert.doesNotMatch(index, /<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:\/\//i);
});
