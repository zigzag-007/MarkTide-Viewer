# 02  Tables

> **Test Purpose:** Stress test GFM table rendering  alignment, edge cases, complex content, and known failure modes.  
> **What to look for:** Correct column alignment, no broken borders, correct handling of special characters inside cells.

---

## 1. Basic Table

| Name    | Age | City        |
|---------|-----|-------------|
| Alice   | 30  | New York    |
| Bob     | 25  | Los Angeles |
| Charlie | 35  | Chicago     |

---

## 2. Column Alignment

| Left aligned | Center aligned | Right aligned |
|:-------------|:--------------:|--------------:|
| Left text    | Center text    |    Right text |
| More left    |   More center  |    More right |
| 1            |       2        |             3 |

---

## 3. Table With No Alignment Markers (default left)

| Col A | Col B | Col C |
|-------|-------|-------|
| A1    | B1    | C1    |
| A2    | B2    | C2    |

---

## 4. Table With Bold, Italic, Code in Cells

| Feature       | Syntax         | Example           |
|---------------|----------------|-------------------|
| **Bold**      | `**text**`     | **hello**         |
| *Italic*      | `*text*`       | *world*           |
| `Inline code` | `` `code` ``   | `print("hi")`     |
| ~~Strike~~    | `~~text~~`     | ~~deprecated~~    |

---

## 5. Table With Links and Images in Cells

| Resource   | Link                             | Description              |
|------------|----------------------------------|--------------------------|
| Google     | [Google](https://google.com)     | World's largest search   |
| GitHub     | [GitHub](https://github.com)     | Code hosting platform    |
| Wikipedia  | [Wiki](https://wikipedia.org)    | Free encyclopedia        |

---

## 6. Table With Pipe Character in Cell (must use HTML entity `&#124;`)

| Expression | Meaning                          |
|------------|----------------------------------|
| `a &#124; b` | Bitwise OR of a and b          |
| `x &#124;&#124; y` | Logical OR (short circuit)|

---

## 7. Narrow Table (minimum viable)

| A | B |
|---|---|
| 1 | 2 |

---

## 8. Wide Table With Many Columns

| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 | Col7 | Col8 | Col9 | Col10 |
|------|------|------|------|------|------|------|------|------|-------|
| A    | B    | C    | D    | E    | F    | G    | H    | I    | J     |
| 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    | 9    | 10    |

---

## 9. Table With Empty Cells

| Name  | Value | Unit  |
|-------|-------|-------|
| Width |       | px    |
|       | 100   |       |
|       |       |       |

---

## 10. Table With Long Content (wrapping behavior)

| Category          | Full Description                                                                                   |
|-------------------|----------------------------------------------------------------------------------------------------|
| Very Long Entry   | This cell contains a significantly long description to test whether the renderer wraps text inside table cells or overflows horizontally. Different renderers behave differently. |
| Short             | OK                                                                                                 |

---

## 11. Table With Numbers & Symbols

| Operation | Symbol | Example    | Result  |
|-----------|--------|------------|---------|
| Add       | +      | 1 + 2      | 3       |
| Subtract  | −      | 5 − 3      | 2       |
| Multiply  | ×      | 4 × 3      | 12      |
| Divide    | ÷      | 10 ÷ 2     | 5       |
| Modulo    | %      | 7 % 3      | 1       |
| Power     | ^      | 2 ^ 8      | 256     |
| Less than | <      | 3 < 5      | true    |
| More than | >      | 5 > 3      | true    |

---

## 12. Table Inside a Blockquote

> | Quoted | Table |
> |--------|-------|
> | A      | B     |
> | C      | D     |

---

## 13. Table Immediately After a Heading (no blank line)

### This heading is immediately followed by a table
| X | Y |
|---|---|
| 1 | 2 |

---

## 14. Intentionally Malformed Tables (edge case behavior)

**Missing closing pipe on some rows:**

| A | B | C
|---|---|---
| 1 | 2 | 3
| 4 | 5 | 6

**Mismatched column counts:**

| A | B | C |
|---|---|---|
| 1 | 2 |
| 3 | 4 | 5 | 6 |

**No body rows:**

| Header1 | Header2 |
|---------|---------|

**Table with HTML in cells:**

| Tag     | Rendered               |
|---------|------------------------|
| `<b>`   | <b>Bold via HTML</b>   |
| `<em>`  | <em>Italic via HTML</em> |
| `<br>`  | Line<br>break          |

---

## 15. Table With Checkbox/Task in Cell

| Task              | Done              |
|-------------------|-------------------|
| Write tests       | ✅                |
| Deploy to prod    | ❌                |
| Review PRs        | ⏳                |

---

## 16. Consecutive Tables (no blank line between)

| First Table A | First Table B |
|---------------|---------------|
| A1            | B1            |

| Second Table A | Second Table B |
|----------------|----------------|
| A2             | B2             |

