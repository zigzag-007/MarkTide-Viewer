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
    // Handle F11 key for fullscreen
    if (e.key === 'F11') {
      e.preventDefault();
      if (window.MarkTideCore && window.MarkTideCore.toggleFullscreen) {
        window.MarkTideCore.toggleFullscreen();
      }
      return;
    }

    // Tab indentation (like Sublime Text)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        this.outdentText();
      } else {
        this.indentText();
      }
      return;
    }
    
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
          if (window.MarkTideUndoRedo) {
            window.MarkTideUndoRedo.undoAction();
          }
          break;
        case 'y':
          e.preventDefault();
          if (window.MarkTideUndoRedo) {
            window.MarkTideUndoRedo.redoAction();
          }
          break;
        case 's':
          e.preventDefault();
          if (window.MarkTideImportExport) {
            window.MarkTideImportExport.downloadMarkdown();
          }
          break;
      }
    }
    
    // Ctrl+Shift shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
      switch(e.key) {
        case 'Z':
          e.preventDefault();
          if (window.MarkTideUndoRedo) {
            window.MarkTideUndoRedo.redoAction();
          }
          break;

        case 'Backspace':
          e.preventDefault();
          this.deleteToLineStart();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.moveLineUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.moveLineDown();
          break;
      }
    }
  }

  deleteToLineStart() {
    const editor = document.getElementById('markdown-editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const value = editor.value;
    
    // Find the start of the current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    
    // Check if line is already empty (only whitespace from start to cursor)
    const lineContent = value.substring(lineStart, start);
    const isLineEmpty = lineContent.trim() === '';
    
    if (isLineEmpty && lineStart > 0) {
      // Line is empty, delete the entire line (including the newline before it)
      const prevNewline = lineStart - 1; // The newline character before this line
      const lineEnd = value.indexOf('\n', start);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd + 1; // Include newline after
      
      const newValue = value.substring(0, prevNewline) + value.substring(actualLineEnd);
      editor.value = newValue;
      
      // Set cursor to end of previous line
      editor.selectionStart = editor.selectionEnd = prevNewline;
    } else {
      // Delete from line start to cursor position (original behavior)
      const newValue = value.substring(0, lineStart) + value.substring(start);
      editor.value = newValue;
      
      // Set cursor to line start
      editor.selectionStart = editor.selectionEnd = lineStart;
    }
    
    editor.focus();
    
    // Save to undo stack
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }
    
    // Trigger re-render
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
    
    // Update document stats
    if (window.MarkTideUtils) {
      window.MarkTideUtils.updateDocumentStats();
    }
  }

  moveLineUp() {
    const editor = document.getElementById('markdown-editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    
    // Find current line boundaries
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', end);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    
    // Find previous line boundaries  
    const prevLineStart = lineStart > 0 ? value.lastIndexOf('\n', lineStart - 2) + 1 : 0;
    const prevLineEnd = lineStart - 1;
    
    // Can't move up if already at first line
    if (lineStart === 0) return;
    
    // Get line contents
    const currentLine = value.substring(lineStart, actualLineEnd);
    const prevLine = value.substring(prevLineStart, prevLineEnd);
    
    // Calculate new content
    const before = value.substring(0, prevLineStart);
    const after = actualLineEnd < value.length ? value.substring(actualLineEnd) : '';
    const newValue = before + currentLine + '\n' + prevLine + after;
    
    // Update editor
    editor.value = newValue;
    
    // Adjust cursor position
    const newStart = start - (prevLineEnd - prevLineStart + 1);
    const newEnd = end - (prevLineEnd - prevLineStart + 1);
    editor.selectionStart = newStart;
    editor.selectionEnd = newEnd;
    editor.focus();
    
    this.updateAfterLineMove();
  }

  moveLineDown() {
    const editor = document.getElementById('markdown-editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    
    // Find current line boundaries
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', end);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    
    // Find next line boundaries
    const nextLineStart = actualLineEnd + 1;
    const nextLineEnd = value.indexOf('\n', nextLineStart);
    const actualNextLineEnd = nextLineEnd === -1 ? value.length : nextLineEnd;
    
    // Can't move down if already at last line or no next line
    if (actualLineEnd >= value.length || nextLineStart > value.length) return;
    
    // Get line contents
    const currentLine = value.substring(lineStart, actualLineEnd);
    const nextLine = value.substring(nextLineStart, actualNextLineEnd);
    
    // Calculate new content
    const before = value.substring(0, lineStart);
    const after = actualNextLineEnd < value.length ? value.substring(actualNextLineEnd) : '';
    const newValue = before + nextLine + '\n' + currentLine + after;
    
    // Update editor
    editor.value = newValue;
    
    // Adjust cursor position
    const nextLineLength = actualNextLineEnd - nextLineStart;
    const newStart = start + nextLineLength + 1;
    const newEnd = end + nextLineLength + 1;
    editor.selectionStart = newStart;
    editor.selectionEnd = newEnd;
    editor.focus();
    
    this.updateAfterLineMove();
  }

  updateAfterLineMove() {
    // Save to undo stack
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }
    
    // Trigger re-render
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
    
    // Update document stats
    if (window.MarkTideUtils) {
      window.MarkTideUtils.updateDocumentStats();
    }
  }

  indentText() {
    const editor = document.getElementById('markdown-editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    
    if (start === end) {
      // No selection - just add 2 spaces at cursor
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      editor.value = newValue;
      editor.selectionStart = editor.selectionEnd = start + 2;
    } else {
      // Selection exists - indent each line in selection
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end - 1);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
      
      const selectedLines = value.substring(lineStart, actualLineEnd);
      const indentedLines = selectedLines.split('\n').map(line => '  ' + line).join('\n');
      
      const newValue = value.substring(0, lineStart) + indentedLines + value.substring(actualLineEnd);
      editor.value = newValue;
      
      // Adjust selection to account for added spaces
      const linesCount = selectedLines.split('\n').length;
      editor.selectionStart = start + 2; // First line gets 2 spaces
      editor.selectionEnd = end + (linesCount * 2); // Each line gets 2 spaces
    }
    
    editor.focus();
    this.updateAfterIndent();
  }

  outdentText() {
    const editor = document.getElementById('markdown-editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    
    if (start === end) {
      // No selection - remove up to 2 leading spaces from current line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', start);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
      const lineText = value.substring(lineStart, actualLineEnd);
      
      let spacesToRemove = 0;
      if (lineText.startsWith('  ')) {
        spacesToRemove = 2;
      } else if (lineText.startsWith(' ')) {
        spacesToRemove = 1;
      }
      
      if (spacesToRemove > 0) {
        const newLineText = lineText.substring(spacesToRemove);
        const newValue = value.substring(0, lineStart) + newLineText + value.substring(actualLineEnd);
        editor.value = newValue;
        editor.selectionStart = editor.selectionEnd = Math.max(lineStart, start - spacesToRemove);
      }
    } else {
      // Selection exists - outdent each line in selection
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end - 1);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
      
      const selectedLines = value.substring(lineStart, actualLineEnd);
      const lines = selectedLines.split('\n');
      let totalSpacesRemoved = 0;
      
      const outdentedLines = lines.map(line => {
        if (line.startsWith('  ')) {
          totalSpacesRemoved += 2;
          return line.substring(2);
        } else if (line.startsWith(' ')) {
          totalSpacesRemoved += 1;
          return line.substring(1);
        }
        return line;
      }).join('\n');
      
      const newValue = value.substring(0, lineStart) + outdentedLines + value.substring(actualLineEnd);
      editor.value = newValue;
      
      // Adjust selection
      const firstLineSpacesRemoved = lines[0].startsWith('  ') ? 2 : (lines[0].startsWith(' ') ? 1 : 0);
      editor.selectionStart = Math.max(lineStart, start - firstLineSpacesRemoved);
      editor.selectionEnd = end - totalSpacesRemoved;
    }
    
    editor.focus();
    this.updateAfterIndent();
  }

  updateAfterIndent() {
    // Save to undo stack
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }
    
    // Trigger re-render
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
    
    // Update document stats
    if (window.MarkTideUtils) {
      window.MarkTideUtils.updateDocumentStats();
    }
  }
}

// Create global instance
window.MarkTideKeyboardShortcuts = new KeyboardShortcutManager();