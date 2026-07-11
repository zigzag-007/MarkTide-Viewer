// Print handling functionality

class PrintHandler {
  constructor() {
    this.printButton = null;
    this.mobilePrintButton = null;
  }

  init() {
    this.printButton = document.getElementById("print-button");
    this.mobilePrintButton = document.getElementById("mobile-print-button");
    
    // removed old event listeners since we now use dropdown menu
  }

  preparePrintTables(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    const needsSoftWrap = (text) => /https?:\/\/|[A-Za-z]:\\|[_-]{2,}|\S{28,}/.test(text);
    const addWrappedText = (fragment, text) => {
      text.split(/(\s+)/).forEach((piece) => {
        if (!piece) return;

        if (/^\s+$/.test(piece) || piece.length < 28) {
          fragment.appendChild(document.createTextNode(piece));
          return;
        }

        piece.split(/([/\\._-])/).forEach((part) => {
          if (!part) return;

          if (/[/\\._-]/.test(part)) {
            fragment.appendChild(document.createTextNode(part));
            fragment.appendChild(document.createElement('wbr'));
            return;
          }

          for (let index = 0; index < part.length; index += 18) {
            fragment.appendChild(document.createTextNode(part.slice(index, index + 18)));

            if (index + 18 < part.length) {
              fragment.appendChild(document.createElement('wbr'));
            }
          }
        });
      });
    };

    wrapper.querySelectorAll('table').forEach((table) => {
      const firstRow = table.querySelector('tr');
      const columnCount = firstRow ? firstRow.children.length : 0;
      const hasLongValue = Array.from(table.querySelectorAll('td:not(:first-child), th:not(:first-child)'))
        .some((cell) => needsSoftWrap(cell.textContent || ''));

      if (columnCount > 0) {
        table.classList.add(`marktide-print-cols-${columnCount}`);
      }

      if (columnCount >= 5) {
        table.classList.add('marktide-print-wide-table');
      }

      if (hasLongValue) {
        table.classList.add('marktide-print-long-table');
      }
    });

    wrapper.querySelectorAll('table td:not(:first-child), table th:not(:first-child)').forEach((cell) => {
      if (!needsSoftWrap(cell.textContent || '')) return;

      cell.classList.add('marktide-print-soft-wrap');

      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!needsSoftWrap(node.nodeValue || '')) {
            return NodeFilter.FILTER_REJECT;
          }

          if (node.parentElement && node.parentElement.closest('pre')) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const textNodes = [];

      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      textNodes.forEach((node) => {
        const fragment = document.createDocumentFragment();
        addWrappedText(fragment, node.nodeValue || '');
        node.parentNode.replaceChild(fragment, node);
      });
    });

