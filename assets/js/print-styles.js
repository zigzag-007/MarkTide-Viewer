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
                    font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
        font-feature-settings: "liga" 1, "calt" 1 !important;
      }

      .markdown-body code {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
                    font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
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
        background: white !important;
        color: #24292e !important;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
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
      background-color: #ffffff !important;
      color: #24292e !important;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
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
      padding: 20px !important;
      background-color: #ffffff !important;
      color: #24292e !important;
      overflow: visible !important;
      position: relative !important;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
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

    /* Force light mode for all elements */
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      color: #24292e !important;
      background: transparent !important;
      page-break-after: avoid !important;
      font-weight: 900 !important;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
    }

    .markdown-body p:not(.mermaid *), .markdown-body li:not(.mermaid *), .markdown-body span:not(.mermaid *):not(pre code.hljs span),
    .markdown-body div:not(.mermaid *):not(.mermaid-container), .markdown-body section, .markdown-body article {
      background: transparent !important;
      color: #24292e !important;
      overflow: visible !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
      hyphens: manual !important;
    }

    .markdown-body table th:first-child,
    .markdown-body table td:first-child {
      overflow-wrap: normal !important;
      word-break: normal !important;
      hyphens: manual !important;
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
      overflow-wrap: normal !important;
      word-break: normal !important;
      hyphens: manual !important;
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
      padding: 6px 8px !important;
    }

    .markdown-body table .marktide-print-soft-wrap,
    .markdown-body table .marktide-print-soft-wrap code {
      overflow-wrap: anywhere !important;
      word-break: normal !important;
      white-space: normal !important;
    }

    .markdown-body code {
      background-color: #f6f8fa !important;
      color: #24292e !important;
      padding: 0.2em 0.4em !important;
      border-radius: 3px !important;
      font-size: 85% !important;
      overflow-wrap: break-word !important;
                  font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
      font-feature-settings: "liga" 1, "calt" 1 !important;
    }

    .markdown-body pre {
      background-color: #f6f8fa !important;
      border-radius: 6px !important;
      padding: 16px !important;
      margin: 1.5em 0 !important;
      overflow: visible !important;
      font-size: 85% !important;
      line-height: 1.45 !important;
      break-inside: auto !important;
      page-break-inside: auto !important;
    }

    .markdown-body pre code {
      background: transparent !important;
      padding: 0 !important;
      border-radius: 0 !important;
      overflow-wrap: break-word !important;
      white-space: pre-wrap !important;
                  font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
      font-feature-settings: "liga" 1, "calt" 1 !important;
    }

    .markdown-body table {
      background-color: #ffffff !important;
      border-collapse: collapse !important;
      width: 100% !important;
      overflow: visible !important;
      break-inside: auto !important;
      page-break-inside: auto !important;
    }

    .markdown-body table tr {
      background-color: #ffffff !important;
      border-top: 1px solid #e1e4e8 !important;
    }

    .markdown-body table tr:nth-child(2n) {
      background-color: #f6f8fa !important;
    }

    .markdown-body table th, .markdown-body table td {
      padding: 9px 20px !important;
      border: 1px solid #e1e4e8 !important;
      overflow: visible !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      hyphens: auto !important;
    }

    .markdown-body blockquote {
      color: #6a737d !important;
      border-left: 4px solid #dfe2e5 !important;
      background: transparent !important;
      padding: 0 1em !important;
      margin: 0 0 16px 0 !important;
    }

    .markdown-body ul, .markdown-body ol {
      padding-left: 2.2em !important;
      margin: 0 0 16px 0 !important;
    }

    .markdown-body ul {
      list-style-type: disc !important;
    }

    /* Mermaid diagrams */
    .mermaid-container, .mermaid {
      overflow: visible !important;
      max-width: 100% !important;
      page-break-inside: avoid !important;
      text-align: center !important;
      margin: 1.5em 0 2.2em !important;
    }

    .mermaid svg {
      display: block !important;
      max-width: 100% !important;
      height: auto !important;
      margin: 0 auto !important;
      overflow: visible !important;
    }

    /* Mermaid flowchart specific styling for print */
    .mermaid .nodeLabel, .mermaid .edgeLabel {
      color: #24292e !important;
    }

    .mermaid .node .label {
      color: #24292e !important;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
    }

    /* Specific styling for flowchart decision nodes */
    .mermaid .flowchart-link {
      stroke: #24292e !important;
      fill: none !important;
    }

    .mermaid .edgePath path {
      stroke: #24292e !important;
      stroke-width: 1.5px !important;
      fill: none !important;
    }

    .mermaid .edgeLabel {
      color: #24292e !important;
      font-weight: 700 !important;
    }

    .mermaid .edgeLabel foreignObject div,
    .mermaid .edgeLabel foreignObject span,
    .mermaid .edgeLabel foreignObject p {
      background-color: #e8f5e8 !important;
      color: #24292e !important;
      box-decoration-break: clone !important;
      -webkit-box-decoration-break: clone !important;
    }

    .mermaid .edgeLabel foreignObject {
      background-color: transparent !important;
      overflow: visible !important;
    }

    .mermaid g.nodes g.node text {
      fill: #24292e !important;
      font-weight: 700 !important;
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
                    font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
        font-feature-settings: "liga" 1, "calt" 1 !important;
        background-color: #f6f8fa !important;
        border-radius: 6px !important;
      }

      .markdown-body pre code {
        white-space: pre-wrap !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
                    font-family: "JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace !important;
        font-feature-settings: "liga" 1, "calt" 1 !important;
        background: transparent !important;
        padding: 0 !important;
        border-radius: 0 !important;
      }

      /* Table responsiveness for print */
      .markdown-body table {
        font-size: 90% !important;
        word-break: normal !important;
        table-layout: auto !important;
        width: 100% !important;
        max-width: 100% !important;
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
