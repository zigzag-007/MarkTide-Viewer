// Utility functions used across the application

/**
 * Process emojis in the given element by converting shortcodes to unicode
 */
function processEmojis(element) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    let parent = node.parentNode;
    let isInCode = false;
    while (parent && parent !== element) {
      if (parent.tagName === 'PRE' || parent.tagName === 'CODE') {
        isInCode = true;
        break;
      }
      parent = parent.parentNode;
    }
    
    if (!isInCode && node.nodeValue.includes(':')) {
      textNodes.push(node);
    }
  }
  
  textNodes.forEach(textNode => {
    const text = textNode.nodeValue;
    const emojiRegex = /:([\w+-]+):/g;
    
    let match;
    let lastIndex = 0;
    let result = '';
    let hasEmoji = false;
    
    while ((match = emojiRegex.exec(text)) !== null) {
      const shortcode = match[1];
      const emoji = joypixels.shortnameToUnicode(`:${shortcode}:`);
      
      if (emoji !== `:${shortcode}:`) { // If conversion was successful
        hasEmoji = true;
        result += text.substring(lastIndex, match.index) + emoji;
        lastIndex = emojiRegex.lastIndex;
      } else {
        result += text.substring(lastIndex, emojiRegex.lastIndex);
        lastIndex = emojiRegex.lastIndex;
      }
    }
    
    if (hasEmoji) {
      result += text.substring(lastIndex);
      const span = document.createElement('span');
      span.textContent = result;
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
}

/**
 * Update document statistics (word count, character count)
 */
function updateDocumentStats() {
  const markdownEditor = document.getElementById("markdown-editor");
  const wordCountElement = document.getElementById("word-count");
  const charCountElement = document.getElementById("char-count");
  const mobileWordCount = document.getElementById("mobile-word-count");
  const mobileCharCount = document.getElementById("mobile-char-count");
  
  const text = markdownEditor.value;

  const charCount = text.length;
  charCountElement.textContent = charCount.toLocaleString();

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  wordCountElement.textContent = wordCount.toLocaleString();
  
  // Update mobile stats
  if (mobileCharCount) mobileCharCount.textContent = charCountElement.textContent;
  if (mobileWordCount) mobileWordCount.textContent = wordCountElement.textContent;
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
async function copyToClipboard(text, targetButton) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showCopiedMessage(targetButton);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        showCopiedMessage(targetButton);
      } else {
        throw new Error("Copy command was unsuccessful");
      }
    }
  } catch (err) {
    console.error("Copy failed:", err);
    alert("Failed to copy text: " + err.message);
  }
}

/**
 * Show copied confirmation message
 */
function showCopiedMessage(targetButton) {
  let buttonEl = null;
  if (targetButton) {
    if (typeof targetButton === 'string') {
      buttonEl = document.getElementById(targetButton);
    } else if (targetButton instanceof HTMLElement) {
      buttonEl = targetButton;
    }
  }
  if (!buttonEl) {
    buttonEl = document.getElementById('copy-button') || document.getElementById('copy-markdown-button');
  }
  if (!buttonEl) return;
  const originalHTML = buttonEl.innerHTML;
  buttonEl.innerHTML = '<i class="bi bi-check-lg"></i>';
  setTimeout(() => {
    buttonEl.innerHTML = originalHTML || '<i class="bi bi-clipboard"></i>';
  }, 2000);
}

const MarktideHighlightTheme = {
  lightUrl: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css",
  darkUrl: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai-sublime.min.css",

  getThemeUrl(isDarkMode = false) {
    return isDarkMode ? this.darkUrl : this.lightUrl;
  },

  getPrintTokenCss() {
    return `
      .markdown-body pre code.hljs,
      .markdown-body pre code.hljs * {
        color: inherit;
      }

      .markdown-body pre code.hljs .hljs-keyword,
      .markdown-body pre code.hljs .hljs-selector-tag,
      .markdown-body pre code.hljs .hljs-subst {
        color: #d73a49 !important;
      }

      .markdown-body pre code.hljs .hljs-title,
      .markdown-body pre code.hljs .hljs-section,
      .markdown-body pre code.hljs .hljs-selector-id {
        color: #6f42c1 !important;
      }

      .markdown-body pre code.hljs .hljs-string,
      .markdown-body pre code.hljs .hljs-doctag,
      .markdown-body pre code.hljs .hljs-attr,
      .markdown-body pre code.hljs .hljs-regexp {
        color: #032f62 !important;
      }

      .markdown-body pre code.hljs .hljs-number,
      .markdown-body pre code.hljs .hljs-literal,
      .markdown-body pre code.hljs .hljs-variable,
      .markdown-body pre code.hljs .hljs-template-variable,
      .markdown-body pre code.hljs .hljs-tag .hljs-attr {
        color: #005cc5 !important;
      }

      .markdown-body pre code.hljs .hljs-comment,
      .markdown-body pre code.hljs .hljs-quote {
        color: #6a737d !important;
      }

      .markdown-body pre code.hljs .hljs-built_in,
      .markdown-body pre code.hljs .hljs-builtin-name,
      .markdown-body pre code.hljs .hljs-name,
      .markdown-body pre code.hljs .hljs-tag {
        color: #22863a !important;
      }

      .markdown-body pre code.hljs .hljs-type,
      .markdown-body pre code.hljs .hljs-class .hljs-title {
        color: #e36209 !important;
      }

      .markdown-body pre code.hljs .hljs-emphasis {
        font-style: italic !important;
      }

      .markdown-body pre code.hljs .hljs-strong {
        font-weight: 700 !important;
      }
    `;
  }
};

