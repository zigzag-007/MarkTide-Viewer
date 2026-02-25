// Enhanced code block copy functionality

class CodeCopyHandler {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    // Set up event delegation for copy buttons
    document.addEventListener('click', this.handleCopyClick.bind(this));
    this.initialized = true;
  }

  handleCopyClick(event) {
    const copyBtn = event.target.closest('.copy-code-btn');
    if (!copyBtn) return;

    event.preventDefault();
    event.stopPropagation();

    const codeId = copyBtn.getAttribute('data-code-id');
    const codeElement = document.getElementById(codeId);
    
    if (!codeElement) {
      console.warn('Code element not found for ID:', codeId);
      return;
    }

    // Get the raw text content from the code element
    const codeText = codeElement.textContent || codeElement.innerText || '';
    
    this.copyToClipboard(codeText, copyBtn);
  }

  async copyToClipboard(text, button) {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        this.showCopySuccess(button);
      } else {
        // Fallback for older browsers or non-secure contexts
        this.fallbackCopyToClipboard(text, button);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      this.fallbackCopyToClipboard(text, button);
    }
  }

  fallbackCopyToClipboard(text, button) {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    try {
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      
      if (successful) {
        this.showCopySuccess(button);
      } else {
        this.showCopyError(button);
      }
    } catch (error) {
      console.error('Fallback copy failed:', error);
      this.showCopyError(button);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  showCopySuccess(button) {
    // Store original content
    const originalIcon = button.innerHTML;
    
    // Add success class and update content
    button.classList.add('copied');
    button.innerHTML = '<i class="bi bi-check2"></i>';
    
    // Reset after 1.5 seconds (shorter like Perplexity)
    setTimeout(() => {
      button.classList.remove('copied');
      button.innerHTML = originalIcon;
    }, 1500);
  }

  showCopyError(button) {
    // Store original content
    const originalIcon = button.innerHTML;
    
    // Show error state via CSS class
    button.classList.add('error');
    button.innerHTML = '<i class="bi bi-exclamation-triangle"></i>';
    
    // Reset after 2 seconds
    setTimeout(() => {
      button.classList.remove('error');
      button.innerHTML = originalIcon;
    }, 2000);
  }
}

// Create global instance
window.MarkTideCodeCopy = new CodeCopyHandler();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.MarkTideCodeCopy.init();
  });
} else {
  window.MarkTideCodeCopy.init();
}
