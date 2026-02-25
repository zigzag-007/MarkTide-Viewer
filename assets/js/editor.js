// Editor functionality for text manipulation (no line numbering)

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

  handleKeydown(e) {
    if (!this.markdownEditor) return;
    // Only handle plain Enter (no modifiers)
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

    const editor = this.markdownEditor;
    const pos = editor.selectionStart;
    if (pos !== editor.selectionEnd) return; // ignore selections

    const value = editor.value;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    const lineEndIdx = value.indexOf('\n', pos);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

    const leftOfCursor = value.substring(lineStart, pos);
    const rightOfCursor = value.substring(pos, lineEnd);

    // Only trigger when nothing after cursor on the line
    if (rightOfCursor.trim().length > 0) return;

    // Match ``` or ```lang (letters, numbers, dash, underscore) with optional trailing spaces
    const fenceOpenRegex = /^```[A-Za-z0-9_-]*\s*$/;

    const trimmedLeft = leftOfCursor.trim();
    if (!fenceOpenRegex.test(trimmedLeft)) return;

    // Determine if we're currently inside a fence before this line.
    // If so, this line is a CLOSING fence and we must not auto-insert another.
    // Simple, robust heuristic: toggle state on every line that starts with ``` up to current lineStart.
    const before = value.substring(0, lineStart);
    const linesBefore = before.split('\n');
    let inFence = false;
    for (let i = 0; i < linesBefore.length; i += 1) {
      const t = linesBefore[i].trim();
      if (fenceOpenRegex.test(t)) {
        inFence = !inFence;
      }
    }
    // If we're inside a fence before this line, current fence is a closer → do nothing
    if (inFence) return;

    // Avoid duplicate if a closer already follows immediately
    const after = value.substring(pos);
    if (/^\n?```/.test(after)) return;

    // Perform insertion: newline, blank line, then closing fence. Caret on the blank line
    e.preventDefault();

    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }

    const insertText = '\n\n```';
    editor.value = value.substring(0, pos) + insertText + value.substring(pos);
    // Place caret on the blank line between fences
    editor.selectionStart = editor.selectionEnd = pos + 1;
    editor.focus();

    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
    if (window.MarkTideUtils) {
      window.MarkTideUtils.updateDocumentStats();
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