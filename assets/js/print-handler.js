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

  printPreview() {
    const markdownEditor = document.getElementById("markdown-editor");
    const markdown = markdownEditor.value;
    const html = marked.parse(markdown);
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ADD_TAGS: ['mjx-container', 'svg', 'path', 'g', 'marker', 'defs', 'pattern', 'clipPath'],
      ADD_ATTR: ['id', 'class', 'style', 'viewBox', 'd', 'fill', 'stroke', 'transform', 'marker-end', 'marker-start']
    });

    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    
    document.body.appendChild(printFrame);
    
    const printDocument = printFrame.contentDocument || printFrame.contentWindow.document;
    
    printDocument.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Print</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <style>
    @media print {
      @page {
        margin: 0.5in;
        size: A4;
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
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        line-height: 1.6 !important;
        font-size: 14px !important;
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.6;
      overflow-x: hidden;
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
    }
    
    .markdown-body p, .markdown-body li, .markdown-body span,
    .markdown-body div, .markdown-body section, .markdown-body article {
      background: transparent !important;
      color: #24292e !important;
      overflow: visible !important;
    }
    
    .markdown-body code {
      background-color: #f6f8fa !important;
      color: #24292e !important;
      padding: 0.2em 0.4em !important;
      border-radius: 3px !important;
      font-size: 85% !important;
      overflow-wrap: break-word !important;
    }
    
    .markdown-body pre {
      background-color: #f6f8fa !important;
      border-radius: 6px !important;
      padding: 16px !important;
      overflow: visible !important;
      font-size: 85% !important;
      line-height: 1.45 !important;
      page-break-inside: avoid !important;
    }
    
    .markdown-body pre code {
      background: transparent !important;
      padding: 0 !important;
      border-radius: 0 !important;
      overflow-wrap: break-word !important;
      white-space: pre-wrap !important;
    }
    
    .markdown-body table {
      background-color: #ffffff !important;
      border-collapse: collapse !important;
      width: 100% !important;
      overflow: visible !important;
      page-break-inside: avoid !important;
    }
    
    .markdown-body table tr {
      background-color: #ffffff !important;
      border-top: 1px solid #e1e4e8 !important;
    }
    
    .markdown-body table tr:nth-child(2n) {
      background-color: #f6f8fa !important;
    }
    
    .markdown-body table th, .markdown-body table td {
      padding: 6px 13px !important;
      border: 1px solid #e1e4e8 !important;
      overflow: visible !important;
    }
    
    .markdown-body blockquote {
      color: #6a737d !important;
      border-left: 4px solid #dfe2e5 !important;
      background: transparent !important;
      padding: 0 1em !important;
      margin: 0 0 16px 0 !important;
    }
    
    .markdown-body ul, .markdown-body ol {
      padding-left: 2em !important;
      margin: 0 0 16px 0 !important;
    }
    
    .markdown-body li {
      margin: 0.25em 0 !important;
    }
    
    /* Mermaid diagrams */
    .mermaid-container, .mermaid {
      overflow: visible !important;
      max-width: 100% !important;
      page-break-inside: avoid !important;
    }
    
    /* Mermaid flowchart specific styling for print */
    .mermaid .nodeLabel, .mermaid .edgeLabel {
      color: #24292e !important;
    }
    
    .mermaid .node rect, .mermaid .node circle, .mermaid .node ellipse, .mermaid .node polygon {
      fill: #f9f9f9 !important;
      stroke: #24292e !important;
      stroke-width: 1px !important;
    }
    
    .mermaid .node .label {
      color: #24292e !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
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
      background-color: #ffffff !important;
      color: #24292e !important;
    }
    
    /* Force backgrounds for flowchart elements */
    .mermaid g.nodes g.node rect,
    .mermaid g.nodes g.node polygon,
    .mermaid g.nodes g.node circle,
    .mermaid g.nodes g.node ellipse {
      fill: #f6f8fa !important;
      stroke: #24292e !important;
      stroke-width: 1px !important;
    }
    
    .mermaid g.nodes g.node text {
      fill: #24292e !important;
      font-weight: 400 !important;
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
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: none !important;
      }
      
      /* Ensure content uses full width */
      .markdown-body > * {
        max-width: none !important;
        width: 100% !important;
      }
      
      /* Better code block handling for print */
      .markdown-body pre {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        max-width: 100% !important;
      }
      
      .markdown-body pre code {
        white-space: pre-wrap !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      /* Table responsiveness for print */
      .markdown-body table {
        font-size: 12px !important;
        word-break: break-word !important;
      }
      
      .markdown-body table th, .markdown-body table td {
        padding: 4px 8px !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
          }
      }
  </style>
</head>
<body>
  <article class="markdown-body">
      ${sanitizedHtml}
  </article>
  
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js"></script>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
      }
    };
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js"></script>
</body>
</html>
    `);
    
    printDocument.close();
    
    // Wait for content to load, then trigger print
    printFrame.onload = function() {
      setTimeout(function() {
        // Apply syntax highlighting
        printFrame.contentDocument.querySelectorAll('pre code').forEach((block) => {
          if (!block.classList.contains('mermaid')) {
            try {
              printFrame.contentWindow.hljs.highlightElement(block);
    } catch (e) {
              console.warn("Syntax highlighting failed:", e);
            }
          }
        });
        
        // Initialize and render Mermaid
        try {
          // Print always uses light mode styling, so use light mode mermaid theme
          const mermaidTheme = "base";
          
          let themeVariables = {
            primaryColor: '#f6f8fa',
            primaryTextColor: '#24292e',
            primaryBorderColor: '#24292e',
            lineColor: '#24292e',
            secondaryColor: '#f6f8fa',
            tertiaryColor: '#ffffff',
            background: '#ffffff',
            mainBkg: '#f6f8fa',
            secondBkg: '#f6f8fa',
            nodeBorder: '#24292e',
            clusterBkg: '#f6f8fa',
            edgeLabelBackground: '#ffffff'
          };
          
          printFrame.contentWindow.mermaid.initialize({
            startOnLoad: false,
            theme: mermaidTheme,
            themeVariables: themeVariables,
            securityLevel: 'loose',
            flowchart: { 
              useMaxWidth: true, 
              htmlLabels: true,
              curve: 'basis'
            },
            fontSize: 16
          });
          
          // Render mermaid diagrams one by one
          const mermaidElements = printFrame.contentDocument.querySelectorAll('.mermaid');
          if (mermaidElements.length > 0) {
            printFrame.contentWindow.mermaid.init(undefined, mermaidElements);
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
                
                // Clean up the iframe after printing
                setTimeout(function() {
                  document.body.removeChild(printFrame);
                }, 500);
              }, 300);
            }).catch((err) => {
              console.warn('MathJax typesetting failed:', err);
              // Still print even if MathJax fails
              setTimeout(function() {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                
                setTimeout(function() {
                  document.body.removeChild(printFrame);
                }, 500);
              }, 300);
            });
          } catch (e) {
            console.warn("MathJax rendering failed:", e);
            // Fallback print
            setTimeout(function() {
              printFrame.contentWindow.focus();
              printFrame.contentWindow.print();
              
              setTimeout(function() {
                document.body.removeChild(printFrame);
              }, 500);
            }, 300);
          }
        } else {
          // No MathJax, just print
          setTimeout(function() {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            
            setTimeout(function() {
              document.body.removeChild(printFrame);
            }, 500);
          }, 300);
        }
      }, 100);
    };
  }
}

// Create global instance
window.MarkFlowPrintHandler = new PrintHandler();