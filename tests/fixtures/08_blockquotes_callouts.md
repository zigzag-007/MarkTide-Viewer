# 08  Blockquotes & Callouts

> **Test Purpose:** Test blockquote nesting, content inside blockquotes, and callout style admonitions.  
> **What to look for:** Correct left border styling, nested indentation, content rendering within quotes.

---

## 1. Simple Blockquote

> This is a simple blockquote.
> It spans multiple lines.

---

## 2. Blockquote With Attribution

> "The only way to do great work is to love what you do."
>
>  Steve Jobs

---

## 3. Multi Paragraph Blockquote

> First paragraph of the blockquote. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Second paragraph of the same blockquote. The blank line with `>` separates paragraphs.
>
> Third paragraph. All three belong to the same blockquote block.

---

## 4. Nested Blockquotes

> Level 1 quote.
>
> > Level 2 quote (nested).
> >
> > > Level 3 quote (deeply nested).
> > >
> > > > Level 4 quote (very deeply nested).
> > >
> > > Back to level 3.
> >
> > Back to level 2.
>
> Back to level 1.

---

## 5. Blockquote With Heading

> ## Heading Inside Blockquote
>
> This paragraph is inside the blockquote, under the heading.

---

## 6. Blockquote With Bold, Italic, Code

> This quote has **bold text**, *italic text*, and `inline code` inside.
> It also has a ~~strikethrough~~ word.

---

## 7. Blockquote With List

> Here is a list inside a blockquote:
>
> - Item one
> - Item two
>   - Nested item
> - Item three

---

## 8. Blockquote With Ordered List

> Steps inside a quote:
>
> 1. First step
> 2. Second step
> 3. Third step

---

## 9. Blockquote With Code Block

> Here is code inside a blockquote:
>
> ```python
> def hello():
>     print("Hello from inside a blockquote!")
> ```
>
> That was the code block.

---

## 10. Blockquote With Table

> | Name  | Score |
> |-------|-------|
> | Alice | 95    |
> | Bob   | 87    |

---

## 11. Blockquote Immediately After Paragraph (no blank line)

This is a paragraph.
> This blockquote has no blank line before it. Some renderers handle this fine; others may merge it with the paragraph.

---

## 12. Lazy Continuation (blockquote continuation without `>` marker)

> This is a blockquote that starts with the `>` marker.
This line has no `>` but is still considered part of the blockquote in lazy continuation mode (CommonMark allows this).
But most editors display the distinction.

---

## 13. Blockquote Interrupted by Blank Line

> First blockquote ends here.

> New separate blockquote starts here.

---

## 14. Callout / Admonition Styles

Different tools support different callout syntaxes. Here are the most common ones:

### GitHub style Alerts (GitHub Markdown, Jan 2024+)

> [!NOTE]
> This is a **Note** callout. Useful for additional context or informational messages.

> [!TIP]
> This is a **Tip** callout. Suggests better ways or optional improvements.

> [!IMPORTANT]
> This is an **Important** callout. For information the reader must understand.

> [!WARNING]
> This is a **Warning** callout. Indicates potential problems.

> [!CAUTION]
> This is a **Caution** callout. Points to negative outcomes or high risk actions.

---

### Obsidian Callout Syntax

> [!info] Custom Title Here
> This is an Obsidian style info callout with a custom title.

> [!warning] Watch Out!
> This is a warning callout in Obsidian syntax.

> [!danger]
> This is a danger callout with no custom title (uses type as title).

> [!success] Great Job
> A success/check callout.

> [!question] Open Question
> A question/help callout.

> [!abstract] Summary
> An abstract or summary callout.

> [!todo] TODO
> A todo callout.

> [!example] Example
> An example callout.

> [!quote] Famous Quote
> > "Success is not final, failure is not fatal: it is the courage to continue that counts."
> >
> >  Winston Churchill

---

### Markdown Preview Enhanced (VS Code) Callout Style

:::note
This is a note block using the `:::` syntax (works in Markdown Preview Enhanced, Docusaurus, VitePress).
:::

:::tip Pro Tip
This is a tip with a custom title.
:::

:::warning
This is a warning block.
:::

:::danger STOP
This is a danger/critical block.
:::

:::info Information
This is an info block.
:::

---

## 15. Quote With Emoji

> 🚀 This blockquote starts with an emoji.
>
> ⚠️ This line has a warning emoji.
>
> ✅ And this one has a checkmark.

---

## 16. Empty Blockquote

>

---

## 17. Blockquote at End of Document (no trailing newline)

> This blockquote is the last element in the document.
> No trailing newline after this.
