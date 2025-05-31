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
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }
    
    const start = this.markdownEditor.selectionStart;
    const end = this.markdownEditor.selectionEnd;
    const currentValue = this.markdownEditor.value;
    
    this.markdownEditor.value = currentValue.substring(0, start) + text + currentValue.substring(end);
    this.markdownEditor.selectionStart = this.markdownEditor.selectionEnd = start + text.length;
    this.markdownEditor.focus();
    
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
  }

  wrapText(prefix, suffix = '') {
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
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
    
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
  }

  insertAtLineStart(prefix) {
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
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
    
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
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

  handleInput() {
    // Save to undo stack periodically
    clearTimeout(this.undoSaveTimeout);
    this.undoSaveTimeout = setTimeout(() => {
      if (window.MarkTideUndoRedo) {
        window.MarkTideUndoRedo.saveToUndoStack();
      }
    }, 1000);

    // Update line numbers
    this.updateLineNumbers();
    
    // Trigger markdown rendering
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
    
    // Save to undo stack on significant changes
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }
  }

  handleKeydown(e) {
    // Handle tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      this.insertText('  '); // Insert 2 spaces
      
      // Trigger re-render after tab insertion
      if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
        window.MarkTideRenderer.debouncedRender();
      }
      
      // Save state for undo
      if (window.MarkTideUndoRedo) {
        window.MarkTideUndoRedo.saveToUndoStack();
      }
    }
  }

  handlePaste(e) {
    // Allow default paste behavior, then trigger re-render
    setTimeout(() => {
      this.updateLineNumbers();
      if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
        window.MarkTideRenderer.debouncedRender();
      }
    }, 10);
  }
}

// Create global instance
window.MarkTideEditor = new EditorManager();