// Undo/Redo functionality for the markdown editor

class UndoRedoManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.lastSavedState = null;
    this.markdownEditor = null;
  }

  init(markdownEditor) {
    this.markdownEditor = markdownEditor;
    this.lastSavedState = this.createState();
  }

  createState() {
    if (!this.markdownEditor) return null;
    
    return {
      value: this.markdownEditor.value,
      selectionStart: this.markdownEditor.selectionStart,
      selectionEnd: this.markdownEditor.selectionEnd,
      scrollTop: this.markdownEditor.scrollTop
    };
  }

  saveToUndoStack() {
    const currentState = this.createState();
    
    // Don't save if nothing changed
    if (this.lastSavedState && 
        this.lastSavedState.value === currentState.value &&
        this.lastSavedState.selectionStart === currentState.selectionStart &&
        this.lastSavedState.selectionEnd === currentState.selectionEnd) {
      return;
    }
    
    // Save current state to undo stack
    if (this.lastSavedState) {
      this.undoStack.push(this.lastSavedState);
      if (this.undoStack.length > 50) { // Limit stack size
        this.undoStack.shift();
      }
    }
    
    // Clear redo stack on new action
    this.redoStack = [];
    this.lastSavedState = currentState;
  }

  restoreState(state) {
    if (!state || !this.markdownEditor) return;
    
    this.markdownEditor.value = state.value;
    this.markdownEditor.focus();
    this.markdownEditor.setSelectionRange(state.selectionStart, state.selectionEnd);
    this.markdownEditor.scrollTop = state.scrollTop;
    
    // Trigger markdown re-render
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
  }

  undoAction() {
    if (this.undoStack.length > 0) {
      // Save current state to redo stack
      this.redoStack.push(this.lastSavedState);
      
      // Get and restore previous state
      const previousState = this.undoStack.pop();
      this.lastSavedState = previousState;
      this.restoreState(previousState);
    }
  }

  redoAction() {
    if (this.redoStack.length > 0) {
      // Save current state to undo stack
      this.undoStack.push(this.lastSavedState);
      
      // Get and restore next state
      const nextState = this.redoStack.pop();
      this.lastSavedState = nextState;
      this.restoreState(nextState);
    }
  }
}

// Create global instance
window.MarkTideUndoRedo = new UndoRedoManager();