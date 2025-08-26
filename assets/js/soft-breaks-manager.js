// Soft Line Breaks Toggle Functionality

class SoftBreaksManager {
  constructor() {
    this.softBreaksToggle = null;
    this.mobileSoftBreaksToggle = null;
  }

  init() {
    // Initialize button references
    this.softBreaksToggle = document.getElementById("soft-breaks-toggle");
    this.mobileSoftBreaksToggle = document.getElementById("mobile-soft-breaks-toggle");
    
    // Set up event listeners
    if (this.softBreaksToggle) {
      this.softBreaksToggle.addEventListener("click", () => this.toggleSoftBreaks());
    }
    
    if (this.mobileSoftBreaksToggle) {
      this.mobileSoftBreaksToggle.addEventListener("click", () => this.toggleSoftBreaks());
    }
    
    // Initialize button states
    this.updateButtonStates();
  }

  toggleSoftBreaks() {
    if (window.MarkTideRenderer) {
      const isEnabled = window.MarkTideRenderer.toggleSoftLineBreaks();
      this.updateButtonStates(isEnabled);
      
      // Show a brief notification
      this.showNotification(isEnabled ? 
        'Soft line breaks enabled - Single Enter creates line break' : 
        'Soft line breaks disabled - Use two spaces + Enter for line break'
      );
    }
  }

  updateButtonStates(isEnabled) {
    // Get current setting if not provided
    if (isEnabled === undefined) {
      isEnabled = window.MarkTideRenderer ? 
        window.MarkTideRenderer.getSoftLineBreaksSetting() : true;
    }

    // Update desktop button
    if (this.softBreaksToggle) {
      const icon = this.softBreaksToggle.querySelector('i');
      if (isEnabled) {
        icon.className = 'bi bi-text-wrap';
        this.softBreaksToggle.title = 'Soft Line Breaks: ON (Single Enter creates line break)';
        this.softBreaksToggle.classList.add('active');
      } else {
        icon.className = 'bi bi-text-paragraph';
        this.softBreaksToggle.title = 'Soft Line Breaks: OFF (Standard Markdown - use two spaces + Enter)';
        this.softBreaksToggle.classList.remove('active');
      }
    }

    // Update mobile button
    if (this.mobileSoftBreaksToggle) {
      const icon = this.mobileSoftBreaksToggle.querySelector('i');
      const span = this.mobileSoftBreaksToggle.querySelector('span');
      if (isEnabled) {
        icon.className = 'bi bi-text-wrap';
        span.textContent = 'Soft Line Breaks: ON';
        this.mobileSoftBreaksToggle.title = 'Soft Line Breaks: ON';
        this.mobileSoftBreaksToggle.classList.add('active');
      } else {
        icon.className = 'bi bi-text-paragraph';
        span.textContent = 'Soft Line Breaks: OFF';
        this.mobileSoftBreaksToggle.title = 'Soft Line Breaks: OFF';
        this.mobileSoftBreaksToggle.classList.remove('active');
      }
    }
  }

  showNotification(message) {
    // Calculate position based on existing notifications
    const existingNotifications = document.querySelectorAll('.soft-breaks-notification');
    let topOffset = 80; // Base offset from top
    
    existingNotifications.forEach(notification => {
      const rect = notification.getBoundingClientRect();
      topOffset = Math.max(topOffset, rect.bottom + 10); // 10px gap between notifications
    });

    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'soft-breaks-notification';
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: `${topOffset}px`,
      right: '20px',
      background: 'var(--button-hover)',
      color: 'var(--text-color)',
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: '1000',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '300px',
      backdropFilter: 'blur(8px)',
      opacity: '0',
      transform: 'translateX(100%)',
      transition: 'all 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
          // Reposition remaining notifications to fill gap
          this.repositionNotifications();
        }
      }, 300);
    }, 3000);
  }

  repositionNotifications() {
    const notifications = document.querySelectorAll('.soft-breaks-notification');
    let topOffset = 80; // Base offset from top
    
    notifications.forEach((notification, index) => {
      notification.style.top = `${topOffset}px`;
      const rect = notification.getBoundingClientRect();
      topOffset = rect.bottom + 10; // 10px gap between notifications
    });
  }
}

// Create global instance
window.MarkTideSoftBreaks = new SoftBreaksManager();
