# 12  Edge Cases, Parsing Ambiguities & Stress Tests

> **Test Purpose:** A collection of known parsing edge cases, ambiguous syntax, and unusual Unicode behavior.  
> **What to look for:** Crashes, raw syntax leakage, unexpected line breaks, overlapping elements.

---

## 1. Setext Heading Ambiguity

The following looks like a heading  is it?

Not a heading?
-

Single character underline below text. CommonMark says this IS an H2.

---

## 2. Heading With Trailing Hashes

### Heading with trailing hash ###

### Another heading ### with hash in middle

###### Minimal H6 ######

---

## 3. ATX Heading With Extra Spaces

#   Heading with many spaces after hash

##Heading with no space (should NOT be a heading in CommonMark)

---

## 4. Thematic Break vs Setext Heading

These three are thematic breaks (horizontal rules), NOT headings:

---
***
___

But this IS a heading:

Text
---

---

## 5. Indented Code Block (4 spaces) vs Paragraph

Normal paragraph.

    This should be a code block (4 spaces of indentation).
    Second line of the code block.
    Third line.

    Still the same code block (blank line within still part of indented code).

Normal paragraph again.

---

## 6. Mixed Indented Code and List

1. First item

       This is code inside a list item (needs extra 4 spaces: 4 for list + 4 for code = 8 total... actually depends on list indent)

2. Second item

---

## 7. Backtick Fence Lengths

````
This is fenced with 4 backticks.
It can contain triple-backtick inside:
```
Like this
```
Without breaking the fence.
````

`````
Five backtick fence.
Can contain four backticks:
````
Without escaping.
````
`````

---

## 8. Tilde Fences

~~~
This block uses tilde fences instead of backticks.
~~~python
This has a language tag with tildes.
~~~

---

## 9. Unclosed Code Fence

```
This code fence is never closed.

Everything after this point, until end of file or next fence, may be rendered as code.

Or the renderer may auto-close it.

```

---

## 10. Link Reference Definitions  Edge Cases

**Defined but never used:**

[unused-ref]: https://example.com/unused "This reference is never used in the document"

**Used but not defined:**

[This link has no reference definition][undefined-ref]

**Duplicate definition (first wins in CommonMark):**

[dup]: https://example.com/first "First definition"
[dup]: https://example.com/second "Second definition — should be ignored"

[Click here to test which URL wins][dup]

**Definition inside blockquote:**

> [blockquote ref]: https://example.com/in-blockquote

[Does this work outside the blockquote?][blockquote-ref]

---

## 11. Emphasis Edge Cases

*a* (minimal italic)

**a** (minimal bold)

***a*** (minimal bold italic)

*foo bar* (normal)

* not italic * (space before closing  not italic in CommonMark)

foo*bar*baz (intra word italic  works in GFM)

foo_bar_baz (underscore intra word  should NOT be italic in CommonMark)

*(*nested*)* (inner parens around italic)

**(**nested**)**(outer bold with inner paren italic)

*a**b**c* (bold inside italic)

**a*b*c** (italic inside bold)

---

## 12. Autolink Extensions (GFM)

These should auto link in GFM:

https://example.com

http://example.com

www.example.com

But these should NOT auto link (no protocol, not www):

example.com

ftp://example.com (FTP may not auto link in all renderers)

---

## 13. Email Auto Links

Standard auto link with angle brackets: <user@example.com>

GFM extended auto link (no brackets): user@example.com

Invalid email (should not link): @username (Twitter handle)

---

## 14. HTML Entity Edge Cases

Numeric decimal entity: &#65; (should render as "A")

Numeric hex entity: &#x41; (should render as "A")

Named entity: &amp; (should render as "&")

Unknown entity: &notanentity; (should be left as is or error)

Partial entity: &amp (missing semicolon  behavior varies)

---

## 15. Unicode & International Characters

**Right to Left text:**

مرحبا بالعالم  Arabic: Hello World

שלום עולם  Hebrew: Hello World

**Mixed LTR/RTL:**

The word مرحبا means "hello" in Arabic.

**East Asian:**

日本語テスト  Japanese

中文测试  Chinese Simplified

한국어 테스트  Korean

**Emoji in headings:**

### 🚀 Heading With Rocket Emoji

### ❤️ Heading With Heart

**Zero width space (invisible character  may affect line breaking):**

This​word has a zero width space​between characters.

**Non breaking space:**

These&nbsp;words&nbsp;are&nbsp;separated&nbsp;by&nbsp;non breaking&nbsp;spaces.

**Soft hyphen:**

Pneumono&shy;ultramicroscopic&shy;silicovolcano&shy;coniosis (breaks at soft hyphens on narrow screens)

---

## 16. Very Long Lines (no wrapping test)

AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

https://example.com/this-is-a-very-very-very-very-very-very-very-very-very-very-very-very-very-very-very-very-long-url-that-should-wrap-or-scroll

---

## 17. Deeply Nested Blockquotes With Lists

> - Level 1 list inside blockquote
>   - Level 2 list
>     > Blockquote inside a nested list inside a blockquote
>     >
>     > - Even a list inside that nested blockquote
>   - Back to level 2

---

## 18. Table With Markdown Formatting Spanning Multiple Cells (does it bleed?)

| Cell A starts **bold | Cell B ends bold** |
|----------------------|---------------------|
| Does bold bleed?     | Or stay contained?  |

---

## 19. Paragraphs That Could Be Lists

- (This starts with hyphen space: definitely a list item)
- a) But is this: a list item that accidentally resembles an alphabetical list?
- 1. Or this: a nested ordered list?

1. First
2. Second

(3. Does the parenthesis make this a list? Some older parsers say yes.)

---

## 20. Fenced Code Block With Just Spaces

```
   
   
   
```

---

## 21. Empty Blockquote, List, and Table

>

- 

| | |
|-|-|
| | |

---

## 22. Invisible Characters & BOM

File beginning with UTF-8 BOM (﻿)  if you see a strange character at the start, the renderer exposed the BOM.

This line has a trailing tab	character (may or may not be visible).

---

## 23. Markdown in HTML Attributes (should NOT render)

<div title="**This bold should not render** in the attribute value">
  But this Markdown **should render** inside the HTML element body.
</div>

---

## 24. Consecutive Blockquotes (separate or merged?)

> First blockquote.

> Second blockquote (blank line between  should be two separate elements).

>> Third blockquote (nested from start).

---

## 25. Extremely Large Table

| C1  | C2  | C3  | C4  | C5  | C6  | C7  | C8  | C9  | C10 | C11 | C12 | C13 | C14 | C15 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  | 12  | 13  | 14  | 15  |
| 16  | 17  | 18  | 19  | 20  | 21  | 22  | 23  | 24  | 25  | 26  | 27  | 28  | 29  | 30  |
| 31  | 32  | 33  | 34  | 35  | 36  | 37  | 38  | 39  | 40  | 41  | 42  | 43  | 44  | 45  |
| 46  | 47  | 48  | 49  | 50  | 51  | 52  | 53  | 54  | 55  | 56  | 57  | 58  | 59  | 60  |
| 61  | 62  | 63  | 64  | 65  | 66  | 67  | 68  | 69  | 70  | 71  | 72  | 73  | 74  | 75  |
