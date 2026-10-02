// Shared code block rendering for preview and export surfaces.
(function (window) {
  function createId(prefix) {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function wrapButtonHtml() {
    const wrapSvg =
      '<svg class="wrap-code-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><line x1="1.5" y1="3.5" x2="14" y2="3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="1.5" y1="8" x2="9.5" y2="8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="1.5" y1="12.5" x2="6" y2="12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const unwrapSvg =
      '<svg class="wrap-code-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><line x1="1.75" y1="3.5" x2="14.25" y2="3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="4.25" y1="8" x2="11.75" y2="8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="5.75" y1="12.5" x2="10.25" y2="12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

    return (
      '<button type="button" class="wrap-code-btn" aria-hidden="true" tabindex="-1" aria-pressed="false" title="Wrap long lines" aria-label="Wrap long lines" data-marktide-tip="Wrap long lines">' +
      '<span class="wrap-code-icon wrap-code-icon--wrap">' +
      wrapSvg +
      '</span>' +
      '<span class="wrap-code-icon wrap-code-icon--unwrap">' +
      unwrapSvg +
      '</span></button>'
    );
  }

  function encodeMermaidSource(source) {
    return encodeURIComponent(source || '');
  }

  function isMermaidLanguage(language) {
    return String(language || '').trim().toLowerCase() === 'mermaid';
  }

  function highlightCode(code, language) {
    if (!window.MarktideCodeHighlight) {
      throw new Error('Shared code highlight helper is required for code block rendering.');
    }

    return window.MarktideCodeHighlight.highlight(code, language);
  }

  function renderMermaidBlock(code, options) {
    const settings = options || {};
    const uniqueId = createId('mermaid-diagram');
    const sourceAttr = settings.includeMermaidSource
      ? ` data-mermaid-source="${encodeMermaidSource(code)}"`
      : '';

    return `<div class="mermaid-container"${sourceAttr}><div class="mermaid" id="${uniqueId}">${code}</div></div>`;
  }

  function renderEnhancedCodeBlock(code, language) {
    const displayLanguage = language || 'text';
    const uniqueId = createId('code-block');
    const highlighted = highlightCode(code, language);

    return `
      <div class="enhanced-code-block">
        <div class="code-block-header">
          <span class="code-language">${displayLanguage}</span>
          <div class="code-block-header-actions">
            ${wrapButtonHtml()}
            <button type="button" class="copy-code-btn" data-code-id="${uniqueId}" title="Copy code" aria-label="Copy code" data-marktide-tip="Copy code">
              <i class="bi bi-copy"></i>
            </button>
          </div>
        </div>
        <pre tabindex="0" role="region" aria-label="Code sample. Scroll horizontally for long lines."><code class="hljs ${highlighted.language}" id="${uniqueId}">${highlighted.value}</code></pre>
      </div>
    `;
  }

  function renderPlainCodeBlock(code, language) {
    const highlighted = highlightCode(code, language);
    return `<pre><code class="hljs ${highlighted.language}">${highlighted.value}</code></pre>`;
  }

  function createRenderer(options) {
    const settings = options || {};
    const renderer = new marked.Renderer();
    const enhanced = settings.enhanced !== false;

    renderer.code = function (code, language) {
      if (isMermaidLanguage(language)) {
        return renderMermaidBlock(code, {
          includeMermaidSource: settings.includeMermaidSource !== false
        });
      }

      return enhanced
        ? renderEnhancedCodeBlock(code, language)
        : renderPlainCodeBlock(code, language);
    };

    return renderer;
  }

  window.MarkTideCodeBlockRenderer = {
    createRenderer,
  };
})(window);
