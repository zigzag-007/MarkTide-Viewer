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
    this._resizeTimer = null;
    this._editorScrollLockHandler = null;
    this._textareaGrowHandler = null;
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

    // disable viewport-height recalcs while scrolling to avoid jitter in editor-only
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
      editorPane.style.overflow = '';
    }
    
    if (previewPane) {
      previewPane.style.display = '';
      previewPane.style.flex = '';
      previewPane.style.width = '';
      previewPane.style.height = '';
      previewPane.style.minHeight = '';
      previewPane.style.overflow = '';
    }
    
    // Reset editor wrapper height to let CSS take control
    if (editorWrapper) {
      editorWrapper.style.height = '';
    }
    
    // Reset textarea height and remove native-scrollbars class
    const markdownEditor = document.getElementById('markdown-editor');
    if (markdownEditor) {
      markdownEditor.style.height = '';
      markdownEditor.classList.remove('native-scrollbars');
      markdownEditor.style.overflow = '';
      markdownEditor.style.overflowY = '';
    }
    // Remove any editor-only handlers
    if (this._editorScrollLockHandler) {
      window.removeEventListener('scroll', this._editorScrollLockHandler);
      this._editorScrollLockHandler = null;
    }
    const markdownEditorCleanup = document.getElementById('markdown-editor');
    if (markdownEditorCleanup && this._textareaGrowHandler) {
      markdownEditorCleanup.removeEventListener('input', this._textareaGrowHandler);
      this._textareaGrowHandler = null;
    }
    
    // Show footer when returning to split view
    if (footer) {
      footer.style.display = 'block';
    }
    
    // Restore normal app container height for split view
    if (appContainer) {
      appContainer.style.height = '100vh';
    }
    // Remove state classes on body
    document.body.classList.remove('editor-only-active');
    document.body.classList.remove('preview-only-active');
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
    const bodyEl = document.body;
    
    // Clear all inline styles first
    this.clearInlineStyles();
    
    switch (view) {
      case 'split':
        // Both panes visible
        this.currentView = 'split';
        this.updateButtonStates(true, true);
        bodyEl.classList.remove('preview-only-active');
        bodyEl.classList.remove('editor-only-active');
        // Ensure panes rely on CSS defaults for scrolling in split
        if (editorPane) editorPane.style.overflow = '';
        if (previewPane) previewPane.style.overflow = '';
        // Restore textarea to split behavior
        const ed = document.getElementById('markdown-editor');
        if (ed) {
          ed.classList.remove('native-scrollbars');
          ed.style.height = '100%';
          ed.style.overflow = 'auto';
          ed.style.overflowY = 'auto';
        }
        // Remove any editor-only scroll lock handler
        if (this._editorScrollLockHandler) {
          window.removeEventListener('scroll', this._editorScrollLockHandler);
          this._editorScrollLockHandler = null;
        }
        break;
        
      case 'editor-only':
        // Only editor visible
        // Editor-only: hide preview and let PAGE scroll from the top
        previewPane.style.display = 'none';
        editorPane.style.flex = '1';
        editorPane.style.width = '100%';
        // remove any fixed heights/overflow so the page can scroll
        editorPane.style.height = 'auto';
        editorPane.style.minHeight = '';
        editorPane.style.overflow = 'visible';
        // ensure wrapper does not clamp height
        const editorWrapperEl = editorPane.querySelector('.editor-wrapper');
        if (editorWrapperEl) {
          editorWrapperEl.style.height = 'auto';
        }
        footer.style.display = 'none';
        // Let the whole document own the scroll in editor-only
        appContainer.style.height = 'auto';
        this.currentView = 'editor-only';
        this.updateButtonStates(true, false);
        bodyEl.classList.remove('preview-only-active');
        bodyEl.classList.add('editor-only-active');
        
        // Ensure textarea expands so document height tracks content
        const markdownEditor = document.getElementById('markdown-editor');
        if (markdownEditor) {
          // Clear any interfering inline styles and let CSS take over
          markdownEditor.style.height = '';
          markdownEditor.style.overflow = '';
          markdownEditor.style.overflowY = '';
          markdownEditor.classList.add('native-scrollbars');

          const grow = () => {
            markdownEditor.style.height = 'auto';
            markdownEditor.style.height = markdownEditor.scrollHeight + 'px';
          };
          requestAnimationFrame(grow);
          markdownEditor.addEventListener('input', grow);
          this._textareaGrowHandler = grow;
        }
        break;
        
      case 'preview-only':
        // Only preview visible
        if (this.isMobileLayout()) {
          editorPane.style.display = 'none';
          // Let the PAGE own scrolling in preview-only
          previewPane.style.height = 'auto';
          previewPane.style.minHeight = '';
          previewPane.style.overflow = 'visible';
        } else {
          editorPane.style.display = 'none';
          previewPane.style.flex = '1';
          previewPane.style.width = '100%';
          previewPane.style.height = 'auto';
          previewPane.style.minHeight = '';
          previewPane.style.overflow = 'visible';
        }
        footer.style.display = 'none';
        // Allow the document to scroll naturally in preview-only
        appContainer.style.height = 'auto';
        this.currentView = 'preview-only';
        this.updateButtonStates(false, true);
        bodyEl.classList.add('preview-only-active');
        bodyEl.classList.remove('editor-only-active');
        break;
    }
  }

  setEditorPaneHeight(editorPane) {
    const header = document.querySelector('.app-header');
    const headerHeight = header ? header.offsetHeight : 0;

    // Account for dropzone if visible (it sits above the editor and consumes vertical space)
    const dropzone = document.getElementById('dropzone');
    let dropzoneTotal = 0;
    if (dropzone && dropzone.offsetParent !== null && getComputedStyle(dropzone).display !== 'none') {
      const dzStyles = getComputedStyle(dropzone);
      const marginBottom = parseFloat(dzStyles.marginBottom || '0');
      dropzoneTotal = dropzone.offsetHeight + marginBottom;
    }

    const targetHeight = `calc(var(--app-vh, 1vh) * 100 - ${headerHeight + dropzoneTotal}px)`;
    // Sync header height to CSS var so container can clamp too
    if (header) {
      header.style.setProperty('--header-height', `${headerHeight}px`);
    }
    editorPane.style.height = targetHeight;
    editorPane.style.minHeight = targetHeight;
    editorPane.style.overflowY = 'auto';
  }

  adjustEditorPaneHeightIfNeeded() {
    if (this.currentView !== 'editor-only') return;
    // In current model, page scrolls; just make sure textarea stays expanded
    const markdownEditor = document.getElementById('markdown-editor');
    if (markdownEditor) {
      requestAnimationFrame(() => {
        markdownEditor.style.height = 'auto';
        markdownEditor.style.height = markdownEditor.scrollHeight + 'px';
      });
    }
  }

  updateViewportUnitVar() {
    const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  }

  getViewportHeightPx() {
    return Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight);
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