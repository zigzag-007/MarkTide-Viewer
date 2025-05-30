// Keyboard shortcuts and hotkey management

class KeyboardShortcutManager {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    document.addEventListener("keydown", (e) => this.handleKeydown(e));
    this.initialized = true;
  }

  handleKeydown(e) {
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
          if (window.MarkFlowUndoRedo) {
            window.MarkFlowUndoRedo.undoAction();
          }
          break;
        case 'y':
          e.preventDefault();
          if (window.MarkFlowUndoRedo) {
            window.MarkFlowUndoRedo.redoAction();
          }
          break;
        case 's':
          e.preventDefault();
          if (window.MarkFlowImportExport) {
            window.MarkFlowImportExport.downloadMarkdown();
          }
          break;
        case 'c':
          e.preventDefault();
          const copyMarkdownButton = document.getElementById("copy-markdown-button");
          if (copyMarkdownButton) {
            copyMarkdownButton.click();
          }
          break;
      }
    }
    
    // Ctrl+Shift shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
      switch(e.key) {
        case 'Z':
          e.preventDefault();
          if (window.MarkFlowUndoRedo) {
            window.MarkFlowUndoRedo.redoAction();
          }
          break;
        case 'S':
          e.preventDefault();
          if (window.MarkFlowScrollSync) {
            window.MarkFlowScrollSync.toggleSyncScrolling();
          }
          break;
      }
    }
  }
}

// Create global instance
window.MarkFlowKeyboardShortcuts = new KeyboardShortcutManager();