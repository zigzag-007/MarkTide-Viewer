// Print handling functionality

class PrintHandler {
  getLogicalTableCells(rows) {
    const occupiedColumns = [];
    const logicalCells = [];

    Array.from(rows || []).forEach((row) => {
      let columnIndex = 0;

      Array.from(row.children || []).forEach((cell) => {
        while (occupiedColumns[columnIndex] > 0) {
          columnIndex += 1;
        }

        const columnSpan = Math.max(1, Number.parseInt(cell.colSpan, 10) || 1);
        const rowSpan = Math.max(1, Number.parseInt(cell.rowSpan, 10) || 1);
        logicalCells.push({
          cell,
          columnIndex,
          columnSpan,
          rowSpan,
        });
        for (let offset = 0; offset < columnSpan; offset += 1) {
          occupiedColumns[columnIndex + offset] = Math.max(
            occupiedColumns[columnIndex + offset] || 0,
            rowSpan
          );
        }
        columnIndex += columnSpan;
      });

      occupiedColumns.forEach((remainingRows, index) => {
        occupiedColumns[index] = Math.max(0, remainingRows - 1);
      });
    });

    return logicalCells;
  }

  getLogicalColumnCount(rows) {
    return this.getLogicalTableCells(rows).reduce((widestRow, entry) => {
      return Math.max(widestRow, entry.columnIndex + entry.columnSpan);
    }, 0);
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
      const rows = table.rows || table.querySelectorAll('tr');
      const logicalCells = this.getLogicalTableCells(rows);
      const valueCells = logicalCells
        .filter((entry) => entry.columnIndex > 0)
        .map((entry) => entry.cell);
      const columnCount = logicalCells.reduce((widestRow, entry) => {
        return Math.max(widestRow, entry.columnIndex + entry.columnSpan);
      }, 0);
      const hasLongValue = valueCells.some((cell) => needsSoftWrap(cell.textContent || ''));

      if (columnCount > 0) {
        table.classList.add(`marktide-print-cols-${columnCount}`);
      }

      if (columnCount >= 5) {
        table.classList.add('marktide-print-wide-table');
      }

      if (hasLongValue) {
        table.classList.add('marktide-print-long-table');
      }

      valueCells.forEach((cell) => {
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
    });

    return wrapper.innerHTML;
  }

