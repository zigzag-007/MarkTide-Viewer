// Editor functionality for text manipulation (no line numbering)

class EditorManager {
  constructor() {
    this.markdownEditor = null;
  }

  init(markdownEditor) {
    this.markdownEditor = markdownEditor;
  }

  getMonacoEditorAndModel() {
    if (!window.monaco || !window.MarkTideMonaco || typeof window.MarkTideMonaco.getEditor !== 'function') {
      return null;
    }
    const editor = window.MarkTideMonaco.getEditor();
    if (!editor || typeof editor.getModel !== 'function') return null;
    const model = editor.getModel();
    if (!model) return null;
    return { editor, model };
  }

  triggerRender() {
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
  }

  applyMonacoTextUpdate({ editor, model, currentValue, newValue, selectionStart, selectionEnd, sourceId = 'editor-update' }) {
    if (!editor || !model || typeof currentValue !== 'string' || typeof newValue !== 'string') return false;

    const didChangeContent = newValue !== currentValue;

    if (didChangeContent) {
      let commonPrefix = 0;
      const oldLen = currentValue.length;
      const newLen = newValue.length;
      while (commonPrefix < oldLen && commonPrefix < newLen && currentValue[commonPrefix] === newValue[commonPrefix]) {
        commonPrefix += 1;
      }

      let commonSuffix = 0;
      while (
        commonSuffix < (oldLen - commonPrefix) &&
        commonSuffix < (newLen - commonPrefix) &&
        currentValue[oldLen - 1 - commonSuffix] === newValue[newLen - 1 - commonSuffix]
      ) {
        commonSuffix += 1;
      }

      const oldDiffEnd = oldLen - commonSuffix;
      const newDiffEnd = newLen - commonSuffix;
      const replaceText = newValue.substring(commonPrefix, newDiffEnd);

      const rangeStart = model.getPositionAt(commonPrefix);
      const rangeEnd = model.getPositionAt(oldDiffEnd);
      const replaceRange = new window.monaco.Range(
        rangeStart.lineNumber,
        rangeStart.column,
        rangeEnd.lineNumber,
        rangeEnd.column
      );

      editor.pushUndoStop();
      editor.executeEdits(sourceId, [{
        range: replaceRange,
        text: replaceText,
        forceMoveMarkers: true
      }]);
      editor.pushUndoStop();
    }

    const maxLen = model.getValueLength();
    const safeSelectionStart = Math.max(0, Math.min(Number(selectionStart) || 0, maxLen));
    const safeSelectionEnd = Math.max(0, Math.min(Number(selectionEnd) || safeSelectionStart, maxLen));
    const selStartPos = model.getPositionAt(safeSelectionStart);
    const selEndPos = model.getPositionAt(safeSelectionEnd);
    editor.setSelection(new window.monaco.Selection(
      selStartPos.lineNumber,
      selStartPos.column,
      selEndPos.lineNumber,
      selEndPos.column
    ));
    editor.focus();

    if (didChangeContent) {
      this.triggerRender();
    }

    return true;
  }

  applyMonacoSelectionTransform(transformFn, sourceId) {
    const context = this.getMonacoEditorAndModel();
    if (!context || typeof transformFn !== 'function') return false;

    const { editor, model } = context;
    const selection = editor.getSelection();
    if (!selection) return false;

    const startOffset = model.getOffsetAt(selection.getStartPosition());
    const endOffset = model.getOffsetAt(selection.getEndPosition());
    const currentValue = model.getValue();

    const result = transformFn({
      currentValue,
      startOffset,
      endOffset,
      selection,
      editor,
      model
    });

    if (!result || typeof result.newValue !== 'string') return false;

    return this.applyMonacoTextUpdate({
      editor,
      model,
      currentValue,
      newValue: result.newValue,
      selectionStart: result.selectionStart,
      selectionEnd: result.selectionEnd,
      sourceId
    });
  }

  // Monaco-safe wrap operation: preserves native undo/redo and cursor state.
  tryWrapTextMonaco(prefix, suffix = '') {
    return this.applyMonacoSelectionTransform(({ currentValue, startOffset, endOffset }) => {
      const selectedText = currentValue.substring(startOffset, endOffset);
      const hasPrefix = startOffset >= prefix.length && currentValue.substring(startOffset - prefix.length, startOffset) === prefix;
      const hasSuffix = endOffset + suffix.length <= currentValue.length && currentValue.substring(endOffset, endOffset + suffix.length) === suffix;

      if (hasPrefix && hasSuffix) {
        return {
          newValue: currentValue.substring(0, startOffset - prefix.length) +
            selectedText +
            currentValue.substring(endOffset + suffix.length),
          selectionStart: startOffset - prefix.length,
          selectionEnd: endOffset - prefix.length
        };
      }

      if (selectedText) {
        const wrappedText = prefix + selectedText + suffix;
        return {
          newValue: currentValue.substring(0, startOffset) + wrappedText + currentValue.substring(endOffset),
          selectionStart: startOffset + prefix.length,
          selectionEnd: startOffset + prefix.length + selectedText.length
        };
      }

      const wrappedText = prefix + suffix;
      return {
        newValue: currentValue.substring(0, startOffset) + wrappedText + currentValue.substring(endOffset),
        selectionStart: startOffset + prefix.length,
        selectionEnd: startOffset + prefix.length
      };
    }, 'editor-wrap-text');
  }

