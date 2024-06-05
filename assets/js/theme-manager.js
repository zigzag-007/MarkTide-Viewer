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
    
    // load saved theme from localStorage or use system preference
    const savedTheme = localStorage.getItem('markflow-theme');
    const prefersDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    this.currentTheme = savedTheme || (prefersDarkMode ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", this.currentTheme);
    
    this.updateHighlightTheme();
    this.updateThemeButtons();
    
    // set up event listeners
    if (this.themeToggle) {
      this.themeToggle.addEventListener("click", () => this.toggleTheme());
    }
    
    if (this.mobileThemeToggle) {
      this.mobileThemeToggle.addEventListener("click", () => this.toggleTheme());
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", this.currentTheme);
    
    // save theme preference
    localStorage.setItem('markflow-theme', this.currentTheme);
    
    this.updateHighlightTheme();
    this.updateThemeButtons();
    
    // re-render markdown to apply theme changes
    if (window.MarkFlowRenderer && window.MarkFlowRenderer.renderMarkdown) {
      window.MarkFlowRenderer.renderMarkdown();
    }
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

  getCurrentTheme() {
    return this.currentTheme;
  }

  isDarkMode() {
    return this.currentTheme === "dark";
  }
}

// Create global instance
window.MarkFlowTheme = new ThemeManager();