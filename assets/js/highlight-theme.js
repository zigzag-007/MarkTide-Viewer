// Shared highlight.js theme URLs and print token styles.
(function (window) {
  const MarktideHighlightTheme = {
    localLightUrl: 'assets/vendor/highlight/styles/github.min.css',
    localDarkUrl: 'assets/vendor/highlight/styles/monokai-sublime.min.css',
    htmlLightUrl: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
    htmlDarkUrl: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai-sublime.min.css',

    getThemeUrl(isDarkMode = false, options = {}) {
      if (options.mode === 'html') {
        return isDarkMode ? this.htmlDarkUrl : this.htmlLightUrl;
      }

      const localUrl = isDarkMode ? this.localDarkUrl : this.localLightUrl;
      return new URL(localUrl, window.location.href).href;
    },

    getPrintTokenCss() {
      return `
        .markdown-body pre code.hljs,
        .markdown-body pre code.hljs * {
          color: inherit;
        }

        .markdown-body pre code.hljs .hljs-keyword,
        .markdown-body pre code.hljs .hljs-selector-tag,
        .markdown-body pre code.hljs .hljs-subst {
          color: #d73a49 !important;
        }

        .markdown-body pre code.hljs .hljs-title,
        .markdown-body pre code.hljs .hljs-section,
        .markdown-body pre code.hljs .hljs-selector-id {
          color: #6f42c1 !important;
        }

        .markdown-body pre code.hljs .hljs-string,
        .markdown-body pre code.hljs .hljs-doctag,
        .markdown-body pre code.hljs .hljs-attr,
        .markdown-body pre code.hljs .hljs-regexp {
          color: #032f62 !important;
        }

        .markdown-body pre code.hljs .hljs-number,
        .markdown-body pre code.hljs .hljs-literal,
        .markdown-body pre code.hljs .hljs-variable,
        .markdown-body pre code.hljs .hljs-template-variable,
        .markdown-body pre code.hljs .hljs-tag .hljs-attr {
          color: #005cc5 !important;
        }

        .markdown-body pre code.hljs .hljs-comment,
        .markdown-body pre code.hljs .hljs-quote {
          color: #6a737d !important;
        }

        .markdown-body pre code.hljs .hljs-built_in,
        .markdown-body pre code.hljs .hljs-builtin-name,
        .markdown-body pre code.hljs .hljs-name,
        .markdown-body pre code.hljs .hljs-tag {
          color: #22863a !important;
        }

        .markdown-body pre code.hljs .hljs-type,
        .markdown-body pre code.hljs .hljs-class .hljs-title {
          color: #e36209 !important;
        }

        .markdown-body pre code.hljs .hljs-emphasis {
          font-style: italic !important;
        }

        .markdown-body pre code.hljs .hljs-strong {
          font-weight: 700 !important;
        }
      `;
    }
  };

  window.MarktideHighlightTheme = MarktideHighlightTheme;
})(window);
