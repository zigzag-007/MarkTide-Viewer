// Shared Markdown document styles for preview and export surfaces.
(function (window) {
  const MARKDOWN_CONTENT_HREF = 'assets/css/markdown-content.css';
  const MERMAID_TOOLBAR_HREF = 'assets/css/mermaid-toolbar.css';

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
    return loadedStyles || readStylesheetWithRequest(hrefToMatch);
  }

  function getContentStyles() {
    return getStylesheet(MARKDOWN_CONTENT_HREF);
  }

  function getMermaidToolbarStyles() {
    return getStylesheet(MERMAID_TOOLBAR_HREF);
  }

  function getThemeVariables(theme) {
    const isDarkMode = theme === 'dark';

    if (isDarkMode) {
      return `
        --preview-bg: #000000;
        --preview-text-color: #e6edf3;
        --text-color: #e6edf3;
        --border-color: #1a1a1a;
        --accent-color: #4fc3f7;
        --blockquote-color: #cccccc;
        --blockquote-bold-color: #E2E8F0;
        --list-marker-color: #e6edf3;
        --list-item-color: #e6edf3;
        --markdown-heading-color: #f0f3f6;
        --markdown-bold-color: #f0f3f6;
        --markdown-bold-weight: 900;
        --markdown-hr-color: #30363d;
        --table-bg: #0f1318;
        --table-row-alt: #141a22;
        --table-border: #30363d;
        --code-pre-bg: #242628;
        --code-inline-bg: #29241E;
        --code-inline-color: #FFD085;
        --code-inline-font-weight: 400;
        --code-header-bg: rgba(255, 255, 255, 0.05);
        --code-header-border: rgba(255, 255, 255, 0.1);
        --code-block-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        --code-block-hover-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        --copy-code-btn-hover-bg: #3a3a3a;
        --copy-code-btn-active-bg: #4a4a4a;
        --copy-code-btn-copied-bg: #3a3a3a;
        --hljs-color: #e8eaed;
      `;
    }

    return `
      --preview-bg: #ffffff;
      --preview-text-color: #24292e;
      --text-color: #24292e;
      --border-color: #e0e0e0;
      --accent-color: #4fc3f7;
      --blockquote-color: #666666;
      --blockquote-bold-color: inherit;
      --list-marker-color: currentColor;
      --list-item-color: inherit;
      --markdown-heading-color: #24292e;
      --markdown-bold-color: inherit;
      --markdown-bold-weight: 900;
      --markdown-hr-color: #c9d1d9;
      --table-bg: #ffffff;
      --table-row-alt: #f8f9fa;
      --table-border: #e0e0e0;
      --code-pre-bg: #f6f8fa;
      --code-inline-bg: #FFF8EC;
      --code-inline-color: #8B4500;
      --code-inline-font-weight: 600;
      --code-header-bg: rgba(0, 0, 0, 0.03);
      --code-header-border: rgba(0, 0, 0, 0.08);
      --code-block-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      --code-block-hover-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      --copy-code-btn-hover-bg: #e0e0e0;
      --copy-code-btn-active-bg: #d0d0d0;
      --copy-code-btn-copied-bg: #e0e0e0;
      --hljs-color: inherit;
    `;
  }

  function getStandaloneStyles(options) {
    const settings = options || {};
    const theme = settings.theme === 'dark' ? 'dark' : 'light';
    const mode = settings.mode || 'html';
    const maxWidth = mode === 'html' ? '920px' : 'none';
    const bodyPadding = mode === 'html' ? '45px' : '0';
    const articlePadding = mode === 'html' ? '0' : '20px';
    const contentStyles = getContentStyles();
    const mermaidToolbarStyles = mode === 'html' ? getMermaidToolbarStyles() : '';

    return `
      html,
      body {
        box-sizing: border-box;
        background-color: ${theme === 'dark' ? '#000000' : '#ffffff'} !important;
        color: ${theme === 'dark' ? '#e6edf3' : '#24292e'} !important;
        color-scheme: ${theme};
      }

      body {
        min-width: 200px;
        max-width: ${maxWidth};
        margin: 0 auto;
        padding: ${bodyPadding};
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
      }

      :root,
      html,
      body,
      .markdown-body {
        ${getThemeVariables(theme)}
      }

      ${contentStyles}

      ${mermaidToolbarStyles}

      .markdown-body {
        max-width: ${maxWidth} !important;
        padding: ${articlePadding} !important;
      }
    `;
  }

  window.MarkTideMarkdownStyles = {
    getContentStyles,
    getMermaidToolbarStyles,
    getStandaloneStyles,
  };
})(window);
