const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
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
    name: 'shared print style helper exists',
    pass: () => exists('assets/js/print-styles.js'),
  },
  {
    name: 'shared export asset helper exists',
    pass: () => exists('assets/js/export-assets.js'),
  },
  {
    name: 'shared highlight theme helper exists',
    pass: () => exists('assets/js/highlight-theme.js')
      && /MarktideHighlightTheme/.test(read('assets/js/highlight-theme.js')),
  },
  {
    name: 'shared export asset helper is loaded before exports',
    pass: () => {
      const index = read('index.html');
      return index.indexOf('assets/js/export-assets.js') > -1
        && index.indexOf('assets/js/export-assets.js') < index.indexOf('assets/js/import-export.js')
        && index.indexOf('assets/js/export-assets.js') < index.indexOf('assets/js/print-handler.js');
    },
  },
  {
    name: 'shared highlight theme helper is loaded before theme and exports',
    pass: () => {
      const index = read('index.html');
      return index.indexOf('assets/js/highlight-theme.js') > -1
        && index.indexOf('assets/js/highlight-theme.js') < index.indexOf('assets/js/theme-manager.js')
        && index.indexOf('assets/js/highlight-theme.js') < index.indexOf('assets/js/import-export.js')
        && index.indexOf('assets/js/highlight-theme.js') < index.indexOf('assets/js/print-handler.js');
    },
  },
  {
    name: 'unused legacy export libraries are not loaded',
    pass: () => {
      const index = read('index.html');
      return !/FileSaver(?:\.min)?\.js/i.test(index)
        && !/html2pdf(?:\.bundle)?\.min\.js/i.test(index)
        && !/jspdf(?:\.umd)?\.min\.js/i.test(index)
        && !/html2canvas(?:\.min)?\.js/i.test(index)
        && !/pdfmake(?:\.min)?\.js/i.test(index)
        && !/vfs_fonts\.js/i.test(index);
    },
  },
  {
    name: 'HTML and PDF exports consume shared export assets',
    pass: () => /MarkTideExportAssets/.test(read('assets/js/import-export.js'))
      && /MarkTideExportAssets/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'export asset URLs are not privately duplicated',
    pass: () => {
      const consumers = [
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');

      return !/fonts\.googleapis\.com/.test(consumers)
        && !/github-markdown-css\/5\.3\.0/.test(consumers)
        && !/mermaid@11\.15\.0/.test(consumers)
        && !/mathjax\/3\.2\.2/.test(consumers)
        && !/highlight\.js\/11\.9\.0/.test(consumers);
    },
  },
  {
    name: 'theme manager and exports consume shared highlight theme helper',
    pass: () => /MarktideHighlightTheme/.test(read('assets/js/theme-manager.js'))
      && /MarktideHighlightTheme/.test(read('assets/js/import-export.js'))
      && /MarktideHighlightTheme/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'highlight theme URLs are not privately duplicated outside the shared helper',
    pass: () => {
      const consumers = [
        read('index.html'),
        read('assets/js/theme-manager.js'),
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');

      return !/highlight\.js\/11\.9\.0\/styles\/github\.min\.css/.test(consumers)
        && !/highlight\.js\/11\.9\.0\/styles\/monokai-sublime\.min\.css/.test(consumers);
    },
  },
  {
    name: 'utils no longer owns highlight theme configuration',
    pass: () => !/MarktideHighlightTheme/.test(read('assets/js/utils.js')),
  },
  {
    name: 'shared Mermaid toolbar CSS exists',
    pass: () => exists('assets/css/mermaid-toolbar.css'),
  },
  {
    name: 'preview loads shared Mermaid toolbar CSS',
    pass: () => /assets\/css\/mermaid-toolbar\.css/.test(read('index.html')),
  },
  {
    name: 'HTML export consumes shared Mermaid toolbar CSS',
    pass: () => {
      const helper = read('assets/js/markdown-styles.js');
      return /mermaid-toolbar\.css/.test(helper)
        && /mode\s*===\s*['"]html['"]/.test(helper);
    },
  },
  {
    name: 'Mermaid toolbar JavaScript owns behavior only',
    pass: () => {
      const source = read('assets/js/mermaid-toolbar.js');
      return !/ensureStyles\s*\(/.test(source)
        && !/getStyles\s*\(/.test(source)
        && !/marktide-mermaid-toolbar-styles/.test(source)
        && !/document\.createElement\(['"]style['"]\)/.test(source);
    },
  },
  {
    name: 'shared Mermaid toolbar CSS preserves accepted layout and themes',
    pass: () => {
      if (!exists('assets/css/mermaid-toolbar.css')) return false;

      const css = read('assets/css/mermaid-toolbar.css');
      return /\.mermaid-toolbar\s*\{[\s\S]*?top:\s*4px[\s\S]*?right:\s*8px/.test(css)
        && /\.mermaid-toolbar-btn,[\s\S]*?width:\s*30px[\s\S]*?height:\s*30px/.test(css)
        && /\[data-theme=["']dark["']\]\s+\.mermaid-toolbar/.test(css)
        && /\[data-theme=["']light["']\]\s+\.mermaid-toolbar/.test(css)
        && /\.mermaid-modal-toolbar\s*\{[\s\S]*?bottom:\s*24px/.test(css)
        && /@media\s+print[\s\S]*?\.mermaid-toolbar,[\s\S]*?\.mermaid-modal-overlay/.test(css);
    },
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
    name: 'shared print style helper is loaded before PDF export',
    pass: () => {
      const index = read('index.html');
      return index.indexOf('assets/js/print-styles.js') > -1
        && index.indexOf('assets/js/print-styles.js') < index.indexOf('assets/js/print-handler.js');
    },
  },
  {
    name: 'HTML export consumes shared markdown styles',
    pass: () => /MarkTideMarkdownStyles/.test(read('assets/js/import-export.js')),
  },
  {
    name: 'HTML export requires shared markdown styles without private fallback CSS',
    pass: () => {
      const source = read('assets/js/import-export.js');
      return /marktideRequireMarkdownStyles\s*\(\)/.test(source)
        && /marktideRequireMarkdownStyles\(\)\.getStandaloneStyles/.test(source)
        && !/const\s+themeStyles\s*=\s*window\.MarkTideMarkdownStyles\s*\?/.test(source)
        && !/body\s*\{[\s\S]*?max-width:\s*920px[\s\S]*?padding:\s*45px/.test(source);
    },
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
    name: 'PDF export consumes shared print styles',
    pass: () => /MarkTidePrintStyles/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'PDF export requires shared markdown and print style helpers',
    pass: () => {
      const source = read('assets/js/print-handler.js');
      return /getMarkdownStyles\s*\(\)/.test(source)
        && /getPrintStyles\s*\(\)/.test(source)
        && /this\.getMarkdownStyles\(\)\.getStandaloneStyles/.test(source)
        && /this\.getPrintStyles\(\)\.getStyles/.test(source)
        && !/window\.MarkTideMarkdownStyles\s*\?/.test(source)
        && !/window\.MarkTidePrintStyles\s*\?/.test(source);
    },
  },
  {
    name: 'PDF export does not own private print stylesheet',
    pass: () => {
      const source = read('assets/js/print-handler.js');
      return !/@page\s*\{/.test(source)
        && !/Force all text to wrap and prevent overflow/.test(source)
        && !/Table responsiveness for print/.test(source)
        && !/Mermaid flowchart specific styling for print/.test(source);
    },
  },
  {
    name: 'shared print styles preserve accepted PDF layout values',
    pass: () => {
      const source = read('assets/js/print-styles.js');
      return /margin:\s*0\.55in 0\.38in/.test(source)
        && /width:\s*16%[\s\S]*?min-width:\s*88px/.test(source)
        && /width:\s*13%[\s\S]*?min-width:\s*86px/.test(source)
        && /width:\s*12%[\s\S]*?min-width:\s*78px/.test(source)
        && /width:\s*14%[\s\S]*?min-width:\s*74px/.test(source);
    },
  },
  {
    name: 'print styles contain layout rules only for shared Markdown content',
    pass: () => {
      const source = read('assets/js/print-styles.js');
      return !/\.markdown-body blockquote\s*\{/.test(source)
        && !/\.markdown-body table tr:nth-child/.test(source)
        && !/\.markdown-body code:not\(pre code\)\s*\{/.test(source)
        && !/\.mermaid \.nodeLabel/.test(source)
        && !/\.mermaid \.edgeLabel foreignObject (?:div|span|p)/.test(source);
    },
  },
  {
    name: 'PDF export keeps inline code highlighting visible',
    pass: () => {
      const sharedCss = read('assets/css/markdown-content.css');
      const printHandler = read('assets/js/print-handler.js');
      return /--markdown-code-inline-bg:\s*#FFF8EC/.test(sharedCss)
        && /--markdown-code-inline-color:\s*#8B4500/.test(sharedCss)
        && /--markdown-code-inline-font-weight:\s*600/.test(sharedCss)
        && /getStandaloneStyles\(\{[\s\S]*?mode:\s*['"]pdf['"]/.test(printHandler);
    },
  },
  {
    name: 'PDF export preserves inline authored text colors',
    pass: () => {
      const source = read('assets/js/print-styles.js');
      return !/\.markdown-body (?:h[1-6]|p|li|span|div|section|article)[^{]*\{[^}]*color:\s*#24292e\s*!important/.test(source)
        && !/:not\(\[style\]\)/.test(source);
    },
  },
  {
    name: 'HTML and PDF exports consume shared MathJax config',
    pass: () => /MarkTideMathJax/.test(read('assets/js/import-export.js'))
      && /MarkTideMathJax/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'HTML and PDF exports consume shared Mermaid config',
    pass: () => /MarkTideMermaidShared/.test(read('assets/js/import-export.js'))
      && /MarkTideMermaidShared/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'shared Mermaid helper owns every render lifecycle',
    pass: () => {
      const consumers = [
        read('assets/js/mermaid-handler.js'),
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');
      const helper = read('assets/js/mermaid-shared.js');
      return !/\bmermaid\.(?:initialize|run|init)\s*\(/.test(consumers)
        && (consumers.match(/(?:MarkTideMermaidShared|getSharedHelper\(\)|\bhelper)\.renderDiagrams\s*\(/g) || []).length === 3
        && /async function renderDiagrams\s*\(/.test(helper);
    },
  },
  {
    name: 'HTML export Mermaid runtime only uses serialized shared globals',
    pass: () => {
      const source = read('assets/js/import-export.js');
      return !/const\s+mermaidConfig\s*=/.test(source)
        && /window\.MarkTideMermaidShared\.renderDiagrams\(document,\s*\{\s*mode:\s*['"]html['"]/.test(source)
        && /window\.MarkTideMermaidToolbar\.enhance\(document\)/.test(source);
    },
  },
  {
    name: 'HTML export requires Mermaid helper and toolbar serialization',
    pass: () => {
      const source = read('assets/js/import-export.js');
      return /marktideRequireMermaidFactory\s*\(\)/.test(source)
        && /marktideRequireMermaidToolbar\s*\(\)/.test(source)
        && !/if\s*\(typeof\s+window\.MarkTideCreateMermaidShared\s*!==\s*['"]function['"]\)\s*return\s*['"]{2}/.test(source)
        && !/if\s*\(typeof\s+MermaidToolbar\s*!==\s*['"]function['"]\)\s*return\s*['"]{2}/.test(source);
    },
  },
  {
    name: 'PDF export does not depend on preview Mermaid handler for config',
    pass: () => !/MarkTideMermaid\.getMermaidConfig/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'Mermaid config is not privately duplicated in exports',
    pass: () => {
      const consumers = [
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');

      return !/flowchart:\s*\{[\s\S]*?nodeSpacing:\s*60/.test(consumers)
        && !/securityLevel:\s*['"]strict['"][\s\S]*?fontSize:\s*16/.test(consumers);
    },
  },
  {
    name: 'preview Mermaid handler does not duplicate shared config',
    pass: () => {
      const source = read('assets/js/mermaid-handler.js');
      return !/securityLevel:\s*['"]strict['"]/.test(source)
        && !/nodeSpacing:\s*60/.test(source)
        && !/rankSpacing:\s*70/.test(source)
        && !/fontSize:\s*16/.test(source);
    },
  },
  {
    name: 'Mermaid modal clone always uses shared sanitizer',
    pass: () => {
      const source = read('assets/js/mermaid-toolbar.js');
      return /getSharedHelper\s*\(\)/.test(source)
        && /getSharedHelper\(\)\.sanitizeSvgInteractions\(modalSvg\)/.test(source)
        && !/MarkTideMermaidShared\s*&&\s*window\.MarkTideMermaidShared\.sanitizeSvgInteractions/.test(source);
    },
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
    name: 'shared MathJax helper owns every explicit typeset pass',
    pass: () => {
      const consumers = [
        read('assets/js/markdown-renderer.js'),
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');
      const helper = read('assets/js/mathjax-config.js');
      return !/typesetPromise\s*\(/.test(consumers)
        && (consumers.match(/MarkTideMathJax\.typeset\s*\(/g) || []).length === 3
        && /startup:\s*\{\s*typeset:\s*false/.test(helper)
        && /function typeset\s*\(/.test(helper);
    },
  },
  {
    name: 'shared MathJax lifecycle clears and queues dynamic content',
    pass: () => {
      const config = read('assets/js/mathjax-config.js');
      const preview = read('assets/js/markdown-renderer.js');
      return /let operationQueue\s*=\s*Promise\.resolve\(\)/.test(config)
        && /function updateContent\s*\(/.test(config)
        && /typesetClear\(\[target\]\)/.test(config)
        && /MarkTideMathJax\.updateContent\(this\.markdownPreview,\s*updateContent\)/.test(preview)
        && /await window\.MarkTideMermaid\.renderDiagrams[\s\S]*?await window\.MarkTideMathJax\.typeset/.test(preview);
    },
  },
  {
    name: 'preview/export/print consume shared sanitizer config',
    pass: () => /MarkTideSanitizer/.test(read('assets/js/markdown-renderer.js'))
      && /MarkTideSanitizer/.test(read('assets/js/import-export.js'))
      && /MarkTideSanitizer/.test(read('assets/js/print-handler.js')),
  },
  {
    name: 'render surfaces use preview HTML and PDF mode names',
    pass: () => {
      const consumers = [
        read('assets/js/markdown-renderer.js'),
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
        read('assets/js/sanitizer-config.js'),
      ].join('\n');
      return !/mode\s*[:=]{1,3}\s*['"]print['"]/.test(consumers)
        && /mode:\s*['"]preview['"]/.test(consumers)
        && /mode:\s*['"]html['"]/.test(consumers)
        && /mode:\s*['"]pdf['"]/.test(consumers);
    },
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
    name: 'shared sanitizer blocks embedded stylesheet takeover',
    pass: () => {
      const source = read('assets/js/sanitizer-config.js');
      return /const FORBIDDEN_TAGS\s*=\s*\[['"]style['"]\]/.test(source)
        && (source.match(/FORBID_TAGS:\s*FORBIDDEN_TAGS\.slice\(\)/g) || []).length === 3;
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
    name: 'markdown consumers do not silently downgrade shared rendering',
    pass: () => {
      const preview = read('assets/js/markdown-renderer.js');
      const exports = [
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');

      return !/:\s*new\s+marked\.Renderer\(\)/.test(preview)
        && !/:\s*new\s+marked\.Renderer\(\)/.test(exports)
        && !/:\s*DOMPurify\.sanitize\(/.test(preview)
        && !/:\s*DOMPurify\.sanitize\(/.test(exports)
        && !/:\s*marked\.parse\(/.test(exports);
    },
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
    name: 'dead CSS declarations and stale stylesheet placeholder are removed',
    pass: () => {
      const markdownCss = read('assets/css/markdown-content.css');
      const keyframesCss = read('assets/css/keyframes.css');
      const themes = [
        read('assets/css/light-theme.css'),
        read('assets/css/dark-theme.css'),
      ].join('\n');
      const index = read('index.html');
      const markdownBody = markdownCss.match(/\.markdown-body\s*\{([\s\S]*?)\}/);
      const paddingCount = markdownBody
        ? (markdownBody[1].match(/\bpadding\s*:/g) || []).length
        : 0;

      return paddingCount === 1
        && !/@keyframes\s+fadeIn\b/.test(keyframesCss)
        && !/--(?:accent-color-rgb|stats-bg|code-bg|hr-color)\s*:/.test(themes)
        && !/assets\/css\/styles\.css/.test(index);
    },
  },
  {
    name: 'unused header height CSS variable is removed',
    pass: () => {
      const consumers = [
        read('assets/css/base.css'),
        read('assets/js/view-manager.js'),
      ].join('\n');

      return !/--header-height/.test(consumers);
    },
  },
  {
    name: 'shared button interactions live only in base CSS',
    pass: () => {
      const base = read('assets/css/base.css');
      const themes = [
        read('assets/css/light-theme.css'),
        read('assets/css/dark-theme.css'),
      ].join('\n');

      return /button,\s*\n\s*\.dropdown-item\s*\{[\s\S]*?transition:\s*all 0\.2s ease/.test(base)
        && /button:hover,\s*\n\s*\.dropdown-item:hover\s*\{[\s\S]*?background-color:\s*var\(--hover-accent\)\s*!important/.test(base)
        && !/(?:\[data-theme=["'](?:light|dark)["']\]\s+)?button,\s*\n\s*(?:\[data-theme=["'](?:light|dark)["']\]\s+)?\.dropdown-item\s*\{/.test(themes)
        && !/(?:\[data-theme=["'](?:light|dark)["']\]\s+)?button:hover,\s*\n\s*(?:\[data-theme=["'](?:light|dark)["']\]\s+)?\.dropdown-item:hover\s*\{/.test(themes);
    },
  },
  {
    name: 'theme ripple presentation lives in CSS',
    pass: () => {
      const css = read('assets/css/base.css');
      const manager = read('assets/js/theme-manager.js');
      return /\.theme-ripple-fallback--dark[\s\S]*background:\s*rgba\(0,\s*0,\s*0,\s*0\.18\)[\s\S]*border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.34\)/.test(css)
        && /\.theme-ripple-fallback--light[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.14\)[\s\S]*border-color:\s*rgba\(0,\s*0,\s*0,\s*0\.28\)/.test(css)
        && !/getFallbackRippleColors/.test(manager)
        && !/ripple\.style\.(?:backgroundColor|border)/.test(manager);
    },
  },
  {
    name: 'shared Markdown CSS owns the Mermaid border theme',
    pass: () => {
      const sharedCss = read('assets/css/markdown-content.css');
      const darkCss = read('assets/css/dark-theme.css');
      return /--markdown-mermaid-border-color:\s*transparent/.test(sharedCss)
        && /:root\[data-theme="dark"\][\s\S]*--markdown-mermaid-border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.14\)/.test(sharedCss)
        && /\.markdown-body \.mermaid-container[\s\S]*border:\s*1px solid var\(--markdown-mermaid-border-color\)/.test(sharedCss)
        && !/#markdown-preview\s+\.mermaid-container/.test(darkCss);
    },
  },
  {
    name: 'PDF uses shared Markdown palette tokens',
    pass: () => {
      const source = read('assets/js/print-styles.js');
      return /background(?:-color)?:\s*var\(--markdown-bg\)\s*!important/.test(source)
        && /color:\s*var\(--markdown-text-color\)\s*!important/.test(source)
        && !/background(?:-color)?:\s*(?:white|#ffffff)\s*!important/.test(source)
        && !/color:\s*#24292e\s*!important/.test(source);
    },
  },
  {
    name: 'browser theme color reads the CSS theme token',
    pass: () => {
      const source = read('assets/js/theme-manager.js');
      return /getComputedStyle\(document\.documentElement\)[\s\S]*getPropertyValue\(['"]--bg-color['"]\)/.test(source)
        && !/currentTheme === ['"]dark['"]\s*\?\s*['"]#000000['"]\s*:\s*['"]#ffffff['"]/.test(source);
    },
  },
  {
    name: 'light theme does not duplicate shared view button states',
    pass: () => {
      const source = read('assets/css/light-theme.css');
      return !/\[data-theme=["']light["']\]\s+\.view-btn:hover\s*\{/.test(source)
        && !/\[data-theme=["']light["']\]\s+\.view-btn\.active\s*\{/.test(source);
    },
  },
  {
    name: 'print table classification rules have one owner',
    pass: () => {
      const source = read('assets/js/print-styles.js');
      const selectors = [
        /\.markdown-body table\.marktide-print-cols-2 th:first-child/g,
        /\.markdown-body table\.marktide-print-cols-3 th:first-child/g,
        /\.markdown-body table\.marktide-print-cols-3 th:last-child/g,
        /\.markdown-body table\.marktide-print-long-table,/g,
        /\.markdown-body table\.marktide-print-long-table\.marktide-print-cols-2 th:first-child/g,
        /\.markdown-body table\.marktide-print-wide-table th,/g,
      ];

      return selectors.every((selector) => (source.match(selector) || []).length === 1)
        && /marktide-print-wide-table th,[\s\S]*?padding:\s*5px 7px\s*!important/.test(source);
    },
  },
  {
    name: 'print handler has no empty initialization lifecycle',
    pass: () => {
      const handler = read('assets/js/print-handler.js');
      const core = read('assets/js/core.js');
      return !/\bconstructor\s*\(\)\s*\{[\s\S]*?printButton/.test(handler)
        && !/\binit\s*\(\)\s*\{/.test(handler)
        && !/MarkTidePrintHandler\.init\s*\(/.test(core);
    },
  },
  {
    name: 'PDF resolves its iframe document after attachment',
    pass: () => {
      const source = read('assets/js/print-handler.js');
      const appendIndex = source.indexOf('document.body.appendChild(printFrame)');
      const documentIndex = source.indexOf('const printDocument = printFrame.contentDocument');
      return appendIndex > -1
        && documentIndex > appendIndex
        && /if \(!printDocument\)\s*\{\s*throw new Error\(['"]Unable to create the PDF print document\./.test(source);
    },
  },
  {
    name: 'dead mobile menu compatibility module is removed',
    pass: () => !exists('assets/js/mobile-menu.js')
      && !/assets\/js\/mobile-menu\.js/.test(read('index.html'))
      && !/MarkTideMobileMenu/.test(read('assets/js/core.js')),
  },
  {
    name: 'shared style helpers expose only consumer APIs',
    pass: () => {
      const markdown = read('assets/js/markdown-styles.js');
      const mermaid = read('assets/js/mermaid-shared.js');
      const mermaidApi = mermaid.match(/return\s*\{\s*getMermaidConfig,[\s\S]*?\n\s*\};/);
      return !/window\.MarkTideMarkdownStyles\s*=\s*\{[\s\S]*?\bgetContentStyles\s*,/.test(markdown)
        && !/window\.MarkTideMarkdownStyles\s*=\s*\{[\s\S]*?\bgetMermaidToolbarStyles\s*,/.test(markdown)
        && Boolean(mermaidApi)
        && !/\b(?:constants|getDiagramFontFamily|getThemeVariables|getReadableTextColor|setSolidEdgeLabelBackground|replaceForeignObjectLabels|inlineComputedStyles|parseSvgNumber)\b/.test(mermaidApi[0]);
    },
  },
  {
    name: 'shared code renderer is the only syntax highlighting pass',
    pass: () => {
      const consumers = [
        read('assets/js/markdown-renderer.js'),
        read('assets/js/import-export.js'),
        read('assets/js/print-handler.js'),
      ].join('\n');
      const exportAssets = read('assets/js/export-assets.js');

      return !/highlightElement\s*\(/.test(consumers)
        && !/getHighlightScriptTags/.test(exportAssets)
        && !/highlight(?:Core|Dos|Dockerfile|Powershell)\s*:/.test(exportAssets);
    },
  },
  {
    name: 'footnote bodies use the shared Markdown extension pipeline',
    pass: () => {
      const source = read('assets/js/markdown-renderer.js');
      return source.includes("const html = this.parseMarkdown(markdown || ' ', options);")
        && !source.includes("const html = marked.parse(markdown || ' ', options);");
    },
  },
  {
    name: 'standalone style assembly rejects missing shared CSS',
    pass: () => {
      const source = read('assets/js/markdown-styles.js');
      return /function getStylesheet\s*\([\s\S]*?throw new Error\(`Shared stylesheet is required: \$\{hrefToMatch\}`\)/.test(source);
    },
  },
  {
    name: 'HTML export requires interactive code runtimes and MathJax config',
    pass: () => {
      const source = read('assets/js/import-export.js');
      return /typeof CodeCopyHandler !== ['"]function['"]\)\s*\{\s*throw new Error/.test(source)
        && /typeof window\.MarkTideCreateCodeWrapController !== ['"]function['"]\)\s*\{\s*throw new Error/.test(source)
        && /function marktideRequireMathJax\s*\(/.test(source)
        && /marktideRequireMathJax\(\)\.getConfigScript\(\)/.test(source)
        && !/MarkTideMathJax\s*\?\s*window\.MarkTideMathJax\.getConfigScript\(\)\s*:\s*['"]{2}/.test(source);
    },
  },
  {
    name: 'PDF export requires serialized Mermaid and MathJax helpers',
    pass: () => {
      const source = read('assets/js/print-handler.js');
      return /getMathJaxConfig\s*\(\)/.test(source)
        && /getMermaidFactory\s*\(\)/.test(source)
        && /this\.getMathJaxConfig\(\)\.getConfigScript\(\)/.test(source)
        && /this\.getMermaidFactory\(\)\.toString\(\)/.test(source)
        && !/window\.MarkTideMathJax\s*\?/.test(source)
        && !/window\.MarkTideCreateMermaidShared\s*\?/.test(source);
    },
  },
  {
    name: 'shared modules expose only their used public contracts',
    pass: () => {
      const codeRenderer = read('assets/js/code-block-renderer.js');
      const mathJax = read('assets/js/mathjax-config.js');
      const sanitizer = read('assets/js/sanitizer-config.js');
      const exportAssets = read('assets/js/export-assets.js');

      return /window\.MarkTideCodeBlockRenderer\s*=\s*\{\s*createRenderer\s*,?\s*\}/.test(codeRenderer)
        && /window\.MarkTideMathJax\s*=\s*\{[\s\S]*?getConfigScript,[\s\S]*?typeset:\s*helper\.typeset,[\s\S]*?updateContent:\s*helper\.updateContent,[\s\S]*?\}/.test(mathJax)
        && /window\.MarkTideSanitizer\s*=\s*\{\s*sanitize\s*,?\s*\}/.test(sanitizer)
        && !/window\.MarkTideExportAssets\s*=\s*\{[\s\S]*?\blinks\s*,/.test(exportAssets)
        && !/window\.MarkTideExportAssets\s*=\s*\{[\s\S]*?\bscripts\s*,/.test(exportAssets);
    },
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
        && /--markdown-copy-code-btn-hover-bg/.test(css);
    },
  },
  {
    name: 'shared CSS owns light and dark markdown theme tokens',
    pass: () => {
      const css = read('assets/css/markdown-content.css');
      const requiredTokens = [
        'markdown-bg',
        'markdown-text-color',
        'markdown-border-color',
        'markdown-accent-color',
        'markdown-table-bg',
        'markdown-code-pre-bg',
        'markdown-code-inline-bg',
        'markdown-code-inline-color',
      ];

      return /:root\s*\{[\s\S]*?--markdown-bg:\s*#ffffff/.test(css)
        && /:root\[data-theme=["']dark["']\][\s\S]*?--markdown-bg:\s*#000000/.test(css)
        && /\.markdown-body\s*\{[\s\S]*?--color-prettylights-syntax-comment:\s*#6a737d/.test(css)
        && /:root\[data-theme=["']dark["']\]\s+\.markdown-body[\s\S]*?--color-prettylights-syntax-comment:\s*#8b949e/.test(css)
        && requiredTokens.every((token) => {
          const declarations = css.match(new RegExp(`--${token}\\s*:`, 'g')) || [];
          return declarations.length === 2;
        });
    },
  },
  {
    name: 'theme files and style helper do not duplicate markdown theme tokens',
    pass: () => {
      const privateOwners = [
        read('assets/css/light-theme.css'),
        read('assets/css/dark-theme.css'),
        read('assets/js/markdown-styles.js'),
      ].join('\n');
      const oldDocumentToken = /--(?:preview-text-color|table-bg|table-row-alt|table-border|code-pre-bg|code-inline-bg|code-inline-color|code-inline-font-weight|code-header-bg|code-header-border|code-block-shadow|code-block-hover-shadow|copy-code-btn-hover-bg|copy-code-btn-active-bg|copy-code-btn-copied-bg|hljs-color|blockquote-color|blockquote-bold-color|list-marker-color|list-item-color|markdown-heading-color|markdown-bold-color|markdown-bold-weight|markdown-hr-color)\s*:/;

      return !oldDocumentToken.test(privateOwners)
        && !/--color-(?:prettylights|fg-|canvas-|border-|neutral-|accent-|attention-)/.test(privateOwners)
        && !/function getThemeVariables\s*\(/.test(read('assets/js/markdown-styles.js'));
    },
  },
  {
    name: 'standalone documents select the shared palette through data-theme',
    pass: () => {
      const htmlExport = read('assets/js/import-export.js');
      const pdfExport = read('assets/js/print-handler.js');
      const styles = read('assets/js/markdown-styles.js');

      return /<html lang="en" data-theme="\$\{currentTheme \|\| 'light'\}">/.test(htmlExport)
        && /<html lang="en" data-theme="light">/.test(pdfExport)
        && /background-color:\s*var\(--markdown-bg\)/.test(styles)
        && /color:\s*var\(--markdown-text-color\)/.test(styles)
        && !/settings\.theme/.test(styles);
    },
  },
  {
    name: 'preview does not load a dead external Mermaid stylesheet',
    pass: () => !/<link[^>]+href=["']https?:\/\/[^"']*mermaid[^"']*\.css[^"']*["'][^>]*>/i.test(read('index.html')),
  },
  {
    name: 'ThemeManager is the single owner of initial theme state',
    pass: () => {
      const index = read('index.html');
      const core = read('assets/js/core.js');
      const theme = read('assets/js/theme-manager.js');
      const themeScripts = index.match(/<script[^>]+src=["']assets\/js\/theme-manager\.js[^"']*["'][^>]*><\/script>/g) || [];
      const bootstrapCall = index.indexOf('window.MarkTideTheme.applyInitialRootTheme()');

      return themeScripts.length === 1
        && index.indexOf('assets/js/theme-manager.js') < bootstrapCall
        && bootstrapCall > -1
        && !/localStorage\.getItem\(['"]marktide-theme['"]\)/.test(index)
        && !/prefers-color-scheme:\s*dark/.test(index)
        && !/\b(?:applyInitialTheme|initializeTheme)\s*\(/.test(core)
        && /resolveInitialTheme\s*\(\)/.test(theme)
        && /applyInitialRootTheme\s*\(\)/.test(theme);
    },
  },
  {
    name: 'initial highlight stylesheet follows the shared root theme',
    pass: () => {
      const index = read('index.html');
      return /const initialTheme\s*=\s*window\.MarkTideTheme\.applyInitialRootTheme\(\)/.test(index)
        && /getThemeUrl\(initialTheme\s*===\s*['"]dark['"]\)/.test(index)
        && !/getThemeUrl\(false\)/.test(index);
    },
  },
  {
    name: 'local CSS and JavaScript assets share one cache version',
    pass: () => {
      const index = read('index.html');
      const assetUrls = Array.from(
        index.matchAll(/(?:href|src)=["'](assets\/(?:css|js)\/[^"']+)["']/g),
        (match) => match[1]
      );
      const versions = assetUrls.map((url) => {
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : '';
      });

      return assetUrls.length > 0
        && versions.every(Boolean)
        && new Set(versions).size === 1;
    },
  },
  {
    name: 'preview code-copy instance is private',
    pass: () => {
      const source = read('assets/js/code-copy-handler.js');
      return /const codeCopyHandler\s*=\s*new CodeCopyHandler\(\)/.test(source)
        && !/window\.MarkTideCodeCopy/.test(source);
    },
  },
  {
    name: 'What\'s New dialog keeps scrolling without a visible scrollbar',
    pass: () => {
      const css = read('assets/css/base.css');
      return /\.whats-new-dialog\s*\{[\s\S]*?overflow-y:\s*auto/.test(css)
        && /\.whats-new-dialog\s*\{[\s\S]*?scrollbar-width:\s*none/.test(css)
        && /\.whats-new-dialog\s*\{[\s\S]*?-ms-overflow-style:\s*none/.test(css)
        && /\.whats-new-dialog::-webkit-scrollbar\s*\{[\s\S]*?display:\s*none/.test(css);
    },
  },
  {
    name: 'Mermaid image export preserves wrapped HTML label lines',
    pass: () => {
      const source = read('assets/js/mermaid-shared.js');
      return /function getForeignObjectLabelLines\s*\(/.test(source)
        && /querySelectorAll\(['"]br['"]\)/.test(source)
        && /doc\.createElementNS\(svgNamespace, ['"]tspan['"]\)/.test(source)
        && /textElement\.appendChild\(tspan\)/.test(source)
        && /const labelLines\s*=\s*getForeignObjectLabelLines\(foreignObject\)/.test(source)
        && !/const text = \(foreignObject\.textContent \|\| ['"]{2}\)\.replace\(\/\\s\+\/g, ['"] ['"]\)\.trim\(\)/.test(source);
    },
  },
  {
    name: 'shared Mermaid edge-label detection includes class cardinalities',
    pass: () => {
      const source = read('assets/js/mermaid-shared.js');
      return /function isEdgeLabelForeignObject\s*\(/.test(source)
        && /foreignObject\.closest\(['"]g\.edgeLabel['"]\)/.test(source)
        && /foreignObject\.querySelector\(['"]\.edgeLabel['"]\)/.test(source)
        && /if\s*\(!isEdgeLabelForeignObject\(foreignObject\)\)\s*return/.test(source)
        && /const isEdgeLabel\s*=\s*isEdgeLabelForeignObject\(foreignObject\)/.test(source);
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
