const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..', '..');
const file = (relativePath) => path.join(root, relativePath);

const exactFiles = new Map([
  ['https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css', file('assets/vendor/github-markdown/github-markdown.min.css')],
  ['https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css', file('assets/vendor/bootstrap-icons/bootstrap-icons.min.css')],
  ['https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2', file('assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2')],
  ['https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff', file('assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff')],
  ['https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css', file('assets/vendor/highlight/styles/github.min.css')],
  ['https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai-sublime.min.css', file('assets/vendor/highlight/styles/monokai-sublime.min.css')],
  ['https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js', file('assets/vendor/mermaid/mermaid.min.js')],
  ['https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js', file('assets/vendor/mathjax/tex-mml-chtml.min.js')],
  ['https://raw.githubusercontent.com/zigzag-007/MarkTide-Viewer/main/assets/img/icon.jpg', file('assets/img/icon.jpg')],
]);

function normalizedUrl(value) {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

async function installStandaloneCdnMirror(context) {
  const unexpectedRequests = [];

  await context.route('https://**/*', async (route) => {
    const requestUrl = route.request().url();
    const normalized = normalizedUrl(requestUrl);

    if (requestUrl.startsWith('https://fonts.googleapis.com/css2?')) {
      const family = new URL(requestUrl).searchParams.get('family') || '';
      const stylesheet = family.startsWith('Inter:') ? 'inter.css'
        : family.startsWith('JetBrains Mono:') ? 'jetbrains-mono.css'
          : family.startsWith('Fira Code:') ? 'fira-code.css' : null;
      if (!stylesheet) throw new Error(`Unexpected export font family: ${family}`);
      const body = fs.readFileSync(file(`assets/vendor/fonts/${stylesheet}`), 'utf8')
        .replace(/url\(([^)]+)\)/g, (match, url) =>
          `url(https://fonts.gstatic.com/marktide-test/${path.basename(url.replace(/["']/g, ''))})`);
      await route.fulfill({ body, contentType: 'text/css; charset=utf-8' });
      return;
    }

    if (normalized.startsWith('https://fonts.gstatic.com/marktide-test/')) {
      await route.fulfill({ path: file(`assets/vendor/fonts/files/${path.basename(normalized)}`) });
      return;
    }

    if (normalized.startsWith('https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/output/chtml/fonts/woff-v2/')) {
      await route.fulfill({
        path: file(`assets/vendor/mathjax/output/chtml/fonts/woff-v2/${path.basename(normalized)}`),
      });
      return;
    }

    const localFile = exactFiles.get(normalized);
    if (localFile) {
      await route.fulfill({ path: localFile });
      return;
    }

    unexpectedRequests.push(requestUrl);
    await route.abort('blockedbyclient');
  });

  return unexpectedRequests;
}

module.exports = {
  installStandaloneCdnMirror,
};
