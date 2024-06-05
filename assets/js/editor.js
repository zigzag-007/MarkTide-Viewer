// Editor functionality for text manipulation and line numbers

class EditorManager {
  constructor() {
    this.markdownEditor = null;
  }

  init(markdownEditor) {
    this.markdownEditor = markdownEditor;
  }

  // Text manipulation functions
  insertText(text) {
    if (window.MarkFlowUndoRedo) {
      window.MarkFlowUndoRedo.saveToUndoStack();
    }
    
    const start = this.markdownEditor.selectionStart;
    const end = this.markdownEditor.selectionEnd;
    const currentValue = this.markdownEditor.value;
    
    this.markdownEditor.value = currentValue.substring(0, start) + text + currentValue.substring(end);
    this.markdownEditor.selectionStart = this.markdownEditor.selectionEnd = start + text.length;
    this.markdownEditor.focus();
    
    if (window.MarkFlowRenderer && window.MarkFlowRenderer.debouncedRender) {
      window.MarkFlowRenderer.debouncedRender();
    }
  }

  wrapText(prefix, suffix = '') {
    if (window.MarkFlowUndoRedo) {
      window.MarkFlowUndoRedo.saveToUndoStack();
    }
    
    const start = this.markdownEditor.selectionStart;
    const end = this.markdownEditor.selectionEnd;
    const selectedText = this.markdownEditor.value.substring(start, end);
    const currentValue = this.markdownEditor.value;
    
    if (selectedText) {
      const wrappedText = prefix + selectedText + suffix;
      this.markdownEditor.value = currentValue.substring(0, start) + wrappedText + currentValue.substring(end);
      this.markdownEditor.selectionStart = start + prefix.length;
      this.markdownEditor.selectionEnd = start + prefix.length + selectedText.length;
    } else {
      const wrappedText = prefix + suffix;
      this.markdownEditor.value = currentValue.substring(0, start) + wrappedText + currentValue.substring(end);
      this.markdownEditor.selectionStart = this.markdownEditor.selectionEnd = start + prefix.length;
    }
    this.markdownEditor.focus();
    
    if (window.MarkFlowRenderer && window.MarkFlowRenderer.debouncedRender) {
      window.MarkFlowRenderer.debouncedRender();
    }
  }

  insertAtLineStart(prefix) {
    if (window.MarkFlowUndoRedo) {
      window.MarkFlowUndoRedo.saveToUndoStack();
    }
    
    const start = this.markdownEditor.selectionStart;
    const currentValue = this.markdownEditor.value;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', start);
    const lineText = currentValue.substring(lineStart, lineEnd === -1 ? currentValue.length : lineEnd);
    
    // Check if line already has the prefix
    if (lineText.startsWith(prefix)) {
      // Remove prefix
      const newText = lineText.substring(prefix.length);
      this.markdownEditor.value = currentValue.substring(0, lineStart) + newText + currentValue.substring(lineEnd === -1 ? currentValue.length : lineEnd);
      this.markdownEditor.selectionStart = this.markdownEditor.selectionEnd = start - prefix.length;
    } else {
      // Add prefix
      this.markdownEditor.value = currentValue.substring(0, lineStart) + prefix + lineText + currentValue.substring(lineEnd === -1 ? currentValue.length : lineEnd);
      this.markdownEditor.selectionStart = this.markdownEditor.selectionEnd = start + prefix.length;
    }
    this.markdownEditor.focus();
    
    if (window.MarkFlowRenderer && window.MarkFlowRenderer.debouncedRender) {
      window.MarkFlowRenderer.debouncedRender();
    }
  }

  updateLineNumbers() {
    const lineNumbersDiv = document.getElementById('line-numbers');
    if (!lineNumbersDiv || !this.markdownEditor) return;
    
    const text = this.markdownEditor.value;
    const lines = text.split('\n');
    
    let lineNumbersText = '';
    for (let i = 1; i <= lines.length; i++) {
      lineNumbersText += i.toString().padStart(3, ' ') + '\n';
    }
    
    lineNumbersDiv.textContent = lineNumbersText;
    
    // Sync scroll position with editor
    lineNumbersDiv.scrollTop = this.markdownEditor.scrollTop;
  }

  syncLineNumbersScroll() {
    const lineNumbersDiv = document.getElementById('line-numbers');
    if (!lineNumbersDiv || !this.markdownEditor) return;
    
    lineNumbersDiv.scrollTop = this.markdownEditor.scrollTop;
  }
}

// Create global instance
window.MarkFlowEditor = new EditorManager();