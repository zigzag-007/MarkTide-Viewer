# 14  Security, Sanitization & XSS Tests

> **Test Purpose:** Test whether the Markdown renderer properly sanitizes dangerous content.  
> **⚠️ What to look for:** If ANY of the marked "DANGEROUS" sections below cause alerts, background color changes, network requests, or visible script output  your renderer has a **security vulnerability**.  
> **✅ Expected behavior:** All sections should render as harmless visible text or simply produce no visible output (HTML comments).

---

## ⚠️ SECTION 1  Script Tags (must be blocked)

**Test 1.1  Direct script tag:**

<script>document.write('<span style="color:red;font-size:2em">UNSAFE: Script executed!</span>');</script>

> ✅ Expected: Nothing visible (tag stripped) or literal text shown.  
> ❌ DANGER: If red large text appears above, scripts are not sanitized.

**Test 1.2  Script with alert:**

<script>alert('XSS: Script injected via Markdown!');</script>

> ✅ Expected: Nothing visible or literal `<script>` text.  
> ❌ DANGER: If an alert dialog appeared, the renderer is critically unsafe.

**Test 1.3  Script in event handler on img tag:**

<img src="x" onerror="document.body.style.background='crimson'; document.body.innerHTML+='<h1>XSS via onerror!</h1>'" />

> ✅ Expected: Broken image icon, no background color change.  
> ❌ DANGER: If background turned crimson or text appeared, `onerror` handlers are not stripped.

**Test 1.4  JavaScript URI in link:**

<a href="javascript:alert('XSS via javascript: URI!')">Click me  javascript: link</a>

> ✅ Expected: Either a dead link or no link rendered.  
> ❌ DANGER: If an alert appeared on click, `javascript:` URIs are not sanitized.

**Test 1.5  Data URI with HTML:**

<a href="data:text/html,<script>alert('XSS via data URI')</script>">Click me  data: URI link</a>

> ✅ Expected: Either a dead link or no link.  
> ❌ DANGER: If a new tab opened with an alert, data URIs are not blocked.

---

## ⚠️ SECTION 2  Style Injection (should be blocked on web platforms)

**Test 2.1  Style tag:**

<style>
body { background color: limegreen !important; }
h1::after { content: "  STYLE INJECTED"; color: red; }
</style>

> ✅ Expected: No green background or modified headings.  
> ❌ DANGER: If background is green or headings have extra text, `<style>` tags are not sanitized.

**Test 2.2  Inline style with dangerous properties:**

