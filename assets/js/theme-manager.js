// Theme management functionality

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.themeToggle = null;
    this.mobileThemeToggle = null;
    this.TRANSITION_DURATION_MS = 1800;
    this.TRANSITION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
    this.isThemeTransitioning = false;
    this.highlightThemeLink = null;
    this.highlightThemeDarkLink = null;
  }

  resolveInitialTheme() {
    const savedTheme = localStorage.getItem('marktide-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    const prefersDark = window.matchMedia
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  applyInitialRootTheme() {
    const theme = this.resolveInitialTheme();
    this.applyRootThemeState(theme);
    this.currentTheme = theme;
    return theme;
  }

  init() {
    this.themeToggle = document.getElementById("theme-toggle");
    this.mobileThemeToggle = document.getElementById("mobile-theme-toggle");
    this.initializeHighlightThemeLinks();

    const rootTheme = document.documentElement.getAttribute("data-theme");
    this.currentTheme = rootTheme === 'dark' || rootTheme === 'light'
      ? rootTheme
      : this.applyInitialRootTheme();
    
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

  applyTheme(theme, options = {}) {
    const shouldRender = options.rerender !== false;
    this.applyRootThemeState(theme);
    this.currentTheme = theme;
    
    // Save to localStorage
    localStorage.setItem('marktide-theme', this.currentTheme);
    
    // Update highlight.js theme
    this.updateHighlightTheme();

    // Update theme-color meta dynamically for PWA/UA coloring
    this.updateThemeColorMeta();
    
    // Re-render markdown when required (can be deferred to avoid visual flashing)
    if (shouldRender && window.MarkTideRenderer && window.MarkTideRenderer.renderMarkdown) {
      window.MarkTideRenderer.renderMarkdown();
    }
  }

  applyRootThemeState(theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }

  initializeHighlightThemeLinks() {
    if (!window.MarktideHighlightTheme) return;

    const primaryLink = document.getElementById("highlight-theme");
    if (!primaryLink) return;

    this.highlightThemeLink = primaryLink;
    this.highlightThemeLink.href = window.MarktideHighlightTheme.getThemeUrl(false);

    let darkLink = document.getElementById("highlight-theme-dark");
    if (!darkLink) {
      darkLink = document.createElement("link");
      darkLink.id = "highlight-theme-dark";
      darkLink.rel = "stylesheet";
      darkLink.href = window.MarktideHighlightTheme.getThemeUrl(true);
      darkLink.disabled = true;
      primaryLink.insertAdjacentElement("afterend", darkLink);
    }
    this.highlightThemeDarkLink = darkLink;
  }

  prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  getTransitionOrigin(event) {
    const hasPointerOrigin = event &&
      Number.isFinite(event.clientX) &&
      Number.isFinite(event.clientY);

    if (hasPointerOrigin) {
      return { x: event.clientX, y: event.clientY };
    }

    const source = event && event.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : this.themeToggle || this.mobileThemeToggle;

    if (source && typeof source.getBoundingClientRect === "function") {
      const rect = source.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  getEndRadius(x, y) {
    return Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
  }

  renderPreviewForTheme() {
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
      return;
    }
    if (window.MarkTideRenderer && window.MarkTideRenderer.renderMarkdown) {
      window.MarkTideRenderer.renderMarkdown();
    }
  }

  runFallbackRippleTransition(nextTheme, x, y, endRadius, onComplete = null) {
    // Ensure we never stack colored overlays if rapid clicks/cancel paths occur.
    document.querySelectorAll(".theme-ripple-fallback").forEach((el) => el.remove());

    const ripple = document.createElement("div");
    ripple.className = `theme-ripple-fallback theme-ripple-fallback--${nextTheme}`;
    ripple.style.left = `${x - endRadius}px`;
    ripple.style.top = `${y - endRadius}px`;
    ripple.style.width = `${endRadius * 2}px`;
    ripple.style.height = `${endRadius * 2}px`;
    document.body.appendChild(ripple);

    const animation = ripple.animate(
      [
        { transform: "scale(0)", opacity: 0.55 },
        { offset: 0.40, transform: "scale(0.72)", opacity: 0.18 },
        { transform: "scale(1.06)", opacity: 0 }
      ],
      {
        duration: this.TRANSITION_DURATION_MS,
        easing: this.TRANSITION_EASING,
        fill: "forwards"
      }
    );

    animation.finished.finally(() => {
      ripple.remove();
      if (typeof onComplete === "function") {
        onComplete();
      }
      this.isThemeTransitioning = false;
    });
  }

  toggleTheme(event) {
    if (this.isThemeTransitioning) return;
    this.isThemeTransitioning = true;

    const nextTheme = this.currentTheme === "dark" ? "light" : "dark";
    const { x, y } = this.getTransitionOrigin(event);
    const endRadius = this.getEndRadius(x, y);

    if (this.prefersReducedMotion()) {
      this.applyTheme(nextTheme);
      this.updateThemeButtons();
      this.isThemeTransitioning = false;
      return;
    }

    const hasViewTransitions = typeof document.startViewTransition === "function";
    if (!hasViewTransitions) {
      this.applyTheme(nextTheme, { rerender: false });
      this.updateThemeButtons();
      this.runFallbackRippleTransition(nextTheme, x, y, endRadius, () => this.renderPreviewForTheme());
      return;
    }

    document.documentElement.classList.add("radial-theme-transition");

    let transition;
    try {
      transition = document.startViewTransition(() => {
        this.applyTheme(nextTheme, { rerender: false });
        this.updateThemeButtons();
      });
    } catch (error) {
      document.documentElement.classList.remove("radial-theme-transition");
      this.applyTheme(nextTheme, { rerender: false });
      this.updateThemeButtons();
      this.runFallbackRippleTransition(nextTheme, x, y, endRadius, () => this.renderPreviewForTheme());
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
          easing: this.TRANSITION_EASING,
          pseudoElement: "::view-transition-new(root)"
        }
      );
    }).catch(() => {
      // No-op: state change already applied in transition callback.
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("radial-theme-transition");
      this.renderPreviewForTheme();
      this.isThemeTransitioning = false;
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
    if (!window.MarktideHighlightTheme) return;

    // Switch highlight.js theme by toggling pre-mounted links to reduce flash.
    const lightLink = this.highlightThemeLink || document.getElementById("highlight-theme");
    const darkLink = this.highlightThemeDarkLink || document.getElementById("highlight-theme-dark");

    if (lightLink && darkLink) {
      const useDark = this.currentTheme === "dark";
      darkLink.disabled = !useDark;
      lightLink.disabled = useDark;
      return;
    }

    // Fallback path (in case links are unavailable)
    const fallbackLink = document.getElementById("highlight-theme");
    if (!fallbackLink) return;
    fallbackLink.href = window.MarktideHighlightTheme.getThemeUrl(this.currentTheme === "dark");
  }

  updateThemeColorMeta() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-color')
      .trim();
    if (color) {
      meta.setAttribute('content', color);
    }
  }
}

// Create global instance
window.MarkTideTheme = new ThemeManager();
