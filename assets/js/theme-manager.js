// Theme management functionality

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.themeToggle = null;
    this.mobileThemeToggle = null;
    this.TRANSITION_DURATION_MS = 1200;
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
      this.themeToggle.addEventListener("click", (event) => this.toggleTheme(event));
    }
    
    if (this.mobileThemeToggle) {
      this.mobileThemeToggle.addEventListener("click", (event) => this.toggleTheme(event));
    }
    // Update toggle button label/icon on init
    this.updateThemeButtons();
  }

  applyTheme(theme) {
    this.applyRootThemeState(theme);
    this.currentTheme = theme;
    
    // Save to localStorage
    localStorage.setItem('marktide-theme', this.currentTheme);
    
    // Update highlight.js theme
    this.updateHighlightTheme();

    // Update theme-color meta dynamically for PWA/UA coloring
    this.updateThemeColorMeta();
    
    // Re-render markdown to apply new theme
    if (window.MarkTideRenderer && window.MarkTideRenderer.renderMarkdown) {
      window.MarkTideRenderer.renderMarkdown();
    }
  }

  applyRootThemeState(theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }

  prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  toggleTheme(event) {
    const nextTheme = this.currentTheme === "dark" ? "light" : "dark";
    const hasViewTransitions = typeof document.startViewTransition === "function";
    const hasPointerOrigin = event &&
      Number.isFinite(event.clientX) &&
      Number.isFinite(event.clientY);

    if (!hasViewTransitions || !hasPointerOrigin || this.prefersReducedMotion()) {
      this.applyTheme(nextTheme);
      this.updateThemeButtons();
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    document.documentElement.classList.add("radial-theme-transition");

    let transition;
    try {
      transition = document.startViewTransition(() => {
        this.applyTheme(nextTheme);
        this.updateThemeButtons();
      });
    } catch (error) {
      document.documentElement.classList.remove("radial-theme-transition");
      this.applyTheme(nextTheme);
      this.updateThemeButtons();
      return;
    }

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: this.TRANSITION_DURATION_MS,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)"
        }
      );
    }).catch(() => {
      // No-op: instant state change already applied in update callback.
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("radial-theme-transition");
    });
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

  updateThemeColorMeta() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    // Match colors similar to app backgrounds in both modes
    const color = this.currentTheme === 'dark' ? '#000000' : '#ffffff';
    meta.setAttribute('content', color);
  }
}

// Create global instance
window.MarkTideTheme = new ThemeManager();
