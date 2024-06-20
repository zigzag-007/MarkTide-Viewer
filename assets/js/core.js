// Core application initialization and management
class MarkTideCore {
  constructor() {
    this.initialized = false;
    this.markdownEditor = null;
  }

  init() {
    if (this.initialized) return;

    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeApp());
      } else {
        this.initializeApp();
      }
    } catch (error) {
      console.error('Failed to initialize MarkTide Viewer:', error);
    }
  }

  initializeApp() {
    try {
      // Get markdown editor reference
      this.markdownEditor = document.getElementById("markdown-editor");
      
      if (!this.markdownEditor) {
        console.error('Markdown editor element not found');
        return;
      }

      // Initialize theme first (affects other components)
      this.initializeTheme();
      
      // Initialize core modules in dependency order
      this.initializeModules();
      
      // Set up formatting toolbar
      this.setupFormattingToolbar();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load sample content
      this.loadSampleContent();
      
      this.initialized = true;
      console.log('MarkTide Viewer initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
    }
  }

  initializeModules() {
    // Initialize all MarkTide modules
    if (window.MarkTideTheme) window.MarkTideTheme.init();
    if (window.MarkTideMermaid) window.MarkTideMermaid.initMermaid();
    if (window.MarkTideRenderer) window.MarkTideRenderer.init();
    if (window.MarkTideEditor) window.MarkTideEditor.init(document.getElementById("markdown-editor"));
    if (window.MarkTideUndoRedo) window.MarkTideUndoRedo.init(document.getElementById("markdown-editor"));
    if (window.MarkTideScrollSync) window.MarkTideScrollSync.init();
    if (window.MarkTideViewManager) window.MarkTideViewManager.init();
    if (window.MarkTideImportExport) window.MarkTideImportExport.init();
    if (window.MarkTidePrintHandler) window.MarkTidePrintHandler.init();
    if (window.MarkTideMobileMenu) window.MarkTideMobileMenu.init();
    if (window.MarkTideKeyboardShortcuts) window.MarkTideKeyboardShortcuts.init();
  }

  setupFormattingToolbar() {
    const formatButtons = [
      { id: 'format-h1', action: () => window.MarkTideEditor.insertAtLineStart('# ') },
      { id: 'format-h2', action: () => window.MarkTideEditor.insertAtLineStart('## ') },
      { id: 'format-h3', action: () => window.MarkTideEditor.insertAtLineStart('### ') },
      { id: 'format-bold', action: () => window.MarkTideEditor.wrapText('**', '**') },
      { id: 'format-italic', action: () => window.MarkTideEditor.wrapText('*', '*') },
      { id: 'format-code', action: () => window.MarkTideEditor.wrapText('`', '`') },
      { id: 'format-quote', action: () => window.MarkTideEditor.insertAtLineStart('> ') },
      { id: 'format-ul', action: () => window.MarkTideEditor.insertAtLineStart('- ') },
      { id: 'format-ol', action: () => window.MarkTideEditor.insertAtLineStart('1. ') },
      { id: 'format-linebreak', action: () => window.MarkTideEditor.insertText('---\n') },
      { id: 'format-undo', action: () => window.MarkTideUndoRedo.undoAction() },
      { id: 'format-redo', action: () => window.MarkTideUndoRedo.redoAction() },
      { id: 'format-upload', action: () => document.getElementById('file-input').click() }
    ];

    formatButtons.forEach(({ id, action }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          action();
        });
      }
    });
  }

  initializeTheme() {
    // Apply saved theme or default
    const savedTheme = localStorage.getItem('marktide-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  loadSampleContent() {
    if (!this.markdownEditor || this.markdownEditor.value.trim()) return;

    const sampleMarkdown = `# 🚀 Welcome to MarkTide Viewer

> **The Ultimate Free Online Markdown Editor** - Where creativity meets simplicity in perfect harmony.

## 🌟 What is MarkTide Viewer?

MarkTide Viewer is a powerful, **free online markdown editor and converter** that runs entirely in your browser. No downloads, no registration required! Perfect for developers, writers, students, and anyone who works with Markdown files.

### 🎯 Perfect For:

- **Developers** writing documentation
- **Students** creating notes and assignments  
- **Writers** drafting articles and blogs
- **Technical writers** creating manuals
- **GitHub users** previewing README files
- **Anyone** who needs to convert Markdown to PDF or HTML

## ✨ Key Features

### 📝 **Markdown Editor**

- Real-time live preview
- Syntax highlighting with 190+ programming languages
- Line numbers and formatting toolbar
- Drag & drop file support
- Auto-save functionality

### 🔄 **Format Conversion**

- **Markdown to PDF** - Professional document export
- **Markdown to HTML** - Web-ready conversion
- **Markdown to Text** - Plain text extraction
- **GitHub-flavored Markdown** support

### 🎨 **User Experience**

- Beautiful dark & light themes
- Responsive design (works on mobile, tablet, desktop)
- Split-screen editor and preview
- Scroll synchronization
- Keyboard shortcuts for power users

### 🚀 **Advanced Features**

- Mermaid diagram support
- Mathematical expressions (LaTeX)
- Tables, task lists, and code blocks
- Emoji support
- Print-friendly layouts

## 🚀 Quick Start

1. **Start typing** or **drag & drop** your \`.md\` file
2. **See live preview** in real-time
3. **Export** to PDF, HTML, or Text when ready

No installation needed - works instantly in any modern web browser!

## 🎯 Use Cases

### For Developers
\`\`\`markdown
# Project Documentation
- API documentation
- README files
- Code documentation
- Technical specifications
\`\`\`

### For Students & Academics
\`\`\`markdown
# Academic Work
- Research papers
- Study notes  
- Assignment reports
- Thesis drafts
\`\`\`

### For Content Creators
\`\`\`markdown
# Content Creation
- Blog posts
- Articles
- Documentation
- User manuals
\`\`\`

## 📊 Example Mermaid Diagram

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
\`\`\`

## 🧮 Mathematical Expressions

Inline math: $E = mc^2$

Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## 📋 Task List Example

- [x] Create awesome markdown editor
- [x] Add real-time preview
- [x] Implement export features
- [ ] Add more themes
- [ ] Mobile app version

## 📊 Table Example

| Feature | MarkTide Viewer | Other Tools |
|---------|----------------|-------------|
| **Free Forever** | ✅ | ❌ (Most charge) |
| **No Registration** | ✅ | ❌ (Most require signup) |
| **Works Offline** | ✅ | ❌ (Most need internet) |
| **Privacy Focused** | ✅ | ❌ (Most track users) |

---

**Ready to get started?** Just start typing above or drag and drop your markdown file! 🚀`;

    this.markdownEditor.value = sampleMarkdown;
    
    // Render the sample content
    if (window.MarkTideRenderer) {
      window.MarkTideRenderer.renderMarkdown();
    }
    if (window.MarkTideUtils) {
      window.MarkTideUtils.updateDocumentStats();
    }
    if (window.MarkTideEditor) {
      window.MarkTideEditor.updateLineNumbers();
    }
    
    // Set initial undo state
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.lastSavedState = window.MarkTideUndoRedo.createState();
    }
  }

  setupEventListeners() {
    if (!this.markdownEditor) return;

    // Editor input events
    this.markdownEditor.addEventListener('input', () => {
      if (window.MarkTideRenderer) {
        window.MarkTideRenderer.debouncedRender();
      }
    });

    this.markdownEditor.addEventListener('keydown', (e) => {
      if (window.MarkTideUndoRedo) {
        window.MarkTideUndoRedo.saveToUndoStack();
      }
    });

    this.markdownEditor.addEventListener('scroll', () => {
      if (window.MarkTideEditor) {
        window.MarkTideEditor.syncLineNumbersScroll();
      }
    });
  }
}

// Initialize the application
const markTideApp = new MarkTideCore();
markTideApp.init();