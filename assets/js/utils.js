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
      span.innerHTML = result;
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
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showCopiedMessage();
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
        showCopiedMessage();
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
function showCopiedMessage() {
  const copyMarkdownButton = document.getElementById("copy-markdown-button");
  const originalText = copyMarkdownButton.innerHTML;
  copyMarkdownButton.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';

  setTimeout(() => {
    copyMarkdownButton.innerHTML = originalText;
  }, 2000);
}

/**
 * Prevent default drag and drop behavior
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Export utilities to global scope
window.MarkTideUtils = {
  updateDocumentStats,
  copyToClipboard,
  showCopiedMessage,
  processEmojis
};