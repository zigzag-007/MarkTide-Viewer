// Shared Markdown document styles for preview and export surfaces.
(function (window) {
  const MARKDOWN_CONTENT_HREF = 'assets/css/markdown-content.css';
  const MERMAID_TOOLBAR_HREF = 'assets/css/mermaid-toolbar.css';
  const READING_CONTROLS_HREF = 'assets/css/reading-controls.css';

  function normalizeHref(value) {
    return (value || '').replace(/\\/g, '/').split('?')[0].split('#')[0];
  }

  function stylesheetMatches(sheet, hrefToMatch) {
    const owner = sheet && sheet.ownerNode;
    const href = normalizeHref((owner && owner.getAttribute && owner.getAttribute('href')) || sheet.href);
    return href.endsWith(hrefToMatch);
  }

  function readLoadedStylesheet(hrefToMatch) {
    const sheets = Array.from(window.document.styleSheets || []);
    const sharedSheet = sheets.find((sheet) => stylesheetMatches(sheet, hrefToMatch));

    if (!sharedSheet || !sharedSheet.cssRules) {
      return '';
    }

    try {
      return Array.from(sharedSheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
    } catch (error) {
      console.warn('Unable to read shared Markdown stylesheet:', error);
      return '';
    }
  }

  function readStylesheetWithRequest(hrefToMatch) {
    try {
      const request = new XMLHttpRequest();
      request.open('GET', hrefToMatch, false);
      request.send(null);

      if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
        return request.responseText || '';
      }
    } catch (error) {
      console.warn('Unable to request shared Markdown stylesheet:', error);
    }

    return '';
  }

  function getStylesheet(hrefToMatch) {
    const loadedStyles = readLoadedStylesheet(hrefToMatch);
    const requestedStyles = loadedStyles || readStylesheetWithRequest(hrefToMatch);

    if (!requestedStyles.trim()) {
      throw new Error(`Shared stylesheet is required: ${hrefToMatch}`);
    }

    return requestedStyles;
  }

  function getContentStyles() {
    return getStylesheet(MARKDOWN_CONTENT_HREF);
  }

  function getMermaidToolbarStyles() {
    return getStylesheet(MERMAID_TOOLBAR_HREF);
  }

  function getStandaloneStyles(options) {
    const settings = options || {};
    const mode = settings.mode || 'html';
    const maxWidth = mode === 'html' ? '920px' : 'none';
    const articlePadding = mode === 'html' ? '' : 'padding: 20px !important;';
    const contentStyles = getContentStyles();
    const mermaidToolbarStyles = mode === 'html' ? getMermaidToolbarStyles() : '';
    const readingControlStyles = mode === 'html' ? getStylesheet(READING_CONTROLS_HREF) : '';

    return `
      html,
      body {
        box-sizing: border-box;
        background-color: var(--markdown-bg) !important;
        color: var(--markdown-text-color) !important;
        color-scheme: var(--markdown-color-scheme);
      }

      body {
        min-width: 200px;
        max-width: ${maxWidth};
        margin: 0 auto;
        padding: 0;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
      }

      ${contentStyles}

      ${mermaidToolbarStyles}

      ${readingControlStyles}

      .markdown-body {
        max-width: ${maxWidth} !important;
        ${articlePadding}
      }
    `;
  }

  window.MarkTideMarkdownStyles = {
    getStandaloneStyles,
  };
})(window);
