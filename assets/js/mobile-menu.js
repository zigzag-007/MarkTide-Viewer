// Mobile menu functionality

class MobileMenuManager {
  init() {
    // Alpine controls open/close state directly in markup.
    // Keep this manager as a tiny compatibility layer for modules that
    // call menu open/close methods from JavaScript.
  }

  dispatchMenuEvent(name) {
    document.body.dispatchEvent(new CustomEvent(name, { bubbles: true }));
  }

  openMobileMenu() {
    this.dispatchMenuEvent("marktide-mobile-menu-open");
  }

  closeMobileMenu() {
    this.dispatchMenuEvent("marktide-mobile-menu-close");
  }

  toggleMobileMenu() {
    this.dispatchMenuEvent("marktide-mobile-menu-toggle");
  }
}

// Create global instance
window.MarkTideMobileMenu = new MobileMenuManager();