    return wrapper.innerHTML;
  }

  stabilizeMermaidDiagrams(printDocument) {
    const printWindow = printDocument.defaultView || window;
    const helper = printWindow.MarkTideMermaidShared || window.MarkTideMermaidShared;

    if (helper && helper.stabilizeMermaidDiagrams) {
      helper.stabilizeMermaidDiagrams(printDocument, { stabilizeDimensions: true });
    }
  }

  printPreview(titleOverride) {
    // Store original title and set a shorter one for PDF export
    const originalTitle = document.title;
    
    const markdownEditor = document.getElementById('markdown-editor');
    let smartTitle = 'MarkTide Document';
    if (titleOverride) {
      smartTitle = titleOverride;
    } else if (markdownEditor && window.MarkTideImportExport) {
      smartTitle = window.MarkTideImportExport.generateSmartFilename(markdownEditor.value, '') || 'MarkTide Document';
    }
    document.title = smartTitle;
    const markdown = markdownEditor.value;
    const normalizedMarkdown = (window.MarkTideRenderer && window.MarkTideRenderer.normalizeListSyntax)
      ? window.MarkTideRenderer.normalizeListSyntax(markdown)
      : markdown;
    
    const printRenderer = window.MarkTideCodeBlockRenderer
      ? window.MarkTideCodeBlockRenderer.createRenderer({
          enhanced: false,
          includeMermaidSource: false,
        })
      : new marked.Renderer();
    
    // Use the clean renderer for print/PDF
    const html = (window.MarkTideRenderer && window.MarkTideRenderer.parseMarkdown)
      ? window.MarkTideRenderer.parseMarkdown(markdown, { renderer: printRenderer })
      : marked.parse(normalizedMarkdown, { renderer: printRenderer });
    const sanitizedHtml = window.MarkTideSanitizer
      ? window.MarkTideSanitizer.sanitize(html, { mode: 'print' })
      : DOMPurify.sanitize(html);
    const printableHtml = this.preparePrintTables(sanitizedHtml);
    const highlightTheme = window.MarktideHighlightTheme
      ? window.MarktideHighlightTheme.getThemeUrl(false)
      : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
    const printHighlightTokenStyles = window.MarktideHighlightTheme
      ? window.MarktideHighlightTheme.getPrintTokenCss()
      : '';
    const markdownPrintStyles = window.MarkTideMarkdownStyles
      ? window.MarkTideMarkdownStyles.getStandaloneStyles({ theme: 'light', mode: 'print' })
      : '';
    const printStyles = window.MarkTidePrintStyles
      ? window.MarkTidePrintStyles.getStyles({ printHighlightTokenStyles, markdownPrintStyles })
      : `${printHighlightTokenStyles}
${markdownPrintStyles}`;

    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    printFrame.style.width = '794px';
    printFrame.style.height = '1123px';
    printFrame.style.border = 'none';
    
    document.body.appendChild(printFrame);
    
    const printDocument = printFrame.contentDocument || printFrame.contentWindow.document;
    const printHandler = this;
    
    printDocument.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${smartTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css">
  <link rel="stylesheet" href="${highlightTheme}">
  <style>
    ${printStyles}
  </style>
</head>
<body>
  <article class="markdown-body">
      ${printableHtml}
  </article>
  
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/dos.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/dockerfile.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/powershell.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js"></script>
  <script>
    ${window.MarkTideCreateMermaidShared ? `window.MarkTideCreateMermaidShared = ${window.MarkTideCreateMermaidShared.toString()}; window.MarkTideMermaidShared = window.MarkTideCreateMermaidShared(window);` : ''}
  </script>
  <script>
    ${window.MarkTideMathJax ? window.MarkTideMathJax.getConfigScript() : ''}
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js"></script>
</body>
</html>
    `);
    
    printDocument.close();

    let cleanupDone = false;
    let cleanupTimer = null;
    const cleanupPrintFrame = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      if (cleanupTimer) {
        clearTimeout(cleanupTimer);
        cleanupTimer = null;
      }
      if (printFrame.parentNode) {
        document.body.removeChild(printFrame);
      }
      document.title = originalTitle;
    };
    
    // Wait for content to load, then trigger print
    printFrame.onload = function() {
      setTimeout(async function() {
        // Apply syntax highlighting
        printFrame.contentDocument.querySelectorAll('pre code').forEach((block) => {
          if (!block.classList.contains('mermaid') && !block.classList.contains('pseudocode')) {
            try {
              printFrame.contentWindow.hljs.highlightElement(block);
    } catch (e) {
              console.warn("Syntax highlighting failed:", e);
            }
          }
        });
        
        if (printFrame.contentDocument.fonts && printFrame.contentDocument.fonts.ready) {
          try {
            await printFrame.contentDocument.fonts.ready;
          } catch (e) {
            console.warn("Font loading check failed:", e);
          }
        }

        // Initialize and render Mermaid
        try {
          const mermaidConfig = window.MarkTideMermaid
            ? window.MarkTideMermaid.getMermaidConfig({ mode: 'pdf', theme: 'light' })
            : {
                startOnLoad: false,
                theme: 'neutral',
                themeVariables: {
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
                },
                securityLevel: 'strict',
                htmlLabels: false,
                flowchart: {
                  useMaxWidth: true,
                  htmlLabels: false,
                  curve: 'basis',
                  nodeSpacing: 60,
                  rankSpacing: 70
                },
                fontSize: 16
              };

          printFrame.contentWindow.mermaid.initialize(mermaidConfig);
          
          // Render mermaid diagrams one by one
          const mermaidElements = printFrame.contentDocument.querySelectorAll('.mermaid');
          if (mermaidElements.length > 0) {
            const mermaidRender = printFrame.contentWindow.mermaid.run
              ? printFrame.contentWindow.mermaid.run({ nodes: mermaidElements })
              : printFrame.contentWindow.mermaid.init(undefined, mermaidElements);

            if (mermaidRender && typeof mermaidRender.then === 'function') {
              await mermaidRender;
            }

            printHandler.stabilizeMermaidDiagrams(printFrame.contentDocument);
          }
        } catch (e) {
          console.warn("Mermaid rendering failed:", e);
        }
        
        // Render MathJax
        if (printFrame.contentWindow.MathJax) {
          try {
            printFrame.contentWindow.MathJax.typesetPromise([printFrame.contentDocument.body]).then(() => {
              // After MathJax is done, trigger print
              setTimeout(function() {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                cleanupTimer = setTimeout(cleanupPrintFrame, 180000);
              }, 300);
            }).catch((err) => {
              console.warn('MathJax typesetting failed:', err);
              // Still print even if MathJax fails
              setTimeout(function() {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                cleanupTimer = setTimeout(cleanupPrintFrame, 180000);
              }, 300);
            });
          } catch (e) {
            console.warn("MathJax rendering failed:", e);
            // Fallback print
            setTimeout(function() {
              printFrame.contentWindow.focus();
              printFrame.contentWindow.print();
              cleanupTimer = setTimeout(cleanupPrintFrame, 180000);
            }, 300);
          }
        } else {
          // No MathJax, just print
          setTimeout(function() {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            cleanupTimer = setTimeout(cleanupPrintFrame, 180000);
          }, 300);
        }
      }, 100);
    };
  }
}

// Create global instance
window.MarkTidePrintHandler = new PrintHandler();