<span style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(255,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; font-size:3em; color:white;">FULLSCREEN OVERLAY via inline CSS</span>

> ✅ Expected: Text "FULLSCREEN OVERLAY via inline CSS" displayed inline (no overlay).  
> ❌ DANGER: If a red overlay covered the whole screen, inline `style` is not sanitized.

**Test 2.3  CSS expression (IE legacy):**

<span style="width:expression(alert('XSS via CSS expression'))">CSS expression test</span>

> ✅ Expected: Text displayed, no alert.

---

## ⚠️ SECTION 3  iframe (must be blocked on web platforms)

**Test 3.1  Basic iframe:**

<iframe src="https://example.com" width="300" height="200">
  Your browser doesn't support iframes.
</iframe>

> ✅ Expected: No embedded frame visible (iframe stripped).  
> ⚠️ Permissible: Frame renders but sandboxed (local editors may allow this).  
> ❌ DANGER: If external content loaded without any sandbox attribute, clickjacking risk.

**Test 3.2  Iframe with JavaScript source:**

<iframe src="javascript:alert('XSS via iframe javascript: src')"></iframe>

> ✅ Expected: Nothing rendered or stripped.  
> ❌ DANGER: If an alert appeared, critical vulnerability.

---

## ⚠️ SECTION 4  Event Handler Injection

**Test 4.1  onclick on paragraph:**

<p onclick="alert('XSS via onclick')">Click this paragraph  onclick handler test</p>

> ✅ Expected: Paragraph text visible, click has no effect.  
> ❌ DANGER: If clicking triggers an alert, event handlers are not stripped.

**Test 4.2  onmouseover:**

<p onmouseover="this.style.color='red'; alert('XSS via onmouseover')">Hover over this text  onmouseover test</p>

> ✅ Expected: Text visible, hover has no effect.  
> ❌ DANGER: If text turned red or alert appeared on hover.

**Test 4.3  onload on image:**

<img src="https://via.placeholder.com/100" onload="alert('XSS via img onload')" alt="onload test image" />

> ✅ Expected: Image displayed, no alert.  
> ❌ DANGER: If an alert appeared, `onload` is not sanitized.

---

## ⚠️ SECTION 5  Markdown Injection via Crafted URLs

**Test 5.1  Link with dangerous title:**

[Hover over me](https://example.com "javascript:alert('XSS in link title')")

> ✅ Expected: Normal link to example.com.  
> ❌ DANGER: If the title attribute contains executable code.

**Test 5.2  Image with SVG data URI (can execute scripts in some browsers):**

![SVG with potential script](data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><script>alert('SVG XSS')</script></svg>)

> ✅ Expected: Broken image or nothing.  
> ❌ DANGER: If alert appeared or SVG rendered.

---

## ⚠️ SECTION 6  Hidden/Invisible Content

**Test 6.1  Hidden div:**

<div style="display:none">This text is hidden. If you can see this, inline styles are preserved but `display:none` works fine.</div>

> ✅ This is generally safe  invisible content is a low risk.

**Test 6.2  Zero opacity text:**

<span style="opacity:0">SECRET: This text is invisible but present in DOM</span>

> ✅ Expected: No visible text (opacity:0 = invisible).

**Test 6.3  Off screen text:**

<span style="position:absolute;left:-9999px">OFF SCREEN: Invisible but present</span>

---

## ✅ SECTION 7  Safe HTML (should render fine)

These HTML elements are generally safe and should render:

<b>Bold via b tag</b>

<i>Italic via i tag</i>

<strong>Strong via strong tag</strong>

<em>Emphasis via em tag</em>

<code>Inline code via code tag</code>

<kbd>Ctrl</kbd> + <kbd>C</kbd>

<mark>Highlighted via mark tag</mark>

<details><summary>Expandable details (safe)</summary>Content inside expandable section.</details>

<table><tr><td>Simple table cell via HTML</td><td>Second cell</td></tr></table>

<hr>

<br>

---

## ✅ SECTION 8  HTML Comments (should be invisible)

<!-- Comment 1: This should be completely invisible -->
<!-- Comment 2: No output expected here -->
<!--
  Multi-line comment.
  All invisible.
-->

> ✅ Expected: Nothing visible between the horizontal rules.  
> If you can see HTML comment content as text, the renderer is treating comments as text (not a security issue, but incorrect rendering).

---

## ℹ️ SECTION 9  Markdown Preview Enhanced CVE-2025-65716

If you are using **VS Code with Markdown Preview Enhanced (MPE) extension**, be aware:

> **CVE-2025-65716** (CVSS 8.8  High Severity): A Remote Code Execution vulnerability in all MPE versions up to and including 0.8.18 allows a maliciously crafted Markdown file to execute arbitrary JavaScript in the preview context. This can be exploited for:
> - Local port scanning
> - Data exfiltration from localhost services
> - Execution of arbitrary JavaScript with renderer process privileges

**Mitigation:** Update MPE to the latest version. Avoid opening untrusted `.md` files in MPE. Consider switching to VS Code's built in Markdown preview for untrusted content.

---

## ℹ️ SECTION 10  Typora CVE-2023-2316

> **CVE-2023-2316** (Typora ≤ v1.6.6): Local file disclosure via path traversal in crafted Markdown files. Patched in **v1.6.7**.

**Mitigation:** Update Typora to v1.6.7 or later. Avoid opening Markdown files from untrusted sources in older Typora versions.

---

## Summary: Security Scorecard

| Test Category                    | Your Result |
|----------------------------------|-------------|
| `<script>` tags  blocked?       | ⬜ Test above |
| `onerror` handlers  stripped?   | ⬜ Test above |
| `javascript:` URIs  blocked?    | ⬜ Test above |
| `<iframe>`  blocked?            | ⬜ Test above |
| `<style>` tags  sanitized?      | ⬜ Test above |
| Event handlers  stripped?       | ⬜ Test above |
| Inline styles  sanitized?       | ⬜ Test above |

> Fill in ✅ (safe) or ❌ (vulnerable) based on what you observe above.
