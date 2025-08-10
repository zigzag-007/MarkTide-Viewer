// Sample content provider for MarkTide Viewer
// Exposes a small API to fetch the default sample markdown used on first load

(function initMarkTideSample() {
  const getDefaultMarkdown = () => `# Welcome to MarkTide Viewer

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
     - Instant rendering of changes
- Syntax highlighting with 190+ programming languages
- Formatting toolbar (bold/italic/code, lists, etc.)
- Drag & drop file support (with replace warning)

### 🔄 **Format Conversion**

- **Markdown to PDF** - Professional document export
     - High-quality print output
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

|       Features         | MarkTide Viewer |     Other Tools        |
|------------------------|-----------------|----------------------- |
| **Free Forever**       |     ✔️ ✔️      |  (Most charge)         |
| **No Registration**    |     ✔️ ✔️      |  (Most require signup) |
| **Works Offline**      |     ✔️ ✔️      |  (Most need internet)  |
| **Privacy Focused**    |     ✔️ ✔️      |  (Most track users)    |

---

**Ready to get started?** Just start typing above or drag and drop your markdown file!`;

  window.MarkTideSample = {
    getDefaultMarkdown,
  };
})();


