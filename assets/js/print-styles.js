// Shared PDF print stylesheet assembly.
(function (window) {
  function getStyles(options) {
    const settings = options || {};
    const printHighlightTokenStyles = settings.printHighlightTokenStyles || '';
    const markdownPrintStyles = settings.markdownPrintStyles || '';

    return `
      ${printHighlightTokenStyles}
      ${markdownPrintStyles}
    @media print {
      @page {
        margin: 0.55in 0.38in;
        size: A4;
      }

      /* Force all text to wrap and prevent overflow */
      *:not(.mermaid *):not(.mermaid-container *):not(.markdown-body pre *):not(.markdown-body code *) {
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        word-break: normal !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Override any fixed widths that might cause overflow */
      .markdown-body *:not(.mermaid *):not(.mermaid-container *):not(.markdown-body pre *):not(.markdown-body code *) {
        width: auto !important;
        min-width: 0 !important;
        flex-shrink: 1 !important;
      }

      /* Preserve mermaid diagram layout */
      .mermaid, .mermaid-container {
        width: 100% !important;
        max-width: 100% !important;
        white-space: initial !important;
        word-wrap: initial !important;
        overflow-wrap: initial !important;
        word-break: initial !important;
      }

      /* Preserve code block formatting */
      .markdown-body pre, .markdown-body pre * {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        max-width: 100% !important;
        font-feature-settings: "liga" 1, "calt" 1 !important;
      }

      .markdown-body code {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        font-feature-settings: "liga" 1, "calt" 1 !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: var(--markdown-bg) !important;
        color: var(--markdown-text-color) !important;
        line-height: 1.6 !important;
        font-size: 14px !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }

      body {
        position: static !important;
        overflow: visible !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      body::-webkit-scrollbar {
        display: none !important;
      }
    }

    /* Base styles for all media */
    html, body {
      margin: 0;
      padding: 0;
      background-color: var(--markdown-bg) !important;
      color: var(--markdown-text-color) !important;
      line-height: 1.6;
      overflow-x: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

      .markdown-body {
      box-sizing: border-box;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      background-color: var(--markdown-bg) !important;
      color: var(--markdown-text-color) !important;
      overflow: visible !important;
      position: relative !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }

    /* Remove any scrollbars */
    * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }

    *::-webkit-scrollbar {
      display: none !important;
    }

    .markdown-body table th:first-child,
    .markdown-body table td:first-child {
      overflow-wrap: normal !important;
      word-break: normal !important;
      hyphens: manual !important;
    }

    .markdown-body table .marktide-print-soft-wrap,
    .markdown-body table .marktide-print-soft-wrap code {
      overflow-wrap: anywhere !important;
      word-break: normal !important;
      white-space: normal !important;
    }

    /* Mermaid diagrams */
    .mermaid-container, .mermaid {
      overflow: visible !important;
      page-break-inside: avoid !important;
    }

    .mermaid svg {
      overflow: visible !important;
    }

    /* Math expressions */
    mjx-container {
      overflow: visible !important;
      page-break-inside: avoid !important;
    }

    /* Images */
    .markdown-body img {
      max-width: 100% !important;
      height: auto !important;
      page-break-inside: avoid !important;
      background-color: transparent !important;
    }

    /* Page break controls */
    .markdown-body h1 {
      page-break-before: auto !important;
      page-break-after: avoid !important;
    }

    .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
    }

          /* Print-specific adjustments */
      @media print {
          .markdown-body {
        padding: 6px !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Ensure content uses full width but prevent overflow */
      .markdown-body > * {
        max-width: 100% !important;
        width: auto !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
      }

      /* Specific handling for paragraphs and text elements */
      .markdown-body p:not(.mermaid *), .markdown-body li:not(.mermaid *), .markdown-body span:not(.mermaid *):not(pre code.hljs span),
      .markdown-body div:not(.mermaid *):not(.mermaid-container), .markdown-body td, .markdown-body th {
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        word-break: normal !important;
        max-width: 100% !important;
      }

      /* Better code block handling for print */
      .markdown-body pre {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        max-width: 100% !important;
        padding: 12px !important;
        overflow: visible !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
      }

      .markdown-body pre code {
        white-space: pre-wrap !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
      }

      /* Table responsiveness for print */
      .markdown-body table {
        font-size: 90% !important;
        word-break: normal !important;
        table-layout: auto !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow: visible !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
      }

      .markdown-body table th, .markdown-body table td {
        padding: 6px 12px !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        word-break: normal !important;
        hyphens: manual !important;
        max-width: none !important;
      }

      .markdown-body table.marktide-print-cols-2 th:first-child,
      .markdown-body table.marktide-print-cols-2 td:first-child {
        width: 16% !important;
        min-width: 88px !important;
      }

      .markdown-body table.marktide-print-cols-3 th:first-child,
      .markdown-body table.marktide-print-cols-3 td:first-child {
        width: 13% !important;
        min-width: 86px !important;
      }

      .markdown-body table.marktide-print-cols-3 th:last-child,
      .markdown-body table.marktide-print-cols-3 td:last-child {
        width: 12% !important;
        min-width: 78px !important;
      }

      .markdown-body table.marktide-print-long-table,
      .markdown-body table.marktide-print-wide-table {
        table-layout: fixed !important;
      }

      .markdown-body table.marktide-print-long-table.marktide-print-cols-2 th:first-child,
      .markdown-body table.marktide-print-long-table.marktide-print-cols-2 td:first-child {
        width: 14% !important;
        min-width: 74px !important;
      }

      .markdown-body table.marktide-print-wide-table th,
      .markdown-body table.marktide-print-wide-table td {
        padding: 5px 7px !important;
      }
      }
    `;
  }

  window.MarkTidePrintStyles = {
    getStyles,
  };
})(window);
