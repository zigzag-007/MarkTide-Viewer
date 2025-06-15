// Theme management functionality

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.themeToggle = null;
    this.mobileThemeToggle = null;
  }

  init() {
    this.themeToggle = document.getElementById("theme-toggle");
    this.mobileThemeToggle = document.getElementById("mobile-theme-toggle");
    
    // Load saved theme or detect system theme
    let savedTheme = localStorage.getItem('marktide-theme');
    if (!savedTheme) {
      // Detect system theme
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
    }
    this.currentTheme = savedTheme;
    
    // Apply initial theme
    this.applyTheme(this.currentTheme);
    
    // Set up event listeners
    if (this.themeToggle) {
      this.themeToggle.addEventListener("click", () => this.toggleTheme());
    }
    
    if (this.mobileThemeToggle) {
      this.mobileThemeToggle.addEventListener("click", () => this.toggleTheme());
    }
    // Update toggle button label/icon on init
    this.updateThemeButtons();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    this.currentTheme = theme;
    
    // Save to localStorage
    localStorage.setItem('marktide-theme', this.currentTheme);
    
    // Update highlight.js theme
    this.updateHighlightTheme();
    
    // Re-render markdown to apply new theme
    if (window.MarkTideRenderer && window.MarkTideRenderer.renderMarkdown) {
      window.MarkTideRenderer.renderMarkdown();
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(this.currentTheme);
    
    this.updateThemeButtons();
  }

  updateThemeButtons() {
    const isDark = this.currentTheme === "dark";
    const iconHtml = isDark 
      ? '<i class="bi bi-sun"></i>' 
      : '<i class="bi bi-moon"></i>';
    
    // update tooltips based on current theme
    const tooltipText = isDark ? "Toggle Light Mode" : "Toggle Dark Mode";
    const mobileText = isDark ? " Light Mode" : " Dark Mode";
    
    if (this.themeToggle) {
      this.themeToggle.innerHTML = iconHtml;
      this.themeToggle.title = tooltipText;
    }
    
    if (this.mobileThemeToggle) {
      this.mobileThemeToggle.innerHTML = iconHtml + mobileText;
      this.mobileThemeToggle.title = tooltipText;
    }
  }

  updateHighlightTheme() {
    // Switch highlight.js theme based on current theme
    const highlightTheme = document.getElementById("highlight-theme");
    if (!highlightTheme) return;
    if (this.currentTheme === "dark") {
      highlightTheme.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai-sublime.min.css";
    } else {
      highlightTheme.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
    }
  }
}

// Create global instance
window.MarkTideTheme = new ThemeManager();