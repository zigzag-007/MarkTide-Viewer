# 02 Tables: Deep Stress Test Suite

> **Test Purpose:** Push GFM table rendering to its absolute limits. This file contains real world data, extreme edge cases, and every known failure pattern that trips up markdown editors.
> **What to look for:** Correct alignment, cell wrapping, special character handling, nested formatting, emoji rendering, HTML fallback, and parser recovery from malformed input.
> **Known fact:** Tables are NOT part of the original Markdown spec or CommonMark. They exist only as a GFM extension, which is why they are the #1 source of rendering inconsistencies across editors.

---

## 1. School Weekly Timetable (Real World)

A real school timetable that students would actually create. Tests alignment across many columns with mixed content.

| Time          | Monday              | Tuesday             | Wednesday           | Thursday            | Friday              |
|:--------------|:--------------------|:--------------------|:--------------------|:--------------------|:--------------------|
| 8:00 - 8:45   | Mathematics         | English Literature  | Physics             | Mathematics         | Chemistry           |
| 8:50 - 9:35   | English Literature  | Chemistry           | Mathematics         | Biology             | Physics             |
| 9:40 - 10:25  | Computer Science    | Physics             | History             | English Literature  | Mathematics         |
| **10:25 - 10:45** | **Morning Break** ☕ | **Morning Break** ☕ | **Morning Break** ☕ | **Morning Break** ☕ | **Morning Break** ☕ |
| 10:45 - 11:30 | Biology             | History             | English Literature  | Computer Science    | Art & Design        |
| 11:35 - 12:20 | History             | Computer Science    | Chemistry           | Art & Design        | Biology             |
| **12:20 - 1:00** | **Lunch Break** 🍕 | **Lunch Break** 🍕 | **Lunch Break** 🍕 | **Lunch Break** 🍕 | **Lunch Break** 🍕 |
| 1:00 - 1:45   | Physical Education  | Art & Design        | Computer Science    | Physical Education  | History             |
| 1:50 - 2:35   | Art & Design        | Physical Education  | Biology             | History             | Computer Science    |
| 2:35 - 2:40   | *End of day*        | *End of day*        | *End of day*        | *End of day*        | *End of day*        |

---

## 2. Employee Payroll Summary (Financial Data with Alignment)

Tests right alignment for numeric/currency columns. Many editors fail to properly right align numbers.

| Employee ID | Name              | Department     | Hours Worked |   Hourly Rate |    Gross Pay |  Tax (22%) |    Net Pay |
|:------------|:------------------|:---------------|:------------:|--------------:|-------------:|-----------:|-----------:|
| EMP001      | Sarah Johnson     | Engineering    |           40 |        $85.00 |    $3,400.00 |    $748.00 |  $2,652.00 |
| EMP002      | Michael Chen      | Marketing      |           38 |        $72.50 |    $2,755.00 |    $606.10 |  $2,148.90 |
| EMP003      | Priya Sharma      | Data Science   |           45 |        $95.00 |    $4,275.00 |    $940.50 |  $3,334.50 |
| EMP004      | James O'Brien     | DevOps         |           42 |        $88.00 |    $3,696.00 |    $813.12 |  $2,882.88 |
| EMP005      | Fatima Al Rashid  | UX Design      |           40 |        $78.00 |    $3,120.00 |    $686.40 |  $2,433.60 |
| EMP006      | David Kim         | Engineering    |           50 |        $85.00 |    $4,250.00 |    $935.00 |  $3,315.00 |
| EMP007      | Ana Garcia Lopez  | QA Testing     |           36 |        $65.00 |    $2,340.00 |    $514.80 |  $1,825.20 |
|             |                   | **TOTALS**     |      **291** |               | **$23,836.00** | **$5,243.92** | **$18,592.08** |

---

## 3. Server Monitoring Dashboard (Mixed Symbols, Emoji Status)

Tests emoji rendering inside table cells and mixed symbol handling.

| Server            | Status | CPU   | RAM    | Disk   | Uptime        | Region         | Alert          |
|:------------------|:------:|------:|-------:|-------:|:--------------|:---------------|:--------------:|
| prod-web-01       | 🟢 UP  | 23%   | 4.2 GB | 67%    | 142d 7h 33m   | us-east-1      |                |
| prod-web-02       | 🟢 UP  | 45%   | 6.1 GB | 72%    | 142d 7h 33m   | us-east-1      |                |
| prod-api-01       | 🟡 WARN| 87%   | 14.8 GB| 91%    | 89d 3h 12m    | us-west-2      | ⚠️ High CPU    |
| prod-db-master    | 🟢 UP  | 34%   | 28.4 GB| 45%    | 365d 0h 0m    | us-east-1      |                |
| prod-db-replica   | 🔴 DOWN| 0%    | 0 GB   | 45%    | 0d 0h 0m      | eu-west-1      | 🚨 CRITICAL    |
| staging-01        | 🟢 UP  | 12%   | 2.1 GB | 34%    | 30d 15h 22m   | us-east-1      |                |
| dev-sandbox       | 🟠 MAINT| 0%   | 0 GB   | 55%    | 0d 0h 0m      | ap-southeast-1 | 🔧 Maintenance |
| prod-cache-redis  | 🟢 UP  | 8%    | 32.0 GB| 12%    | 200d 4h 18m   | us-east-1      |                |

---

## 4. Programming Language Comparison (Dense Data, Inline Code)

Tests inline code rendering inside table cells. Many editors break when cells contain backtick code.

| Language     | Typing        | Hello World                          | Package Manager      | File Extension | Year |
|:-------------|:--------------|:-------------------------------------|:---------------------|:---------------|:-----|
| Python       | Dynamic       | `print("Hello, World!")`            | `pip` / `conda`      | `.py`          | 1991 |
| JavaScript   | Dynamic       | `console.log("Hello, World!");`      | `npm` / `yarn`       | `.js`          | 1995 |
| TypeScript   | Static        | `console.log("Hello, World!");`      | `npm` / `yarn`       | `.ts`          | 2012 |
| Rust         | Static        | `println!("Hello, World!");`         | `cargo`              | `.rs`          | 2010 |
| Go           | Static        | `fmt.Println("Hello, World!")`       | `go mod`             | `.go`          | 2009 |
| Java         | Static        | `System.out.println("Hello, World!");` | `maven` / `gradle` | `.java`        | 1995 |
| C++          | Static        | `std::cout << "Hello, World!";`      | `vcpkg` / `conan`    | `.cpp`         | 1985 |
| Ruby         | Dynamic       | `puts "Hello, World!"`               | `gem` / `bundler`    | `.rb`          | 1995 |
| Swift        | Static        | `print("Hello, World!")`             | `SPM`                | `.swift`       | 2014 |
| Kotlin       | Static        | `println("Hello, World!")`           | `gradle`             | `.kt`          | 2011 |

