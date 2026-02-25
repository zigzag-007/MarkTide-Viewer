// Markdown Beautify / Auto-fix (conservative defaults)

class BeautifyManager {
  constructor() {
    this.loading = false;
    this.loaded = false;
    this.prettier = null;
    this.markdownPlugin = null;
    this.toastEl = null; // deprecated in favor of soft-breaks notifications
  }

  async ensureLoaded() {
    if (this.loaded || this.loading) {
      while (this.loading && !this.loaded) {
        await new Promise(r => setTimeout(r, 50));
      }
      return;
    }
    this.loading = true;
    try {
      // Lazy-load Prettier standalone and markdown plugin from CDN
      const [{ default: prettier }, { default: markdownPlugin }] = await Promise.all([
        import('https://unpkg.com/prettier@3.2.5/standalone.mjs'),
        import('https://unpkg.com/prettier@3.2.5/plugins/markdown.mjs')
      ]);
      this.prettier = prettier;
      this.markdownPlugin = markdownPlugin;
      this.loaded = true;
    } catch (err) {
      console.warn('Failed to load formatter libraries:', err);
      this.loaded = false;
    } finally {
      this.loading = false;
    }
  }

  async runBeautify(options = {}) {
    const editor = document.getElementById('markdown-editor');
    if (!editor) return;

    // Save current selection to attempt caret restoration
    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;

    const btn = document.getElementById('format-beautify') || document.getElementById('mobile-format-beautify');
    this.setButtonLoading(btn, true);

    if (window.MarkTideUndoRedo) {
      window.MarkTideUndoRedo.saveToUndoStack();
    }

    await this.ensureLoaded();
    if (!this.loaded) {
      this.setButtonLoading(btn, false);
      if (window.MarkTideSoftBreaks) {
        window.MarkTideSoftBreaks.showNotification('Beautify unavailable (libs failed to load)');
      }
      return;
    }

    const source = editor.value;
    try {
      const preprocessed = this.preprocessFences(source);
      const formatted = await this.prettier.format(preprocessed, {
        parser: 'markdown',
        plugins: [this.markdownPlugin],
        // Conservative defaults
        proseWrap: options.proseWrap || 'preserve', // 'preserve' | 'always' | 'never'
        tabWidth: 2,
        useTabs: false,
        endOfLine: 'lf',
        singleQuote: false,
      });

      // Avoid useless updates
      if (formatted && formatted !== source) {
        editor.value = formatted;
        // Best-effort caret restore: keep at same character index if possible
        const newLength = formatted.length;
        const deltaStart = Math.min(selectionStart, newLength);
        const deltaEnd = Math.min(selectionEnd, newLength);
        editor.selectionStart = deltaStart;
        editor.selectionEnd = deltaEnd;

        // Trigger UI updates
        if (window.MarkTideRenderer && window.MarkTideRenderer.debouncedRender) {
          window.MarkTideRenderer.debouncedRender();
        }
        if (window.MarkTideUtils) {
          window.MarkTideUtils.updateDocumentStats();
        }

        if (window.MarkTideSoftBreaks) {
          window.MarkTideSoftBreaks.showNotification('Beautified markdown (changes applied)');
        }
      } else {
        if (window.MarkTideSoftBreaks) {
          window.MarkTideSoftBreaks.showNotification('Beautify complete (no changes needed)');
        }
      }
    } catch (err) {
      console.warn('Beautify failed:', err);
      if (window.MarkTideSoftBreaks) {
        window.MarkTideSoftBreaks.showNotification('Beautify failed');
      }
    } finally {
      this.setButtonLoading(btn, false);
    }
  }

  preprocessFences(text) {
    // Add default language "text" for unlabeled fenced code blocks (MD040)
    const lines = text.split('\n');
    let inFence = false;
    let fenceChar = null; // support only backticks here
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      // Detect opening fence without language
      if (!inFence) {
        // Only triple backticks, no language
        if (/^```\s*$/.test(trimmed)) {
          lines[i] = raw.replace(/```\s*$/, '```text');
          inFence = true;
          fenceChar = '`';
          continue;
        }
        // Opening with language present → enter fence
        if (/^```\S+/.test(trimmed)) {
          inFence = true;
          fenceChar = '`';
          continue;
        }
      } else {
        // Inside fence: detect closing line
        if (fenceChar === '`' && /^```\s*$/.test(trimmed)) {
          inFence = false;
          fenceChar = null;
          continue;
        }
      }
    }
    return lines.join('\n');
  }

  setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
      button.disabled = true;
      button.setAttribute('data-original-html', button.innerHTML);
      button.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
      button.title = 'Beautifying...';
    } else {
      button.disabled = false;
      const original = button.getAttribute('data-original-html');
      if (original) button.innerHTML = original;
      button.title = 'Beautify Markdown';
    }
  }

  // showToast deprecated
}

window.MarkTideBeautify = new BeautifyManager();

