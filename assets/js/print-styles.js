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
        margin: 0.56in 0.38in;
        size: A4;

        /* Use the existing margin so numbering does not move document content. */
        @bottom-left {
          content: counter(page);
          text-align: right;
          padding-right: 4pt;
          vertical-align: middle;
          font-family: Arial, sans-serif;
          font-size: 7pt;
          font-weight: 600;
          line-height: 1;
          color: #000;
          background: linear-gradient(#d7d7d7, #d7d7d7) left calc(50% - 11pt) / 100% 0.25pt no-repeat;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* The fixed label width leaves the number directly beside the separator. */
        @bottom-right {
          content: "Page";
          width: 25pt;
          padding-left: 4pt;
          text-align: right;
          vertical-align: middle;
          font-family: Arial, sans-serif;
          font-size: 7pt;
          font-weight: 400;
          letter-spacing: 1pt;
          line-height: 1;
          color: #92969e;
          background:
            linear-gradient(#42464d, #42464d) left center / 0.5pt 8pt no-repeat,
            linear-gradient(#d7d7d7, #d7d7d7) left calc(50% - 11pt) / 100% 0.25pt no-repeat;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }

      /* Force all text to wrap and prevent overflow */
      *:not(img):not(.mermaid *):not(.mermaid-container *):not(.markdown-body pre *):not(.markdown-body code *) {
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        word-break: normal !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Override any fixed widths that might cause overflow */
      .markdown-body *:not(.mermaid *):not(.mermaid-container *):not(.markdown-body pre *):not(.markdown-body code *):not(.marktide-print-content-table):not(img) {
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
        line-height: 1.4 !important;
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
      line-height: 1.4;
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
      max-width: 100%;
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
        --marktide-print-reference-font-size: 1.05rem;
        font-size: 1.03rem;
        padding: 6px !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Keep the original hierarchy with small print size reductions. */
      .markdown-body h1 { --marktide-print-reference-font-size: 2.1rem; }
      .markdown-body h2 { --marktide-print-reference-font-size: 1.575rem; }
      .markdown-body h3 { --marktide-print-reference-font-size: 1.3125rem; }
      .markdown-body h4 { --marktide-print-reference-font-size: 1.05rem; }
      .markdown-body h5 { --marktide-print-reference-font-size: 0.91875rem; }
      .markdown-body h6 { --marktide-print-reference-font-size: 0.8925rem; }
      .markdown-body :is(h1, h2, h3, h4, h5, h6) {
        font-size: calc(var(--marktide-print-reference-font-size) - 0.2px);
      }
      .markdown-body :is(h2, h3, h4) {
        font-size: calc(var(--marktide-print-reference-font-size) - 0.3px);
      }

      /* Code and captions keep their previous sizes, not the smaller body size. */
      .markdown-body code:not(pre code):not([style*="font-size"] code) {
        font-size: calc(var(--marktide-print-reference-font-size) * 0.85);
      }
      .markdown-body code:not(pre code) {
        padding-top: 0.08em;
        padding-bottom: 0.08em;
      }
      .markdown-body .marktide-image-caption:not([style*="font-size"] .marktide-image-caption) {
        --marktide-print-reference-font-size: 0.945rem;
        font-size: var(--marktide-print-reference-font-size);
      }

      /* Ensure content uses full width but prevent overflow */
      .markdown-body > *:not(img) {
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

      .markdown-body pre:not(.enhanced-code-block pre):not([style*="font-size"] pre) {
        font-size: calc(var(--marktide-print-reference-font-size) * 0.85);
      }

      .markdown-body pre code {
        white-space: pre-wrap !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
      }

      /* Table responsiveness for print */
      .markdown-body table {
        --marktide-print-reference-font-size: 0.945rem;
        font-size: var(--marktide-print-reference-font-size) !important;
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

      /* Only wide, simple grids get content based column allocation. */
      .markdown-body table.marktide-print-content-table {
        display: table !important;
        --marktide-print-reference-font-size: 0.8715rem;
        font-size: var(--marktide-print-reference-font-size) !important;
      }

      .markdown-body table.marktide-print-content-table th,
      .markdown-body table.marktide-print-content-table td {
        padding: 3px 4px !important;
      }

      .markdown-body table.marktide-print-content-table th:first-child,
      .markdown-body table.marktide-print-content-table td:first-child,
      .markdown-body table.marktide-print-content-table td:first-child code {
        overflow-wrap: anywhere !important;
        word-break: normal !important;
      }

      .markdown-body table.marktide-print-content-table tbody tr.marktide-print-keep-row {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      /* Reserve cut space without adding padding inside ordinary cells. */
      .markdown-body .marktide-print-fragment-edge {
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        padding-bottom: 7px;
      }

      .markdown-body .marktide-print-fragment-edge > table {
        margin-bottom: -7px !important;
      }

      .markdown-body .marktide-print-fragment-edge > table > tbody {
        /* Row groups end at their content, unlike a page filling outer frame. */
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        outline: 1px solid var(--marktide-print-fragment-border, var(--markdown-table-border, var(--markdown-border-color)));
        outline-offset: -1px;
      }

      /* Allow a partial row when the cut has room for one readable line. */
      .markdown-body .marktide-print-fragment-edge > table > tbody > tr > :is(td, th) {
        orphans: 1;
        widows: 1;
      }
      }
    `;
  }

  window.MarkTidePrintStyles = {
    getStyles,
  };
})(window);