---

## 5. Pipe Characters Inside Cells (Classic Breaker)

This is the #1 table breaker. The pipe `|` is the column delimiter, so literal pipes in cell content confuse every parser differently.

**Method 1: HTML Entity `&#124;`**

| Expression      | Meaning                          | Example                    |
|:----------------|:---------------------------------|:---------------------------|
| `a &#124; b`    | Bitwise OR                       | `5 &#124; 3` = `7`        |
| `a &#124;&#124; b` | Logical OR                   | `true &#124;&#124; false`  |
| `a & b`         | Bitwise AND                      | `5 & 3` = `1`             |

**Method 2: Backslash Escape `\|` (not universally supported)**

| Expression     | Works in GFM? | Works in CommonMark? |
|:---------------|:-------------:|:--------------------:|
| `a \| b`       | Yes           | No                   |
| `a \|\| b`     | Yes           | No                   |

**Method 3: Backtick Wrapping**

| Shell Command                  | Description                    |
|:-------------------------------|:-------------------------------|
| `cat file.txt \| grep "error"` | Pipe output to grep            |
| `ls -la \| wc -l`              | Count lines in directory       |
| `echo $PATH \| tr ':' '\n'`    | Split PATH                     |

---

## 6. Wide Table: HR Staff Directory (8 Columns)

> **PDF Note:** This is a realistic 8-column table a user might actually create. In **PDF export**, wide tables are a major pain point — the PDF renderer must choose between: shrinking font size to fit, cutting off columns at the page edge, wrapping cell text (which bloats row height), or rotating to landscape. Test your viewer's PDF export with this table and see what choice it makes.

| ID     | Full Name           | Department          | Job Title                     | Email                          | Phone          | Start Date | Salary      |
|:-------|:--------------------|:--------------------|:------------------------------|:-------------------------------|:---------------|:-----------|------------:|
| EMP001 | Sarah Johnson       | Engineering         | Senior Software Engineer      | sarah.johnson@company.com      | +1-555-0101   | 2019-03-15 |   $125,000  |
| EMP002 | Michael Chen        | Marketing           | Head of Digital Marketing     | michael.chen@company.com       | +1-555-0102   | 2020-07-01 |    $98,500  |
| EMP003 | Priya Sharma        | Data Science        | Principal Data Scientist       | priya.sharma@company.com       | +1-555-0103   | 2018-11-20 |   $140,000  |
| EMP004 | James O'Brien       | DevOps              | Infrastructure Lead            | james.obrien@company.com       | +1-555-0104   | 2021-02-14 |   $118,000  |
| EMP005 | Fatima Al Rashid    | UX Design           | Senior UX Researcher           | fatima.alrashid@company.com    | +1-555-0105   | 2022-05-09 |    $105,000 |
| EMP006 | David Kim           | Engineering         | Staff Software Engineer        | david.kim@company.com          | +1-555-0106   | 2017-08-30 |   $148,000  |
| EMP007 | Ana Garcia Lopez    | QA Testing          | QA Automation Engineer         | ana.garcialopez@company.com    | +1-555-0107   | 2023-01-16 |    $88,000  |
| EMP008 | Raj Patel           | Product             | Senior Product Manager         | raj.patel@company.com          | +1-555-0108   | 2020-09-01 |   $132,000  |

---

## 7. Single Cell Content: Text Wrapping vs PDF Page Width

> **PDF Note:** In a PDF export, a cell this long either wraps (making the row very tall) or overflows the page. In a browser preview it typically just wraps. The difference between the two is a very common complaint with markdown to PDF tools.

| Category | Description |
|:---------|:------------|
| Short    | OK |
| Medium   | This is a moderate length description that fits in most renderers without issues. |
| Long     | This cell contains a deliberately long description to test text wrapping behavior. In a browser-based markdown preview, this should wrap gracefully within the cell and simply make the row taller. However, when exported to PDF, many converters struggle: the text may overflow beyond the page margin, the font may shrink to fit, or the entire table may be cut off mid-page. If you are reading this full sentence inside a properly wrapped cell in your PDF, the converter handled it well. |
| Very Long | Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. |

---

## 8. Math / LaTeX Inside Table Cells

This is a known failure point. GitHub does not support `$` math in tables. Obsidian and some VS Code extensions do.

| Concept            | Formula                                        | Notes                                   |
|:-------------------|:-----------------------------------------------|:----------------------------------------|
| Pythagorean        | $a^2 + b^2 = c^2$                             | Right triangle relationship             |
| Quadratic Formula  | $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$     | Roots of $ax^2 + bx + c = 0$           |
| Euler's Identity   | $e^{i\pi} + 1 = 0$                            | Most beautiful equation                 |
| Summation          | $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$         | Sum of first $n$ natural numbers        |
| Matrix             | $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$ | A 2x2 matrix (may break in tables)     |
| Absolute Value     | $\lvert x \rvert \geq 0$                      | Using `\lvert` instead of `\|` to avoid pipe conflict |

---

## 9. Links, Images, and Badges Inside Cells

