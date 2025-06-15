// Mobile menu functionality

class MobileMenuManager {
  constructor() {
    this.mobileMenuToggle = null;
    this.mobileMenuPanel = null;
    this.mobileMenuOverlay = null;
    this.mobileCloseMenu = null;
    // Bound handler so we can add/remove easily
    this.boundDocumentClick = null;
  }

  init() {
    this.mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    this.mobileMenuPanel = document.getElementById("mobile-menu-panel");
    this.mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
    this.mobileCloseMenu = document.getElementById("close-mobile-menu");
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.mobileMenuToggle) {
      this.mobileMenuToggle.addEventListener("click", () => this.openMobileMenu());
    }
    
    if (this.mobileCloseMenu) {
      this.mobileCloseMenu.addEventListener("click", () => this.closeMobileMenu());
    }
    
    if (this.mobileMenuOverlay) {
      this.mobileMenuOverlay.addEventListener("click", () => this.closeMobileMenu());
    }
  }

  openMobileMenu() {
    if (this.mobileMenuPanel) {
      this.mobileMenuPanel.classList.add("active");
    }
    if (this.mobileMenuOverlay) {
      this.mobileMenuOverlay.classList.add("active");
    }

    // Attach a document click handler to close when clicking outside panel
    if (!this.boundDocumentClick) {
      this.boundDocumentClick = (e) => {
        const clickedInsidePanel = this.mobileMenuPanel && this.mobileMenuPanel.contains(e.target);
        const clickedToggle = this.mobileMenuToggle && this.mobileMenuToggle.contains(e.target);
        if (!clickedInsidePanel && !clickedToggle) {
          this.closeMobileMenu();
        }
      };
      // Use capture phase to ensure we catch click before it might be stopped
      document.addEventListener("click", this.boundDocumentClick, true);
    }
  }

  closeMobileMenu() {
    if (this.mobileMenuPanel) {
      this.mobileMenuPanel.classList.remove("active");
    }
    if (this.mobileMenuOverlay) {
      this.mobileMenuOverlay.classList.remove("active");
    }

    // Remove the global document listener when menu closes
    if (this.boundDocumentClick) {
      document.removeEventListener("click", this.boundDocumentClick, true);
      this.boundDocumentClick = null;
    }
  }
}

// Create global instance
window.MarkTideMobileMenu = new MobileMenuManager();