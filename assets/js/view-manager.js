// View management for different display modes (split, code-only, preview-only)
// WARNING: DO NOT MODIFY THIS FILE WITHOUT PROPER TESTING
// The button and icon logic is complex and has been carefully fixed to work correctly
// Any changes to the icon classes or button states may break the functionality

class ViewManager {
  constructor() {
    this.showCodeButton = null;
    this.showPreviewButton = null;
    this.mobileShowCode = null;
    this.mobileShowPreview = null;
    this.currentView = 'split'; // 'split', 'editor-only', 'preview-only'
  }

  init() {
    // Initialize button references
    this.showCodeButton = document.getElementById("show-code-button");
    this.showPreviewButton = document.getElementById("show-preview-button");
    this.mobileShowCode = document.getElementById("mobile-show-code");
    this.mobileShowPreview = document.getElementById("mobile-show-preview");
    
    // Set up event listeners for desktop buttons
    if (this.showCodeButton) {
      this.showCodeButton.addEventListener("click", () => this.toggleEditorView());
    }
    
    if (this.showPreviewButton) {
      this.showPreviewButton.addEventListener("click", () => this.togglePreviewView());
    }
    
    // Set up event listeners for mobile buttons (they trigger desktop button clicks)
    if (this.mobileShowCode) {
      this.mobileShowCode.addEventListener("click", () => {
        this.showCodeButton.click();
      });
    }
    
    if (this.mobileShowPreview) {
      this.mobileShowPreview.addEventListener("click", () => {
        this.showPreviewButton.click();
      });
    }
  }

  // Check if we're in mobile/tablet layout (1080px and below)
  isMobileLayout() {
    return window.innerWidth <= 1080;
  }

  // Clear all inline styles to let CSS take control
  clearInlineStyles() {
    const editorPane = document.querySelector(".editor-pane");
    const previewPane = document.querySelector(".preview-pane");
    const footer = document.querySelector(".app-footer");
    const appContainer = document.querySelector(".app-container");
    const editorWrapper = editorPane?.querySelector(".editor-wrapper");
    
    if (editorPane) {
      editorPane.style.display = '';
      editorPane.style.flex = '';
      editorPane.style.width = '';
      editorPane.style.height = '';
      editorPane.style.minHeight = '';
    }
    
    if (previewPane) {
      previewPane.style.display = '';
      previewPane.style.flex = '';
      previewPane.style.width = '';
      previewPane.style.height = '';
      previewPane.style.minHeight = '';
    }
    
    // Reset editor wrapper height to let CSS take control
    if (editorWrapper) {
      editorWrapper.style.height = '';
    }
    
    // Show footer when returning to split view
    if (footer) {
      footer.style.display = 'block';
    }
    
    // Restore normal app container height for split view
    if (appContainer) {
      appContainer.style.height = '100vh';
    }
  }

  updateMobileButtons() {
    // Sync mobile buttons with desktop buttons
    // Mobile buttons show text, desktop buttons only show icons
    if (this.mobileShowCode && this.showCodeButton) {
      const isActive = this.showCodeButton.classList.contains('active');
      const text = isActive ? 'Hide Editor' : 'Show Editor';
      this.mobileShowCode.innerHTML = `<i class="bi bi-code-square"></i><span>${text}</span>`;
      this.mobileShowCode.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    
    if (this.mobileShowPreview && this.showPreviewButton) {
      const isActive = this.showPreviewButton.classList.contains('active');
      const text = isActive ? 'Hide Preview' : 'Show Preview';
      this.mobileShowPreview.innerHTML = `<i class="bi bi-eye"></i><span>${text}</span>`;
      this.mobileShowPreview.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  updateButtonStates(isEditorVisible, isPreviewVisible) {
    // Update editor button state - only icon for new header design
    if (this.showCodeButton) {
      if (isEditorVisible) {
        this.showCodeButton.classList.add('active');
        this.showCodeButton.setAttribute('aria-pressed', 'true');
        this.showCodeButton.setAttribute('title', 'Hide Editor');
      } else {
        this.showCodeButton.classList.remove('active');
        this.showCodeButton.setAttribute('aria-pressed', 'false');
        this.showCodeButton.setAttribute('title', 'Show Editor');
      }
    }
    
    // Update preview button state - only icon for new header design
    if (this.showPreviewButton) {
      if (isPreviewVisible) {
        this.showPreviewButton.classList.add('active');
        this.showPreviewButton.setAttribute('aria-pressed', 'true');
        this.showPreviewButton.setAttribute('title', 'Hide Preview');
      } else {
        this.showPreviewButton.classList.remove('active');
        this.showPreviewButton.setAttribute('aria-pressed', 'false');
        this.showPreviewButton.setAttribute('title', 'Show Preview');
      }
    }
    
    // Update mobile buttons to match
    this.updateMobileButtons();
  }

  // Simple view state management
  setView(view) {
    const editorPane = document.querySelector(".editor-pane");
    const previewPane = document.querySelector(".preview-pane");
    const footer = document.querySelector(".app-footer");
    const appContainer = document.querySelector(".app-container");
    
    // Clear all inline styles first
    this.clearInlineStyles();
    
    switch (view) {
      case 'split':
        // Both panes visible
        this.currentView = 'split';
        this.updateButtonStates(true, true);
        break;
        
      case 'editor-only':
        // Only editor visible
        if (this.isMobileLayout()) {
          previewPane.style.display = 'none';
          editorPane.style.height = 'auto';
          editorPane.style.minHeight = '100vh';
          // Fix editor wrapper height for mobile
          const editorWrapper = editorPane.querySelector('.editor-wrapper');
          if (editorWrapper) {
            editorWrapper.style.height = 'calc(100vh - 44px)';
          }
        } else {
          previewPane.style.display = 'none';
          editorPane.style.flex = '1';
          editorPane.style.width = '100%';
          editorPane.style.height = 'auto';
          editorPane.style.minHeight = '100vh';
        }
        footer.style.display = 'none';
        appContainer.style.height = 'auto';
        this.currentView = 'editor-only';
        this.updateButtonStates(true, false);
        break;
        
      case 'preview-only':
        // Only preview visible
        if (this.isMobileLayout()) {
          editorPane.style.display = 'none';
          previewPane.style.height = 'auto';
          previewPane.style.minHeight = '100vh';
        } else {
          editorPane.style.display = 'none';
          previewPane.style.flex = '1';
          previewPane.style.width = '100%';
          previewPane.style.height = 'auto';
          previewPane.style.minHeight = '100vh';
        }
        footer.style.display = 'none';
        appContainer.style.height = 'auto';
        this.currentView = 'preview-only';
        this.updateButtonStates(false, true);
        break;
    }
  }

  toggleEditorView() {
    // "Hide Editor" button clicked
    // If we're in split view or editor-only, hide editor and show preview-only
    // If we're in preview-only, show split view
    if (this.currentView === 'split' || this.currentView === 'editor-only') {
      this.setView('preview-only');
    } else {
      // We're in preview-only, go back to split
      this.setView('split');
    }
  }

  togglePreviewView() {
    // "Hide Preview" button clicked  
    // If we're in split view or preview-only, hide preview and show editor-only
    // If we're in editor-only, show split view
    if (this.currentView === 'split' || this.currentView === 'preview-only') {
      this.setView('editor-only');
    } else {
      // We're in editor-only, go back to split
      this.setView('split');
    }
  }
}

// Create global instance
window.MarkTideViewManager = new ViewManager();