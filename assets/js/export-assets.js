// Shared external asset URLs for standalone HTML and PDF export documents.
(function (window) {
  const fontPreconnect = [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  ].join('\n');

  const fontStylesheets = [
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">',
    '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">',
    '<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap" rel="stylesheet">'
  ].join('\n');

  const links = {
    githubMarkdownCss: 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css',
    bootstrapIconsCss: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'
  };

  const scripts = {
    highlightCore: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
    highlightDos: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/dos.min.js',
    highlightDockerfile: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/dockerfile.min.js',
    highlightPowershell: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/powershell.min.js',
    mermaid: 'https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js',
    mathJax: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js'
  };

  function stylesheetTag(href) {
    return `<link rel="stylesheet" href="${href}">`;
  }

  function scriptTag(src) {
    return `<script src="${src}"><\/script>`;
  }

  function getFontLinks() {
    return `${fontPreconnect}\n${fontStylesheets}`;
  }

  function getCommonStylesheetLinks(options = {}) {
    const settings = options || {};
    const includeBootstrapIcons = settings.includeBootstrapIcons !== false;
    const linksOut = [
      stylesheetTag(links.githubMarkdownCss)
    ];

    if (includeBootstrapIcons) {
      linksOut.push(stylesheetTag(links.bootstrapIconsCss));
    }

    return linksOut.join('\n');
  }

  function getHighlightScriptTags() {
    return [
      scriptTag(scripts.highlightCore),
      scriptTag(scripts.highlightDos),
      scriptTag(scripts.highlightDockerfile),
      scriptTag(scripts.highlightPowershell)
    ].join('\n');
  }

  function getMermaidScriptTag() {
    return scriptTag(scripts.mermaid);
  }

  function getMathJaxScriptTag() {
    return scriptTag(scripts.mathJax);
  }

  window.MarkTideExportAssets = {
    links,
    scripts,
    getFontLinks,
    getCommonStylesheetLinks,
    getHighlightScriptTags,
    getMermaidScriptTag,
    getMathJaxScriptTag,
  };
})(window);
