# 06  Lists (Ordered, Unordered, Task, Nested, Edge Cases)

> **Test Purpose:** Test all list varieties including nesting, continuation, mixing, and known edge cases.  
> **What to look for:** Correct bullet/number rendering, proper nesting indentation, task checkbox display, tight vs loose list spacing.

---

## 1. Unordered List  Hyphens

- Item A
- Item B
- Item C

---

## 2. Unordered List  Asterisks

* Item X
* Item Y
* Item Z

---

## 3. Unordered List  Plus Signs

+ Alpha
+ Beta
+ Gamma

---

## 4. Mixing Markers (should each create a separate list or continue?)

- Using hyphen
* Using asterisk
+ Using plus sign

---

## 5. Ordered List  Standard

1. First item
2. Second item
3. Third item
4. Fourth item
5. Fifth item

---

## 6. Ordered List  All Starting With 1 (CommonMark auto increments)

1. Apples
1. Bananas
1. Cherries
1. Dates

---

## 7. Ordered List  Starting at a Custom Number

5. Fifth item
6. Sixth item
7. Seventh item

---

## 8. Ordered List  Large Starting Number (CommonMark spec edge)

1000000000. This is item one billion
1000000001. Does the renderer handle this?

---

## 9. Nested Unordered List (up to 4 levels)

- Level 1 item A
  - Level 2 item A
    - Level 3 item A
      - Level 4 item A
      - Level 4 item B
    - Level 3 item B
  - Level 2 item B
- Level 1 item B

---

## 10. Nested Ordered List

1. Chapter One
   1. Section 1.1
      1. Subsection 1.1.1
      2. Subsection 1.1.2
   2. Section 1.2
2. Chapter Two
   1. Section 2.1
   2. Section 2.2

---

## 11. Mixed Ordered + Unordered Nested

1. First ordered
   - Unordered sub item A
   - Unordered sub item B
2. Second ordered
   - Another sub item
     1. Nested ordered inside unordered inside ordered
     2. Item 2
3. Third ordered

---

## 12. Task List (GFM)

- [x] ✅ Completed task
- [x] Another completed task
- [ ] Incomplete task
- [ ] Another incomplete task
- [x] ~~Completed and deprecated~~
- [ ] Task with **bold** text
- [ ] Task with `code`
- [ ] Task with a [link](https://example.com)

---

## 13. Nested Task List

- [x] Phase 1: Planning
  - [x] Define requirements
  - [x] Create wireframes
  - [ ] Get stakeholder sign off
- [ ] Phase 2: Development
  - [x] Backend API
  - [ ] Frontend UI
  - [ ] Write unit tests
- [ ] Phase 3: Deployment
  - [ ] Staging deploy
  - [ ] Load testing
  - [ ] Production release

---

## 14. Tight vs Loose Lists

**Tight list (no blank lines between items  compact spacing):**

- Item one
- Item two
- Item three

**Loose list (blank lines between items  paragraph spacing):**

- Item one

- Item two

- Item three

---

## 15. List Item With Multiple Paragraphs (continuation)

- This list item has a first paragraph.

  This is a second paragraph in the same list item. It must be indented to be recognized as continuation.

- This is the next list item.

  It also has two paragraphs.

  And even a third paragraph.

---

## 16. List Item With Code Block

1. Install Node.js:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. Verify installation:

   ```bash
   node --version
   npm --version
   ```

3. Initialize project:

   ```bash
   mkdir my-project && cd my-project
   npm init -y
   ```

---

## 17. List Item With Blockquote

- First item with a quote:

  > "The best way to predict the future is to invent it."  Alan Kay

- Second item with a nested quote:

  > This is a blockquote inside a list item.
  >
  > It spans multiple paragraphs.

---

## 18. List Item With Table

- Here is a list item that contains a table:

  | Column A | Column B |
  |----------|----------|
  | A1       | B1       |
  | A2       | B2       |

- The next item is back to normal.

---

## 19. List With Heading Inside (non standard, problematic)

- Item before heading
- ## Heading Inside List Item (renders differently per tool)
- Item after heading

---

## 20. Definition List (Pandoc / MultiMarkdown extension)

Term A
:   Definition of Term A. This can span multiple
    lines if indented.

Term B
:   Definition of B, first paragraph.

:   Definition of B, second paragraph (same term, multiple definitions).

Term C
:   Short definition.

---

## 21. Edge Cases

**Item immediately after paragraph (potential parsing issue):**

This is a paragraph.
- But this hyphen should it become a list or stay in the paragraph?

**Interrupted ordered list (does it restart numbering?):**

1. Item one
2. Item two

Interrupting paragraph.

3. Item three (does the renderer continue from 3 or restart at 1?)

**Deeply nested (8 levels):**

- L1
  - L2
    - L3
      - L4
        - L5
          - L6
            - L7
              - L8 (very deep)

**List ending at EOF (no trailing newline  should still render):**

- Final item one
- Final item two
- Final item three
