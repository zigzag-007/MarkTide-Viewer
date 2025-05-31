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
    
    if (editorPane) {
      editorPane.style.display = '';
      editorPane.style.flex = '';
      editorPane.style.width = '';
      editorPane.style.height = '';
    }
    
    if (previewPane) {
      previewPane.style.display = '';
      previewPane.style.flex = '';
      previewPane.style.width = '';
      previewPane.style.height = '';
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
    if (isEditorVisible) {
      this.showCodeButton.innerHTML = '<i class="bi bi-code-square"></i>';
      this.showCodeButton.classList.add("active");
    } else {
      this.showCodeButton.innerHTML = '<i class="bi bi-code-square"></i>';
      this.showCodeButton.classList.remove("active");
    }

    // Update preview button state - only icon for new header design
    if (isPreviewVisible) {
      this.showPreviewButton.innerHTML = '<i class="bi bi-eye"></i>';
      this.showPreviewButton.classList.add("active");
    } else {
      this.showPreviewButton.innerHTML = '<i class="bi bi-eye"></i>';
      this.showPreviewButton.classList.remove("active");
    }

    // Sync mobile buttons with text
    this.updateMobileButtons();
  }

  toggleEditorView() {
    const editorPane = document.querySelector(".editor-pane");
    const previewPane = document.querySelector(".preview-pane");
    const isEditorVisible = editorPane.style.display !== 'none';
    const isPreviewVisible = previewPane.style.display !== 'none';
    
    if (this.isMobileLayout()) {
      // Mobile/tablet layout (1080px and below) - use vertical stacking
      if (!isEditorVisible) {
        // Show editor (restore split view)
        this.clearInlineStyles();
        this.updateButtonStates(true, true);
      } else if (!isPreviewVisible) {
        // Show both panes
        this.clearInlineStyles();
        this.updateButtonStates(true, true);
      } else {
        // Hide editor - show only preview
        editorPane.style.display = 'none';
        previewPane.style.display = 'block';
        previewPane.style.height = '100%';
        this.updateButtonStates(false, true);
      }
    } else {
      // Desktop layout (above 1080px) - use horizontal layout
      if (!isEditorVisible) {
        // Show editor (restore split view)
        editorPane.style.display = 'block';
        previewPane.style.display = 'block';
        editorPane.style.flex = '1';
        previewPane.style.flex = '1';
        editorPane.style.width = '50%';
        previewPane.style.width = '50%';
        this.updateButtonStates(true, true);
      } else if (!isPreviewVisible) {
        // Show both panes
        editorPane.style.display = 'block';
        previewPane.style.display = 'block';
        editorPane.style.flex = '1';
        previewPane.style.flex = '1';
        editorPane.style.width = '50%';
        previewPane.style.width = '50%';
        this.updateButtonStates(true, true);
      } else {
        // Hide editor
        editorPane.style.display = 'none';
        previewPane.style.display = 'block';
        previewPane.style.flex = '1';
        previewPane.style.width = '100%';
        this.updateButtonStates(false, true);
      }
    }
  }

  togglePreviewView() {
    const editorPane = document.querySelector(".editor-pane");
    const previewPane = document.querySelector(".preview-pane");
    const isEditorVisible = editorPane.style.display !== 'none';
    const isPreviewVisible = previewPane.style.display !== 'none';
    
    if (this.isMobileLayout()) {
      // Mobile/tablet layout (1080px and below) - use vertical stacking
      if (!isPreviewVisible) {
        // Show preview (restore split view)
        this.clearInlineStyles();
        this.updateButtonStates(true, true);
      } else if (!isEditorVisible) {
        // Show both panes
        this.clearInlineStyles();
        this.updateButtonStates(true, true);
      } else {
        // Hide preview - show only editor
        previewPane.style.display = 'none';
        editorPane.style.display = 'block';
        editorPane.style.height = '100%';
        this.updateButtonStates(true, false);
      }
    } else {
      // Desktop layout (above 1080px) - use horizontal layout
      if (!isPreviewVisible) {
        // Show preview (restore split view)
        editorPane.style.display = 'block';
        previewPane.style.display = 'block';
        editorPane.style.flex = '1';
        previewPane.style.flex = '1';
        editorPane.style.width = '50%';
        previewPane.style.width = '50%';
        this.updateButtonStates(true, true);
      } else if (!isEditorVisible) {
        // Show both panes
        editorPane.style.display = 'block';
        previewPane.style.display = 'block';
        editorPane.style.flex = '1';
        previewPane.style.flex = '1';
        editorPane.style.width = '50%';
        previewPane.style.width = '50%';
        this.updateButtonStates(true, true);
      } else {
        // Hide preview
        previewPane.style.display = 'none';
        editorPane.style.display = 'block';
        editorPane.style.flex = '1';
        editorPane.style.width = '100%';
        this.updateButtonStates(true, false);
      }
    }
  }
}

// Create global instance
window.MarkTideViewManager = new ViewManager();