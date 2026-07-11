// Shared MathJax configuration for preview and export surfaces.
(function (window) {
  function createConfig() {
    return {
      tex: {
        inlineMath: [['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
      }
    };
  }

  function getConfigScript() {
    return `window.MathJax = ${JSON.stringify(createConfig())};`;
  }

  window.MarkTideMathJax = {
    createConfig,
    getConfigScript,
  };

  window.MathJax = createConfig();
})(window);
