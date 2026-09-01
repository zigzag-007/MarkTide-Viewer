# 11  Extended Markdown Extensions

> **Test Purpose:** Test non standard Markdown extensions that are supported by some tools but not others.  
> **What to look for:** Which extensions your viewer supports vs. renders as raw syntax.

---

## 1. Strikethrough (GFM)

~~This text is struck through.~~

~~**Bold and strikethrough**~~

~~*Italic and strikethrough*~~

This has a ~~single~~ struck word in the middle.

---

## 2. Highlight / Mark (Markdown it, Typora, Obsidian)

==This text should be highlighted in yellow/orange.==

==**Highlighted and bold**==

This has ==one highlighted phrase== in a longer sentence.

---

## 3. Superscript (Pandoc, Typora, MultiMarkdown)

x^2^ + y^2^ = z^2^

The answer is 2^32^ = 4,294,967,296.

E = mc^2^ (but E = mc<sup>2</sup> works more broadly via HTML)

---

## 4. Subscript (Pandoc, Typora, MultiMarkdown)

H~2~O is water.

CO~2~ is carbon dioxide.

The element Fe~3~O~4~ is magnetite.

pH~7~ is neutral.

---

## 5. Inserted Text (some renderers, HTML `<ins>`)

<ins>This text was inserted (underlined in some renderers).</ins>

---

## 6. Definition Lists (Pandoc / MultiMarkdown)

Apple
:   A sweet, edible fruit produced by the apple tree (*Malus domestica*).
:   Also a technology company known for iPhone and Mac.

Markdown
:   A lightweight markup language with plain text formatting syntax.
:   Created by John Gruber in 2004.

CommonMark
:   A strongly defined, highly compatible specification of Markdown.
:   Addresses ambiguities in the original specification.

---

## 7. Abbreviations (Python Markdown, Markdown it abbr plugin)

The HTML specification is maintained by the W3C and covers HTTP protocols.

*[HTML]: HyperText Markup Language
*[W3C]: World Wide Web Consortium
*[HTTP]: HyperText Transfer Protocol

---

## 8. Footnotes

Here is a sentence with a footnote.[^fn1]

And another sentence with a different footnote.[^fn2]

Footnote with long text and multiple paragraphs.[^fn3]

[^fn1]: This is the first footnote.
[^fn2]: This is the second footnote, with **bold** and `code`.
[^fn3]: This footnote has a long first paragraph that explains something in detail.

    And a second paragraph that continues the footnote. Indent with 4 spaces.

    ```python
    # Even code blocks work in footnotes
    print("footnote code")
    ```

---

## 9. Task List Extensions

### Basic Task List
- [x] Item 1 complete
- [ ] Item 2 incomplete
- [x] Item 3 complete
- [ ] Item 4 incomplete

### Task List With Due Dates (custom metadata  Obsidian/Logseq style)

- [ ] Write report 📅 2024-02-01
- [x] Review PR ✅ 2024-01-15
- [ ] Deploy hotfix 🔴 HIGH PRIORITY
- [/] In progress task (Obsidian notation)
- [-] Cancelled task (Obsidian notation)

---

## 10. Emoji  Shortcode Style

:smile: :laughing: :cry: :heart_eyes: :sunglasses:

:+1: :-1: :ok_hand: :clap: :raised_hands:

:fire: :rocket: :star: :tada: :sparkles:

:warning: :x: :white_check_mark: :information_source:

:computer: :iphone: :keyboard: :mouse: :headphones:

:coffee: :pizza: :beer: :cake: :trophy:

:earth_africa: :earth_americas: :earth_asia:

---

## 11. Emoji  Unicode Direct

😀 😂 🤣 😊 😎 🥳 🤔 😴 🤯 🥰

👍 👎 👏 🙌 🤝 👋 🖐️ ✌️ 🤞 💪

🌟 ⭐ 🔥 💯 ✅ ❌ ⚠️ ℹ️ 🔴 🟡 🟢

🎉 🎊 🎈 🎁 🏆 🥇 🎯 🚀 💡 🔮

🌍 🌏 🌎 ☀️ 🌙 ⭐ 🌈 ⚡ ❄️ 🌊

---

## 12. Admonitions (Python Markdown / MkDocs)

!!! note "Custom Note Title"
    This is an admonition note block from Python Markdown's `admonition` extension.
    It should display with a colored sidebar or box.

!!! tip
    A tip without a custom title.

!!! warning "Caution!"
    A warning admonition.

!!! danger "Critical Error"
    A danger/critical admonition.

!!! success "Success"
    A success admonition.

!!! info
    An info admonition.

!!! question "Frequently Asked Question"
    An FAQ/question admonition block.

---

## 13. Custom Containers (Vuepress / VitePress style)

::: tip
This is a tip container (VitePress/VuePress style).
:::

::: warning
This is a warning container.
:::

::: danger STOP
This is a danger container with custom title.
:::

::: info Note
This is an info container.
:::

::: details Click to expand
This is a collapsible details container.
:::

---

## 14. Ruby Annotations (East Asian text support, rare)

<ruby>漢字<rt>かんじ</rt></ruby>

<ruby>東京<rt>とうきょう</rt></ruby>

<ruby>Markdown<rt>マークダウン</rt></ruby>

---

## 15. Line Numbering in Code Blocks (some renderers)

```python {1,3-5} showLineNumbers
line 1 — highlighted
line 2 — normal
line 3 — highlighted
line 4 — highlighted
line 5 — highlighted
line 6 — normal
line 7 — normal
```

---

## 16. Code Block Filename/Title (some renderers)

```javascript title="src/app.js"
const express = require('express');
const app = express();
app.listen(3000);
```

```python title="main.py" linenums="1"
def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
```

---

## 17. Spoiler / Collapsible (various implementations)

||This is spoiler text  hidden until hovered/clicked in some renderers||

>! This is Reddit style spoiler text

---

## 18. Critical Text Formatting (KaTeX vs HTML)

| Feature        | Non standard Syntax | HTML Alternative |
|----------------|--------------------|--------------------|
| Highlight      | `==text==`         | `<mark>text</mark>` |
| Superscript    | `x^2^`             | `x<sup>2</sup>` |
| Subscript      | `H~2~O`            | `H<sub>2</sub>O` |
| Underline      | N/A                | `<u>text</u>` |
| Inserted       | N/A                | `<ins>text</ins>` |
| Deleted        | `~~text~~`         | `<del>text</del>` |

---

## 19. Multi Line Table Cells (non standard)

Standard GFM tables do NOT support multi line cells. Here's an attempt (behavior varies):

| Item  | Description                                                      |
|-------|------------------------------------------------------------------|
| Alpha | Single line  always works                                        |
| Beta  | This cell attempts to span<br>multiple lines using a `<br>` tag  |
| Gamma | Another<br>multi<br>line<br>cell                                  |

---

## 20. Nested Emphasis Edge Cases

*italic and **bold italic** mixed*  how does your renderer handle this?

**bold and *bold italic* mixed**  same question.

_italic_underscore_  tricky: is the final underscore part of italic or word boundary?

`Code **with bold markers inside** not bold`  should be literal.
