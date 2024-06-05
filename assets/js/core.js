// Core initialization and main application setup

class MarkFlowCore {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeApp());
    } else {
      this.initializeApp();
    }
  }

  initializeApp() {
    // Initialize all modules
    this.initializeModules();
    
    // Set up formatting toolbar
    this.setupFormattingToolbar();
    
    // Set up export buttons
    this.setupExportButtons();
    
    // Set up fullscreen functionality
    this.setupFullscreen();
    
    // Load sample content
    this.loadSampleContent();
    
    // Initial render
    this.performInitialRender();
    
    // Set up editor event listeners
    this.setupEditorEventListeners();
    
    this.initialized = true;
  }

  initializeModules() {
    // Initialize all MarkFlow modules
    if (window.MarkFlowTheme) window.MarkFlowTheme.init();
    if (window.MarkFlowMermaid) window.MarkFlowMermaid.initMermaid();
    if (window.MarkFlowRenderer) window.MarkFlowRenderer.init();
    if (window.MarkFlowEditor) window.MarkFlowEditor.init(document.getElementById("markdown-editor"));
    if (window.MarkFlowUndoRedo) window.MarkFlowUndoRedo.init(document.getElementById("markdown-editor"));
    if (window.MarkFlowScrollSync) window.MarkFlowScrollSync.init();
    if (window.MarkFlowViewManager) window.MarkFlowViewManager.init();
    if (window.MarkFlowImportExport) window.MarkFlowImportExport.init();
    if (window.MarkFlowPrintHandler) window.MarkFlowPrintHandler.init();
    if (window.MarkFlowMobileMenu) window.MarkFlowMobileMenu.init();
    if (window.MarkFlowKeyboardShortcuts) window.MarkFlowKeyboardShortcuts.init();
  }

  setupFormattingToolbar() {
    // Formatting toolbar event listeners
    const formatButtons = [
      { id: 'format-h1', action: () => window.MarkFlowEditor.insertAtLineStart('# ') },
      { id: 'format-h2', action: () => window.MarkFlowEditor.insertAtLineStart('## ') },
      { id: 'format-h3', action: () => window.MarkFlowEditor.insertAtLineStart('### ') },
      { id: 'format-bold', action: () => window.MarkFlowEditor.wrapText('**', '**') },
      { id: 'format-italic', action: () => window.MarkFlowEditor.wrapText('*', '*') },
      { id: 'format-code', action: () => window.MarkFlowEditor.wrapText('`', '`') },
      { id: 'format-quote', action: () => window.MarkFlowEditor.insertAtLineStart('> ') },
      { id: 'format-ul', action: () => window.MarkFlowEditor.insertAtLineStart('- ') },
      { id: 'format-ol', action: () => window.MarkFlowEditor.insertAtLineStart('1. ') },
      { id: 'format-linebreak', action: () => window.MarkFlowEditor.insertText('---\n') },
      { id: 'format-undo', action: () => window.MarkFlowUndoRedo.undoAction() },
      { id: 'format-redo', action: () => window.MarkFlowUndoRedo.redoAction() },
      { id: 'format-upload', action: () => {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
          fileInput.click();
        }
      }}
    ];

    formatButtons.forEach(button => {
      const element = document.getElementById(button.id);
      if (element) {
        element.addEventListener('click', button.action);
      }
    });
  }

  setupExportButtons() {
    // set up toolbar export buttons to trigger header export buttons
    const toolbarExportButtons = [
      { toolbarId: 'toolbar-export-markdown', headerId: 'export-markdown' },
      { toolbarId: 'toolbar-export-html', headerId: 'export-html' },
      { toolbarId: 'toolbar-export-txt', headerId: 'export-txt' },
      { toolbarId: 'toolbar-export-pdf', headerId: 'export-pdf' }
    ];

    toolbarExportButtons.forEach(button => {
      const toolbarElement = document.getElementById(button.toolbarId);
      const headerElement = document.getElementById(button.headerId);
      
      if (toolbarElement && headerElement) {
        toolbarElement.addEventListener('click', (e) => {
          e.preventDefault();
          headerElement.click();
        });
      }
    });
  }

  setupFullscreen() {
    const fullscreenButton = document.getElementById('format-fullscreen');
    if (fullscreenButton) {
      fullscreenButton.addEventListener('click', this.toggleFullscreen);
    }

    // Listen for fullscreen changes (e.g., when ESC is pressed)
    document.addEventListener('fullscreenchange', () => {
      const fullscreenButton = document.getElementById('format-fullscreen');
      if (fullscreenButton && !document.fullscreenElement) {
        fullscreenButton.innerHTML = '<i class="bi bi-fullscreen"></i>';
        fullscreenButton.title = 'Toggle Fullscreen';
      }
    });
  }

  toggleFullscreen() {
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

  loadSampleContent() {
    const sampleMarkdown = `# 🚀 Welcome to MarkFlow Viewer

> **The Ultimate Markdown Editor** - Where creativity meets simplicity in perfect harmony.

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Core Features](#core-features)
3. [Markdown Showcase](#markdown-showcase)
4. [Code Examples](#code-examples)
5. [Advanced Features](#advanced-features)
6. [Tips & Tricks](#tips-tricks)
7. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Introduction

Welcome to **MarkFlow Viewer**, your comprehensive markdown editing solution! This powerful editor combines intuitive design with advanced features to create the perfect writing environment for developers, writers, and content creators.

### Why Choose MarkFlow?

- ✨ **Real-time Preview** - See your changes instantly
- 🎨 **Beautiful Themes** - Light and dark modes for comfortable editing
- 💾 **Multiple Export Options** - PDF, HTML, and Markdown formats
- ⚡ **Lightning Fast** - Optimized performance for large documents
- 📱 **Responsive Design** - Works seamlessly on all devices

---

## Core Features

### 1. **Rich Text Formatting**

Transform your plain text into beautifully formatted documents with ease:

**Bold text** makes your important points stand out, while *italic text* adds emphasis with elegance. You can even combine them for ***bold italic*** impact!

Need to ~~strike through~~ outdated information? We've got you covered. Want to highlight \`inline code\`? Just wrap it in backticks!

### 2. **Lists & Organization**

#### Unordered Lists
- 🎯 Clean and organized structure
- 🔧 Easy to create and maintain
- 📊 Perfect for brainstorming
  - Nested items for hierarchy
  - Multiple levels supported
    - As deep as you need

#### Ordered Lists
1. Step-by-step instructions
2. Sequential processes
3. Ranked items
   1. Sub-steps with clarity
   2. Detailed breakdowns
      1. Even more detail when needed

#### Task Lists
- [x] Complete markdown support
- [x] Real-time preview
- [x] Export functionality
- [ ] Share your amazing documents
- [ ] Collaborate with others

### 3. **Blockquotes & Callouts**

> "The best way to predict the future is to create it."
> 
> This editor helps you create beautiful documents that stand out from the crowd.

> **💡 Pro Tip:** Use blockquotes to highlight important information or memorable quotes!

---

## Markdown Showcase

### Tables Made Simple

| Feature | Description | Status |
|---------|-------------|--------|
| **Syntax Highlighting** | Beautiful code coloring | ✅ Active |
| **Live Preview** | Real-time rendering | ✅ Active |
| **Export Options** | PDF, HTML, Markdown | ✅ Active |
| **Theme Support** | Light & Dark modes | ✅ Active |
| **Mobile Responsive** | Works on all devices | ✅ Active |

### Mathematical Expressions

MarkFlow supports both inline math like $E = mc^2$ and display math:

$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

Complex equations? No problem:

$$\\nabla \\times \\vec{\\mathbf{B}} - \\frac{1}{c} \\frac{\\partial\\vec{\\mathbf{E}}}{\\partial t} = \\frac{4\\pi}{c}\\vec{\\mathbf{j}}$$

---

## Code Examples

### Java Excellence

\`\`\`java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello World!");
        // Brought to you by Zig Zag
    }
}
\`\`\`

### Python Excellence

\`\`\`python
print("Hello World!")
# Brought to you by Zig Zag
\`\`\`

### HTML & CSS Styling

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>MarkFlow Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; }
        h1 { color: #333; border-bottom: 2px solid #eee; }
    </style>
</head>
<body>
    <h1>Your Content Here</h1>
</body>
</html>
\`\`\`


## Advanced Features

### 1. Mermaid Diagrams

\`\`\`mermaid
graph TD
    A[Start Editing] --> B{Choose Mode}
    B -->|Light| C[Light Theme]
    B -->|Dark| D[Dark Theme]
    C --> E[Write Content]
    D --> E[Write Content]
    E --> F{Export Format}
    F -->|PDF| G[Download PDF]
    F -->|HTML| H[Download HTML]
    F -->|Markdown| I[Download MD]
\`\`\`

### 2. Flowcharts

\`\`\`mermaid
flowchart LR
    subgraph "MarkFlow Editor"
        A[Write] --> B[Preview]
        B --> C[Export]
    end
    
    C --> D{Format}
    D --> E[📄 PDF]
    D --> F[🌐 HTML]
    D --> G[📝 Markdown]
    
    style A fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#000
    style B fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    style C fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000
\`\`\`

### 3. Horizontal Rules

Create visual separators with style:

---

***

___

---

## Tips & Tricks

### 🎯 Power User Tips

1. **Quick Formatting**
   - Use \`Ctrl/Cmd + B\` for **bold**
   - Use \`Ctrl/Cmd + I\` for *italic*
   - Use \`Ctrl/Cmd + K\` for [links]()

2. **Efficient Navigation**
   - Split view for simultaneous editing and preview
   - Toggle views with keyboard shortcuts
   - Use the toolbar for quick formatting

3. **Export Mastery**
   - PDF exports preserve all formatting
   - HTML exports include embedded styles
   - Markdown exports maintain compatibility

---

## Keyboard Shortcuts

### Essential Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| **Bold** | \`Ctrl + B\` | \`Cmd + B\` |
| **Italic** | \`Ctrl + I\` | \`Cmd + I\` |
| **Link** | \`Ctrl + K\` | \`Cmd + K\` |
| **Code** | \`Ctrl + E\` | \`Cmd + E\` |
| **Save** | \`Ctrl + S\` | \`Cmd + S\` |
| **Export** | \`Ctrl + Shift + E\` | \`Cmd + Shift + E\` |
| **Toggle Preview** | \`Ctrl + P\` | \`Cmd + P\` |
| **Toggle Theme** | \`Ctrl + T\` | \`Cmd + T\` |

---

## 🎉 Start Creating!

You're now ready to create amazing documents with MarkFlow Viewer. Whether you're writing technical documentation, creative content, or academic papers, this editor has everything you need.

### Quick Start Checklist

- [ ] Explore the toolbar options
- [ ] Try different themes
- [ ] Test the export features
- [ ] Create your first document

> **Remember:** The best way to learn is by doing. Start typing and watch your ideas come to life!

---

<div align="center">

### 🌟 Happy Writing with MarkFlow Viewer! 🌟

**Built with ❤️ by Zig Zag, for everyone**

</div>
`;

    const markdownEditor = document.getElementById("markdown-editor");
    if (markdownEditor) {
      markdownEditor.value = sampleMarkdown;
    }
  }

  performInitialRender() {
    // Initial render and setup
    if (window.MarkFlowRenderer) {
      window.MarkFlowRenderer.renderMarkdown();
    }
    if (window.MarkFlowUtils) {
      window.MarkFlowUtils.updateDocumentStats();
    }
    if (window.MarkFlowEditor) {
      window.MarkFlowEditor.updateLineNumbers();
    }

    // Initialize undo stack with current content
    if (window.MarkFlowUndoRedo) {
      window.MarkFlowUndoRedo.lastSavedState = window.MarkFlowUndoRedo.createState();
    }
  }

  setupEditorEventListeners() {
    const markdownEditor = document.getElementById("markdown-editor");
    if (!markdownEditor) return;

    markdownEditor.addEventListener("input", () => {
      if (window.MarkFlowRenderer) {
        window.MarkFlowRenderer.debouncedRender();
      }
    });

    markdownEditor.addEventListener("input", () => {
      // Save to undo stack on significant changes (more than single character)
      clearTimeout(window.undoSaveTimeout);
      window.undoSaveTimeout = setTimeout(() => {
        if (window.MarkFlowUndoRedo) {
          window.MarkFlowUndoRedo.saveToUndoStack();
        }
      }, 1000);
    });

    markdownEditor.addEventListener("scroll", () => {
      if (window.MarkFlowEditor) {
        window.MarkFlowEditor.syncLineNumbersScroll();
      }
    });
  }
}

// Initialize the application
const markFlowApp = new MarkFlowCore();
markFlowApp.init();