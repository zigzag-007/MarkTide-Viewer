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

  getPrintMermaidConfig() {
    if (window.MarkTideMermaidShared && window.MarkTideMermaidShared.getMermaidConfig) {
      return window.MarkTideMermaidShared.getMermaidConfig({ mode: 'pdf', theme: 'light' });
    }

    throw new Error('Shared Mermaid helper is required for PDF export rendering.');
  }

  getExportAssets() {
    if (window.MarkTideExportAssets) {
      return window.MarkTideExportAssets;
    }

    throw new Error('Shared export assets are required for PDF export rendering.');
  }

  printPreview(titleOverride) {
    if (!window.MarkTideCodeBlockRenderer || !window.MarkTideRenderer || !window.MarkTideSanitizer) {
      throw new Error('Shared Markdown rendering pipeline is required for PDF export.');
    }

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
    
    const printRenderer = window.MarkTideCodeBlockRenderer.createRenderer({
      enhanced: false,
      includeMermaidSource: false,
    });
    
    // Use the clean renderer for print/PDF
    const html = window.MarkTideRenderer.parseMarkdown(markdown, { renderer: printRenderer });
    const sanitizedHtml = window.MarkTideSanitizer.sanitize(html, { mode: 'print' });
    const printableHtml = this.preparePrintTables(sanitizedHtml);
    if (!window.MarktideHighlightTheme) {
      throw new Error('Shared highlight theme helper is required for PDF export.');
    }

    const highlightTheme = window.MarktideHighlightTheme.getThemeUrl(false);
    const printHighlightTokenStyles = window.MarktideHighlightTheme.getPrintTokenCss();
    const markdownPrintStyles = window.MarkTideMarkdownStyles
      ? window.MarkTideMarkdownStyles.getStandaloneStyles({ theme: 'light', mode: 'print' })
      : '';
    const printStyles = window.MarkTidePrintStyles
      ? window.MarkTidePrintStyles.getStyles({ printHighlightTokenStyles, markdownPrintStyles })
      : `${printHighlightTokenStyles}
${markdownPrintStyles}`;
    const exportAssets = this.getExportAssets();

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
  ${exportAssets.getFontLinks()}
  ${exportAssets.getCommonStylesheetLinks({ includeBootstrapIcons: false })}
  <link rel="stylesheet" href="${highlightTheme}">
  <style>
    ${printStyles}
  </style>
</head>
<body>
  <article class="markdown-body">
      ${printableHtml}
  </article>
  
  ${exportAssets.getHighlightScriptTags()}
  ${exportAssets.getMermaidScriptTag()}
  <script>
    ${window.MarkTideCreateMermaidShared ? `window.MarkTideCreateMermaidShared = ${window.MarkTideCreateMermaidShared.toString()}; window.MarkTideMermaidShared = window.MarkTideCreateMermaidShared(window);` : ''}
  </script>
  <script>
    ${window.MarkTideMathJax ? window.MarkTideMathJax.getConfigScript() : ''}
  </script>
  ${exportAssets.getMathJaxScriptTag()}
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
          const mermaidConfig = printHandler.getPrintMermaidConfig();

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
