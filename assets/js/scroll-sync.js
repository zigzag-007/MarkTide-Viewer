// Scroll synchronization between editor and preview panes

class ScrollSyncManager {
  constructor() {
    this.syncScrollingEnabled = false;
    this.isEditorScrolling = false;
    this.isPreviewScrolling = false;
    this.scrollSyncTimeout = null;
    this.SCROLL_SYNC_DELAY = 10;
    
    this.editorPane = null;
    this.previewPane = null;
    this.toggleSyncButton = null;
    this.mobileToggleSync = null;
  }

  init() {
    this.editorPane = document.getElementById("markdown-editor");
    this.previewPane = document.querySelector(".preview-pane");
    this.toggleSyncButton = document.getElementById("toggle-sync");
    this.mobileToggleSync = document.getElementById("mobile-toggle-sync");
    
    // Set up event listeners
    if (this.editorPane) {
      this.editorPane.addEventListener("scroll", () => this.syncEditorToPreview());
    }
    
    if (this.previewPane) {
      this.previewPane.addEventListener("scroll", () => this.syncPreviewToEditor());
    }
    
    if (this.toggleSyncButton) {
      this.toggleSyncButton.addEventListener("click", () => this.toggleSyncScrolling());
    }
    
    if (this.mobileToggleSync) {
      this.mobileToggleSync.addEventListener("click", () => {
        this.toggleSyncScrolling();
        this.updateMobileSyncButton();
      });
    }
  }

  syncEditorToPreview() {
    if (!this.syncScrollingEnabled || this.isPreviewScrolling) return;

    this.isEditorScrolling = true;
    clearTimeout(this.scrollSyncTimeout);

    this.scrollSyncTimeout = setTimeout(() => {
      const editorScrollRatio =
        this.editorPane.scrollTop /
        (this.editorPane.scrollHeight - this.editorPane.clientHeight);
      const previewScrollPosition =
        (this.previewPane.scrollHeight - this.previewPane.clientHeight) *
        editorScrollRatio;

      if (!isNaN(previewScrollPosition) && isFinite(previewScrollPosition)) {
        this.previewPane.scrollTop = previewScrollPosition;
      }

      setTimeout(() => {
        this.isEditorScrolling = false;
      }, 50);
    }, this.SCROLL_SYNC_DELAY);
  }

  syncPreviewToEditor() {
    if (!this.syncScrollingEnabled || this.isEditorScrolling) return;

    this.isPreviewScrolling = true;
    clearTimeout(this.scrollSyncTimeout);

    this.scrollSyncTimeout = setTimeout(() => {
      const previewScrollRatio =
        this.previewPane.scrollTop /
        (this.previewPane.scrollHeight - this.previewPane.clientHeight);
      const editorScrollPosition =
        (this.editorPane.scrollHeight - this.editorPane.clientHeight) *
        previewScrollRatio;

      if (!isNaN(editorScrollPosition) && isFinite(editorScrollPosition)) {
        this.editorPane.scrollTop = editorScrollPosition;
      }

      setTimeout(() => {
        this.isPreviewScrolling = false;
      }, 50);
    }, this.SCROLL_SYNC_DELAY);
  }

  toggleSyncScrolling() {
    this.syncScrollingEnabled = !this.syncScrollingEnabled;
    this.updateSyncButtons();
  }

  updateSyncButtons() {
    if (this.syncScrollingEnabled) {
      if (this.toggleSyncButton) {
        this.toggleSyncButton.innerHTML = '<i class="bi bi-link"></i> Sync On';
        this.toggleSyncButton.classList.add("sync-enabled");
        this.toggleSyncButton.classList.remove("sync-disabled");
        this.toggleSyncButton.classList.remove("border-primary");
      }
    } else {
      if (this.toggleSyncButton) {
        this.toggleSyncButton.innerHTML = '<i class="bi bi-link-45deg"></i> Sync Off';
        this.toggleSyncButton.classList.add("sync-disabled");
        this.toggleSyncButton.classList.remove("sync-enabled");
        this.toggleSyncButton.classList.add("border-primary");
      }
    }
  }

  updateMobileSyncButton() {
    if (!this.mobileToggleSync) return;
    
    if (this.syncScrollingEnabled) {
      this.mobileToggleSync.innerHTML = '<i class="bi bi-link me-2"></i> Sync On';
      this.mobileToggleSync.classList.add("sync-enabled");
      this.mobileToggleSync.classList.remove("sync-disabled");
      this.mobileToggleSync.classList.remove("border-primary");
    } else {
      this.mobileToggleSync.innerHTML = '<i class="bi bi-link-45deg me-2"></i> Sync Off';
      this.mobileToggleSync.classList.add("sync-disabled");
      this.mobileToggleSync.classList.remove("sync-enabled");
      this.mobileToggleSync.classList.add("border-primary");
    }
  }
}

// Create global instance
window.MarkTideScrollSync = new ScrollSyncManager();