  triggerPrint(printFrame, cleanup) {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } finally {
      cleanup();
    }
  }

  getMermaidFactory() {
    if (typeof window.MarkTideCreateMermaidShared === 'function') {
      return window.MarkTideCreateMermaidShared;
    }

    throw new Error('Shared Mermaid factory is required for PDF export rendering.');
  }

  getMathJaxConfig() {
    if (window.MarkTideMathJax
      && typeof window.MarkTideMathJax.getConfigScript === 'function') {
      return window.MarkTideMathJax;
    }

    throw new Error('Shared MathJax configuration is required for PDF export rendering.');
  }

  getExportAssets() {
    if (window.MarkTideExportAssets) {
      return window.MarkTideExportAssets;
    }

    throw new Error('Shared export assets are required for PDF export rendering.');
  }

  getMarkdownStyles() {
    if (window.MarkTideMarkdownStyles
      && typeof window.MarkTideMarkdownStyles.getStandaloneStyles === 'function') {
      return window.MarkTideMarkdownStyles;
    }

    throw new Error('Shared Markdown styles are required for PDF export rendering.');
  }

  getPrintStyles() {
    if (window.MarkTidePrintStyles
      && typeof window.MarkTidePrintStyles.getStyles === 'function') {
      return window.MarkTidePrintStyles;
    }

    throw new Error('Shared print styles are required for PDF export rendering.');
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
    const markdown = markdownEditor.value;
    
    const printRenderer = window.MarkTideCodeBlockRenderer.createRenderer({
      enhanced: false,
      includeMermaidSource: false,
    });
    
    // Use the clean renderer for print/PDF
    const html = window.MarkTideRenderer.parseMarkdown(markdown, { renderer: printRenderer });
    const renderedHtml = window.MarkTideRenderer.prepareRenderedHtml(html, { mode: 'pdf' });
    const printableHtml = this.preparePrintTables(renderedHtml);
    if (!window.MarktideHighlightTheme) {
      throw new Error('Shared highlight theme helper is required for PDF export.');
    }

    const highlightTheme = window.MarktideHighlightTheme.getThemeUrl(false);
    const printHighlightTokenStyles = window.MarktideHighlightTheme.getPrintTokenCss();
    const markdownPrintStyles = this.getMarkdownStyles().getStandaloneStyles({
      mode: 'pdf'
    });
    const printStyles = this.getPrintStyles().getStyles({
      printHighlightTokenStyles,
      markdownPrintStyles
    });
    const exportAssets = this.getExportAssets();
    const fontLinks = exportAssets.getFontLinks();
    const stylesheetLinks = exportAssets.getCommonStylesheetLinks({ includeBootstrapIcons: false });
    const mermaidScriptTag = exportAssets.getMermaidScriptTag();
    const mathJaxScriptTag = exportAssets.getMathJaxScriptTag();
    const mermaidFactoryScript = this.getMermaidFactory().toString();
    const mathJaxConfigScript = this.getMathJaxConfig().getConfigScript();

    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    printFrame.style.width = '794px';
    printFrame.style.height = '1123px';
    printFrame.style.border = 'none';
    
    const printHandler = this;
    const printDocumentHtml = `
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${smartTitle}</title>
  ${fontLinks}
  ${stylesheetLinks}
  <link rel="stylesheet" href="${highlightTheme}">
  <style>
    ${printStyles}
  </style>
</head>
<body>
  <article class="markdown-body">
      ${printableHtml}
  </article>
  
  ${mermaidScriptTag}
  <script>
    window.MarkTideCreateMermaidShared = ${mermaidFactoryScript};
    window.MarkTideMermaidShared = window.MarkTideCreateMermaidShared(window);
  </script>
  <script>
    ${mathJaxConfigScript}
  </script>
  ${mathJaxScriptTag}
</body>
</html>
    `;

    let cleanupDone = false;
    const cleanupPrintFrame = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      if (printFrame.parentNode) {
        document.body.removeChild(printFrame);
      }
      document.title = originalTitle;
    };

    document.title = smartTitle;
    try {
      document.body.appendChild(printFrame);
      const printDocument = printFrame.contentDocument
        || (printFrame.contentWindow && printFrame.contentWindow.document);
      if (!printDocument) {
        throw new Error('Unable to create the PDF print document.');
      }
      printDocument.write(printDocumentHtml);
      printDocument.close();
    } catch (error) {
      cleanupPrintFrame();
      throw error;
    }
    
    // Wait for content to load, then trigger print
    printFrame.onload = function() {
      setTimeout(async function() {
        if (printFrame.contentDocument.fonts && printFrame.contentDocument.fonts.ready) {
          try {
            await printFrame.contentDocument.fonts.ready;
          } catch (e) {
            console.warn("Font loading check failed:", e);
          }
        }

        // Initialize and render Mermaid
        try {
          const mermaidElements = printFrame.contentDocument.querySelectorAll('.mermaid');
          if (mermaidElements.length > 0) {
            await printFrame.contentWindow.MarkTideMermaidShared.renderDiagrams(
              printFrame.contentDocument,
              {
                mode: 'pdf',
                theme: 'light',
                nodes: mermaidElements,
                stabilizeDimensions: true,
              }
            );
          }
        } catch (e) {
          console.warn("Mermaid rendering failed:", e);
        }
        
        // Render MathJax
        if (printFrame.contentWindow.MarkTideMathJax) {
          try {
            printFrame.contentWindow.MarkTideMathJax.typeset(printFrame.contentDocument.body).then(() => {
              // After MathJax is done, trigger print
              setTimeout(function() {
                printHandler.triggerPrint(printFrame, cleanupPrintFrame);
              }, 300);
            }).catch((err) => {
              console.warn('MathJax typesetting failed:', err);
              // Still print even if MathJax fails
              setTimeout(function() {
                printHandler.triggerPrint(printFrame, cleanupPrintFrame);
              }, 300);
            });
          } catch (e) {
            console.warn("MathJax rendering failed:", e);
            // Fallback print
            setTimeout(function() {
              printHandler.triggerPrint(printFrame, cleanupPrintFrame);
            }, 300);
          }
        } else {
          // No MathJax, just print
          setTimeout(function() {
            printHandler.triggerPrint(printFrame, cleanupPrintFrame);
          }, 300);
        }
      }, 100);
    };
  }
}

// Create global instance
window.MarkTidePrintHandler = new PrintHandler();
