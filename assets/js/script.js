document.addEventListener("DOMContentLoaded", function () {
  let markdownRenderTimeout = null;
  const RENDER_DELAY = 100;
  let syncScrollingEnabled = false;
  let isEditorScrolling = false; 
  let isPreviewScrolling = false;
  let scrollSyncTimeout = null;
  const SCROLL_SYNC_DELAY = 10;

  // Undo/Redo functionality - improved version
  let undoStack = [];
  let redoStack = [];
  let lastSavedState = null;
  
  function createState() {
    return {
      value: markdownEditor.value,
      selectionStart: markdownEditor.selectionStart,
      selectionEnd: markdownEditor.selectionEnd,
      scrollTop: markdownEditor.scrollTop
    };
  }
  
  function saveToUndoStack() {
    const currentState = createState();
    
    // Don't save if nothing changed
    if (lastSavedState && 
        lastSavedState.value === currentState.value &&
        lastSavedState.selectionStart === currentState.selectionStart &&
        lastSavedState.selectionEnd === currentState.selectionEnd) {
      return;
    }
    
    // Save current state to undo stack
    if (lastSavedState) {
      undoStack.push(lastSavedState);
      if (undoStack.length > 50) { // Limit stack size
        undoStack.shift();
      }
    }
    
    // Clear redo stack on new action
    redoStack = [];
    lastSavedState = currentState;
  }
  
  function restoreState(state) {
    if (!state) return;
    
    markdownEditor.value = state.value;
    markdownEditor.focus();
    markdownEditor.setSelectionRange(state.selectionStart, state.selectionEnd);
    markdownEditor.scrollTop = state.scrollTop;
    
    // Update line numbers and render
    updateLineNumbers();
    debouncedRender();
  }

  function undoAction() {
    if (undoStack.length > 0) {
      // Save current state to redo stack
      redoStack.push(lastSavedState);
      
      // Get and restore previous state
      const previousState = undoStack.pop();
      lastSavedState = previousState;
      restoreState(previousState);
    }
  }
  
  function redoAction() {
    if (redoStack.length > 0) {
      // Save current state to undo stack
      undoStack.push(lastSavedState);
      
      // Get and restore next state
      const nextState = redoStack.pop();
      lastSavedState = nextState;
      restoreState(nextState);
    }
  }

  const markdownEditor = document.getElementById("markdown-editor");
  const markdownPreview = document.getElementById("markdown-preview");
  const themeToggle = document.getElementById("theme-toggle");
  const importButton = document.getElementById("import-button");
  const fileInput = document.getElementById("file-input");
  const exportMd = document.getElementById("export-md");
  const exportHtml = document.getElementById("export-html");
  const exportPdf = document.getElementById("export-pdf");
  const copyMarkdownButton = document.getElementById("copy-markdown-button");
  const dropzone = document.getElementById("dropzone");
  const closeDropzoneBtn = document.getElementById("close-dropzone");
  const toggleSyncButton = document.getElementById("toggle-sync");
  const editorPane = document.getElementById("markdown-editor");
  const previewPane = document.querySelector(".preview-pane");
  const wordCountElement = document.getElementById("word-count");
  const charCountElement = document.getElementById("char-count");
  const showCodeButton = document.getElementById("show-code-button");
  const showPreviewButton = document.getElementById("show-preview-button");
  const printButton = document.getElementById("print-button");

  const mobileMenuToggle    = document.getElementById("mobile-menu-toggle");
  const mobileMenuPanel     = document.getElementById("mobile-menu-panel");
  const mobileMenuOverlay   = document.getElementById("mobile-menu-overlay");
  const mobileCloseMenu     = document.getElementById("close-mobile-menu");
  const mobileWordCount     = document.getElementById("mobile-word-count");
  const mobileCharCount     = document.getElementById("mobile-char-count");
  const mobileToggleSync    = document.getElementById("mobile-toggle-sync");
  const mobileImportBtn     = document.getElementById("mobile-import-button");
  const mobileShowCode      = document.getElementById("mobile-show-code");
  const mobileShowPreview   = document.getElementById("mobile-show-preview");
  const mobilePrintButton   = document.getElementById("mobile-print-button");
  const mobileCopyMarkdown  = document.getElementById("mobile-copy-markdown");
  const mobileThemeToggle   = document.getElementById("mobile-theme-toggle");

  // Check dark mode preference first for proper initialization
  const prefersDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  document.documentElement.setAttribute(
    "data-theme",
    prefersDarkMode ? "dark" : "light"
  );
  
  themeToggle.innerHTML = prefersDarkMode
    ? '<i class="bi bi-sun"></i>'
    : '<i class="bi bi-moon"></i>';

  const initMermaid = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const mermaidTheme = currentTheme === "dark" ? "dark" : "base";
    
    let themeVariables = {};
    if (currentTheme === "dark") {
      themeVariables = {
        primaryColor: '#30363d',
        primaryTextColor: '#e4e1f0',
        primaryBorderColor: '#8b7cf8',
        lineColor: '#8b7cf8',
        secondaryColor: '#21262d',
        tertiaryColor: '#161b22',
        background: '#1a1625',
        mainBkg: '#21262d',
        secondBkg: '#30363d',
        tertiaryBkg: '#161b22'
      };
    } else {
      themeVariables = {
        primaryColor: '#f9f9f9',
        primaryTextColor: '#24292e',
        primaryBorderColor: '#d1d5da',
        lineColor: '#24292e',
        secondaryColor: '#e8f5e8',
        tertiaryColor: '#fff3e0'
      };
    }
    
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      themeVariables: themeVariables,
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true },
      fontSize: 16
    });
  };

  initMermaid();

  const markedOptions = {
    gfm: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartypants: false,
    xhtml: false,
    headerIds: true,
    mangle: false,
  };

  const renderer = new marked.Renderer();
  renderer.code = function (code, language) {
    if (language === 'mermaid') {
      const uniqueId = 'mermaid-diagram-' + Math.random().toString(36).substr(2, 9);
      return `<div class="mermaid-container"><div class="mermaid" id="${uniqueId}">${code}</div></div>`;
    }
    
    // Handle batch/bat files
    if (language === 'batch' || language === 'bat' || language === 'cmd') {
      language = 'dos'; // Use DOS highlighting for batch files
    }
    
    const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
    const highlightedCode = hljs.highlight(code, {
      language: validLanguage,
    }).value;
    
    return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
  };

  marked.setOptions({
    ...markedOptions,
    renderer: renderer,
    highlight: function (code, language) {
      if (language === 'mermaid') return code;
      
      // Handle batch/bat files
      if (language === 'batch' || language === 'bat' || language === 'cmd') {
        language = 'dos';
      }
      
      const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
      return hljs.highlight(code, { language: validLanguage }).value;
    },
  });

  const sampleMarkdown = `# Welcome to MarkFlow Viewer

## ✨ Key Features
- **Live Preview** with GitHub styling
- **Smart Import/Export** with direct printing
- **Mermaid Diagrams** for visual documentation
- **LaTeX Math Support** for scientific notation
- **Emoji Support** 😄 👍 🎉
- **Syntax Highlighting** for 190+ languages
- **View Modes** - Code only, Preview only, or Split view

## 💻 Code with Syntax Highlighting

### JavaScript Example
\`\`\`javascript
  function renderMarkdown() {
    const markdown = markdownEditor.value;
    const html = marked.parse(markdown);
    const sanitizedHtml = DOMPurify.sanitize(html);
    markdownPreview.innerHTML = sanitizedHtml;
    
    // Apply syntax highlighting to code blocks
    markdownPreview.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
  }
\`\`\`

### Batch Script Example
\`\`\`batch
@echo off
title MarkFlow Viewer Setup
echo Installing dependencies...
npm install
echo Starting server...
npm start
pause
\`\`\`

### Python Example
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate first 10 Fibonacci numbers
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
\`\`\`

### JSON Configuration
\`\`\`json
{
  "name": "markdown-viewer",
  "version": "2.0.0",
  "features": {
    "syntax_highlighting": true,
    "mermaid_diagrams": true,
    "math_support": true,
    "dark_mode": true
  }
  }
\`\`\`

## 🧮 Mathematical Expressions

Write complex formulas with LaTeX syntax:

**Inline equation:** The famous equation $E = mc^2$ changed physics forever.

**Display equations:**
$$\\frac{\\partial f}{\\partial x} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

**Summation formula:**
$$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}$$

**Matrix notation:**
$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix} =
\\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}$$

## 📊 Mermaid Diagrams

### Flowchart Example
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great! 🎉]
    B -->|No| D[Debug 🔧]
    C --> E[Deploy 🚀]
    D --> F[Fix Issues]
    F --> B
    E --> G[Monitor]
    G --> H[End]
\`\`\`

### Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant E as Editor
    participant P as Preview
    participant S as Server
    
    U->>E: Type markdown
    E->>P: Render content
    U->>E: Make changes
    E->>P: Update rendering
    U->>S: Export/Print
    S-->>U: Generated file
\`\`\`

### Git Workflow
\`\`\`mermaid
flowchart TD
    A[Initial Commit] --> B[Feature Branch]
    B --> C[Add Editor]
    C --> D[Add Preview]
    D --> E[Fix Bugs]
    E --> F[Merge Feature]
    F --> G[Release v2.0]
    G --> H[Production]
\`\`\`

## 📝 Beautiful Lists & Organization

### 🎯 Project Goals
1. **Performance** - Lightning fast rendering
2. **Usability** - Intuitive interface design
3. **Features** - Comprehensive markdown support
4. **Accessibility** - Screen reader friendly
5. **Extensibility** - Plugin architecture ready

### 🔧 Development Stack
- **Frontend Framework:** Vanilla JavaScript
- **Styling:** CSS3 with CSS Variables
- **Markdown Parser:** Marked.js
- **Syntax Highlighter:** Highlight.js
- **Math Rendering:** MathJax
- **Diagram Support:** Mermaid.js

### 📋 Task Categories

#### 🚀 High Priority
- [x] ~~Implement live preview~~
- [x] ~~Add syntax highlighting~~
- [x] ~~Support mermaid diagrams~~
- [ ] Add plugin system
- [ ] Implement collaborative editing

#### 🔄 In Progress
- [x] ~~Dark mode support~~
- [x] ~~Mobile responsiveness~~
- [ ] Offline functionality
- [ ] Advanced export options

#### 💡 Future Ideas
- [ ] AI-powered writing assistance
- [ ] Real-time collaboration
- [ ] Cloud synchronization
- [ ] Custom themes marketplace

### 🌟 Feature Showcase

> **Note:** This editor supports advanced markdown features including:
> - Tables with sorting capabilities
> - Custom containers and callouts
> - Task lists with progress tracking
> - Footnotes and references
> - Advanced typography

## 📊 Comparison Table

| Feature | Our Editor | Basic Editors | Advanced Editors |
|:--------|:----------:|:-------------:|:----------------:|
| **Live Preview** | ✅ GitHub Style | ✅ Basic | ✅ Advanced |
| **Sync Scrolling** | ✅ Bidirectional | ❌ None | 🔄 One-way |
| **Mermaid Diagrams** | ✅ Full Support | ❌ None | 🔄 Limited |
| **Math Rendering** | ✅ LaTeX/MathJax | ❌ None | 🔄 Basic |
| **Export Options** | ✅ Print Ready | 🔄 Basic | ✅ Multiple |
| **Dark Mode** | ✅ Auto/Manual | ❌ None | ✅ Available |
| **Mobile Support** | ✅ Responsive | 🔄 Limited | ✅ App-like |

## 🎨 Text Formatting Showcase

### Basic Formatting
Make text **bold**, *italic*, or ***bold and italic***. You can also use ~~strikethrough~~ text when needed.

### Special Elements
Use \`inline code\` for short snippets, or create keyboard shortcuts like <kbd>Ctrl</kbd> + <kbd>S</kbd> to save.

### Quotes and Citations
> "The best way to predict the future is to invent it."
> 
> — Alan Kay, Computer Scientist

> **💡 Pro Tip:** Use blockquotes for important notes, tips, or citations to make them stand out from regular content.

### Horizontal Rules
Content above the line

---

Content below the line

## 🔗 Links and References

### External Links
- [GitHub Repository](https://github.com/ThisIs-Developer/Markdown-Viewer)
- [Markdown Guide](https://www.markdownguide.org/)
- [Mermaid Documentation](https://mermaid.js.org/)

### Internal Navigation
- [Jump to Features](#-key-features)
- [View Code Examples](#-code-with-syntax-highlighting)
- [See Diagrams](#-mermaid-diagrams)

## 🛡️ Security & Privacy

This is a **fully client-side application**. Your content:
- ✅ Never leaves your browser
- ✅ Stays secure on your device  
- ✅ No server uploads required
- ✅ Works completely offline

### 🌐 Browser Compatibility
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

---

**Happy writing with Zig Zag!** 🚀✍️`;

  markdownEditor.value = sampleMarkdown;

  // Text manipulation functions
  function insertText(text) {
    saveToUndoStack();
    const start = markdownEditor.selectionStart;
    const end = markdownEditor.selectionEnd;
    const currentValue = markdownEditor.value;
    
    markdownEditor.value = currentValue.substring(0, start) + text + currentValue.substring(end);
    markdownEditor.selectionStart = markdownEditor.selectionEnd = start + text.length;
    markdownEditor.focus();
    debouncedRender();
  }
  
  function wrapText(prefix, suffix = '') {
    saveToUndoStack();
    const start = markdownEditor.selectionStart;
    const end = markdownEditor.selectionEnd;
    const selectedText = markdownEditor.value.substring(start, end);
    const currentValue = markdownEditor.value;
    
    if (selectedText) {
      const wrappedText = prefix + selectedText + suffix;
      markdownEditor.value = currentValue.substring(0, start) + wrappedText + currentValue.substring(end);
      markdownEditor.selectionStart = start + prefix.length;
      markdownEditor.selectionEnd = start + prefix.length + selectedText.length;
    } else {
      const wrappedText = prefix + suffix;
      markdownEditor.value = currentValue.substring(0, start) + wrappedText + currentValue.substring(end);
      markdownEditor.selectionStart = markdownEditor.selectionEnd = start + prefix.length;
    }
    markdownEditor.focus();
    debouncedRender();
  }
  
  function insertAtLineStart(prefix) {
    saveToUndoStack();
    const start = markdownEditor.selectionStart;
    const currentValue = markdownEditor.value;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', start);
    const lineText = currentValue.substring(lineStart, lineEnd === -1 ? currentValue.length : lineEnd);
    
    // Check if line already has the prefix
    if (lineText.startsWith(prefix)) {
      // Remove prefix
      const newText = lineText.substring(prefix.length);
      markdownEditor.value = currentValue.substring(0, lineStart) + newText + currentValue.substring(lineEnd === -1 ? currentValue.length : lineEnd);
      markdownEditor.selectionStart = markdownEditor.selectionEnd = start - prefix.length;
    } else {
      // Add prefix
      markdownEditor.value = currentValue.substring(0, lineStart) + prefix + lineText + currentValue.substring(lineEnd === -1 ? currentValue.length : lineEnd);
      markdownEditor.selectionStart = markdownEditor.selectionEnd = start + prefix.length;
    }
    markdownEditor.focus();
    debouncedRender();
  }
  
  function downloadMarkdown() {
    const content = markdownEditor.value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function exportAsHTML() {
    const markdown = markdownEditor.value;
    const html = marked.parse(markdown);
    const sanitizedHtml = DOMPurify.sanitize(html);
    
    // Get current theme
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const isDarkMode = currentTheme === "dark";
    
    // Theme-specific styles
    const themeStyles = isDarkMode ? `
        body { 
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: #1a1625 !important;
            color: #e4e1f0 !important;
        }
        .markdown-body {
            background-color: #1a1625 !important;
            color: #e4e1f0 !important;
            color-scheme: dark;
        }
        
        /* Dark mode code highlighting */
        .hljs {
            background: #2a2540 !important;
            color: #e4e1f0 !important;
        }
        
        /* Dark mode table styles */
        .markdown-body table {
            background-color: #211d2e !important;
            border-color: #3d3651 !important;
        }
        
        .markdown-body table tr {
            background-color: #211d2e !important;
            border-top: 1px solid #3d3651 !important;
        }
        
        .markdown-body table tr:nth-child(2n) {
            background-color: #2a2540 !important;
        }
        
        .markdown-body table th, .markdown-body table td {
            border: 1px solid #3d3651 !important;
        }
        
        /* Dark mode code blocks */
        .markdown-body pre {
            background-color: #2a2540 !important;
        }
        
        .markdown-body code {
            background-color: #2a2540 !important;
            color: #e4e1f0 !important;
        }
        
        /* Dark mode horizontal rules */
        .markdown-body hr {
            background-color: #3d3651 !important;
            border: none !important;
            height: 1px !important;
        }
        
        /* Dark mode blockquotes */
        .markdown-body blockquote {
            color: #b8b5c6 !important;
            border-left: 4px solid #8b7cf8 !important;
            background: transparent !important;
        }
        
        /* Dark mode links */
        .markdown-body a {
            color: #8b7cf8 !important;
        }
        
        /* Dark mode headings */
        .markdown-body h1, .markdown-body h2, .markdown-body h3, 
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            color: #e4e1f0 !important;
            border-bottom-color: #3d3651 !important;
        }
    ` : `
        body { 
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: #ffffff !important;
            color: #24292e !important;
        }
        .markdown-body {
            background-color: #ffffff !important;
            color: #24292e !important;
            color-scheme: light;
        }
        
        /* Light mode code highlighting */
        .hljs {
            background: #f6f8fa !important;
            color: #24292e !important;
        }
        
        /* Light mode table styles */
        .markdown-body table {
            background-color: #ffffff !important;
            border-color: #e1e4e8 !important;
        }
        
        .markdown-body table tr {
            background-color: #ffffff !important;
            border-top: 1px solid #e1e4e8 !important;
        }
        
        .markdown-body table tr:nth-child(2n) {
            background-color: #f6f8fa !important;
        }
        
        .markdown-body table th, .markdown-body table td {
            border: 1px solid #e1e4e8 !important;
        }
        
        /* Light mode code blocks */
        .markdown-body pre {
            background-color: #f6f8fa !important;
        }
        
        .markdown-body code {
            background-color: #f6f8fa !important;
            color: #24292e !important;
        }
        
        /* Light mode horizontal rules */
        .markdown-body hr {
            background-color: #e1e4e8 !important;
            border: none !important;
            height: 1px !important;
        }
        
        /* Light mode blockquotes */
        .markdown-body blockquote {
            color: #6a737d !important;
            border-left: 4px solid #dfe2e5 !important;
            background: transparent !important;
        }
        
        /* Light mode links */
        .markdown-body a {
            color: #0366d6 !important;
        }
        
        /* Light mode headings */
        .markdown-body h1, .markdown-body h2, .markdown-body h3, 
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            color: #24292e !important;
            border-bottom-color: #e1e4e8 !important;
        }
        
        /* Force all text elements to light mode */
        .markdown-body p, .markdown-body li, .markdown-body span,
        .markdown-body div, .markdown-body section, .markdown-body article,
        .markdown-body strong, .markdown-body em, .markdown-body del {
            color: #24292e !important;
            background: transparent !important;
        }
    `;
    
    // Choose appropriate highlight.js theme
    const highlightTheme = isDarkMode 
        ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
        : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
    
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Markdown</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css">
    <link rel="stylesheet" href="${highlightTheme}">
    <style>
        ${themeStyles}
        
        /* Mermaid diagram styles */
        .mermaid-container, .mermaid {
            text-align: center;
            margin: 1em 0;
        }
        
        .mermaid svg {
            max-width: 100%;
            height: auto;
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
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            if (!block.classList.contains('mermaid')) {
                hljs.highlightElement(block);
            }
        });
        
        // Initialize and render Mermaid diagrams
        const isDarkMode = ${isDarkMode};
        const mermaidTheme = isDarkMode ? 'dark' : 'base';
        
        let themeVariables = {};
        if (isDarkMode) {
            themeVariables = {
                primaryColor: '#30363d',
                primaryTextColor: '#e4e1f0',
                primaryBorderColor: '#8b7cf8',
                lineColor: '#8b7cf8',
                secondaryColor: '#21262d',
                tertiaryColor: '#161b22',
                background: '#1a1625',
                mainBkg: '#21262d',
                secondBkg: '#30363d',
                tertiaryBkg: '#161b22'
            };
        } else {
            themeVariables = {
                primaryColor: '#f9f9f9',
                primaryTextColor: '#24292e',
                primaryBorderColor: '#d1d5da',
                lineColor: '#24292e',
                secondaryColor: '#e8f5e8',
                tertiaryColor: '#fff3e0'
            };
        }
        
        mermaid.initialize({
            startOnLoad: false,
            theme: mermaidTheme,
            themeVariables: themeVariables,
            securityLevel: 'loose',
            flowchart: { useMaxWidth: true, htmlLabels: true },
            fontSize: 16
        });
        
        // Render all mermaid diagrams
        try {
            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        } catch (e) {
            console.warn("Mermaid rendering failed:", e);
        }
    </script>
</body>
</html>`;
    
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${isDarkMode ? 'dark' : 'light'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function exportAsText() {
    const content = markdownEditor.value;
    // Remove markdown formatting for plain text
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // Remove images, keep alt text
      .replace(/^[\s]*[-\*\+]\s+/gm, '• ') // Convert lists to bullets
      .replace(/^[\s]*\d+\.\s+/gm, '• ') // Convert numbered lists to bullets
      .replace(/^>\s+/gm, '') // Remove blockquotes
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/---+/g, ''); // Remove horizontal rules
    
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function exportAsPDF() {
    // Use the existing print functionality but save as PDF
    printPreview();
  }
  
  function toggleFullscreen() {
    const fullscreenButton = document.getElementById('format-fullscreen');
    
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen().then(() => {
        fullscreenButton.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
        fullscreenButton.title = 'Exit Fullscreen';
      }).catch(err => {
        console.warn('Could not enter fullscreen:', err);
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().then(() => {
        fullscreenButton.innerHTML = '<i class="bi bi-fullscreen"></i>';
        fullscreenButton.title = 'Toggle Fullscreen';
      }).catch(err => {
        console.warn('Could not exit fullscreen:', err);
      });
    }
  }

  function renderMarkdown() {
    try {
      const markdown = markdownEditor.value;
      const html = marked.parse(markdown);
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ADD_TAGS: ['mjx-container'],
        ADD_ATTR: ['id', 'class', 'style']
      });
      markdownPreview.innerHTML = sanitizedHtml;

      markdownPreview.querySelectorAll("pre code").forEach((block) => {
        try {
          if (!block.classList.contains('mermaid')) {
            hljs.highlightElement(block);
          }
        } catch (e) {
          console.warn("Syntax highlighting failed for a code block:", e);
        }
      });

      processEmojis(markdownPreview);
      
      // Reinitialize mermaid with current theme before rendering diagrams
      initMermaid();
      
      try {
        mermaid.init(undefined, markdownPreview.querySelectorAll('.mermaid'));
      } catch (e) {
        console.warn("Mermaid rendering failed:", e);
      }
      
      if (window.MathJax) {
        try {
          MathJax.typesetPromise([markdownPreview]).catch((err) => {
            console.warn('MathJax typesetting failed:', err);
          });
        } catch (e) {
          console.warn("MathJax rendering failed:", e);
        }
      }

      updateDocumentStats();
    } catch (e) {
      console.error("Markdown rendering failed:", e);
      markdownPreview.innerHTML = `<div class="alert alert-danger">
              <strong>Error rendering markdown:</strong> ${e.message}
          </div>
          <pre>${markdownEditor.value}</pre>`;
    }
  }

  function importMarkdownFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      markdownEditor.value = e.target.result;
      renderMarkdown();
      dropzone.style.display = "none";
    };
    reader.readAsText(file);
  }

  function processEmojis(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      let parent = node.parentNode;
      let isInCode = false;
      while (parent && parent !== element) {
        if (parent.tagName === 'PRE' || parent.tagName === 'CODE') {
          isInCode = true;
          break;
        }
        parent = parent.parentNode;
      }
      
      if (!isInCode && node.nodeValue.includes(':')) {
        textNodes.push(node);
      }
    }
    
    textNodes.forEach(textNode => {
      const text = textNode.nodeValue;
      const emojiRegex = /:([\w+-]+):/g;
      
      let match;
      let lastIndex = 0;
      let result = '';
      let hasEmoji = false;
      
      while ((match = emojiRegex.exec(text)) !== null) {
        const shortcode = match[1];
        const emoji = joypixels.shortnameToUnicode(`:${shortcode}:`);
        
        if (emoji !== `:${shortcode}:`) { // If conversion was successful
          hasEmoji = true;
          result += text.substring(lastIndex, match.index) + emoji;
          lastIndex = emojiRegex.lastIndex;
        } else {
          result += text.substring(lastIndex, emojiRegex.lastIndex);
          lastIndex = emojiRegex.lastIndex;
        }
      }
      
      if (hasEmoji) {
        result += text.substring(lastIndex);
        const span = document.createElement('span');
        span.innerHTML = result;
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
  }

  function debouncedRender() {
    clearTimeout(markdownRenderTimeout);
    markdownRenderTimeout = setTimeout(() => {
      renderMarkdown();
      updateLineNumbers();
    }, RENDER_DELAY);
  }

  function updateDocumentStats() {
    const text = markdownEditor.value;

    const charCount = text.length;
    charCountElement.textContent = charCount.toLocaleString();

    const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    wordCountElement.textContent = wordCount.toLocaleString();
  }

  function updateLineNumbers() {
    const lineNumbersDiv = document.getElementById('line-numbers');
    const text = markdownEditor.value;
    const lines = text.split('\n');
    
    let lineNumbersText = '';
    for (let i = 1; i <= lines.length; i++) {
      lineNumbersText += i.toString().padStart(3, ' ') + '\n';
    }
    
    lineNumbersDiv.textContent = lineNumbersText;
    
    // Sync scroll position with editor
    lineNumbersDiv.scrollTop = markdownEditor.scrollTop;
  }

  function syncLineNumbersScroll() {
    const lineNumbersDiv = document.getElementById('line-numbers');
    lineNumbersDiv.scrollTop = markdownEditor.scrollTop;
  }

  function syncEditorToPreview() {
    if (!syncScrollingEnabled || isPreviewScrolling) return;

    isEditorScrolling = true;
    clearTimeout(scrollSyncTimeout);

    scrollSyncTimeout = setTimeout(() => {
      const editorScrollRatio =
        editorPane.scrollTop /
        (editorPane.scrollHeight - editorPane.clientHeight);
      const previewScrollPosition =
        (previewPane.scrollHeight - previewPane.clientHeight) *
        editorScrollRatio;

      if (!isNaN(previewScrollPosition) && isFinite(previewScrollPosition)) {
        previewPane.scrollTop = previewScrollPosition;
      }

      setTimeout(() => {
        isEditorScrolling = false;
      }, 50);
    }, SCROLL_SYNC_DELAY);
  }

  function syncPreviewToEditor() {
    if (!syncScrollingEnabled || isEditorScrolling) return;

    isPreviewScrolling = true;
    clearTimeout(scrollSyncTimeout);

    scrollSyncTimeout = setTimeout(() => {
      const previewScrollRatio =
        previewPane.scrollTop /
        (previewPane.scrollHeight - previewPane.clientHeight);
      const editorScrollPosition =
        (editorPane.scrollHeight - editorPane.clientHeight) *
        previewScrollRatio;

      if (!isNaN(editorScrollPosition) && isFinite(editorScrollPosition)) {
        editorPane.scrollTop = editorScrollPosition;
      }

      setTimeout(() => {
        isPreviewScrolling = false;
      }, 50);
    }, SCROLL_SYNC_DELAY);
  }

  function toggleSyncScrolling() {
    syncScrollingEnabled = !syncScrollingEnabled;
    if (syncScrollingEnabled) {
      toggleSyncButton.innerHTML = '<i class="bi bi-link"></i> Sync On';
      toggleSyncButton.classList.add("sync-enabled");
      toggleSyncButton.classList.remove("sync-disabled");
      toggleSyncButton.classList.remove("border-primary");
    } else {
      toggleSyncButton.innerHTML = '<i class="bi bi-link-45deg"></i> Sync Off';
      toggleSyncButton.classList.add("sync-disabled");
      toggleSyncButton.classList.remove("sync-enabled");
      toggleSyncButton.classList.add("border-primary");
    }
  }

  function updateMobileButtons() {
    // Update mobile menu buttons to match desktop buttons
    const mobileShowCode = document.getElementById('mobile-show-code');
    const mobileShowPreview = document.getElementById('mobile-show-preview');
    
    if (mobileShowCode && showCodeButton) {
      mobileShowCode.innerHTML = showCodeButton.innerHTML.replace('<i class="bi bi-code-square"></i>', '<i class="bi bi-code-square me-2"></i>').replace('<i class="bi bi-code-square-fill"></i>', '<i class="bi bi-code-square-fill me-2"></i>');
      mobileShowCode.setAttribute('aria-pressed', showCodeButton.getAttribute('aria-pressed'));
    }
    
    if (mobileShowPreview && showPreviewButton) {
      mobileShowPreview.innerHTML = showPreviewButton.innerHTML.replace('<i class="bi bi-eye"></i>', '<i class="bi bi-eye me-2"></i>').replace('<i class="bi bi-eye-fill"></i>', '<i class="bi bi-eye-fill me-2"></i>');
      mobileShowPreview.setAttribute('aria-pressed', showPreviewButton.getAttribute('aria-pressed'));
    }
  }

  function toggleEditorVisibility() {
    const editorPane = document.querySelector(".editor-pane");
    const previewPane = document.querySelector(".preview-pane");
    const isEditorVisible = editorPane.style.display !== 'none';
    
    if (isEditorVisible) {
      // Hide editor
      editorPane.style.display = 'none';
      previewPane.style.display = 'block';
      previewPane.style.flex = '1';
      previewPane.style.width = '100%';
      
      // Update button - editor is now hidden
      showCodeButton.innerHTML = '<i class="bi bi-code-square"></i> Show Editor';
      showCodeButton.setAttribute('aria-pressed', 'false');
      showCodeButton.classList.remove("border-primary");
    } else {
      // Show editor (restore split view)
      editorPane.style.display = 'block';
      previewPane.style.display = 'block';
      editorPane.style.flex = '1';
      previewPane.style.flex = '1';
      editorPane.style.width = '50%';
      previewPane.style.width = '50%';
      
      // Update button - editor is now visible
      showCodeButton.innerHTML = '<i class="bi bi-code-square"></i> Hide Editor';
      showCodeButton.setAttribute('aria-pressed', 'true');
      showCodeButton.classList.add("border-primary");
    }
    
    updateMobileButtons();
  }

  function togglePreviewVisibility() {
    const editorPane = document.querySelector(".editor-pane");
    const previewPane = document.querySelector(".preview-pane");
    const isPreviewVisible = previewPane.style.display !== 'none';
    
    if (isPreviewVisible) {
      // Hide preview
      previewPane.style.display = 'none';
      editorPane.style.display = 'block';
      editorPane.style.flex = '1';
      editorPane.style.width = '100%';
      
      // Update button - preview is now hidden
      showPreviewButton.innerHTML = '<i class="bi bi-eye"></i> Show Preview';
      showPreviewButton.setAttribute('aria-pressed', 'false');
      showPreviewButton.classList.remove("border-primary");
    } else {
      // Show preview (restore split view)
      editorPane.style.display = 'block';
      previewPane.style.display = 'block';
      editorPane.style.flex = '1';
      previewPane.style.flex = '1';
      editorPane.style.width = '50%';
      previewPane.style.width = '50%';
      
      // Update button - preview is now visible
      showPreviewButton.innerHTML = '<i class="bi bi-eye"></i> Hide Preview';
      showPreviewButton.setAttribute('aria-pressed', 'true');
      showPreviewButton.classList.add("border-primary");
    }
    
    updateMobileButtons();
  }

  function showCodeOnly() {
    const editorPaneDiv = document.querySelector(".editor-pane");
    const previewPaneDiv = document.querySelector(".preview-pane");
    
    // Hide preview, show only editor
    previewPaneDiv.style.display = 'none';
    editorPaneDiv.style.display = 'block';
    editorPaneDiv.style.flex = '1';
    editorPaneDiv.style.width = '100%';
    
    // Update button states - editor is visible, preview is hidden
    showCodeButton.innerHTML = '<i class="bi bi-code-square-fill"></i> Hide Editor';
    showCodeButton.classList.add("border-primary");
    showPreviewButton.innerHTML = '<i class="bi bi-eye"></i> Show Preview';
    showPreviewButton.classList.remove("border-primary");
    
    // Update mobile buttons
    updateMobileButtons();
  }

  function showPreviewOnly() {
    const editorPaneDiv = document.querySelector(".editor-pane");
    const previewPaneDiv = document.querySelector(".preview-pane");
    
    // Hide editor, show only preview
    editorPaneDiv.style.display = 'none';
    previewPaneDiv.style.display = 'block';
    previewPaneDiv.style.flex = '1';
    previewPaneDiv.style.width = '100%';
    
    // Update button states - preview is visible, editor is hidden
    showPreviewButton.innerHTML = '<i class="bi bi-eye-fill"></i> Hide Preview';
    showPreviewButton.classList.add("border-primary");
    showCodeButton.innerHTML = '<i class="bi bi-code-square"></i> Show Editor';
    showCodeButton.classList.remove("border-primary");
    
    // Update mobile buttons
    updateMobileButtons();
  }

  function showBoth() {
    const editorPaneDiv = document.querySelector(".editor-pane");
    const previewPaneDiv = document.querySelector(".preview-pane");
    
    // Show both panes
    editorPaneDiv.style.display = 'block';
    previewPaneDiv.style.display = 'block';
    editorPaneDiv.style.flex = '1';
    previewPaneDiv.style.flex = '1';
    editorPaneDiv.style.width = '50%';
    previewPaneDiv.style.width = '50%';
    
    // Both are visible, so buttons should say "Hide"
    showCodeButton.innerHTML = '<i class="bi bi-code-square"></i> Hide Editor';
    showCodeButton.classList.remove("border-primary");
    showPreviewButton.innerHTML = '<i class="bi bi-eye"></i> Hide Preview';
    showPreviewButton.classList.remove("border-primary");
    
    // Update mobile buttons
    updateMobileButtons();
  }

  // Modified functions to cycle through states
  function toggleEditorView() {
    const editorPaneDiv = document.querySelector(".editor-pane");
    const previewPaneDiv = document.querySelector(".preview-pane");
    
    if (editorPaneDiv.style.display === 'none') {
      // Currently showing preview only, switch to both
      showBoth();
    } else if (previewPaneDiv.style.display === 'none') {
      // Currently showing code only, switch to both
      showBoth();
    } else {
      // Currently showing both, switch to code only
      showCodeOnly();
    }
  }

  function togglePreviewView() {
    const editorPaneDiv = document.querySelector(".editor-pane");
    const previewPaneDiv = document.querySelector(".preview-pane");
    
    if (previewPaneDiv.style.display === 'none') {
      // Currently showing code only, switch to both
      showBoth();
    } else if (editorPaneDiv.style.display === 'none') {
      // Currently showing preview only, switch to both
      showBoth();
    } else {
      // Currently showing both, switch to preview only
      showPreviewOnly();
    }
  }

  function printPreview() {
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

  function openMobileMenu() {
    mobileMenuPanel.classList.add("active");
    mobileMenuOverlay.classList.add("active");
  }
  function closeMobileMenu() {
    mobileMenuPanel.classList.remove("active");
    mobileMenuOverlay.classList.remove("active");
  }
  mobileMenuToggle.addEventListener("click", openMobileMenu);
  mobileCloseMenu.addEventListener("click", closeMobileMenu);
  mobileMenuOverlay.addEventListener("click", closeMobileMenu);

  function updateMobileStats() {
    mobileCharCount.textContent   = charCountElement.textContent;
    mobileWordCount.textContent   = wordCountElement.textContent;
  }

  const origUpdateStats = updateDocumentStats;
  updateDocumentStats = function() {
    origUpdateStats();
    updateMobileStats();
  };

  mobileToggleSync.addEventListener("click", () => {
    toggleSyncScrolling();
    if (syncScrollingEnabled) {
      mobileToggleSync.innerHTML = '<i class="bi bi-link me-2"></i> Sync On';
      mobileToggleSync.classList.add("sync-enabled");
      mobileToggleSync.classList.remove("sync-disabled");
      mobileToggleSync.classList.remove("border-primary");
    } else {
      mobileToggleSync.innerHTML = '<i class="bi bi-link-45deg me-2"></i> Sync Off';
      mobileToggleSync.classList.add("sync-disabled");
      mobileToggleSync.classList.remove("sync-enabled");
      mobileToggleSync.classList.add("border-primary");
    }
  });
  mobileImportBtn.addEventListener("click", () => fileInput.click());
  mobileShowCode.addEventListener("click", () => {
    showCodeButton.click();
  });
  mobileShowPreview.addEventListener("click", () => {
    showPreviewButton.click();
  });
  mobilePrintButton.addEventListener("click", () => printButton.click());
  mobileCopyMarkdown.addEventListener("click", () => copyMarkdownButton.click());
  mobileThemeToggle.addEventListener("click", () => {
    themeToggle.click();
    mobileThemeToggle.innerHTML = themeToggle.innerHTML + " Toggle Dark Mode";
  });
  
  renderMarkdown();
  updateMobileStats();
  updateLineNumbers();

  // Initialize undo stack with current content
  lastSavedState = createState();

  // Formatting toolbar event listeners
  document.getElementById('format-h1').addEventListener('click', () => insertAtLineStart('# '));
  document.getElementById('format-h2').addEventListener('click', () => insertAtLineStart('## '));
  document.getElementById('format-h3').addEventListener('click', () => insertAtLineStart('### '));
  document.getElementById('format-bold').addEventListener('click', () => wrapText('**', '**'));
  document.getElementById('format-italic').addEventListener('click', () => wrapText('*', '*'));
  document.getElementById('format-code').addEventListener('click', () => wrapText('`', '`'));
  document.getElementById('format-quote').addEventListener('click', () => insertAtLineStart('> '));
  document.getElementById('format-ul').addEventListener('click', () => insertAtLineStart('- '));
  document.getElementById('format-ol').addEventListener('click', () => insertAtLineStart('1. '));
  document.getElementById('format-linebreak').addEventListener('click', () => insertText('  \n'));
  document.getElementById('format-undo').addEventListener('click', undoAction);
  document.getElementById('format-redo').addEventListener('click', redoAction);
  document.getElementById('export-markdown').addEventListener('click', (e) => {
    e.preventDefault();
    downloadMarkdown();
  });
  document.getElementById('export-html').addEventListener('click', (e) => {
    e.preventDefault();
    exportAsHTML();
  });
  document.getElementById('export-txt').addEventListener('click', (e) => {
    e.preventDefault();
    exportAsText();
  });
  document.getElementById('export-pdf').addEventListener('click', (e) => {
    e.preventDefault();
    exportAsPDF();
  });
  document.getElementById('format-upload').addEventListener('click', () => fileInput.click());
  document.getElementById('format-fullscreen').addEventListener('click', toggleFullscreen);

  // Listen for fullscreen changes (e.g., when ESC is pressed)
  document.addEventListener('fullscreenchange', () => {
    const fullscreenButton = document.getElementById('format-fullscreen');
    if (!document.fullscreenElement) {
      fullscreenButton.innerHTML = '<i class="bi bi-fullscreen"></i>';
      fullscreenButton.title = 'Toggle Fullscreen';
    }
  });

  markdownEditor.addEventListener("input", debouncedRender);
  markdownEditor.addEventListener("input", () => {
    // Save to undo stack on significant changes (more than single character)
    clearTimeout(window.undoSaveTimeout);
    window.undoSaveTimeout = setTimeout(saveToUndoStack, 1000);
  });
  markdownEditor.addEventListener("scroll", syncLineNumbersScroll);
  editorPane.addEventListener("scroll", syncEditorToPreview);
  previewPane.addEventListener("scroll", syncPreviewToEditor);
  toggleSyncButton.addEventListener("click", toggleSyncScrolling);
  showCodeButton.addEventListener("click", toggleEditorVisibility);
  showPreviewButton.addEventListener("click", togglePreviewVisibility);
  printButton.addEventListener("click", printPreview);
  themeToggle.addEventListener("click", function () {
    const theme =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", theme);

    if (theme === "dark") {
      themeToggle.innerHTML = '<i class="bi bi-sun"></i>';
    } else {
      themeToggle.innerHTML = '<i class="bi bi-moon"></i>';
    }
    
    renderMarkdown();
  });

  importButton.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      importMarkdownFile(file);
    }
    this.value = "";
  });

  copyMarkdownButton.addEventListener("click", function () {
    try {
      const markdownText = markdownEditor.value;
      copyToClipboard(markdownText);
    } catch (e) {
      console.error("Copy failed:", e);
      alert("Failed to copy Markdown: " + e.message);
    }
  });

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showCopiedMessage();
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          showCopiedMessage();
        } else {
          throw new Error("Copy command was unsuccessful");
        }
      }
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Failed to copy HTML: " + err.message);
    }
  }

  function showCopiedMessage() {
    const originalText = copyMarkdownButton.innerHTML;
    copyMarkdownButton.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';

    setTimeout(() => {
      copyMarkdownButton.innerHTML = originalText;
    }, 2000);
  }

  const dropEvents = ["dragenter", "dragover", "dragleave", "drop"];

  dropEvents.forEach((eventName) => {
    dropzone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropzone.classList.add("active");
  }

  function unhighlight() {
    dropzone.classList.remove("active");
  }

  dropzone.addEventListener("drop", handleDrop, false);
  dropzone.addEventListener("click", function (e) {
    if (e.target !== closeDropzoneBtn && !closeDropzoneBtn.contains(e.target)) {
      fileInput.click();
    }
  });
  closeDropzoneBtn.addEventListener("click", function(e) {
    e.stopPropagation(); 
    dropzone.style.display = "none";
  });

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      const file = files[0];
      const isMarkdownFile =
        file.type === "text/markdown" ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".markdown");
      if (isMarkdownFile) {
        importMarkdownFile(file);
      } else {
        alert("Please upload a Markdown file (.md or .markdown)");
      }
    }
  }

  document.addEventListener("keydown", function (e) {
    // Formatting keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      switch(e.key) {
        case 'b':
          e.preventDefault();
          document.getElementById('format-bold').click();
          break;
        case 'i':
          e.preventDefault();
          document.getElementById('format-italic').click();
          break;
        case '`':
          e.preventDefault();
          document.getElementById('format-code').click();
          break;
        case 'z':
          e.preventDefault();
          undoAction();
          break;
        case 'y':
          e.preventDefault();
          redoAction();
          break;
      }
    }
    
    // Ctrl+Shift shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
      switch(e.key) {
        case 'Z':
          e.preventDefault();
          redoAction();
          break;
      }
    }
    
    // Original keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      downloadMarkdown();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      e.preventDefault();
      copyMarkdownButton.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
      e.preventDefault();
      toggleSyncScrolling();
    }
  });
});