// Mobile menu functionality

class MobileMenuManager {
  constructor() {
    this.mobileMenuToggle = null;
    this.mobileMenuPanel = null;
    this.mobileMenuOverlay = null;
    this.mobileCloseMenu = null;
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
  }

  closeMobileMenu() {
    if (this.mobileMenuPanel) {
      this.mobileMenuPanel.classList.remove("active");
    }
    if (this.mobileMenuOverlay) {
      this.mobileMenuOverlay.classList.remove("active");
    }
  }
}

// Create global instance
window.MarkTideMobileMenu = new MobileMenuManager();