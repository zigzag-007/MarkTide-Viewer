---
title: "10 – Front Matter & Metadata"
author: "Markdown Tester"
date: "2024-01-15"
version: 3
draft: false
tags:
  - markdown
  - front-matter
  - metadata
  - testing
categories:
  - documentation
  - testing
description: "A comprehensive test of YAML, TOML, and JSON front matter rendering and parsing."
canonical_url: "https://example.com/posts/front-matter-test"
image: "https://via.placeholder.com/1200x630/6366f1/ffffff?text=Front+Matter+Test"
layout: post
toc: true
math: true
mermaid: true
aliases:
  - /old/path/to/post
  - /another/alias
custom_field: "Custom fields can store any string value"
nested:
  key1: value1
  key2: value2
  array:
    - item1
    - item2
    - item3
number_field: 42
float_field: 3.14159
boolean_true: true
boolean_false: false
null_field: null
date_field: 2024-01-15T10:30:00Z
multiline: |
  This is a multiline
  string value in YAML.
  Each line is preserved.
folded: >
  This is a folded
  multiline string. Lines
  are joined with spaces.
---

# 10  Front Matter & Metadata

> **Test Purpose:** Verify that front matter (YAML block above) is parsed as metadata, NOT rendered as content.  
> **What to look for:** The YAML block between `---` delimiters should NOT appear in the rendered output. Only the heading below the front matter should be the first visible element.

---

## What Was in the Front Matter?

The YAML front matter at the top of this file contained:

| Key            | Value                                          |
|----------------|------------------------------------------------|
| `title`        | "10  Front Matter & Metadata"                 |
| `author`       | "Markdown Tester"                              |
| `date`         | 2024-01-15                                     |
| `version`      | 3 (integer)                                    |
| `draft`        | false (boolean)                                |
| `tags`         | Array of 4 strings                             |
| `description`  | Long string                                    |
| `nested`       | Nested object with keys and array              |
| `null_field`   | null                                           |
| `date_field`   | ISO 8601 datetime                              |
| `multiline`    | Literal block scalar (preserves newlines)      |
| `folded`       | Folded block scalar (joins lines)              |

---

## How Different Editors Handle Front Matter

| Editor / Tool     | Front Matter Support |
|-------------------|---------------------|
| VS Code (built in)| Hides it (treated as YAML) |
| Obsidian          | Shows in Properties panel (v1.4+), hides from preview |
| Typora            | Shows styled metadata area at top |
| HackMD            | Parses for document config (title, tags) |
| GitHub            | Jekyll style: hidden, used for site generation |
| GitLab            | Parsed for project metadata |
| Pandoc            | Full YAML metadata support with template variables |
| Hugo              | YAML, TOML (+++ delimiters), JSON ({} delimiters) |
| Jekyll            | YAML only, must have at least two `---` delimiters |
| VitePress         | YAML parsed for page config |
| Docusaurus        | YAML parsed for doc metadata |

---

## TOML Front Matter (Hugo style)

Some static site generators (especially Hugo) use TOML front matter with `+++` delimiters instead of `---`.

**TOML example (do NOT put at top of file  shown here as code):**

```toml
+++
title = "My Post"
date = 2024-01-15T10:30:00Z
draft = false
tags = ["markdown", "hugo", "toml"]
[author]
name = "John Doe"
email = "john@example.com"
+++
```

---

## JSON Front Matter

Some tools (Hexo, etc.) support JSON front matter:

```json
{
  "title": "My Post",
  "date": "2024-01-15",
  "tags": ["markdown", "json"],
  "draft": false
}
```

---

## Front Matter Variables in Templates (Pandoc)

When using Pandoc with templates, front matter variables become accessible:

- `$title$` → rendered in document title
- `$author$` → author byline  
- `$date$` → publication date
- `$abstract$` → document abstract
- `$toc$` → enables table of contents

Example Pandoc command:

```bash
pandoc input.md -o output.pdf \
  --template=my-template.tex \
  --variable=fontsize:12pt \
  --variable=geometry:margin=1in \
  --toc \
  --number-sections
```

---

## Obsidian Properties (v1.4+)

Obsidian 1.4 introduced a visual Properties panel. Front matter becomes:
- Editable via GUI dropdown
- Type aware (text, number, date, checkbox, list, tags, aliases)
- Displayed in a structured panel (not raw YAML)

Supported property types:
- `text`  plain string
- `list`  array of strings
- `number`  integer or float
- `checkbox`  boolean
- `date`  ISO date picker
- `datetime`  ISO datetime picker

---

## Edge Cases

**Partial front matter (only opening delimiter):**

```
---
title: Broken
This line is not YAML
But this file has no closing ---
```

**Front matter not at file start (should NOT be treated as front matter):**

Some text before front matter.

---
title: Not real front matter
---

This `---` block above is in the middle of the file so most renderers will treat it as a horizontal rule, not front matter.

**Empty front matter:**

```
---
---
```

**Front matter with special YAML values:**

```yaml
---
infinity: .inf
negative_infinity: -.inf
not_a_number: .nan
octal: 0o17
hexadecimal: 0xFF
scientific: 1.23e4
---
```