  tryInsertTextMonaco(text) {
    const insertText = typeof text === 'string' ? text : String(text ?? '');
    return this.applyMonacoSelectionTransform(({ currentValue, startOffset, endOffset }) => {
      return {
        newValue: currentValue.substring(0, startOffset) + insertText + currentValue.substring(endOffset),
        selectionStart: startOffset + insertText.length,
        selectionEnd: startOffset + insertText.length
      };
    }, 'editor-insert-text');
  }

  tryInsertAtLineStartMonaco(prefix) {
    return this.applyMonacoSelectionTransform(({ currentValue, startOffset }) => {
      const lineStart = currentValue.lastIndexOf('\n', startOffset - 1) + 1;
      const lineEnd = currentValue.indexOf('\n', startOffset);
      const safeLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;
      const lineText = currentValue.substring(lineStart, safeLineEnd);

      let newLine;
      let newCursor;
      if (lineText.startsWith(prefix)) {
        newLine = lineText.substring(prefix.length);
        newCursor = Math.max(lineStart, startOffset - prefix.length);
      } else {
        newLine = prefix + lineText;
        newCursor = startOffset + prefix.length;
      }

      const maxCursor = lineStart + newLine.length;
      const clampedCursor = Math.max(lineStart, Math.min(newCursor, maxCursor));

      return {
        newValue: currentValue.substring(0, lineStart) + newLine + currentValue.substring(safeLineEnd),
        selectionStart: clampedCursor,
        selectionEnd: clampedCursor
      };
    }, 'editor-insert-line-prefix');
  }

  trySetHeadingMonaco(level) {
    if (level < 1 || level > 6) return false;

    return this.applyMonacoSelectionTransform(({ currentValue, startOffset }) => {
      const prefix = '#'.repeat(level) + ' ';
      const lineStart = currentValue.lastIndexOf('\n', startOffset - 1) + 1;
      const lineEndIdx = currentValue.indexOf('\n', startOffset);
      const lineEnd = lineEndIdx === -1 ? currentValue.length : lineEndIdx;
      const lineText = currentValue.substring(lineStart, lineEnd);

      const headingRegex = /^#{1,6}\s+/;
      const currentHeadingMatch = lineText.match(headingRegex);
      const currentHeadingPrefix = currentHeadingMatch ? currentHeadingMatch[0] : '';
      const hasDesired = lineText.startsWith(prefix);
      const strippedLine = lineText.replace(headingRegex, '');

      const newLine = hasDesired ? strippedLine : prefix + strippedLine;
      const newValue = currentValue.substring(0, lineStart) + newLine + currentValue.substring(lineEnd);

      const cursorOffset = Math.max(0, startOffset - lineStart);
      const cursorInStripped = currentHeadingPrefix
        ? Math.max(0, cursorOffset - currentHeadingPrefix.length)
        : cursorOffset;
      const baseOffset = hasDesired ? lineStart : lineStart + prefix.length;
      const maxCursor = lineStart + newLine.length;
      const newPos = Math.max(lineStart, Math.min(baseOffset + cursorInStripped, maxCursor));

      return {
        newValue,
        selectionStart: newPos,
        selectionEnd: newPos
      };
    }, 'editor-set-heading');
  }

  // Text manipulation functions
  insertText(text) {
    if (this.tryInsertTextMonaco(text)) {
      return;
    }

    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }
    
    const start = this.markdownEditor.selectionStart;
    const end = this.markdownEditor.selectionEnd;
    const currentValue = this.markdownEditor.value;
    
    this.markdownEditor.value = currentValue.substring(0, start) + text + currentValue.substring(end);
    this.markdownEditor.selectionStart = this.markdownEditor.selectionEnd = start + text.length;
    this.markdownEditor.focus();

    this.triggerRender();
  }

  wrapText(prefix, suffix = '') {
    if (this.tryWrapTextMonaco(prefix, suffix)) {
      return;
    }

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

    this.triggerRender();
  }

  insertAtLineStart(prefix) {
    if (this.tryInsertAtLineStartMonaco(prefix)) {
      return;
    }

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

    this.triggerRender();
  }

  // New: Set heading level (1-6) similar to MS Word
  setHeading(level) {
    if (level < 1 || level > 6) return;
    if (this.trySetHeadingMonaco(level)) {
      return;
    }
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

    this.triggerRender();
  }
}

// Create global instance
window.MarkTideEditor = new EditorManager();