| Project        | Build Status | Coverage | License | Homepage |
|:---------------|:-------------|:---------|:--------|:---------|
| React          | ![build](https://img.shields.io/badge/build-passing-brightgreen) | ![coverage](https://img.shields.io/badge/coverage-95%25-green) | ![MIT](https://img.shields.io/badge/license-MIT-blue) | [reactjs.org](https://reactjs.org) |
| Vue            | ![build](https://img.shields.io/badge/build-passing-brightgreen) | ![coverage](https://img.shields.io/badge/coverage-89%25-yellowgreen) | ![MIT](https://img.shields.io/badge/license-MIT-blue) | [vuejs.org](https://vuejs.org) |
| Angular        | ![build](https://img.shields.io/badge/build-failing-red) | ![coverage](https://img.shields.io/badge/coverage-72%25-yellow) | ![MIT](https://img.shields.io/badge/license-MIT-blue) | [angular.io](https://angular.io) |

---

## 10. Nested Inline Formatting Stress

Every cell in this table stacks multiple formatting types. This is where parsers start to disagree.

| Test Case                                          | Expected Rendering                                |
|:---------------------------------------------------|:--------------------------------------------------|
| `**bold**`                                         | **bold**                                          |
| `*italic*`                                         | *italic*                                          |
| `***bold italic***`                                | ***bold italic***                                 |
| `~~strikethrough~~`                                | ~~strikethrough~~                                 |
| `**bold with `code` inside**`                      | **bold with `code` inside**                       |
| `*italic with **bold** inside*`                    | *italic with **bold** inside*                     |
| `[**bold link**](https://example.com)`             | [**bold link**](https://example.com)              |
| `[![img](https://img.shields.io/badge/x-y-blue)](https://example.com)` | [![img](https://img.shields.io/badge/x-y-blue)](https://example.com) |
| `***~~bold italic strikethrough~~***`              | ***~~bold italic strikethrough~~***                |
| `**bold *and italic* mixed**`                      | **bold *and italic* mixed**                       |

---

## 11. Empty Cells and Sparse Data (Edge Case)

Some renderers collapse rows with all empty cells or misalign when cells are missing.

| A     | B     | C     | D     | E     |
|-------|-------|-------|-------|-------|
| data  |       |       |       |       |
|       | data  |       |       |       |
|       |       | data  |       |       |
|       |       |       | data  |       |
|       |       |       |       | data  |
|       |       |       |       |       |
| a     | b     |       | d     |       |

---

## 12. Unicode, RTL Text, and International Characters

Tests how renderers handle bidirectional text, CJK characters, and scripts with different widths.

| Language   | Script    | Sample Text                                 | Direction |
|:-----------|:----------|:--------------------------------------------|:----------|
| English    | Latin     | Hello, World!                               | LTR       |
| Arabic     | Arabic    | مرحبا بالعالم                                | RTL       |
| Hebrew     | Hebrew    | שלום עולם                                    | RTL       |
| Chinese    | Hanzi     | 你好世界                                      | LTR       |
| Japanese   | Mixed     | こんにちは世界                                 | LTR       |
| Korean     | Hangul    | 안녕하세요 세계                                | LTR       |
| Hindi      | Devanagari| नमस्ते दुनिया                                 | LTR       |
| Thai       | Thai      | สวัสดีชาวโลก                                   | LTR       |
| Russian    | Cyrillic  | Привет, мир!                                 | LTR       |
| Greek      | Greek     | Γειά σου Κόσμε                               | LTR       |
| Mixed      | RTL+LTR   | Hello مرحبا World عالم 123                   | Mixed     |

---

## 13. Table Inside a Blockquote (Classic Failure)

Every row must be prefixed with `>`. Missing a single `>` on any row breaks the table in most parsers.

> | Quarter | Revenue     | Growth   | Target Met |
> |:--------|:------------|:---------|:----------:|
> | Q1 2024 | $2,450,000  | +12.3%   | ✅          |
> | Q2 2024 | $2,890,000  | +17.9%   | ✅          |
> | Q3 2024 | $2,720,000  |  -5.9%   | ❌          |
> | Q4 2024 | $3,150,000  | +15.8%   | ✅          |

---

## 14. Table Inside a Nested Blockquote

> Outer quote context:
>
> > Inner quote with a table:
> >
> > | Level | Value |
> > |:------|:------|
> > | Deep  | Nested|
> > | Very  | Deep  |

---

## 15. Table Inside a List Item

Some renderers support this with proper indentation. Most do not.

1. Here is item one with a table:

   | Rank | Name    | Score |
   |:-----|:--------|------:|
   | 1st  | Alice   | 98.5  |
   | 2nd  | Bob     | 95.2  |
   | 3rd  | Charlie | 91.8  |

2. Here is item two (did the table above render inside the list?)

- Unordered list item with table:

  | Key   | Value |
  |:------|:------|
  | color | blue  |
  | size  | large |

---

## 16. Table Inside `<details>` / `<summary>` (Collapsible)

Click to expand. The table should render correctly inside the collapsed section.

<details>
<summary>Click to see the student grades table</summary>

| Student         | Math | Science | English | History | Average |
|:----------------|-----:|--------:|--------:|--------:|--------:|
| Emily Watson    |   92 |      88 |      95 |      91 |    91.5 |
| David Park      |   78 |      95 |      82 |      85 |    85.0 |
| Sofia Rodriguez |   95 |      91 |      88 |      93 |    91.8 |
| Amir Khan       |   88 |      84 |      90 |      87 |    87.3 |
| Yuki Tanaka     |   91 |      97 |      85 |      89 |    90.5 |

</details>

---

## 17. Minimal Separator Variations (Parser Tolerance)

### 17a. Single dash per column (minimum valid GFM)

| A | B | C |
|-|-|-|
| 1 | 2 | 3 |

### 17b. Mixed dash counts

| Short | Medium | Long Column Header |
|-|------|--------------------------|
| a | b | c |

### 17c. Separator with extra colons (should this be center aligned?)

| A | B | C |
|:::|:::|:::|
| 1 | 2 | 3 |

### 17d. Separator with only spaces (invalid, but how does it fail?)

| A | B | C |
|   |   |   |
| 1 | 2 | 3 |

---

## 18. Missing Outer Pipes (Valid GFM, but Some Editors Choke)

No outer pipes on any row:

A | B | C
---|---|---
1 | 2 | 3
4 | 5 | 6

---

## 19. Mismatched Column Counts (Graceful Degradation)

How does the renderer handle rows with too few or too many columns?

| A | B | C |
|---|---|---|
| 1 | 2 |
| 3 | 4 | 5 | 6 | 7 |
| 8 |
| 9 | 10 | 11 |

---

## 20. Single Column Table

| Solo Column Header |
|:--------------------|
| Row 1              |
| Row 2              |
| Row 3              |
| Row 4              |

---

## 21. Table With No Body Rows (Header Only)

| Header A | Header B | Header C |
|----------|----------|----------|

---

## 22. Consecutive Tables With No Blank Line Between

| First A | First B |
|---------|---------|
| 1       | 2       |
| Second A | Second B |
|----------|----------|
| 3        | 4        |

---

## 23. Table After Heading With No Blank Line
### This heading has no blank line before the table
| Surprise | Table |
|----------|-------|
| Did it   | work? |

---

## 24. Table After Paragraph With No Blank Line

This paragraph has no blank line after it.
| Surprise | Table |
|----------|-------|
| Did it   | work? |

---

## 25. Indented Tables (Code Block Threshold)

### 25a. Indented 2 spaces (should still render as table)

  | A | B |
  |---|---|
  | 1 | 2 |

### 25b. Indented 4 spaces (should become code block, NOT table)

    | A | B |
    |---|---|
    | 1 | 2 |

---

## 26. HTML Table With Merged Cells (colspan / rowspan)

GFM cannot do this. You must use raw HTML. Tests whether the renderer supports HTML tables and whether Markdown formatting works inside them.

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th colspan="3">Q1 2024 Sales by Region</th>
    </tr>
    <tr>
      <th></th>
      <th>North</th>
      <th>South</th>
      <th>West</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2"><b>Electronics</b></td>
      <td>$45,200</td>
      <td>$38,900</td>
      <td>$52,100</td>
    </tr>
    <tr>
      <td>$41,800</td>
      <td>$35,200</td>
      <td>$49,700</td>
    </tr>
    <tr>
      <td><b>Furniture</b></td>
      <td>$23,400</td>
      <td>$19,800</td>
      <td>$28,600</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: center; background-color: #f0f0f0;"><em>Note: All values in USD. Rows 2-3 show monthly breakdown.</em></td>
    </tr>
  </tbody>
</table>

---

## 27. HTML Table vs GFM Table Side by Side

**GFM version:**

| Name  | Role      |
|:------|:----------|
| Alice | Engineer  |
| Bob   | Designer  |

**HTML version (should look identical):**

<table>
  <tr>
    <th>Name</th>
    <th>Role</th>
  </tr>
  <tr>
    <td>Alice</td>
    <td>Engineer</td>
  </tr>
  <tr>
    <td>Bob</td>
    <td>Designer</td>
  </tr>
</table>

---

## 28. Table With `<br>` For Multi Line Cells

GFM doesn't support actual newlines in cells. The `<br>` tag is the standard workaround.

| Name              | Address                                          | Notes                                |
|:------------------|:-------------------------------------------------|:-------------------------------------|
| Acme Corporation  | 123 Business Park Drive<br>Suite 4500<br>Austin, TX 78701<br>United States | Primary client<br>Contract through 2025 |
| Globex Inc.       | 1 Innovation Way<br>Building C<br>Dublin, Ireland | European HQ<br>GDPR compliant       |
| Initech LLC       | 4120 Office Space Blvd<br>Floor 3<br>Houston, TX 77001 | Satellite office<br>Limited support  |

---

## 29. Footnotes Inside Table Cells

Most renderers will NOT render these as actual footnotes. GitHub renders them as literal text `[^1]`.

| Feature       | Support     | Notes              |
|:--------------|:------------|:-------------------|
| Tables        | GFM [^1]    | Extension syntax   |
| Footnotes     | Pandoc [^2] | Not standard GFM   |
| Math          | KaTeX [^3]  | Renderer specific  |

[^1]: GitHub Flavored Markdown extension
[^2]: Pandoc extended Markdown
[^3]: KaTeX or MathJax required

---

## 30. Task Checkboxes in Table Cells (Will NOT Render as Checkboxes)

The `- [ ]` syntax only works in list context. Inside tables, it should render as plain text.

| Task                              | Status      | Priority |
|:----------------------------------|:------------|:---------|
| - [ ] Write documentation        | In progress | High     |
| - [x] Set up CI/CD pipeline      | Done        | Critical |
| - [ ] Code review                | Pending     | Medium   |

**Workaround using emoji and HTML:**

| Task                     | Status | Priority   |
|:-------------------------|:------:|:-----------|
| Write documentation      | ⬜     | 🔴 High    |
| Set up CI/CD pipeline    | ✅     | 🔴 Critical|
| Code review              | ⏳     | 🟡 Medium  |
| Fix login bug            | ❌     | 🔴 High    |
| Update dependencies      | ✅     | 🟢 Low     |

---

## 31. Styled / Colored Cells via HTML (GitHub Strips `style`)

GitHub strips `style` attributes for security. Obsidian may render them. Test your viewer.

<table>
  <tr>
    <td style="background-color: #ff6b6b; color: white; padding: 8px; font-weight: bold;">Red Cell</td>
    <td style="background-color: #51cf66; color: white; padding: 8px; font-weight: bold;">Green Cell</td>
    <td style="background-color: #339af0; color: white; padding: 8px; font-weight: bold;">Blue Cell</td>
  </tr>
  <tr>
    <td style="background-color: #ffd43b; padding: 8px;">Yellow Cell</td>
    <td style="background-color: #845ef7; color: white; padding: 8px;">Purple Cell</td>
    <td style="background-color: #ff922b; color: white; padding: 8px;">Orange Cell</td>
  </tr>
</table>

---

## 32. Recipe Card (Real World: Cooking Ingredients)

| Ingredient               | Amount       | Preparation       | Substitution                       |
|:-------------------------|:-------------|:-------------------|:-----------------------------------|
| All purpose flour        | 2 1/2 cups   | Sifted             | Gluten free 1:1 blend              |
| Unsalted butter          | 1 cup (2 sticks) | Room temperature | Coconut oil (equal amount)         |
| Granulated sugar         | 3/4 cup      |                    | Coconut sugar                      |
| Brown sugar (packed)     | 3/4 cup      | Packed firmly      | Muscovado or jaggery               |
| Large eggs               | 2            | Room temperature   | 2 flax eggs (vegan)                |
| Pure vanilla extract     | 2 tsp        |                    | Vanilla bean paste                 |
| Baking soda              | 1 tsp        |                    | None (critical)                    |
| Fine sea salt            | 1 tsp        |                    | Table salt (use 3/4 tsp)           |
| Semi sweet chocolate chips | 2 cups     |                    | Dark chocolate (70%+), chopped     |
| Walnuts *(optional)*     | 1 cup        | Roughly chopped    | Pecans or omit                     |

---

## 33. Gym Workout Tracker (Real World: Fitness Log)

| Exercise                  | Sets x Reps  | Weight (kg) | Rest (sec) | RPE  | Notes                    |
|:--------------------------|:-------------|:------------|:-----------|:-----|:-------------------------|
| Barbell Back Squat        | 4 x 8        | 100         | 180        | 8/10 | ATG depth, belt on       |
| Romanian Deadlift         | 3 x 10       | 80          | 120        | 7/10 | Slow eccentric 3s        |
| Bulgarian Split Squat     | 3 x 12 (each)| 20 (DBs)   | 90         | 8/10 | Hold DBs at sides        |
| Leg Press                 | 4 x 12       | 200         | 120        | 7/10 | Feet high & wide         |
| Leg Curl (machine)        | 3 x 15       | 45          | 60         | 6/10 |                          |
| Calf Raise (standing)     | 4 x 20       | 60          | 45         | 7/10 | 2s pause at top          |
| **Total Volume**          | **21 sets**  |             |            |      | ~55 min session          |

---

## 34. Travel Itinerary (Real World: Trip Planning)

| Day | Date       | Time          | Activity                                                  | Location                | Cost    |
|:----|:-----------|:--------------|:----------------------------------------------------------|:------------------------|--------:|
| 1   | 2024-12-20 | 06:00         | ✈️ Flight: LHR to NRT (BA005)                             | Heathrow Airport        | $890.00 |
| 1   | 2024-12-20 | 14:30 (local) | 🚃 Narita Express to Shinjuku                              | Narita Airport          |  $30.00 |
| 1   | 2024-12-20 | 16:00         | 🏨 Check in: Park Hyatt Tokyo                              | Shinjuku, Tokyo         | $450.00 |
| 2   | 2024-12-21 | 09:00         | ⛩️ Meiji Shrine & Harajuku                                 | Shibuya                 |   Free  |
| 2   | 2024-12-21 | 12:30         | 🍣 Lunch: Tsukiji Outer Market                             | Chuo City               |  $25.00 |
| 2   | 2024-12-21 | 15:00         | 🏙️ Shibuya Crossing & Shibuya Sky                          | Shibuya                 |  $18.00 |
| 3   | 2024-12-22 | 08:00         | 🚅 Shinkansen to Kyoto (Nozomi)                            | Tokyo Station           | $120.00 |
| 3   | 2024-12-22 | 11:00         | 🏯 Fushimi Inari Shrine (thousands of torii gates)         | Kyoto                   |   Free  |
| 3   | 2024-12-22 | 14:00         | 🎋 Arashiyama Bamboo Grove                                 | Kyoto                   |   Free  |
|     |            |               |                                                           | **Trip Total**          | **$1,533.00** |

---

## 35. Escape Character Chaos (Every Special Character in a Cell)

| Character | Raw   | Escaped / Safe       | Notes                              |
|:----------|:------|:---------------------|:-----------------------------------|
| Pipe      | `\|`  | `&#124;`             | Primary table breaker              |
| Backslash | `\\`  | `\`                  | Escape character itself            |
| Backtick  | `` ` `` | `` ` ``            | Inline code delimiter              |
| Asterisk  | `*`   | `\*`                 | Bold/italic trigger                |
| Underscore| `_`   | `\_`                 | Bold/italic trigger (alt)          |
| Tilde     | `~`   | `\~`                 | Strikethrough trigger              |
| Hash      | `#`   | `\#`                 | Heading trigger                    |
| Bracket [ | `[`   | `\[`                 | Link start                         |
| Bracket ] | `]`   | `\]`                 | Link end                           |
| Paren (   | `(`   | `\(`                 | Link URL start                     |
| Paren )   | `)`   | `\)`                 | Link URL end                       |
| Angle <   | `<`   | `&lt;`               | HTML tag start                     |
| Angle >   | `>`   | `&gt;`               | Blockquote / HTML tag end          |
| Ampersand | `&`   | `&amp;`              | HTML entity start                  |

---

## 36. Complex Emoji Rendering (ZWJ Sequences, Skin Tones, Flags)

| Emoji                | Code / Name                        | Type                  |
|:---------------------|:-----------------------------------|:----------------------|
| 😀                   | Grinning Face                      | Basic                 |
| 👨‍💻                   | Man Technologist (ZWJ)             | ZWJ Sequence          |
| 👩‍👩‍👧‍👦                  | Family: Woman, Woman, Girl, Boy    | Complex ZWJ           |
| 👋🏽                   | Waving Hand (Medium Skin Tone)     | Skin Tone Modifier    |
| 🏳️‍🌈                   | Rainbow Flag                       | Flag ZWJ              |
| 🇯🇵                   | Flag: Japan                        | Regional Indicator    |
| 🇺🇸                   | Flag: United States                | Regional Indicator    |
| 🧑‍🚀                   | Astronaut (Gender Neutral)         | ZWJ Sequence          |
| ❤️‍🔥                   | Heart on Fire                      | ZWJ Sequence          |
| 🫶🏼                   | Heart Hands (Medium Light Skin)    | Skin Tone Modifier    |

---

## 37. Large Table Performance Test (50 rows)

Renderers may start lagging at 50+ rows. Check for scroll performance and rendering speed.

| # | UUID | Name | Email | Score | Grade | Status |
|--:|:-----|:-----|:------|------:|:------|:------:|
| 1 | a1b2c3d4 | Olivia Smith | olivia.smith@mail.com | 97.3 | A+ | ✅ |
| 2 | e5f6g7h8 | Liam Johnson | liam.j@mail.com | 94.1 | A | ✅ |
| 3 | i9j0k1l2 | Emma Williams | emma.w@mail.com | 91.8 | A | ✅ |
| 4 | m3n4o5p6 | Noah Brown | noah.b@mail.com | 89.5 | B+ | ✅ |
| 5 | q7r8s9t0 | Ava Jones | ava.j@mail.com | 87.2 | B+ | ✅ |
| 6 | u1v2w3x4 | William Davis | will.d@mail.com | 85.0 | B | ✅ |
| 7 | y5z6a7b8 | Sophia Miller | sophia.m@mail.com | 82.4 | B | ✅ |
| 8 | c9d0e1f2 | James Wilson | james.w@mail.com | 79.9 | C+ | ⚠️ |
| 9 | g3h4i5j6 | Isabella Moore | isabella.m@mail.com | 77.1 | C+ | ⚠️ |
| 10 | k7l8m9n0 | Benjamin Taylor | ben.t@mail.com | 75.0 | C | ⚠️ |
| 11 | o1p2q3r4 | Mia Anderson | mia.a@mail.com | 73.6 | C | ⚠️ |
| 12 | s5t6u7v8 | Lucas Thomas | lucas.t@mail.com | 71.2 | C | ⚠️ |
| 13 | w9x0y1z2 | Charlotte Jackson | charlotte.j@mail.com | 68.8 | D+ | ⚠️ |
| 14 | a3b4c5d6 | Henry White | henry.w@mail.com | 66.5 | D+ | ⚠️ |
| 15 | e7f8g9h0 | Amelia Harris | amelia.h@mail.com | 64.1 | D | ❌ |
| 16 | i1j2k3l4 | Alexander Martin | alex.m@mail.com | 62.0 | D | ❌ |
| 17 | m5n6o7p8 | Harper Garcia | harper.g@mail.com | 59.8 | F | ❌ |
| 18 | q9r0s1t2 | Daniel Martinez | daniel.m@mail.com | 95.5 | A | ✅ |
| 19 | u3v4w5x6 | Evelyn Robinson | evelyn.r@mail.com | 93.2 | A | ✅ |
| 20 | y7z8a9b0 | Michael Clark | michael.c@mail.com | 90.7 | A | ✅ |
| 21 | c1d2e3f4 | Abigail Rodriguez | abigail.r@mail.com | 88.4 | B+ | ✅ |
| 22 | g5h6i7j8 | Sebastian Lewis | seb.l@mail.com | 86.1 | B | ✅ |
| 23 | k9l0m1n2 | Emily Lee | emily.l@mail.com | 83.8 | B | ✅ |
| 24 | o3p4q5r6 | Jack Walker | jack.w@mail.com | 81.5 | B | ✅ |
| 25 | s7t8u9v0 | Elizabeth Hall | liz.h@mail.com | 78.9 | C+ | ⚠️ |
| 26 | w1x2y3z4 | Aiden Allen | aiden.a@mail.com | 76.3 | C+ | ⚠️ |
| 27 | a5b6c7d8 | Avery Young | avery.y@mail.com | 74.0 | C | ⚠️ |
| 28 | e9f0g1h2 | Sofia Hernandez | sofia.h@mail.com | 71.7 | C | ⚠️ |
| 29 | i3j4k5l6 | Owen King | owen.k@mail.com | 69.4 | D+ | ⚠️ |
| 30 | m7n8o9p0 | Scarlett Wright | scarlett.w@mail.com | 67.1 | D+ | ⚠️ |
| 31 | q1r2s3t4 | Elijah Lopez | elijah.l@mail.com | 96.8 | A+ | ✅ |
| 32 | u5v6w7x8 | Grace Hill | grace.h@mail.com | 94.5 | A | ✅ |
| 33 | y9z0a1b2 | Carter Scott | carter.s@mail.com | 92.2 | A | ✅ |
| 34 | c3d4e5f6 | Chloe Green | chloe.g@mail.com | 89.9 | B+ | ✅ |
| 35 | g7h8i9j0 | Logan Adams | logan.a@mail.com | 87.6 | B+ | ✅ |
| 36 | k1l2m3n4 | Aria Baker | aria.b@mail.com | 85.3 | B | ✅ |
| 37 | o5p6q7r8 | Mason Gonzalez | mason.g@mail.com | 83.0 | B | ✅ |
| 38 | s9t0u1v2 | Lily Nelson | lily.n@mail.com | 80.4 | B | ✅ |
| 39 | w3x4y5z6 | Ethan Carter | ethan.c@mail.com | 77.8 | C+ | ⚠️ |
| 40 | a7b8c9d0 | Zoey Mitchell | zoey.m@mail.com | 75.5 | C | ⚠️ |
| 41 | e1f2g3h4 | Jackson Perez | jackson.p@mail.com | 73.2 | C | ⚠️ |
| 42 | i5j6k7l8 | Penelope Roberts | penny.r@mail.com | 70.9 | C | ⚠️ |
| 43 | m9n0o1p2 | Levi Turner | levi.t@mail.com | 68.3 | D+ | ⚠️ |
| 44 | q3r4s5t6 | Layla Phillips | layla.p@mail.com | 65.7 | D+ | ⚠️ |
| 45 | u7v8w9x0 | Mateo Campbell | mateo.c@mail.com | 63.4 | D | ❌ |
| 46 | y1z2a3b4 | Riley Parker | riley.p@mail.com | 61.1 | D | ❌ |
| 47 | c5d6e7f8 | Ellie Evans | ellie.e@mail.com | 58.8 | F | ❌ |
| 48 | g9h0i1j2 | Leo Edwards | leo.e@mail.com | 56.5 | F | ❌ |
| 49 | k3l4m5n6 | Nora Collins | nora.c@mail.com | 54.2 | F | ❌ |
| 50 | o7p8q9r0 | Jayden Stewart | jayden.s@mail.com | 52.0 | F | ❌ |

---

## 38. Table With `<input>` Elements (Interactive HTML)

Some renderers support interactive HTML elements inside tables. Most strip them for security.

<table>
  <tr>
    <th>Task</th>
    <th>Done?</th>
    <th>Notes</th>
  </tr>
  <tr>
    <td>Complete the report</td>
    <td><input type="checkbox" disabled checked></td>
    <td>Submitted on Friday</td>
  </tr>
  <tr>
    <td>Review pull request</td>
    <td><input type="checkbox" disabled></td>
    <td>Assigned to David</td>
  </tr>
  <tr>
    <td>Deploy to staging</td>
    <td><input type="checkbox" disabled></td>
    <td>Blocked by review</td>
  </tr>
</table>

---

## 39. Markdown Formatting Inside HTML Table (Known Bug)

In most parsers, **Markdown is NOT processed** inside block level HTML. So `**bold**` should render as literal asterisks, not bold text.

<table>
  <tr>
    <th>Markdown Syntax</th>
    <th>Expected Result</th>
  </tr>
  <tr>
    <td>**This should NOT be bold** (raw Markdown in HTML block)</td>
    <td>Literal asterisks visible</td>
  </tr>
  <tr>
    <td><b>This SHOULD be bold</b> (HTML tag)</td>
    <td>Bold text</td>
  </tr>
  <tr>
    <td><em>This SHOULD be italic</em> (HTML tag)</td>
    <td>Italic text</td>
  </tr>
  <tr>
    <td><code>This SHOULD be code</code> (HTML tag)</td>
    <td>Monospace text</td>
  </tr>
</table>

---

## 40. Grocery Shopping List (Real World: Everyday Use)

| Aisle | Item                          | Qty  | Unit Price | Total   | Organic? |
|:------|:------------------------------|:-----|:-----------|--------:|:--------:|
| 1     | Whole wheat bread              | 2    | $3.49      |   $6.98 | ✅        |
| 1     | Sourdough loaf                | 1    | $5.99      |   $5.99 | ✅        |
| 2     | 2% milk (gallon)              | 1    | $4.29      |   $4.29 |          |
| 2     | Greek yogurt (32oz)           | 2    | $6.49      |  $12.98 | ✅        |
| 3     | Chicken breast (boneless)     | 2 lb | $5.99/lb   |  $11.98 |          |
| 3     | Atlantic salmon fillet        | 1 lb | $12.99/lb  |  $12.99 |          |
| 4     | Broccoli crowns               | 1    | $2.49      |   $2.49 | ✅        |
| 4     | Baby spinach (5oz)            | 2    | $3.99      |   $7.98 | ✅        |
| 4     | Avocados                      | 4    | $1.25      |   $5.00 |          |
| 5     | Olive oil (extra virgin)      | 1    | $8.99      |   $8.99 | ✅        |
| 5     | Balsamic vinegar              | 1    | $6.49      |   $6.49 |          |
| 6     | Dark chocolate (72%)          | 2    | $3.29      |   $6.58 |          |
| 7     | Laundry detergent             | 1    | $11.99     |  $11.99 |          |
|       |                               |      | **Subtotal** | **$104.73** |   |
|       |                               |      | **Tax (8.5%)** | **$8.90** |  |
|       |                               |      | **TOTAL**    | **$113.63** |   |

---

## 41. PDF Export Stress Tests

> **What to look for in PDF:** Open your PDF export and check each sub-test below. PDF rendering is a completely separate rendering engine from the web preview — a table that looks perfect in preview can catastrophically fail in PDF.

### 41a. Narrow Enough to Fit on One PDF Page (Portrait)

This 4-column table with short content should comfortably fit on a single A4 page in portrait orientation without any wrapping or font scaling. Use this as your **baseline pass test**.

| Item No. | Product Name      | Unit Price | Qty |
|:---------|:------------------|:----------:|----:|
| 001      | Wireless Mouse    |   $29.99   |   3 |
| 002      | USB-C Hub         |   $49.99   |   2 |
| 003      | Laptop Stand      |   $39.99   |   1 |
| 004      | Mechanical Keyboard |  $119.99 |   1 |
| 005      | Monitor Light Bar |   $35.99   |   2 |
| 006      | Webcam HD 1080p   |   $79.99   |   1 |

**Expected PDF result:** Clean table, all columns visible, no horizontal overflow, single page.

---

### 41b. Wide Table: Will It Overflow the PDF Page?

This is 8 columns with moderate content. This is the key test for PDF export. Paste this in your viewer and export. Does it:
- ✅ Shrink font/table proportionally to fit? (best outcome)
- ⚠️ Wrap the long header cells? (acceptable)
- ❌ Cut off rightmost columns at the page margin? (broken)
- ❌ Overflow horizontally with content invisible off screen? (broken)

| Invoice # | Client Name         | Service Description          | Hours | Rate/hr | Subtotal   | Tax (8%) | Total Due  |
|:----------|:--------------------|:-----------------------------|------:|--------:|-----------:|---------:|-----------:|
| INV-2024-001 | Acme Corporation | Website redesign & dev   |    40 |  $150.00 |  $6,000.00 |  $480.00 | $6,480.00  |
| INV-2024-002 | Globex Inc.      | SEO audit & consultation |    12 |  $175.00 |  $2,100.00 |  $168.00 | $2,268.00  |
| INV-2024-003 | Initech LLC      | Backend API development   |    35 |  $160.00 |  $5,600.00 |  $448.00 | $6,048.00  |
| INV-2024-004 | Umbrella Corp    | Cloud infra setup & docs  |    20 |  $180.00 |  $3,600.00 |  $288.00 | $3,888.00  |

---

### 41c. Multi-Page Table: Header Row Repetition Test

> **The most common PDF table bug:** When a table spans multiple PDF pages, the header row should repeat at the top of every new page. Most markdown-to-PDF tools do NOT do this, leaving you with raw data rows on page 2+ with no context of what each column means. Check if your PDF export repeats the header.

This table has enough rows to likely spill onto a second PDF page. Scroll or flip to page 2 in the PDF — **is the header row visible at the top of page 2?**

| Order ID    | Customer Name       | Product                        | Category       | Qty | Unit Price | Total      | Status    | Ship Date  |
|:------------|:--------------------|:-------------------------------|:---------------|----:|-----------:|-----------:|:----------|:-----------|
| ORD-10001   | Alice Thompson      | Ergonomic Office Chair         | Furniture      |   1 |   $349.99  |   $349.99  | Delivered | 2024-01-05 |
| ORD-10002   | Bob Martinez        | Standing Desk (L-shaped)       | Furniture      |   1 |   $599.99  |   $599.99  | Delivered | 2024-01-07 |
| ORD-10003   | Carol Lee           | 4K Monitor 27"                 | Electronics    |   2 |   $399.99  |   $799.98  | Shipped   | 2024-01-08 |
| ORD-10004   | David Singh         | Noise Cancelling Headphones    | Electronics    |   1 |   $279.99  |   $279.99  | Delivered | 2024-01-09 |
| ORD-10005   | Eva Kowalski        | Laptop Cooling Pad             | Accessories    |   3 |    $29.99  |    $89.97  | Delivered | 2024-01-10 |
| ORD-10006   | Frank O'Sullivan    | USB-C Docking Station          | Accessories    |   1 |   $149.99  |   $149.99  | Processing| 2024-01-11 |
| ORD-10007   | Grace Kim           | Wireless Charging Pad          | Accessories    |   2 |    $39.99  |    $79.98  | Delivered | 2024-01-12 |
| ORD-10008   | Henry Dubois        | Blue Light Glasses             | Health         |   1 |    $24.99  |    $24.99  | Delivered | 2024-01-13 |
| ORD-10009   | Isabel Nakamura     | Desk Organizer (Bamboo)        | Office         |   1 |    $44.99  |    $44.99  | Shipped   | 2024-01-14 |
| ORD-10010   | James Okafor        | Mechanical Keyboard TKL        | Electronics    |   1 |   $129.99  |   $129.99  | Delivered | 2024-01-15 |
| ORD-10011   | Karen Petrov        | Desk Plant (Pothos, small)     | Office Decor   |   2 |    $14.99  |    $29.98  | Delivered | 2024-01-16 |
| ORD-10012   | Leo Andersen        | Cable Management Kit           | Accessories    |   1 |    $19.99  |    $19.99  | Delivered | 2024-01-17 |
| ORD-10013   | Mia Ferreira        | Monitor Arm (Single)           | Accessories    |   2 |    $79.99  |   $159.98  | Processing| 2024-01-18 |
| ORD-10014   | Nathan Yılmaz       | Whiteboard (36"x24")           | Office         |   1 |    $89.99  |    $89.99  | Shipped   | 2024-01-19 |
| ORD-10015   | Olivia Svensson     | Ergonomic Wrist Rest           | Accessories    |   3 |    $22.99  |    $68.97  | Delivered | 2024-01-20 |
| ORD-10016   | Paul Mensah         | Mesh Back Chair (task)         | Furniture      |   4 |   $249.99  |   $999.96  | Delivered | 2024-01-21 |
| ORD-10017   | Quinn Walsh         | Footrest Adjustable            | Ergonomics     |   1 |    $49.99  |    $49.99  | Delivered | 2024-01-22 |
| ORD-10018   | Rosa Tanaka         | Laptop Bag (15" Slim)          | Accessories    |   1 |    $59.99  |    $59.99  | Delivered | 2024-01-23 |
| ORD-10019   | Sam Obi             | Screen Cleaning Kit            | Accessories    |   2 |     $9.99  |    $19.98  | Delivered | 2024-01-24 |
| ORD-10020   | Tina Baumann        | Smart LED Desk Lamp            | Electronics    |   1 |    $69.99  |    $69.99  | Processing| 2024-01-25 |

---

### 41d. Table Immediately Before and After Page Content

> **PDF page break test:** In PDF export, content that straddles a page boundary can split a table awkwardly mid-row, leaving an orphaned header or a cut row. Add enough text above and below to push this table near a page break and see what happens.

The following paragraph exists to push the table below closer toward the end of a PDF page. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.

| Meeting Agenda       | Owner         | Duration | Status      |
|:---------------------|:--------------|:--------:|:------------|
| Q4 Metrics Review    | Sarah Johnson | 15 min   | ✅ Done     |
| Product Roadmap Q1   | Raj Patel     | 30 min   | 🔄 Ongoing  |
| Engineering Updates  | David Kim     | 20 min   | ⏳ Pending  |
| Budget Approval 2025 | CFO Office    | 25 min   | ❌ Blocked  |
| AOB / Open Floor     | All           | 10 min   | ⏳ Pending  |

The paragraph after the table continues here. In PDF, this text should appear immediately below the table on whichever page the table ended on. If there is a large blank gap between the table and this text in the PDF, the renderer inserted an unnecessary page break.

---

### 41e. Portrait vs Landscape Hint (6 vs 10 columns)

> **Tip for PDF users:** A 6-column table usually fits in portrait (A4 = 210mm wide). A 10+ column table almost always needs landscape. Some markdown-to-PDF tools let you set `@page { size: A4 landscape; }` in custom CSS. This sub-test shows both scenarios side by side.

**Portrait-friendly (6 columns, should fit A4):**

| Month    | Revenue     | Expenses    | Profit      | Growth  | Target Met |
|:---------|:------------|:------------|:------------|:-------:|:----------:|
| January  | $148,200    | $112,400    |  $35,800    | +8.2%   | ✅          |
| February | $162,500    | $118,700    |  $43,800    | +9.7%   | ✅          |
| March    | $155,900    | $125,300    |  $30,600    | -4.3%   | ❌          |
| April    | $174,100    | $121,800    |  $52,300    | +11.7%  | ✅          |
| May      | $181,600    | $129,200    |  $52,400    | +4.2%   | ✅          |
| June     | $168,300    | $131,500    |  $36,800    | -7.3%   | ❌          |

**Landscape-recommended (10 columns — will likely overflow A4 portrait):**

| Month    | Revenue     | Expenses    | Profit      | Growth  | Target | Customers | Avg Order | Refunds | Net Score |
|:---------|:------------|:------------|:------------|:-------:|:------:|----------:|----------:|--------:|----------:|
| January  | $148,200    | $112,400    |  $35,800    | +8.2%   | ✅     | 1,204     | $123.10   |  $2,100 | 87        |
| February | $162,500    | $118,700    |  $43,800    | +9.7%   | ✅     | 1,389     | $117.00   |  $1,850 | 91        |
| March    | $155,900    | $125,300    |  $30,600    | -4.3%   | ❌     | 1,243     | $125.42   |  $3,200 | 79        |

---

> **End of Table Stress Test Suite (41 tests).**
> If all tests above rendered correctly in both preview AND PDF, your markdown viewer has exceptional table support. Most editors will fail on 5 to 10 of the standard tests, and most PDF exports will fail on at least 2 to 3 of the PDF-specific tests (41a through 41e).
