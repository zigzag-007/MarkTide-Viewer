async function captureHtmlExport(page) {
  return page.evaluate(async () => {
    const originalClick = HTMLAnchorElement.prototype.click;
    const originalRevoke = URL.revokeObjectURL;
    let blobUrl = null;

    HTMLAnchorElement.prototype.click = function captureClick() {
      blobUrl = this.href;
    };
    URL.revokeObjectURL = () => {};

    try {
      window.MarkTideImportExport.exportAsHTML();
      if (!blobUrl) throw new Error('HTML export did not create a download URL');
      return await fetch(blobUrl).then((response) => response.text());
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
      URL.revokeObjectURL = originalRevoke;
      if (blobUrl) originalRevoke.call(URL, blobUrl);
    }
  });
}

async function capturePdfPreparation(page, title = 'MarkTide Test Document', options = {}) {
  return page.evaluate(({ includeDocumentHtml, printTitle }) => new Promise((resolve, reject) => {
    const handler = window.MarkTidePrintHandler;
    const originalTriggerPrint = handler.triggerPrint;
    const originalTitle = document.title;
    const timeout = setTimeout(() => {
      handler.triggerPrint = originalTriggerPrint;
      document.querySelectorAll('iframe[style*="-1000px"]').forEach((frame) => frame.remove());
      document.title = originalTitle;
      reject(new Error('PDF preparation timed out'));
    }, 30_000);

    handler.triggerPrint = (printFrame, cleanup) => {
      try {
        const printDocument = printFrame.contentDocument;
        const inlineCode = printDocument.querySelector('.markdown-body code:not(pre code)');
        const authored = printDocument.getElementById('authored-style');
        const inlineStyle = inlineCode ? getComputedStyle(inlineCode) : null;
        const authoredStyle = authored ? getComputedStyle(authored) : null;
        const article = printDocument.querySelector('.markdown-body');
        const mermaidGeometry = [...printDocument.querySelectorAll('.mermaid svg')].map((svg, diagramIndex) => {
          const problems = [];
          const viewBox = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
          const svgBounds = svg.getBoundingClientRect();
          const labelKeys = new Set();
          if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
            problems.push('invalid viewBox');
          }
          [...svg.querySelectorAll('text')].forEach((label) => {
            const text = (label.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) return;
            const bounds = label.getBoundingClientRect();
            if (
              bounds.left < svgBounds.left - 2
              || bounds.top < svgBounds.top - 2
              || bounds.right > svgBounds.right + 2
              || bounds.bottom > svgBounds.bottom + 2
            ) {
              problems.push(`cropped label: ${text.slice(0, 60)}`);
            }
            const key = `${text}|${Math.round(bounds.x * 2)}|${Math.round(bounds.y * 2)}|${Math.round(bounds.width * 2)}|${Math.round(bounds.height * 2)}`;
            if (labelKeys.has(key)) problems.push(`duplicate label: ${text.slice(0, 60)}`);
            labelKeys.add(key);
          });
          return {
            diagramIndex,
            foreignObjectCount: svg.querySelectorAll('foreignObject').length,
            problems: [...new Set(problems)],
          };
        });

        resolve({
          authored: authoredStyle ? {
            color: authoredStyle.color,
            fontFamily: authoredStyle.fontFamily,
            fontSize: authoredStyle.fontSize,
          } : null,
          inlineCode: inlineStyle ? {
            backgroundColor: inlineStyle.backgroundColor,
            color: inlineStyle.color,
            fontWeight: inlineStyle.fontWeight,
          } : null,
          mermaidGeometry,
          mermaidCount: printDocument.querySelectorAll('.mermaid svg').length,
          toolbarCount: printDocument.querySelectorAll('.mermaid-toolbar').length,
          unsafeArticleMarkupCount: article
            ? article.querySelectorAll('script, iframe, style, [onerror], [onload]').length
            : null,
          documentHtml: includeDocumentHtml ? printDocument.documentElement.outerHTML : null,
        });
      } catch (error) {
        reject(error);
      } finally {
        clearTimeout(timeout);
        handler.triggerPrint = originalTriggerPrint;
        cleanup();
      }
    };

    try {
      handler.printPreview(printTitle);
    } catch (error) {
      clearTimeout(timeout);
      handler.triggerPrint = originalTriggerPrint;
      document.title = originalTitle;
      reject(error);
    }
  }), {
    includeDocumentHtml: options.includeDocumentHtml === true,
    printTitle: title,
  });
}

module.exports = {
  captureHtmlExport,
  capturePdfPreparation,
};
