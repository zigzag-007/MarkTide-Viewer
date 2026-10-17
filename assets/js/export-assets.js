// Shared asset URLs for standalone HTML and PDF export documents.
(function (window) {
  const profiles = {
    html: {
      fontLinks: [
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">',
        '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">',
        '<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap" rel="stylesheet">'
      ],
      githubMarkdownCss: 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css',
      bootstrapIconsCss: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
      mermaid: 'https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js',
      mathJax: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js'
    },
    pdf: {
      fontLinks: [
        'assets/vendor/fonts/inter.css',
        'assets/vendor/fonts/jetbrains-mono.css',
        'assets/vendor/fonts/fira-code.css'
      ],
      githubMarkdownCss: 'assets/vendor/github-markdown/github-markdown.min.css',
      bootstrapIconsCss: 'assets/vendor/bootstrap-icons/bootstrap-icons.min.css',
      mermaid: 'assets/vendor/mermaid/mermaid.min.js',
      mathJax: 'assets/vendor/mathjax/tex-mml-chtml.min.js'
    }
  };

  function getProfile(options = {}) {
    return options.mode === 'pdf' ? profiles.pdf : profiles.html;
  }

  function resolveAssetUrl(url, options = {}) {
    return options.mode === 'pdf' ? new URL(url, window.location.href).href : url;
  }

  function stylesheetTag(href) {
    return `<link rel="stylesheet" href="${href}">`;
  }

  function scriptTag(src) {
    return `<script src="${src}"><\/script>`;
  }

  function getFontLinks(options = {}) {
    const profile = getProfile(options);
    if (options.mode === 'pdf') {
      return profile.fontLinks
        .map((href) => stylesheetTag(resolveAssetUrl(href, options)))
        .join('\n');
    }

    return profile.fontLinks.join('\n');
  }

  function getCommonStylesheetLinks(options = {}) {
    const profile = getProfile(options);
    const includeBootstrapIcons = options.includeBootstrapIcons !== false;
    const linksOut = [
      stylesheetTag(resolveAssetUrl(profile.githubMarkdownCss, options))
    ];

    if (includeBootstrapIcons) {
      linksOut.push(stylesheetTag(resolveAssetUrl(profile.bootstrapIconsCss, options)));
    }

    return linksOut.join('\n');
  }

  function getMermaidScriptTag(options = {}) {
    const profile = getProfile(options);
    return scriptTag(resolveAssetUrl(profile.mermaid, options));
  }

  function getMathJaxScriptTag(options = {}) {
    const profile = getProfile(options);
    return scriptTag(resolveAssetUrl(profile.mathJax, options));
  }

  window.MarkTideExportAssets = {
    getFontLinks,
    getCommonStylesheetLinks,
    getMermaidScriptTag,
    getMathJaxScriptTag,
  };
})(window);