const MarktideCodeHighlight = {
  aliases: {
    batch: 'dos',
    bat: 'dos',
    cmd: 'dos',
    dos: 'dos',
    containerfile: 'dockerfile',
    docker: 'dockerfile',
    dockerfile: 'dockerfile',
    powershell: 'powershell',
    ps1: 'powershell',
    pwsh: 'powershell',
    ps: 'powershell',
    pseudocode: 'pseudocode',
    pseudo: 'pseudocode',
    algorithm: 'pseudocode',
    algo: 'pseudocode'
  },

  normalizeLanguage(language) {
    const cleanLanguage = String(language || '')
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();

    if (!cleanLanguage) {
      return 'plaintext';
    }

    return this.aliases[cleanLanguage] || cleanLanguage;
  },

  escapeCode(code) {
    return String(code || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  highlight(code, language) {
    const normalizedLanguage = this.normalizeLanguage(language);

    if (normalizedLanguage === 'pseudocode') {
      return {
        language: 'pseudocode',
        value: this.highlightPseudocode(code)
      };
    }

    const validLanguage = window.hljs && hljs.getLanguage(normalizedLanguage)
      ? normalizedLanguage
      : 'plaintext';

    try {
      return {
        language: validLanguage,
        value: hljs.highlight(String(code || ''), {
          language: validLanguage,
          ignoreIllegals: true
        }).value
      };
    } catch (e) {
      return {
        language: 'plaintext',
        value: this.escapeCode(code)
      };
    }
  },

  highlightPseudocode(code) {
    const keywords = new Set([
      'algorithm', 'begin', 'break', 'case', 'continue', 'do', 'else', 'elseif',
      'end', 'endif', 'endfor', 'endfunction', 'endprocedure', 'endwhile', 'for',
      'function', 'if', 'input', 'output', 'print', 'procedure', 'read', 'repeat',
      'return', 'switch', 'then', 'until', 'while', 'write'
    ]);
    const literals = new Set(['and', 'false', 'not', 'null', 'or', 'true']);
    const tokenPattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*|#.*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w-]*\b)/g;

    return String(code || '').split('\n').map((line) => {
      let result = '';
      let lastIndex = 0;
      let match;

      while ((match = tokenPattern.exec(line)) !== null) {
        const token = match[0];
        const lowerToken = token.toLowerCase();
        result += this.escapeCode(line.slice(lastIndex, match.index));

        if (token.startsWith('//') || token.startsWith('#')) {
          result += `<span class="hljs-comment">${this.escapeCode(token)}</span>`;
        } else if (token.startsWith('"') || token.startsWith("'")) {
          result += `<span class="hljs-string">${this.escapeCode(token)}</span>`;
        } else if (/^\d/.test(token)) {
          result += `<span class="hljs-number">${this.escapeCode(token)}</span>`;
        } else if (keywords.has(lowerToken)) {
          result += `<span class="hljs-keyword">${this.escapeCode(token)}</span>`;
        } else if (literals.has(lowerToken)) {
          result += `<span class="hljs-literal">${this.escapeCode(token)}</span>`;
        } else {
          result += this.escapeCode(token);
        }

        lastIndex = tokenPattern.lastIndex;
      }

      result += this.escapeCode(line.slice(lastIndex));
      tokenPattern.lastIndex = 0;
      return result;
    }).join('\n');
  }
};

// Export utilities to global scope
window.MarkTideUtils = {
  updateDocumentStats,
  copyToClipboard,
  showCopiedMessage,
  processEmojis
};

window.MarktideHighlightTheme = MarktideHighlightTheme;
window.MarktideCodeHighlight = MarktideCodeHighlight;
