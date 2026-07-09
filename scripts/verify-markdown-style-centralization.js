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
