const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function loadMarkdownRenderer() {
  const source = fs.readFileSync(path.join(root, 'assets/js/markdown-renderer.js'), 'utf8');
  const context = {
    console,
    window: {},
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/markdown-renderer.js' });
  return context.window.MarkTideRenderer;
}

function loadMarkdownRendererHarness() {
  const source = fs.readFileSync(path.join(root, 'assets/js/markdown-renderer.js'), 'utf8');
  const context = {
    console,
    window: {},
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/markdown-renderer.js' });
  return {
    context,
    renderer: context.window.MarkTideRenderer,
  };
}

function loadCodeBlockRenderer(overrides = {}) {
  const source = fs.readFileSync(path.join(root, 'assets/js/code-block-renderer.js'), 'utf8');
  class Renderer {}
  const context = {
    window: {},
    marked: { Renderer },
    ...overrides,
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/code-block-renderer.js' });
  return context.window.MarkTideCodeBlockRenderer;
}

function loadSanitizer() {
  const source = fs.readFileSync(path.join(root, 'assets/js/sanitizer-config.js'), 'utf8');
  const hooks = {};
  const DOMPurify = {
    addHook(name, callback) {
      hooks[name] = callback;
    },
    sanitize(html, config = {}) {
      let sanitized = String(html).replace(/style="([^"]*)"/g, (match, styleText) => {
        const declarations = styleText
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => {
            const separator = item.indexOf(':');
            return {
              property: item.slice(0, separator).trim().toLowerCase(),
              value: item.slice(separator + 1).trim(),
            };
          });
        const style = {
          length: declarations.length,
          item(index) {
            return declarations[index].property;
          },
          getPropertyValue(property) {
            const declaration = declarations.find((item) => item.property === property);
            return declaration ? declaration.value.replace(/\s*!important\s*$/i, '') : '';
          },
          getPropertyPriority(property) {
            const declaration = declarations.find((item) => item.property === property);
            return declaration && /\s*!important\s*$/i.test(declaration.value) ? 'important' : '';
          },
        };
        const data = {
          attrName: 'style',
          attrValue: styleText,
          keepAttr: true,
        };

        if (hooks.uponSanitizeAttribute) {
          hooks.uponSanitizeAttribute({ style }, data);
        }

        return data.keepAttr === false || !data.attrValue
          ? ''
          : `style="${data.attrValue}"`;
      });
      (config.FORBID_TAGS || []).forEach((tagName) => {
        const pairedTag = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`, 'gi');
        const singleTag = new RegExp(`<${tagName}\\b[^>]*\\/?>`, 'gi');
        sanitized = sanitized.replace(pairedTag, '').replace(singleTag, '');
      });
      return sanitized;
    },
  };
  const context = {
    DOMPurify,
    window: {},
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/sanitizer-config.js' });
  return context.window.MarkTideSanitizer;
}

function loadPrintHandler(overrides = {}) {
  const source = fs.readFileSync(path.join(root, 'assets/js/print-handler.js'), 'utf8');
  const context = {
    console,
    setTimeout,
    clearTimeout,
    window: {},
    ...overrides,
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/print-handler.js' });
  return {
    context,
    handler: context.window.MarkTidePrintHandler,
  };
}

function loadPrintStyles() {
  const source = fs.readFileSync(path.join(root, 'assets/js/print-styles.js'), 'utf8');
  const context = { window: {} };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/print-styles.js' });
  return context.window.MarkTidePrintStyles;
}

function createHtmlExportHarness() {
  const source = fs.readFileSync(path.join(root, 'assets/js/import-export.js'), 'utf8');
  let exportedHtml = '';
  class CapturedBlob {
    constructor(parts) {
      this.parts = parts;
    }
  }
  const link = {
    click() {},
  };
  const document = {
    documentElement: {
      getAttribute() {
        return 'dark';
      },
    },
    body: {
      appendChild() {},
      removeChild() {},
    },
    createElement(tagName) {
      if (tagName === 'a') return link;
      return {};
    },
  };
  const context = {
    Blob: CapturedBlob,
    CodeCopyHandler: class CodeCopyHandler {},
    console,
    document,
    MermaidToolbar: class MermaidToolbar {},
    URL: {
      createObjectURL(blob) {
        exportedHtml = blob.parts.join('');
        return 'blob:captured';
      },
      revokeObjectURL() {},
    },
    window: {},
  };
  context.window.MarkTideCodeBlockRenderer = {
    createRenderer() {
      return {};
    },
  };
  context.window.MarkTideRenderer = {
    parseMarkdown() {
      return '<p>PARSED</p>';
    },
    prepareRenderedHtml() {
      return '<p>EMOJI_READY</p>';
    },
  };
  context.window.MarkTideSanitizer = {
    sanitize() {
      return '<p>SANITIZED_WITHOUT_EMOJI</p>';
    },
  };
  context.window.MarkTideMarkdownStyles = {
    getStandaloneStyles() {
      return '.markdown-body { color: inherit; }';
    },
  };
  context.window.MarktideHighlightTheme = {
    getThemeUrl() {
      return 'dark-highlight.css';
    },
    getPrintTokenCss() {
      return 'LIGHT_PRINT_TOKENS';
    },
  };
  context.window.MarkTideExportAssets = {
    getFontLinks() {
      return '';
    },
    getCommonStylesheetLinks() {
      return '';
    },
    getMermaidScriptTag() {
      return '';
    },
    getMathJaxScriptTag() {
      return '';
    },
  };
  context.window.MarkTideCreateMermaidShared = function createMermaidShared() {};
  context.window.MarkTideCreateCodeWrapController = function createCodeWrapController() {};
  context.window.MarkTideMathJax = {
    getConfigScript() {
      return 'window.MathJax = {};';
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/import-export.js' });
  context.window.MarkTideImportExport.markdownEditor = { value: '# Export' };

  return {
    exportHtml() {
      context.window.MarkTideImportExport.exportAsHTML();
      return exportedHtml;
    },
  };
}

function createPdfExportHarness() {
  let writtenHtml = '';
  const printDocument = {
    write(html) {
      writtenHtml = html;
    },
    close() {},
  };
  const printWindow = {
    document: printDocument,
  };
  const printFrame = {
    get contentDocument() {
      return this.parentNode ? printDocument : null;
    },
    get contentWindow() {
      return this.parentNode ? printWindow : null;
    },
    parentNode: null,
    style: {},
  };
  const document = {
    title: 'Original title',
    body: {
      appendChild(frame) {
        frame.parentNode = this;
      },
      removeChild(frame) {
        frame.parentNode = null;
      },
    },
    createElement(tagName) {
      assert.strictEqual(tagName, 'iframe');
      return printFrame;
    },
    getElementById(id) {
      return id === 'markdown-editor' ? { value: '# PDF' } : null;
    },
  };
  const { context, handler } = loadPrintHandler({ document });
  context.window.MarkTideCodeBlockRenderer = {
    createRenderer() {
      return {};
    },
  };
  context.window.MarkTideRenderer = {
    parseMarkdown() {
      return '<p>PARSED</p>';
    },
    prepareRenderedHtml() {
      return '<p>EMOJI_READY</p>';
    },
  };
  context.window.MarkTideSanitizer = {
    sanitize() {
      return '<p>SANITIZED_WITHOUT_EMOJI</p>';
    },
  };
  context.window.MarkTideImportExport = {
    generateSmartFilename() {
      return 'PDF';
    },
  };
  context.window.MarktideHighlightTheme = {
    getThemeUrl() {
      return 'light-highlight.css';
    },
    getPrintTokenCss() {
      return 'PRINT_TOKENS';
    },
  };
  context.window.MarkTideMarkdownStyles = {
    getStandaloneStyles() {
      return 'MARKDOWN_STYLES';
    },
  };
  context.window.MarkTidePrintStyles = {
    getStyles() {
      return 'PRINT_STYLES';
    },
  };
  context.window.MarkTideExportAssets = {
    getFontLinks() {
      return '';
    },
    getCommonStylesheetLinks() {
      return '';
    },
    getMermaidScriptTag() {
      return '';
    },
    getMathJaxScriptTag() {
      return '';
    },
  };
  context.window.MarkTideCreateMermaidShared = function createMermaidShared() {};
  context.window.MarkTideMathJax = {
    getConfigScript() {
      return 'window.MathJax = {};';
    },
  };
  handler.preparePrintTables = (html) => html;

  return {
    exportHtml() {
      handler.printPreview();
      return writtenHtml;
    },
  };
}

function loadMermaidShared() {
  const source = fs.readFileSync(path.join(root, 'assets/js/mermaid-shared.js'), 'utf8');
  const window = {
    document: {},
  };
  const context = {
    document: window.document,
    window,
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/mermaid-shared.js' });
  return context.window.MarkTideMermaidShared;
}

function loadMermaidRenderHarness() {
  const source = fs.readFileSync(path.join(root, 'assets/js/mermaid-shared.js'), 'utf8');
  const calls = [];
  const diagrams = [{ id: 'one' }, { id: 'two' }];
  const rootElement = {
    querySelectorAll(selector) {
      return selector === '.mermaid' ? diagrams : [];
    },
  };
  const window = {
    document: {},
    mermaid: {
      initialize(config) {
        calls.push({ type: 'initialize', config });
      },
      run(options) {
        calls.push({ type: 'run', nodes: Array.from(options.nodes) });
        return Promise.resolve();
      },
    },
  };
  const context = {
    document: window.document,
    window,
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/mermaid-shared.js' });
  return {
    calls,
    diagrams,
    helper: context.window.MarkTideMermaidShared,
    rootElement,
  };
}

function loadMermaidToolbar() {
  const source = fs.readFileSync(path.join(root, 'assets/js/mermaid-toolbar.js'), 'utf8')
    .replace(/window\.MarkTideMermaidToolbar = new MermaidToolbar\(\);[\s\S]*$/, 'window.MarkTideMermaidToolbarClass = MermaidToolbar;');
  const context = {
    console,
    window: {
      requestAnimationFrame(callback) {
        callback();
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/mermaid-toolbar.js' });
  return {
    context,
    Toolbar: context.window.MarkTideMermaidToolbarClass,
  };
}

function loadMathJaxConfig() {
  const source = fs.readFileSync(path.join(root, 'assets/js/mathjax-config.js'), 'utf8');
  const context = {
    document: {
      body: {},
    },
    window: {},
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/js/mathjax-config.js' });
  return context;
}

function testNestedFencesStayLiteral() {
  const renderer = loadMarkdownRenderer();
  const markdown = [
    '````markdown',
    '```',
    '1.2 MUST_STAY_LITERAL',
    '==MUST_STAY_LITERAL==',
    '*[HTML]: MUST_STAY_LITERAL',
    '[^note]: MUST_STAY_LITERAL',
    '$$MUST_STAY_LITERAL$$',
    '```',
    '~~~~',
    '2.3 ALSO_LITERAL',
    '~~~~',
    '````',
  ].join('\n');

  assert.strictEqual(
    renderer.normalizeListSyntax(markdown),
    markdown,
    'nested and different fence markers must not expose code to list normalization'
  );

  const prepared = renderer.prepareMarkdownExtensions(markdown);
  assert.strictEqual(
    prepared.markdown,
    markdown,
    'nested and different fence markers must not expose code to Markdown extensions'
  );
  assert.deepStrictEqual(Array.from(prepared.abbreviations), []);
  assert.deepStrictEqual(Array.from(prepared.footnotes), []);
  assert.deepStrictEqual(Array.from(prepared.markPlaceholders), []);
  assert.deepStrictEqual(Array.from(prepared.displayMathPlaceholders), []);
}

function testCodeBlocksRequireSharedHighlighter() {
  const renderer = loadCodeBlockRenderer();
  const markedRenderer = renderer.createRenderer({ enhanced: false });

  assert.throws(
    () => markedRenderer.code('const value = 1;', 'javascript'),
    /Shared code highlight helper is required/,
    'code block rendering must not keep a private Highlight fallback'
  );
}

function testMarkdownSetupDoesNotRegisterSecondHighlighter() {
  const { context, renderer } = loadMarkdownRendererHarness();
  let markedOptions = null;
  context.localStorage = {
    getItem() {
      return null;
    },
  };
  context.marked = {
    setOptions(options) {
      markedOptions = options;
    },
  };
  context.window.MarkTideCodeBlockRenderer = {
    createRenderer() {
      return {};
    },
  };

  renderer.setupMarked();

  assert(markedOptions, 'Markdown setup must configure Marked');
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(markedOptions, 'highlight'),
    false,
    'the shared code block renderer must be the only syntax highlight owner'
  );
}

function testInlineStylesBlockLayoutTakeover() {
  const sanitizer = loadSanitizer();
  const dangerous = '<span style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(255,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;font-size:3em;color:white">Overlay</span>';
  const result = sanitizer.sanitize(dangerous, { mode: 'preview' });

  assert(!/position\s*:/i.test(result), 'position must be removed');
  assert(!/z-index\s*:/i.test(result), 'z-index must be removed');
  assert(!/(?:^|[;"\s])(?:top|left)\s*:/i.test(result), 'screen offsets must be removed');
  assert(!/(?:100vw|100vh)/i.test(result), 'viewport sized dimensions must be removed');
  assert(!/display\s*:\s*flex/i.test(result), 'layout takeover display values must be removed');
  assert(!/(?:align-items|justify-content)\s*:/i.test(result), 'layout alignment controls must be removed');
  assert(/font-size\s*:\s*3em/i.test(result), 'authored font size must remain');
  assert(/color\s*:\s*white/i.test(result), 'authored text color must remain');
  assert(/background\s*:\s*rgba\(255,0,0,0\.5\)/i.test(result), 'authored safe background must remain');
}

function testInlineStylesPreserveApprovedVisualValues() {
  const sanitizer = loadSanitizer();
  const safe = '<div style="color:#D2571C;font-family:Georgia, serif;font-size:1.2em;font-weight:600;text-align:center;background:linear-gradient(90deg, #6366f1, #a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;padding:8px;border:2px solid red;height:64px;margin-right:32px;page-break-after:always">Styled</div>';
  const result = sanitizer.sanitize(safe, { mode: 'pdf' });

  [
    'color:#D2571C',
    'font-family:Georgia, serif',
    'font-size:1.2em',
    'font-weight:600',
    'text-align:center',
    'background:linear-gradient(90deg, #6366f1, #a855f7)',
    '-webkit-background-clip:text',
    '-webkit-text-fill-color:transparent',
    'padding:8px',
    'border:2px solid red',
    'height:64px',
    'margin-right:32px',
    'page-break-after:always',
  ].forEach((declaration) => {
    assert(result.includes(declaration), `approved style must remain: ${declaration}`);
  });
}

function testInlineStylesRejectExecutableValues() {
  const sanitizer = loadSanitizer();
  const dangerous = '<span style="width:expression(alert(1));background-image:url(https://example.test/pixel);color:javascript:alert(1);font-size:16px">Text</span>';
  const result = sanitizer.sanitize(dangerous, { mode: 'html' });

  assert(!/expression\s*\(/i.test(result), 'CSS expressions must be removed');
  assert(!/url\s*\(/i.test(result), 'CSS URL loads must be removed');
  assert(!/javascript\s*:/i.test(result), 'JavaScript CSS values must be removed');
  assert(/font-size\s*:\s*16px/i.test(result), 'safe declarations beside unsafe values must remain');
}

function testEmbeddedStyleTagsAreBlocked() {
  const sanitizer = loadSanitizer();
  const dangerous = '<p style="color:#D2571C">Authored color</p><style>body{background:black!important}p{color:lime!important}</style>';

  ['preview', 'html', 'pdf'].forEach((mode) => {
    const result = sanitizer.sanitize(dangerous, { mode });
    assert(!/<style\b/i.test(result), `${mode} must remove embedded stylesheet tags`);
    assert(!/background\s*:\s*black/i.test(result), `${mode} must remove global stylesheet content`);
    assert(/color\s*:\s*#D2571C/i.test(result), `${mode} must preserve safe inline authored styles`);
  });
}

function testInlineStylesRejectOversizedValues() {
  const sanitizer = loadSanitizer();
  const dangerous = '<div style="height:10000000px;max-width:1e+07px;padding:10000000px;font-size:10000000px;line-height:10000000px;border:10000000px solid red;color:#D2571C">Text</div>';

  ['preview', 'html', 'pdf'].forEach((mode) => {
    const result = sanitizer.sanitize(dangerous, { mode });
    assert(!/10000000px/i.test(result), `${mode} must reject oversized CSS lengths`);
    assert(!/1e\+07px/i.test(result), `${mode} must reject browser normalized scientific CSS lengths`);
    assert(/color\s*:\s*#D2571C/i.test(result), `${mode} must preserve safe visual styles beside oversized values`);
  });
}

function testPrintTableUsesLogicalColumnCount() {
  const { handler } = loadPrintHandler();
  assert.strictEqual(
    typeof handler.getLogicalColumnCount,
    'function',
    'PrintHandler must expose its logical table grid calculation'
  );

  const rows = [
    { children: [{ colSpan: 4, rowSpan: 1 }] },
    { children: [
      { colSpan: 1, rowSpan: 2 },
      { colSpan: 1, rowSpan: 1 },
      { colSpan: 2, rowSpan: 1 },
    ] },
    { children: [
      { colSpan: 1, rowSpan: 1 },
      { colSpan: 2, rowSpan: 1 },
    ] },
  ];

  assert.strictEqual(
    handler.getLogicalColumnCount(rows),
    4,
    'colspan and rowspan must describe one four column table grid'
  );
}

function testPrintTableTracksLogicalCellPositions() {
  const { handler } = loadPrintHandler();
  assert.strictEqual(
    typeof handler.getLogicalTableCells,
    'function',
    'PrintHandler must expose logical cell positions for wrapping decisions'
  );

  const rowHeader = { colSpan: 1, rowSpan: 2 };
  const firstValue = { colSpan: 1, rowSpan: 1 };
  const secondValue = { colSpan: 1, rowSpan: 1 };
  const rows = [
    { children: [rowHeader, firstValue] },
    { children: [secondValue] },
  ];
  const cells = handler.getLogicalTableCells(rows);
  const secondValuePosition = cells.find((entry) => entry.cell === secondValue);

  assert.strictEqual(secondValuePosition.columnIndex, 1, 'rowspan must reserve logical column zero');
}

function testPrintCallAlwaysCleansUp() {
  const { handler } = loadPrintHandler();
  assert.strictEqual(
    typeof handler.triggerPrint,
    'function',
    'PrintHandler must own one cleanup safe print trigger'
  );
  const calls = [];
  const printFrame = {
    contentWindow: {
      focus() {
        calls.push('focus');
      },
      print() {
        calls.push('print');
      },
    },
  };

  handler.triggerPrint(printFrame, () => calls.push('cleanup'));

  assert.deepStrictEqual(calls, ['focus', 'print', 'cleanup']);
}

function testPrintDependencyFailureLeavesPageUntouched() {
  const document = {
    title: 'Original page title',
    body: {
      appended: 0,
      appendChild() {
        this.appended += 1;
      },
    },
    getElementById(id) {
      return id === 'markdown-editor' ? { value: '# Test' } : null;
    },
    createElement() {
      throw new Error('an iframe must not be created before dependency checks finish');
    },
  };
  const { context, handler } = loadPrintHandler({ document });
  context.window.MarkTideCodeBlockRenderer = {
    createRenderer() {
      return {};
    },
  };
  context.window.MarkTideRenderer = {
    parseMarkdown() {
      return '<h1>Test</h1>';
    },
    prepareRenderedHtml(html) {
      return html;
    },
  };
  context.window.MarkTideSanitizer = {
    sanitize(html) {
      return html;
    },
  };
  context.window.MarkTideImportExport = {
    generateSmartFilename() {
      return 'Test';
    },
  };
  handler.preparePrintTables = (html) => html;

  assert.throws(
    () => handler.printPreview(),
    /Shared highlight theme helper is required/,
    'the missing shared dependency must be reported'
  );
  assert.strictEqual(document.title, 'Original page title');
  assert.strictEqual(document.body.appended, 0);
}

function testDarkHtmlExportDoesNotInjectPrintTokens() {
  const html = createHtmlExportHarness().exportHtml();

  assert(html.includes('dark-highlight.css'), 'dark export must load the dark Highlight theme');
  assert(!html.includes('LIGHT_PRINT_TOKENS'), 'HTML export must not inject light PDF token colors');
}

function testHtmlExportUsesSharedRenderedHtmlPipeline() {
  const html = createHtmlExportHarness().exportHtml();

  assert(html.includes('<p>EMOJI_READY</p>'), 'HTML export must use the shared rendered HTML result');
  assert(!html.includes('SANITIZED_WITHOUT_EMOJI'), 'HTML export must not bypass shared emoji post processing');
}

function testHtmlExportEnhancesValidMermaidAfterBatchFailure() {
  const html = createHtmlExportHarness().exportHtml();

  assert(
    /window\.MarkTideMermaidRenderPromise\s*=\s*window\.MarkTideMermaidShared\.renderDiagrams\(document,\s*\{\s*mode:\s*['"]html['"]\s*\}\)[\s\S]*?\.catch\([\s\S]*?\.finally\([\s\S]*?MarkTideMermaidToolbar\.enhance\(document\)/.test(html),
    'standalone HTML must enhance valid Mermaid diagrams even when another diagram rejects the batch'
  );
  assert(
    /function bootCodeWrap\([\s\S]*?MarkTideMermaidRenderPromise[\s\S]*?\.then\([\s\S]*?MarkTideMathJax\.typeset/.test(html),
    'standalone HTML must wait for Mermaid before starting MathJax'
  );
}

function testSharedRenderedHtmlPipelineSanitizesBeforeEmojis() {
  const { context, renderer } = loadMarkdownRendererHarness();
  const calls = [];
  const wrapper = { innerHTML: '', querySelectorAll: () => [] };
  context.document = {
    createElement() {
      return wrapper;
    },
  };
  context.window.MarkTideSanitizer = {
    sanitize(html, options) {
      calls.push(`sanitize:${html}:${options.mode}`);
      return '<p>SANITIZED</p>';
    },
  };
  context.window.MarkTideUtils = {
    processEmojis(element) {
      calls.push(`emoji:${element.innerHTML}`);
      element.innerHTML = '<p>EMOJI_READY</p>';
    },
  };

  assert.strictEqual(
    typeof renderer.prepareRenderedHtml,
    'function',
    'MarkdownRenderer must own shared sanitize and emoji post processing'
  );
  assert.strictEqual(renderer.prepareRenderedHtml('<p>RAW</p>', { mode: 'html' }), '<p>EMOJI_READY</p>');
  assert.deepStrictEqual(calls, [
    'sanitize:<p>RAW</p>:html',
    'emoji:<p>SANITIZED</p>',
  ]);
}

async function testPreviewUsesSharedRenderedHtmlPipeline() {
  const { context, renderer } = loadMarkdownRendererHarness();
  const preview = { innerHTML: '' };
  renderer.initialized = true;
  renderer.markdownEditor = { value: '# Preview' };
  renderer.markdownPreview = preview;
  renderer.parseMarkdown = () => '<p>PARSED</p>';
  renderer.prepareRenderedHtml = () => '<p>PIPELINE_RESULT</p>';
  context.window.MarkTideSanitizer = {
    sanitize() {
      return '<p>OLD_DIRECT_RESULT</p>';
    },
  };

  await renderer.renderMarkdown();

  assert.strictEqual(preview.innerHTML, '<p>PIPELINE_RESULT</p>');
}

async function testPreviewErrorFallbackEscapesUntrustedText() {
  const { context, renderer } = loadMarkdownRendererHarness();
  const preview = { innerHTML: '' };
  context.console = {
    error() {},
    warn() {},
  };
  renderer.initialized = true;
  renderer.markdownEditor = { value: '<img src=x onerror="alert(1)">' };
  renderer.markdownPreview = preview;
  renderer.parseMarkdown = () => {
    throw new Error('<script>alert(2)</script>');
  };

  await renderer.renderMarkdown();

  assert(!preview.innerHTML.includes('<img'), 'raw Markdown must not become live HTML in the error view');
  assert(!preview.innerHTML.includes('<script'), 'error text must not become live HTML in the error view');
  assert(preview.innerHTML.includes('&lt;img'));
  assert(preview.innerHTML.includes('&lt;script'));
}

function testPdfExportUsesSharedRenderedHtmlPipeline() {
  const html = createPdfExportHarness().exportHtml();

  assert(html.includes('<p>EMOJI_READY</p>'), 'PDF export must use the shared rendered HTML result');
  assert(!html.includes('SANITIZED_WITHOUT_EMOJI'), 'PDF export must not bypass shared emoji post processing');
}

function testInvalidMermaidDoesNotReceiveToolbar() {
  const helper = loadMermaidShared();
  assert.strictEqual(
    typeof helper.isMermaidErrorSvg,
    'function',
    'the shared Mermaid helper must own error SVG detection'
  );
  const errorSvg = {
    getAttribute(name) {
      return name === 'aria-roledescription' ? 'error' : '';
    },
    querySelector() {
      return null;
    },
  };
  assert.strictEqual(helper.isMermaidErrorSvg(errorSvg), true);
  const validSvgWithUserErrorClass = {
    getAttribute(name) {
      return name === 'aria-roledescription' ? 'flowchart-v2' : '';
    },
    querySelector() {
      return {};
    },
  };
  assert.strictEqual(
    helper.isMermaidErrorSvg(validSvgWithUserErrorClass),
    false,
    'user class names must not turn a valid diagram into an error'
  );

  const { context, Toolbar } = loadMermaidToolbar();
  context.window.MarkTideMermaidShared = {
    isMermaidErrorSvg: helper.isMermaidErrorSvg,
    prepareSvgClone() {},
    sanitizeSvgInteractions() {},
  };
  const container = {
    dataset: {},
    inserted: false,
    querySelector(selector) {
      return selector === '.mermaid svg' ? errorSvg : null;
    },
    insertAdjacentHTML() {
      this.inserted = true;
    },
  };
  const rootElement = {
    querySelectorAll() {
      return [container];
    },
  };

  new Toolbar().enhance(rootElement);

  assert.strictEqual(container.inserted, false, 'invalid Mermaid output must not get image controls');
  assert.strictEqual(container.dataset.mermaidToolbarReady, undefined);
}

async function testMathJaxUsesOneExplicitLifecycle() {
  const context = loadMathJaxConfig();
  assert.strictEqual(
    context.window.MathJax.startup && context.window.MathJax.startup.typeset,
    false,
    'MathJax startup must not race the shared explicit typeset pass'
  );
  assert.strictEqual(
    typeof context.window.MarkTideMathJax.typeset,
    'function',
    'shared MathJax helper must own explicit typesetting'
  );
  assert.strictEqual(
    typeof context.window.MarkTideMathJax.updateContent,
    'function',
    'shared MathJax helper must clear old math before replacing dynamic content'
  );

  const target = { id: 'target' };
  const calls = [];
  const firstTypeset = createDeferred();
  let typesetCount = 0;
  context.window.MathJax = {
    typesetClear(elements) {
      calls.push({ type: 'clear', elements });
    },
    typesetPromise(elements) {
      typesetCount += 1;
      calls.push({ type: 'typeset', elements, count: typesetCount });
      return typesetCount === 1 ? firstTypeset.promise : Promise.resolve();
    },
  };
  await context.window.MarkTideMathJax.updateContent(target, () => calls.push({ type: 'update' }));
  const firstPromise = context.window.MarkTideMathJax.typeset(target);
  const secondPromise = context.window.MarkTideMathJax.typeset(target);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepStrictEqual(calls.map((call) => call.type), ['clear', 'update', 'typeset']);
  firstTypeset.resolve();
  await Promise.all([firstPromise, secondPromise]);
  assert.deepStrictEqual(calls.map((call) => call.type), ['clear', 'update', 'typeset', 'typeset']);
  assert.strictEqual(calls[0].elements[0], target);
  assert.strictEqual(calls[2].elements[0], target);

  const standalone = {
    document: { body: {} },
    window: {},
  };
  vm.createContext(standalone);
  vm.runInContext(context.window.MarkTideMathJax.getConfigScript(), standalone);
  assert.strictEqual(standalone.window.MathJax.startup.typeset, false);
  assert.strictEqual(typeof standalone.window.MarkTideMathJax.typeset, 'function');
  assert.strictEqual(typeof standalone.window.MarkTideMathJax.updateContent, 'function');
}

async function testPreviewSequencesMermaidBeforeMathJax() {
  const { context, renderer } = loadMarkdownRendererHarness();
  const preview = { innerHTML: '' };
  const mermaid = createDeferred();
  const calls = [];
  renderer.initialized = true;
  renderer.markdownEditor = { value: '# Preview' };
  renderer.markdownPreview = preview;
  renderer.parseMarkdown = () => '<p>PARSED</p>';
  renderer.prepareRenderedHtml = () => '<p>READY</p>';
  context.window.MarkTideMathJax = {
    updateContent(rootElement, update) {
      calls.push('clear');
      update();
      calls.push('update');
      return Promise.resolve(true);
    },
    typeset() {
      calls.push('mathjax');
      return Promise.resolve(true);
    },
  };
  context.window.MarkTideMermaid = {
    renderDiagrams() {
      calls.push('mermaid:start');
      return mermaid.promise.then(() => calls.push('mermaid:end'));
    },
  };
  context.window.MarkTideMermaidToolbar = {
    enhance() {
      calls.push('toolbar');
    },
  };

  const renderPromise = renderer.renderMarkdown();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepStrictEqual(calls, ['clear', 'update', 'mermaid:start']);
  mermaid.resolve();
  await renderPromise;
  assert.deepStrictEqual(calls, [
    'clear',
    'update',
    'mermaid:start',
    'mermaid:end',
    'toolbar',
    'mathjax',
  ]);
}

async function testMermaidUsesOneSharedRenderLifecycle() {
  const { calls, diagrams, helper, rootElement } = loadMermaidRenderHarness();
  assert.strictEqual(
    typeof helper.renderDiagrams,
    'function',
    'shared Mermaid helper must own initialize, run, and stabilization'
  );

  const rendered = await helper.renderDiagrams(rootElement, {
    mode: 'html',
    theme: 'dark',
  });

  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].type, 'initialize');
  assert.strictEqual(calls[0].config.securityLevel, 'strict');
  assert.strictEqual(calls[0].config.flowchart.useMaxWidth, false);
  assert.strictEqual(calls[1].type, 'run');
  assert.deepStrictEqual(calls[1].nodes, diagrams);
  assert.deepStrictEqual(Array.from(rendered), diagrams);
}

function testPrintStylesLeaveTypographyToSharedMarkdownStyles() {
  const printStyles = loadPrintStyles().getStyles();

  assert(
    !/font-family\s*:/i.test(printStyles),
    'print layout CSS must not replace the shared Markdown font families'
  );
}

const tests = [
  ['nested fenced code stays literal', testNestedFencesStayLiteral],
  ['code blocks require the shared highlighter', testCodeBlocksRequireSharedHighlighter],
  ['Markdown setup has one syntax highlighter', testMarkdownSetupDoesNotRegisterSecondHighlighter],
  ['inline styles block layout takeover', testInlineStylesBlockLayoutTakeover],
  ['inline styles preserve approved visual values', testInlineStylesPreserveApprovedVisualValues],
  ['inline styles reject executable values', testInlineStylesRejectExecutableValues],
  ['embedded style tags are blocked', testEmbeddedStyleTagsAreBlocked],
  ['inline styles reject oversized values', testInlineStylesRejectOversizedValues],
  ['print tables use logical column counts', testPrintTableUsesLogicalColumnCount],
  ['print tables track logical cell positions', testPrintTableTracksLogicalCellPositions],
  ['print calls always clean up', testPrintCallAlwaysCleansUp],
  ['print dependency failures leave the page untouched', testPrintDependencyFailureLeavesPageUntouched],
  ['dark HTML export does not inject print tokens', testDarkHtmlExportDoesNotInjectPrintTokens],
  ['HTML export uses shared rendered HTML pipeline', testHtmlExportUsesSharedRenderedHtmlPipeline],
  ['HTML export enhances valid Mermaid after batch failure', testHtmlExportEnhancesValidMermaidAfterBatchFailure],
  ['shared rendered HTML pipeline sanitizes before emojis', testSharedRenderedHtmlPipelineSanitizesBeforeEmojis],
  ['Preview uses shared rendered HTML pipeline', testPreviewUsesSharedRenderedHtmlPipeline],
  ['Preview error fallback escapes untrusted text', testPreviewErrorFallbackEscapesUntrustedText],
  ['PDF export uses shared rendered HTML pipeline', testPdfExportUsesSharedRenderedHtmlPipeline],
  ['invalid Mermaid does not receive a toolbar', testInvalidMermaidDoesNotReceiveToolbar],
  ['MathJax uses one explicit lifecycle', testMathJaxUsesOneExplicitLifecycle],
  ['Preview sequences Mermaid before MathJax', testPreviewSequencesMermaidBeforeMathJax],
  ['Mermaid uses one shared render lifecycle', testMermaidUsesOneSharedRenderLifecycle],
  ['print styles leave typography to shared Markdown styles', testPrintStylesLeaveTypographyToSharedMarkdownStyles],
];

async function run() {
  let failed = false;

  for (const [name, test] of tests) {
    try {
      await test();
      console.log(`PASS ${name}`);
    } catch (error) {
      failed = true;
      console.error(`FAIL ${name}`);
      console.error(error.stack || error.message);
    }
  }

  if (failed) {
    process.exitCode = 1;
  }
}

run();
