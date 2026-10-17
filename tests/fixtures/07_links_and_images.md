# 07 Links, References & Images

> **Test Purpose:** Test all link types, reference style links, anchors, auto links, footnotes, and image embedding.
> **What to look for:** Clickable links (not raw text), correct image rendering, tooltips or titles, broken image placeholders, and correct handling of different image formats.
> **A note on image sources:** The old version of this file used `via.placeholder.com` for almost every image. That service is now unreliable and often fails to load at all, so this version uses services that are confirmed to work: `placehold.co` (supports SVG, PNG, JPEG, GIF, WebP, and AVIF), `picsum.photos` (real photos), and Wikimedia Commons (real, stable files).

---

## 1. Inline Links

[Simple link](https://example.com)

[Link with title or tooltip](https://example.com "Hover over me, this is the title")

[Link with single quote title](https://example.com 'Single quote title')

[Link to a local file](./other_file.md)

[Link with a path](../parent/file.md)

[Link with a port number](https://example.com:8080/path)

[FTP link](ftp://ftp.example.com/file.txt)

---

## 2. Bare URLs & Auto Links

Auto link with angle brackets: <https://example.com>

Auto link email: <user@example.com>

Bare URL (should auto link in GFM): https://example.com

Bare URL without https (may not auto link): www.example.com

---

## 3. Reference Style Links

[Reference link][ref1]

[Reference link with title][ref-with-title]

[Implicit reference][]

[Case Insensitive Ref][CASE]

[ref1]: https://example.com
[ref-with-title]: https://example.com "Reference with title"
[Implicit reference]: https://example.com/implicit
[case]: https://example.com/case-test

---

## 4. Anchors & Heading Links

[Jump to Section: Tables](#2-tables-in-the-same-document)

[Jump to a heading in this file](#1-inline-links)

[Jump to footnotes section](#15-footnotes-pandoc--github-extension)

---

## 5. Link Inside Formatting

**[Bold link](https://example.com)**

*[Italic link](https://example.com)*

`[Code link, this should NOT be a link](https://example.com)`

[Link with **bold** inside](https://example.com)

[Link with `code` inside](https://example.com)

---

## 6. Link Edge Cases

**Empty URL (no destination):**

[Link with empty URL]()

**Link with special chars in URL:**

[URL with spaces encoded](https://example.com/path%20with%20spaces)

[URL with query string](https://example.com/search?q=markdown&sort=date)

[URL with fragment](https://example.com/page#section-2)

[URL with parentheses](https://en.wikipedia.org/wiki/Markdown_(markup_language))

**Link text with brackets:**

[\[Bracketed text\]](https://example.com)

**Nested parentheses in URL (tricky parsing):**

[Link](https://example.com/path(nested))

---

## 7. Images: Inline (real photo)

A real photograph, always the same image, from Lorem Picsum:

![A real photo of a dog, used as a stable test image](https://picsum.photos/id/237/400/300)

A generated placeholder, useful when you just want a solid color block with text:

![Generated placeholder with custom colors](https://placehold.co/400x200/4f46e5/ffffff.png?text=Test+Image)

![Another generated placeholder](https://placehold.co/200x200/10b981/ffffff.png?text=Square)

---

## 8. Images: With Title

![Image with title tooltip](https://placehold.co/400x200/f59e0b/000000.png?text=Amber+Box "Hover to see this title")

---

## 9. Images: Reference Style

![Reference image][img-ref]

![Another reference][img-ref2]

[img-ref]: https://placehold.co/350x150/ef4444/ffffff.png?text=Reference+Image
[img-ref2]: https://placehold.co/350x150/3b82f6/ffffff.png?text=Another+Reference

---

## 10. Images: Linked Images (clickable)

[![Clickable image](https://placehold.co/400x100/6366f1/ffffff.png?text=Click+Me "Click this image")](https://example.com)

---

## 11. Images: Non Existent (broken image test)

![This image does not exist](https://example.com/nonexistent-image-404.png "Should show broken image icon")

---

## 12. Images: Format Coverage (real format tests, not just PNG)

Most test files only ever test PNG. Here each format is requested for real, so you can check your renderer actually decodes each one rather than just displaying whatever the browser falls back to.

**SVG (vector):**

![SVG placeholder](https://placehold.co/400x200/06b6d4/ffffff.svg?text=SVG+Format)

**WebP:**

![WebP placeholder](https://placehold.co/400x200/8b5cf6/ffffff.webp?text=WebP+Format)

**AVIF:**

![AVIF placeholder](https://placehold.co/400x200/ec4899/ffffff.avif?text=AVIF+Format)

**GIF (static):**

![GIF placeholder](https://placehold.co/400x200/f97316/ffffff.gif?text=GIF+Format)

**Real animated GIF (36 frames, actually moves):**

![Animated Newton's cradle, real animated GIF](https://commons.wikimedia.org/wiki/Special:FilePath/Newtons_cradle_animation_book.gif)

**Real PNG with transparency (checkered background if your renderer handles alpha correctly):**

![Real PNG with an alpha transparency channel](https://commons.wikimedia.org/wiki/Special:FilePath/PNG_transparency_demonstration_1.png)

**Real JPEG:**

![Real JPEG photo](https://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg)

---

## 13. Images: Data URI (small base64 inline image)

![Tiny 1px red dot](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg== "1x1 red pixel")

---

## 14. Images: Sizing (Non Standard Markdown)

Standard Markdown does not support image sizing. These are non standard extensions.

**HTML style sizing (works in many renderers):**

<img src="https://placehold.co/200x100/22c55e/ffffff.png?text=200x100" width="200" height="100" alt="Sized image via HTML" />

**Obsidian style pipe sizing:**

![Small image|150](https://placehold.co/400x200/a855f7/ffffff.png?text=Large+but+resized)

---

## 15. Footnotes (Pandoc / GitHub extension)

This sentence has a footnote.[^1]

This one has a longer footnote.[^longnote]

Here is another footnote reference.[^2]

[^1]: This is the first footnote. It's short.
[^2]: Second footnote, can contain **bold**, `code`, and [links](https://example.com).
[^longnote]: This is a longer footnote with multiple paragraphs.

    Indent the next paragraph to make it part of the footnote.

    And another paragraph. Footnotes can be surprisingly long.

---

## 16. Wikilinks (Obsidian / Foam extension)

[[Internal Page Link]]

[[Internal Page Link|Display Name Override]]

[[Folder/Nested Page]]

---

## 17. Link with Newline in Definition

[Multiline ref]

[Multiline ref]: https://example.com
    "Title can be on next line (CommonMark spec)"

---

## 18. Email Links

Plain email (may auto link): user@example.com

Angle bracket email: <user@example.com>

Mailto link via HTML: <a href="mailto:user@example.com">Email me</a>

---

## 19. Telephone Links (HTML only)

<a href="tel:+15551234567">Call us: +1 (555) 123-4567</a>
