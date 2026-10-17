# 01  Basic Typography & Inline Formatting

> **Test Purpose:** Verify heading levels, paragraph flow, and all inline formatting elements.  
> **What to look for:** Correct rendering of each element; no bleed through of raw syntax characters.

---

## 1. Heading Hierarchy

# H1  Top Level Heading
## H2  Second Level
### H3  Third Level
#### H4  Fourth Level
##### H5  Fifth Level
###### H6  Sixth Level

---

## 2. Setext Style Headings (Alternative Syntax)

Setext H1
=========

Setext H2
---------

---

## 3. Paragraphs & Line Breaks

This is a paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

This is a **second paragraph**. There should be visible spacing between these two blocks.

This line ends with two trailing spaces  
so it should produce a hard line break (not a new paragraph).

This line uses a backslash at the end\
to also produce a hard line break in CommonMark compliant renderers.

This line has no break  so the next line is joined in a soft wrap.
The next line continues the same paragraph (no blank line between them).

---

## 4. Emphasis & Strong

*Italic with asterisks*

_Italic with underscores_

**Bold with double asterisks**

__Bold with double underscores__

***Bold and italic***

___Bold and italic with underscores___

**Bold with _nested italic_ inside**

*Italic with **nested bold** inside*

~~Strikethrough (GFM)~~

<s>Strikethrough via HTML</s>

---

## 5. Inline Code

Use `backtick` for inline code.

A single backtick `` ` `` inside inline code (double backtick fence).

Code with a leading/trailing space: `` `code` ``  the spaces are stripped.

`const x = "hello world";`

---

## 6. Superscript & Subscript (non standard)

H~2~O (subscript  works in some renderers like Pandoc, Typora)

x^2^ (superscript  works in some renderers)

E = mc<sup>2</sup> (HTML superscript  widely supported)

H<sub>2</sub>O (HTML subscript  widely supported)

---

## 7. Highlighted Text (non standard)

==This text should be highlighted== (works in Markdown it, Typora, Obsidian)

<mark>This uses HTML mark tag</mark>

---

## 8. Keyboard Tags

Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to open the command palette.

---

## 9. Abbreviations (Pandoc / MultiMarkdown)

The HTML specification is maintained by W3C.

*[HTML]: HyperText Markup Language
*[W3C]: World Wide Web Consortium

---

## 10. Horizontal Rules

Three or more hyphens:

---

Three or more asterisks:

***

Three or more underscores:

___

Mixed with spaces:

- - -

---

## 11. Escape Characters

\*Not italic\*

\*\*Not bold\*\*

\`Not code\`

\# Not a heading

\[Not a link\](not-a-link)

\> Not a blockquote

\- Not a list item

---

## 12. Special Characters & Entities

&amp; &lt; &gt; &quot; &apos;

Numeric: &#169; &#8212; &#x2764;

Unicode directly: ©  ❤ ✓ ✗ → ← ↑ ↓

---

## 13. Emoji

:smile: :tada: :rocket: :warning: :x: :white_check_mark:

Unicode emoji directly: 😄 🎉 🚀 ⚠️ ❌ ✅

---

## 14. Edge Cases

**Empty heading (potential crash/render issue):**

#

**Heading immediately followed by content (no blank line):**

## Heading With No Gap
This paragraph comes right after a heading with no blank line. Some renderers handle this fine; others may mangle the paragraph.

**Unclosed bold (intentional malformed syntax):**

This has an **unclosed bold and the rest of paragraph.

**Nested emphasis edge case (tricky):**

*one *two* three*

***bold italic***__underline bold__
