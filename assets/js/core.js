// Core application initialization and management
class MarkTideCore {
  constructor() {
    this.initialized = false;
    this.markdownEditor = null;
    this.markdownPreview = null;
  }

  init() {
    // Show loading screen
    this.showLoadingScreen();
    
    // Wait for DOM content to be loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeApp();
      });
    } else {
      // DOM is already loaded
      this.initializeApp();
    }
  }

  showLoadingScreen() {
    // Apply theme immediately for loading screen
    this.applyInitialTheme();
    
    // Ensure loading screen is visible and hide main content initially
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.querySelector('.app-container');
    
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }
    
    if (appContainer) {
      appContainer.style.visibility = 'hidden';
    }
    
    // Hide loading screen after 2 seconds
    setTimeout(() => {
      this.hideLoadingScreen();
    }, 2000);
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.querySelector('.app-container');
    
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      
      // Remove loading screen completely after fade animation
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
    
    if (appContainer) {
      appContainer.style.visibility = 'visible';
    }
  }

  initializeApp() {
    if (this.initialized) return;
    
    try {
      // Initialize core elements
      this.markdownEditor = document.getElementById("markdown-editor");
      this.markdownPreview = document.getElementById("markdown-preview");
      
      if (!this.markdownEditor || !this.markdownPreview) {
        throw new Error("Required elements not found");
      }

      // Initialize modules in proper order
      this.initializeModules();
      
      // Setup formatting toolbar
      this.setupFormattingToolbar();
      
      // Initialize theme system
      this.initializeTheme();
      
      // Load sample content
      this.loadSampleContent();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      // Initialization completed successfully (for debugging, can be re-enabled if needed)
    } catch (error) {
      console.error('Failed to initialize MarkTide Viewer:', error);
    }
  }

  initializeModules() {
    // Initialize all MarkTide modules
    if (window.MarkTideTheme) window.MarkTideTheme.init();
    if (window.MarkTideMermaid) window.MarkTideMermaid.initMermaid();
    if (window.MarkTideRenderer) window.MarkTideRenderer.init();
    if (window.MarkTideSoftBreaks) window.MarkTideSoftBreaks.init();
    if (window.MarkTideEditor) window.MarkTideEditor.init(document.getElementById("markdown-editor"));
    if (window.MarkTideUndoRedo) window.MarkTideUndoRedo.init(document.getElementById("markdown-editor"));
    if (window.MarkTideScrollSync) window.MarkTideScrollSync.init();
    if (window.MarkTideViewManager) window.MarkTideViewManager.init();
    if (window.MarkTideImportExport) window.MarkTideImportExport.init();
    if (window.MarkTidePrintHandler) window.MarkTidePrintHandler.init();
    if (window.MarkTideMobileMenu) window.MarkTideMobileMenu.init();
    if (window.MarkTideKeyboardShortcuts) window.MarkTideKeyboardShortcuts.init();
  }

  setupFormattingToolbar() {
    const formatButtons = [
      { id: 'format-h1', action: () => window.MarkTideEditor.setHeading(1) },
      { id: 'format-h2', action: () => window.MarkTideEditor.setHeading(2) },
      { id: 'format-h3', action: () => window.MarkTideEditor.setHeading(3) },
      { id: 'format-bold', action: () => window.MarkTideEditor.wrapText('**', '**') },
      { id: 'format-italic', action: () => window.MarkTideEditor.wrapText('*', '*') },
      { id: 'format-underline', action: () => window.MarkTideEditor.wrapText('<u>', '</u>') },
      { id: 'format-code', action: () => window.MarkTideEditor.wrapText('`', '`') },
      { id: 'format-quote', action: () => window.MarkTideEditor.insertAtLineStart('> ') },
      { id: 'format-align-left', action: () => this.alignText('left') },
      { id: 'format-align-center', action: () => this.alignText('center') },
      { id: 'format-align-right', action: () => this.alignText('right') },
      { id: 'format-ul', action: () => window.MarkTideEditor.insertAtLineStart('- ') },
      { id: 'format-ol', action: () => window.MarkTideEditor.insertAtLineStart('1. ') },
      { id: 'format-linebreak', action: () => window.MarkTideEditor.insertText('<div style="page-break-after: always;"></div>\n') },
      { id: 'format-undo', action: () => window.MarkTideUndoRedo.undoAction() },
      { id: 'format-redo', action: () => window.MarkTideUndoRedo.redoAction() }
    ];

    formatButtons.forEach(({ id, action }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          action();
        });
      }
    });
  }

  alignText(alignment) {
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }
    
    const prefix = `<div style="text-align: ${alignment};">`;
    const suffix = `</div>`;
    
    const start = this.markdownEditor.selectionStart;
    const end = this.markdownEditor.selectionEnd;
    const currentValue = this.markdownEditor.value;
    const selectedText = currentValue.substring(start, end);
    
    const hasPrefix = start >= prefix.length && currentValue.substring(start - prefix.length, start) === prefix;
    const hasSuffix = end + suffix.length <= currentValue.length && currentValue.substring(end, end + suffix.length) === suffix;

    if (hasPrefix && hasSuffix) {
      // Remove alignment wrapper
      this.markdownEditor.value = currentValue.substring(0, start - prefix.length) +
                                  selectedText +
                                  currentValue.substring(end + suffix.length);
      this.markdownEditor.selectionStart = start - prefix.length;
      this.markdownEditor.selectionEnd = end - prefix.length;
    } else if (selectedText) {
      // Wrap selected text with alignment div
      const alignedText = prefix + selectedText + suffix;
      this.markdownEditor.value = currentValue.substring(0, start) + alignedText + currentValue.substring(end);
      this.markdownEditor.selectionStart = start + prefix.length;
      this.markdownEditor.selectionEnd = start + prefix.length + selectedText.length;
    } else {
      // No selection: insert empty alignment div and place cursor inside
      const alignedText = prefix + suffix;
      this.markdownEditor.value = currentValue.substring(0, start) + alignedText + currentValue.substring(end);
      this.markdownEditor.selectionStart = this.markdownEditor.selectionEnd = start + prefix.length;
    }
    
    this.markdownEditor.focus();
    
    // Trigger re-render
    if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
      window.MarkTideRenderer.debouncedRender();
    }
  }

  initializeTheme() {
    // Apply saved theme or default
    const savedTheme = localStorage.getItem('marktide-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  
  applyInitialTheme() {
    // Apply theme immediately for loading screen
    let savedTheme = localStorage.getItem('marktide-theme');
    if (!savedTheme) {
      // Detect system theme
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  loadSampleContent() {
    if (!this.markdownEditor || this.markdownEditor.value.trim()) return;

    const sampleMarkdown = (window.MarkTideSample && window.MarkTideSample.getDefaultMarkdown)
      ? window.MarkTideSample.getDefaultMarkdown()
      : '# Welcome to MarkTide Viewer\n\nStart typing...';

    this.markdownEditor.value = sampleMarkdown;
    
    // Render the sample content
    if (window.MarkTideRenderer) {
      window.MarkTideRenderer.renderMarkdown();
    }
    if (window.MarkTideUtils) {
      window.MarkTideUtils.updateDocumentStats();
    }
    
    // Set initial undo state
    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.lastSavedState = window.MarkTideUndoRedo.createState();
    }
  }

  setupEventListeners() {
    if (!this.markdownEditor) return;

    // Track if content has been modified
    let hasUnsavedChanges = false;
    const originalContent = this.markdownEditor.value;

    // Editor input events
    this.markdownEditor.addEventListener('input', () => {
      if (window.MarkTideRenderer) {
        window.MarkTideRenderer.debouncedRender();
      }
      
      // Check if content differs from original
      if (this.markdownEditor.value !== originalContent) {
        hasUnsavedChanges = true;
      }
    });

    this.markdownEditor.addEventListener('keydown', (e) => {
      if (window.MarkTideUndoRedo) {
        window.MarkTideUndoRedo.saveToUndoStack();
      }
    });

    // Handle page refresh/close warning
    window.addEventListener('beforeunload', (e) => {
      if (hasUnsavedChanges && this.markdownEditor.value !== originalContent) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });

    // Fix double-click word selection behavior
    this.markdownEditor.addEventListener('mouseup', (e) => {
      if (window.MarkTideEditor) {
        window.MarkTideEditor.handleMouseUp(e);
      }
    });

    // Handle fullscreen changes (including ESC key and browser fullscreen)
    document.addEventListener('fullscreenchange', () => {
      this.updateFullscreenButtonState();
    });

    // Handle browser fullscreen changes (F11 key)
    document.addEventListener('webkitfullscreenchange', () => {
      this.updateFullscreenButtonState();
    });

    document.addEventListener('mozfullscreenchange', () => {
      this.updateFullscreenButtonState();
    });

    document.addEventListener('MSFullscreenChange', () => {
      this.updateFullscreenButtonState();
    });

    // Handle browser fullscreen exit with F11
    let resizeTimeout;
    window.addEventListener('resize', () => {
      // Debounce resize events to avoid excessive calls
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Check if we're in browser fullscreen but not element fullscreen
        const isBrowserFullscreen = window.innerHeight === screen.height && window.innerWidth === screen.width;
        const isElementFullscreen = !!document.fullscreenElement;
        
        if (isBrowserFullscreen && !isElementFullscreen) {
          // Browser fullscreen active, update button state
          this.updateFullscreenButtonState(true);
        } else if (!isBrowserFullscreen && !isElementFullscreen) {
          // Neither browser nor element fullscreen
          this.updateFullscreenButtonState(false);
        }
      }, 100);
    });

    // Initial button state update
    this.updateFullscreenButtonState();

    // Bind header fullscreen button
    const headerFullscreenBtn = document.getElementById('header-fullscreen-toggle');
    if (headerFullscreenBtn) {
      headerFullscreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleFullscreen();
      });
    }
  }

  updateFullscreenButtonState(forceState = null) {
    const fullscreenBtn = document.getElementById('header-fullscreen-toggle');
    if (!fullscreenBtn) return;

    // Check if we're in browser fullscreen (F11)
    const isBrowserFullscreen = window.innerHeight === screen.height && window.innerWidth === screen.width;
    const isElementFullscreen = !!document.fullscreenElement;
    
    // Determine the actual fullscreen state
    let isFullscreen = false;
    if (forceState !== null) {
      isFullscreen = forceState;
    } else {
      isFullscreen = isElementFullscreen || isBrowserFullscreen;
    }

    if (isFullscreen) {
      fullscreenBtn.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
      fullscreenBtn.title = 'Exit Fullscreen';
    } else {
      fullscreenBtn.innerHTML = '<i class="bi bi-fullscreen"></i>';
      fullscreenBtn.title = 'Toggle Fullscreen';
    }
  }

  toggleFullscreen() {
    // Check if we're in browser fullscreen (F11)
    const isBrowserFullscreen = window.innerHeight === screen.height && window.innerWidth === screen.width;
    const isElementFullscreen = !!document.fullscreenElement;

    if (isBrowserFullscreen && !isElementFullscreen) {
      // We're in browser fullscreen but not element fullscreen
      // Exit browser fullscreen first, then enter element fullscreen
      document.exitFullscreen().then(() => {
        // Small delay to ensure browser fullscreen is fully exited
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('Error attempting to enable element fullscreen:', err);
          });
        }, 100);
      }).catch(err => {
        console.warn('Error attempting to exit browser fullscreen:', err);
      });
    } else if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().catch(err => {
        console.warn('Error attempting to exit fullscreen:', err);
      });
    }
  }
}

// Initialize the application
const markTideApp = new MarkTideCore();
markTideApp.init();

// Expose core instance globally for keyboard shortcuts
window.MarkTideCore = markTideApp;