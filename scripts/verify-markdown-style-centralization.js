const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

function hasForbiddenMarkdownThemeCss() {
  const themePaths = ['assets/css/light-theme.css', 'assets/css/dark-theme.css'];
  const forbiddenPatterns = [
    /\.markdown-body\s+table/,
    /\.markdown-body\s+table\s+tr/,
    /\.markdown-body\s+table\s+th/,
    /\.markdown-body\s+table\s+td/,
    /\.markdown-body\s+pre:not/,
    /\.markdown-body\s+code:not/,
    /\.markdown-body\s+pre\s+code/,
    /\.markdown-body\s+strong/,
    /\.markdown-body\s+b\b/,
    /\.markdown-body\s+blockquote\s+strong/,
    /\.markdown-body\s+blockquote\s+b\b/,
    /\.markdown-body\s+ol/,
    /\.markdown-body\s+ul/,
    /\.markdown-body\s+li/,
    /\.markdown-body\s+h[1-6]/,
    /\.enhanced-code-block/,
    /\.code-block-header/,
    /\.code-language/,
    /\.copy-code-btn/,
  ];

  return themePaths.some((themePath) => {
    const css = read(themePath);
    return forbiddenPatterns.some((pattern) => pattern.test(css));
  });
}

const checks = [
  {
    name: 'shared markdown CSS exists',
    pass: () => exists('assets/css/markdown-content.css'),
  },
  {
    name: 'preview loads shared markdown CSS',
    pass: () => /assets\/css\/markdown-content\.css/.test(read('index.html')),
  },
  {
    name: 'shared style helper exists',
    pass: () => exists('assets/js/markdown-styles.js'),
  },
  {
    name: 'shared style helper is loaded before exports',
    pass: () => {
      const index = read('index.html');
      return index.indexOf('assets/js/markdown-styles.js') > -1
        && index.indexOf('assets/js/markdown-styles.js') < index.indexOf('assets/js/import-export.js');
    },
  },
  {
    name: 'shared code block renderer exists',
    pass: () => exists('assets/js/code-block-renderer.js'),
  },
  {
    name: 'shared MathJax config exists',
    pass: () => exists('assets/js/mathjax-config.js'),
  },
  {
    name: 'shared sanitizer config exists',
    pass: () => exists('assets/js/sanitizer-config.js'),
  },
  {
    name: 'shared code wrap controller is serializable',
    pass: () => /MarkTideCreateCodeWrapController/.test(read('assets/js/code-wrap-handler.js')),
  },
  {
    name: 'shared code block renderer is loaded before markdown consumers',
    pass: () => {
      const index = read('index.html');
      return index.indexOf('assets/js/code-block-renderer.js') > -1
        && index.indexOf('assets/js/code-block-renderer.js') < index.indexOf('assets/js/markdown-renderer.js')
        && index.indexOf('assets/js/code-block-renderer.js') < index.indexOf('assets/js/import-export.js')
        && index.indexOf('assets/js/code-block-renderer.js') < index.indexOf('assets/js/print-handler.js');
    },
  },
  {
    name: 'shared MathJax config is loaded before MathJax library',
    pass: () => {
      const index = read('index.html');
      return index.indexOf('assets/js/mathjax-config.js') > -1
        && index.indexOf('assets/js/mathjax-config.js') < index.indexOf('tex-mml-chtml.min.js');
    },
  },
  {
    name: 'shared sanitizer config is loaded before markdown consumers',
    pass: () => {
      const index = read('index.html');
      return index.indexOf('assets/js/sanitizer-config.js') > -1
        && index.indexOf('assets/js/sanitizer-config.js') < index.indexOf('assets/js/markdown-renderer.js')
        && index.indexOf('assets/js/sanitizer-config.js') < index.indexOf('assets/js/import-export.js')
        && index.indexOf('assets/js/sanitizer-config.js') < index.indexOf('assets/js/print-handler.js');
    },
  },
  {
    name: 'HTML export consumes shared markdown styles',
    pass: () => /MarkTideMarkdownStyles/.test(read('assets/js/import-export.js')),
  },
  {
    name: 'HTML export no longer owns private code block CSS copies',
    pass: () => {
      const exportCode = read('assets/js/import-export.js');
      return !/Enhanced code block styles - (Dark|Light) Mode/.test(exportCode)
        && !/Preview code header: Grok-style/.test(exportCode)
        && !/hljs: pre>code uses overflow-x:auto/.test(exportCode);
    },
  },
  {
    name: 'HTML export no longer owns private Mermaid document CSS',
    pass: () => {
      const exportCode = read('assets/js/import-export.js');
      return !/const\s+mermaidStyles\s*=/.test(exportCode)
        && !/Mermaid diagram styles/.test(exportCode)
        && !/\.mermaid-container\s*\{[\s\S]*?overflow-x:\s*auto/.test(exportCode)
        && !/\.mermaid\s+svg\s*\{[\s\S]*?max-width:\s*none/.test(exportCode);
    },
  },
  {
    name: 'HTML export has no dead centralized-style placeholders',
    pass: () => {
      const exportCode = read('assets/js/import-export.js');
      return !/getDecimalOutlineListStyles/.test(exportCode)
        && !/enhancedCodeBlockStyles/.test(exportCode)
        && !/codeBlockPreScrollbarStyles/.test(exportCode);
    },
  },
  {
    name: 'PDF export consumes shared markdown styles',
    pass: () => /MarkTideMarkdownStyles/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'HTML and PDF exports consume shared MathJax config',
    pass: () => /MarkTideMathJax/.test(read('assets/js/import-export.js'))
      && /MarkTideMathJax/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'MathJax config is not privately duplicated',
    pass: () => {
      const sources = [
        read('index.html'),
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');

      return !/inlineMath:\s*\[\[/.test(sources)
        && !/displayMath:\s*\[\[/.test(sources)
        && !/processEnvironments:\s*true/.test(sources)
        && !/skipHtmlTags:\s*\[/.test(sources);
    },
  },
  {
    name: 'preview/export/print consume shared sanitizer config',
    pass: () => /MarkTideSanitizer/.test(read('assets/js/markdown-renderer.js'))
      && /MarkTideSanitizer/.test(read('assets/js/import-export.js'))
      && /MarkTideSanitizer/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'DOMPurify profiles are not privately duplicated',
    pass: () => {
      const sources = [
        read('assets/js/markdown-renderer.js'),
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');

      return !/DOMPurify\.sanitize\([^,]+,\s*\{\s*ADD_TAGS:/.test(sources)
        && !/ADD_ATTR:\s*\[/.test(sources);
    },
  },
  {
    name: 'dead Mermaid print helpers are removed',
    pass: () => {
      const source = read('assets/js/mermaid-handler.js');
      return !/getPrintThemeVariables\s*\(/.test(source)
        && !/initForPrint\s*\(/.test(source);
    },
  },
  {
    name: 'preview/export/print consume shared code block renderer',
    pass: () => /MarkTideCodeBlockRenderer/.test(read('assets/js/markdown-renderer.js'))
      && /MarkTideCodeBlockRenderer/.test(read('assets/js/import-export.js'))
      && /MarkTideCodeBlockRenderer/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'markdown consumers do not own private code block renderers',
    pass: () => {
      const consumers = [
        read('assets/js/markdown-renderer.js'),
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');

      return !/marktide(?:Export)?WrapButtonHtml/.test(consumers)
        && !/marktide(?:Export)?EncodeMermaidSource/.test(consumers)
        && !/\.code\s*=\s*function\s*\(\s*code\s*,\s*language\s*\)/.test(consumers)
        && !/code-block-['"]\s*\+\s*Math\.random/.test(consumers)
        && !/mermaid-diagram-['"]\s*\+\s*Math\.random/.test(consumers);
    },
  },
  {
    name: 'HTML export serializes shared code block runtime',
    pass: () => {
      const exportCode = read('assets/js/import-export.js');
      return /CodeCopyHandler\.toString\(\)/.test(exportCode)
        && /MarkTideCreateCodeWrapController\.toString\(\)/.test(exportCode)
        && !/class CodeCopyHandler\s*\{[\s\S]*?handleCopyClick/.test(exportCode)
        && !/ROOT_SELECTOR\s*=\s*["']\.markdown-body["']/.test(exportCode);
    },
  },
  {
    name: 'preview sanitizer preserves shared code copy ids',
    pass: () => /["']data-code-id["']/.test(read('assets/js/sanitizer-config.js')),
  },
  {
    name: 'base CSS no longer owns markdown content block',
    pass: () => !/MARKDOWN PREVIEW CONTENT/.test(read('assets/css/base.css')),
  },
  {
    name: 'shared badge spacing survives soft-break differences',
    pass: () => {
      const css = read('assets/css/markdown-content.css');
      return /p:has\(img\[src\*="img\.shields\.io"\]\) br/.test(css)
        && /img\[src\*="img\.shields\.io"\][\s\S]*margin-bottom:\s*12px/.test(css)
        && /img\[src\*="img\.shields\.io"\]:last-of-type[\s\S]*margin-bottom:\s*0/.test(css);
    },
  },
  {
    name: 'PDF export does not override shared badge spacing',
    pass: () => !/img\[src\*="img\.shields\.io"\]/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'theme CSS does not own markdown document rules',
    pass: () => !hasForbiddenMarkdownThemeCss(),
  },
  {
    name: 'shared CSS owns markdown table/code/text rules',
    pass: () => {
      const css = read('assets/css/markdown-content.css');
      return /\.markdown-body\s+table\s*\{/.test(css)
        && /\.enhanced-code-block\s*\{/.test(css)
        && /\.markdown-body\s+strong/.test(css)
        && /\.markdown-body\s+ol\s*>\s*li::before/.test(css)
        && /\.markdown-body\s+ul\s+li::marker/.test(css)
        && /--copy-code-btn-hover-bg/.test(css);
    },
  },
];

let failed = false;

checks.forEach((check) => {
  if (check.pass()) {
    console.log(`PASS ${check.name}`);
    return;
  }

  failed = true;
  console.error(`FAIL ${check.name}`);
});

if (failed) {
  process.exit(1);
}
