# 09  Raw HTML Embedding

> **Test Purpose:** Test how raw HTML is handled  rendered, sanitized, or stripped.  
> **What to look for:** Whether HTML tags render visually or show as literal text; whether dangerous tags are blocked.

---

## 1. Basic HTML Elements

<b>Bold via HTML b tag</b>

<i>Italic via HTML i tag</i>

<strong>Strong via HTML strong tag</strong>

<em>Emphasis via HTML em tag</em>

<u>Underline via HTML u tag</u>

<s>Strikethrough via HTML s tag</s>

<small>Small text via HTML small tag</small>

<big>Big text via HTML big tag (deprecated)</big>

<sub>Subscript</sub> and <sup>Superscript</sup>

<mark>Highlighted text via mark tag</mark>

<code>Inline code via HTML code tag</code>

<pre>Preformatted text via HTML pre tag
   with preserved spaces and
   line breaks</pre>

---

## 2. HTML Block Level Elements

<div>
  <p>Paragraph inside a div. This is an HTML block.</p>
  <p>Second paragraph inside the same div.</p>
</div>

<section>
  <h3>Section heading via HTML</h3>
  <p>Content inside a section element.</p>
</section>

<article>
  <h4>Article heading</h4>
  <p>This is article content rendered via raw HTML in Markdown.</p>
</article>

---

## 3. Line Breaks

Line one.<br>Line two via br tag (no space).

Line A.<br />Line B via br self closing (XHTML style).

---

## 4. HTML Comments (should be invisible in rendered output)

<!-- This is an HTML comment. It should NOT be visible in the rendered output. -->

Visible text above and below the comment.

<!-- 
  Multi-line HTML comment.
  This entire block should be hidden.
  Line 3.
-->

---

## 5. Horizontal Rules via HTML

<hr>

<hr />

<hr style="border: 2px solid red;" />

---

## 6. Details / Summary (Progressive Disclosure)

<details>
  <summary>Click to expand  What is Markdown?</summary>

  Markdown is a lightweight markup language that uses plain text formatting syntax. It was created by John Gruber in 2004.

  **Key features:**
  - Simple and readable
  - Converts to HTML
  - Supported by GitHub, GitLab, and many editors

</details>

<details open>
  <summary>This section is expanded by default (open attribute)</summary>

  This content is visible immediately without clicking. The `open` attribute controls this.

</details>

<details>
  <summary>Details block with code inside</summary>

  ```python
  def revealed():
      print("You expanded the details!")
  ```

</details>

---

## 7. Keyboard & Abbreviations

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

Press <kbd>⌘</kbd> + <kbd>Space</kbd> to open Spotlight.

Press <kbd>Alt</kbd> + <kbd>F4</kbd> to close window.

---

## 8. Superscript & Subscript via HTML

Water: H<sub>2</sub>O

Carbon dioxide: CO<sub>2</sub>

Speed of light: c = 3×10<sup>8</sup> m/s

Footnote reference: Text<sup>[1]</sup>

---

## 9. Tables via HTML

<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>GFM Tables</th>
      <th>HTML Tables</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Syntax</td>
      <td>Markdown pipes</td>
      <td>Full HTML tags</td>
    </tr>
    <tr>
      <td>Column span</td>
      <td>Not supported</td>
      <td><code>colspan</code> attribute</td>
    </tr>
    <tr>
      <td>Row span</td>
      <td>Not supported</td>
      <td><code>rowspan</code> attribute</td>
    </tr>
    <tr>
      <td>Styling</td>
      <td>CSS only</td>
      <td>Inline style or CSS</td>
    </tr>
  </tbody>
</table>

---

## 10. HTML Table with Colspan & Rowspan

<table border="1">
  <tr>
    <th colspan="3">Merged Header (colspan=3)</th>
  </tr>
  <tr>
    <th rowspan="2">Merged Side Header (rowspan=2)</th>
    <td>R2C2</td>
    <td>R2C3</td>
  </tr>
  <tr>
    <td>R3C2</td>
    <td>R3C3</td>
  </tr>
</table>

---

## 11. Figures & Captions

<figure>
  <img src="https://via.placeholder.com/400x200/6366f1/ffffff?text=Figure+1" 
       alt="A placeholder figure image" 
       width="400" height="200" />
  <figcaption>Fig. 1  This is a figure caption rendered via HTML figcaption element.</figcaption>
</figure>

---

## 12. Inline Styles (may be sanitized)

<p style="color: #ef4444; font-weight: bold; font-size: 1.2em;">
  Red bold text via inline CSS style (may be stripped in some renderers for security).
</p>

<span style="background: linear-gradient(90deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.5em; font-weight: bold;">
  Gradient text via inline CSS (rendered only if styles are preserved)
</span>

---

## 13. HTML Inside a Markdown Table Cell

| Feature   | HTML Example                  | Notes                     |
|-----------|-------------------------------|---------------------------|
| Bold      | <b>Bold</b>                   | Works in most renderers   |
| Color     | <span style="color:red">Red</span> | May be sanitized     |
| Break     | Line<br>break                 | Works broadly             |

---

## 14. Script Tag (Security  should be stripped/blocked)

<script>
  // This script should NOT execute. It should be stripped or shown as escaped text.
  alert("XSS Test  if you see this alert, the renderer is unsafe!");
  document.body.style.background = "red";
</script>

> ⚠️ If a red background appeared or an alert popped up, the renderer does not sanitize `<script>` tags  that is a **security vulnerability**.

---

## 15. iFrame Embedding (may be blocked)

<iframe 
  src="https://example.com" 
  width="600" 
  height="400"
  title="Embedded iframe test"
  sandbox>
</iframe>

> ⚠️ If the iframe rendered, the viewer allows embedding external pages. This can be a security concern.

---

## 16. Style Tag (may be sanitized)

<style>
  /* If this renders, styles will apply globally */
  body { background: #0a0a0a !important; }
  p { color: lime !important; }
</style>

> ⚠️ If the page background changed to black or text turned lime green, the renderer allows `<style>` tags  a potential security issue.

---

## 17. HTML Entities Within Markdown

&copy; &reg; &trade; &hellip; &mdash; &ndash; &laquo; &raquo;

&alpha; &beta; &gamma; &delta; &Omega; &pi;

&larr; &rarr; &uarr; &darr; &harr; &lArr; &rArr;

&hearts; &clubs; &diams; &spades;

Numeric: &#9733; &#9829; &#10084; &#x1F600;

---

## 18. HTML Mixed With Markdown (interleaving)

<div>

**This Markdown bold** should render even inside an HTML div, in most renderers.

- List inside HTML div

</div>

> Note: CommonMark spec says Markdown inside block level HTML is NOT processed. Some renderers do process it anyway.

---

## 19. HTML Comments as Metadata (Docusaurus / VitePress pattern)

<!-- truncate -->

<!-- more -->

<!-- prettier-ignore -->

---

## 20. Input Elements (may or may not render interactive)

<input type="checkbox" checked /> Checked checkbox via HTML

<input type="checkbox" /> Unchecked checkbox via HTML

<input type="text" placeholder="Text input (may be stripped)" />

<input type="range" min="0" max="100" value="50" />

<button onclick="alert('Clicked!')">Button (click if rendered)</button>
