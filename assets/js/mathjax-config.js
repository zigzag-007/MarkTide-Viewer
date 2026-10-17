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
      },
      startup: {
        typeset: false
      }
    };
  }

  function createMathJaxHelper(runtimeWindow) {
    let operationQueue = Promise.resolve();

    function enqueue(operation) {
      const result = operationQueue
        .catch(() => false)
        .then(operation);
      operationQueue = result.catch(() => false);
      return result;
    }

    function updateContent(root, update) {
      const target = root || runtimeWindow.document.body;
      return enqueue(() => {
        if (runtimeWindow.MathJax && typeof runtimeWindow.MathJax.typesetClear === 'function') {
          runtimeWindow.MathJax.typesetClear([target]);
        }
        update();
        return true;
      });
    }

    function typeset(root) {
      const target = root || runtimeWindow.document.body;
      return enqueue(() => {
        if (!runtimeWindow.MathJax || typeof runtimeWindow.MathJax.typesetPromise !== 'function') {
          return false;
        }

        return Promise.resolve(runtimeWindow.MathJax.typesetPromise([target])).then(() => true);
      });
    }

    return {
      typeset,
      updateContent,
    };
  }

  function getConfigScript() {
    return `
      window.MathJax = ${JSON.stringify(createConfig())};
      window.MarkTideMathJax = (${createMathJaxHelper.toString()})(window);
    `;
  }

  const helper = createMathJaxHelper(window);

  window.MarkTideMathJax = {
    getConfigScript,
    typeset: helper.typeset,
    updateContent: helper.updateContent,
  };

  window.MathJax = createConfig();
})(window);
