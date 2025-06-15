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
    const currentValue = this.markdownEditor.value;
    const selectedText = currentValue.substring(start, end);

    // Determine if formatting is already applied directly around the selection
    const hasPrefix = start >= prefix.length && currentValue.substring(start - prefix.length, start) === prefix;
    const hasSuffix = end + suffix.length <= currentValue.length && currentValue.substring(end, end + suffix.length) === suffix;

    if (hasPrefix && hasSuffix) {
      // Unwrap / remove formatting
      const newValue = currentValue.substring(0, start - prefix.length) +
                       selectedText +
                       currentValue.substring(end + suffix.length);
      this.markdownEditor.value = newValue;
      // Update selection to the original text
      this.markdownEditor.selectionStart = start - prefix.length;
      this.markdownEditor.selectionEnd = end - prefix.length;
    } else if (selectedText) {
      // Apply formatting around selected text
      const wrappedText = prefix + selectedText + suffix;
      this.markdownEditor.value = currentValue.substring(0, start) + wrappedText + currentValue.substring(end);
      this.markdownEditor.selectionStart = start + prefix.length;
      this.markdownEditor.selectionEnd = start + prefix.length + selectedText.length;
    } else {
      // No selection: insert prefix & suffix and place cursor in-between
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

  handleMouseUp(e) {
    // Fix double-click word selection to not include trailing spaces
    if (e.detail === 2) { // Double-click
      const start = this.markdownEditor.selectionStart;
      const end = this.markdownEditor.selectionEnd;
      const selectedText = this.markdownEditor.value.substring(start, end);
      
      // Trim trailing whitespace but keep leading whitespace intact
      const trimmedText = selectedText.replace(/\s+$/, '');
      if (trimmedText.length !== selectedText.length) {
        this.markdownEditor.setSelectionRange(start, start + trimmedText.length);
      }
    }

    // Triple-click usually selects the whole line/paragraph – trim trailing spaces/newlines
    if (e.detail === 3) {
      const start = this.markdownEditor.selectionStart;
      const end = this.markdownEditor.selectionEnd;
      const selectedText = this.markdownEditor.value.substring(start, end);
      
      // Remove trailing whitespace *and* line breaks but keep leading spaces intact
      const trimmedText = selectedText.replace(/[\s\n]+$/, '');
      if (trimmedText.length !== selectedText.length) {
        this.markdownEditor.setSelectionRange(start, start + trimmedText.length);
      }
    }
  }

  // New: Set heading level (1-6) similar to MS Word
  setHeading(level) {
    if (level < 1 || level > 6) return;
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }

    const prefix = '#'.repeat(level) + ' ';
    const start = this.markdownEditor.selectionStart;
    const currentValue = this.markdownEditor.value;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEndIdx = currentValue.indexOf('\n', start);
    const lineEnd = lineEndIdx === -1 ? currentValue.length : lineEndIdx;
    const lineText = currentValue.substring(lineStart, lineEnd);

    const headingRegex = /^#{1,6}\s+/;
    const hasDesired = lineText.startsWith(prefix);
    const strippedLine = lineText.replace(headingRegex, '');

    let newLine;
    if (hasDesired) {
      // Toggle off heading
      newLine = strippedLine;
    } else {
      newLine = prefix + strippedLine;
    }

    // Replace line
    this.markdownEditor.value = currentValue.substring(0, lineStart) + newLine + currentValue.substring(lineEnd);

    // Move cursor: keep it at same offset within strippedLine
    const cursorOffset = start - lineStart;
    let newPos = lineStart + (hasDesired ? 0 : prefix.length) + cursorOffset;
    // Ensure within line bounds
    if (newPos > lineStart + newLine.length) newPos = lineStart + newLine.length;
    this.markdownEditor.selectionStart = this.markdownEditor.selectionEnd = newPos;

    this.markdownEditor.focus();

    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
  }
}

// Create global instance
window.MarkTideEditor = new EditorManager();