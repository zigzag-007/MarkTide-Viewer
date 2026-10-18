const { test } = require('node:test');
const assert = require('node:assert/strict');
const editing = require('../../assets/js/markdown-editing');
const marked = require('../../assets/vendor/marked/marked.min');
editing.install(marked);
const selection = (anchor, head = anchor) => ({ anchor, head });

test('inline transforms retain reverse selections and toggle enclosing nested formatting', () => {
  const plan = editing.inline('one word', [selection(8, 4)], 'bold', marked);
  assert.equal(editing.apply('one word', plan), 'one **word**');
  assert.deepEqual(plan.selections, [selection(10, 6)]);
  const unwrapped = editing.inline('**one *word***', [selection(8, 12)], 'bold', marked);
  assert.equal(editing.apply('**one *word***', unwrapped), 'one *word*');
});

test('inline code chooses a safe fence and keeps edge spaces', () => {
  assert.deepEqual(editing.codePair('a``b'), ['```', '```']);
  assert.deepEqual(editing.codePair('`text`'), ['`` ', ' ``']);
  const source = ' a`b ';
  const plan = editing.inline(source, [selection(0, source.length)], 'code', marked);
  const token = marked.Lexer.lexInline(editing.apply(source, plan))[0];
  assert.equal(token.text, source);
});

test('multiple selections use one edit plan and preserve literal punctuation', () => {
  const source = '猫 and café';
  const plan = editing.inline(source, [selection(0, 1), selection(6, 10)], 'bold', marked);
  assert.equal(editing.apply(source, plan), '**猫** and **café**');
  assert.deepEqual(plan.selections, [selection(2, 3), selection(12, 16)]);
  assert.equal(editing.apply('literal *', editing.inline('literal *', [selection(9)], 'bold', marked)), 'literal *****');
});

test('line commands deduplicate overlapping blocks and exclude an end at column one', () => {
  const source = 'one\ntwo\nthree';
  const plan = editing.lines(source, [selection(0, 8), selection(4, 6)], 'bullet', marked);
  assert.equal(editing.apply(source, plan), '- one\n- two\nthree');
  assert.equal(plan.edits.length, 2);
});

test('heading levels replace ATX and Setext without touching fenced code', () => {
  const source = '# Title\n\nSubtitle\n========\n\n```\n# literal\n```';
  const plan = editing.lines(source, [selection(0, source.length)], 'heading', marked, 2);
  const result = editing.apply(source, plan);
  assert.ok(result.startsWith('## Title'));
  assert.ok(result.includes('## Subtitle'));
  assert.ok(!result.includes('========'));
  assert.ok(result.endsWith('```\n# literal\n```'));
});

test('list conversion retains container indentation and task text', () => {
  const source = '>   - [x] keep\n>   - [ ] next';
  const plan = editing.lines(source, [selection(0, source.length)], 'numbered', marked);
  assert.equal(editing.apply(source, plan), '>   1. keep\n>   2. next');
});

test('unsupported inline and paragraph indentation targets abort without partial edits', () => {
  assert.throws(() => editing.inline('```\n**literal**\n```', [selection(4, 15)], 'bold', marked));
  assert.throws(() => editing.lines('- first\nprose', [selection(0, 13)], 'indent', marked));
});

test('alignment keeps Markdown structured and switches an existing wrapper', () => {
  const source = '# **Title**\n\nBody';
  const centered = editing.apply(source, editing.alignment(source, [selection(2, 5)], 'center', marked));
  assert.ok(marked.parse(centered).includes('<h1><strong>Title</strong></h1>'));
  assert.ok(marked.parse(centered).includes('text-align: center'));
  const right = editing.apply(centered, editing.alignment(centered, [selection(27)], 'right', marked));
  assert.equal((right.match(/:::marktide-align/g) || []).length, 1);
  const left = editing.apply(right, editing.alignment(right, [selection(26)], 'left', marked));
  assert.equal(left, source);
});

test('alignment scanner ignores a closing marker inside fenced code', () => {
  const source = ':::marktide-align right\n```\n:::\n```\n\ntext\n:::\n';
  assert.equal(editing.alignmentToken(source).text, '```\n:::\n```\n\ntext\n');
  assert.equal((marked.parse(source).match(/marktide-aligned-block/g) || []).length, 1);
});

test('alignment toggles a uniform selection and applies to mixed blocks', () => {
  for (const value of ['center', 'right', 'justify']) {
    const source = 'First\n\nSecond';
    const aligned = editing.alignment(source, [selection(0, source.length)], value, marked);
    const result = editing.apply(source, aligned);
    const reset = editing.alignment(result, aligned.selections, value, marked);
    assert.equal(editing.apply(result, reset), source);
    assert.deepEqual(reset.selections, [selection(0, source.length)]);
    const mixed = `:::marktide-align ${value}\nFirst\n:::\n\nSecond`;
    const applied = editing.apply(mixed, editing.alignment(mixed, [selection(0, mixed.length)], value, marked));
    assert.equal(editing.blocks(applied, marked).filter(block => block.token.type !== 'space')
      .every(block => block.token.alignment === value), true);
  }
  const left = editing.alignment('First', [selection(0, 5)], 'left', marked);
  assert.deepEqual(left.edits, []);
});

test('highlight parses nested formatting and leaves escaped markers and code literal', () => {
  assert.ok(marked.parse('==a **bold** & b==').includes('<mark>a <strong>bold</strong> &amp; b</mark>'));
  assert.equal(marked.parseInline('`==literal==`'), '<code>==literal==</code>');
  assert.equal(marked.parseInline('\\==literal=='), '==literal==');
});

test('clear formatting uses tokens and preserves code, math, footnotes and literal punctuation', () => {
  const source = '# **Heading**\n\nA [**label**](https://example.com/a_b) and `*literal*`.\n\n'
    + '\\*literal\\*\n\n$$\nx_y\n$$\n\n[^a]: **note**\n\n```mermaid\ngraph LR; a-->b\n```';
  const result = editing.apply(source, editing.clear(source, [selection(0, source.length)], marked));
  assert.ok(result.startsWith('Heading'));
  assert.ok(result.includes('A label and \\*literal\\*.'));
  assert.ok(result.includes('\\*literal\\*'));
  assert.ok(result.includes('$$\nx_y\n$$'));
  assert.ok(result.includes('[^a]: **note**'));
  assert.ok(result.endsWith('```mermaid\ngraph LR; a-->b\n```'));
});

test('hard breaks continue the container and page breaks reject duplicates and code', () => {
  const source = '> - first';
  assert.equal(editing.apply(source, editing.lineBreak(source, [selection(source.length)], marked)), '> - first  \n>   ');
  assert.throws(() => editing.pageBreak('<!-- marktide-page-break -->\n', [selection(28)], marked));
  assert.throws(() => editing.pageBreak('```\ncode\n```', [selection(5)], marked));
});

test('nested code stays literal during clear and line formatting', () => {
  for (const source of ['> prose **bold**\n>\n> \x60\x60\x60\n> **literal**\n> \x60\x60\x60',
    '- prose\n\n  \x60\x60\x60\n  **literal**\n  \x60\x60\x60',
    ':::marktide-align center\n\x60\x60\x60\n**literal**\n\x60\x60\x60\n:::']) {
    const ranges = editing.codeRanges(source, marked);
    assert.ok(ranges.length);
    const all = [selection(0, source.length)];
    const cleared = editing.apply(source, editing.clear(source, all, marked));
    assert.ok(cleared.includes('**literal**'));
    const listed = editing.apply(source, editing.lines(source, all, 'bullet', marked));
    assert.ok(listed.includes('**literal**'));
    for (const range of ranges) {
      const literal = source.slice(range.from, range.to);
      assert.ok(listed.includes(literal));
      assert.throws(() => editing.inline(source, [selection(range.from + 1)], 'bold', marked));
    }
  }
});

test('clear leaves inline math multiplication and surrounding math markup intact', () => {
  for (const math of ['$x*y*z$', '\\(x*y*z\\)', '\\[x*y*z\\]']) {
    const source = 'Before **bold** ' + math + ' and *after*.';
    const result = editing.apply(source, editing.clear(source, [selection(0, source.length)], marked));
    assert.equal(result, 'Before bold ' + math + ' and after.');
  }
});

test('page break resolves a complete block rather than splitting heading or link syntax', () => {
  for (const source of ['## Header\n\nFollowing', '[label](https://example.com)\n\nFollowing']) {
    const plan = editing.pageBreak(source, [selection(4)], marked);
    const result = editing.apply(source, plan);
    assert.ok(result.startsWith(source.split('\n\n')[0] + '\n\n<!-- marktide-page-break -->'));
    assert.ok(marked.parse(result).includes('Page break'));
  }
});

test('pure link plans replace existing links and preserve reverse label selection', () => {
  const source = '[old](https://old.test)';
  const selections = [selection(4, 1)];
  const target = editing.linkTarget(source, selections, marked);
  assert.equal(target.url, 'https://old.test');
  const plan = editing.link(source, selections, target, 'new [label]', '/next');
  const result = editing.apply(source, plan);
  assert.equal(result, '[new \\[label\\]](</next>)');
  assert.equal(plan.selections[0].anchor > plan.selections[0].head, true);
  assert.equal((marked.parse(result).match(/<a /g) || []).length, 1);
});

test('pure code block plans share safe fence logic and preserve existing content', () => {
  const source = '\x60\x60\x60js\nconst text = "\x60\x60\x60";\n\x60\x60\x60';
  const selections = [selection(8)];
  const target = editing.codeBlockTarget(source, selections, marked);
  assert.equal(target.language, 'js');
  const plan = editing.codeBlock(source, selections, target, 'javascript');
  const result = editing.apply(source, plan);
  assert.ok(result.startsWith('\x60\x60\x60\x60javascript\n'));
  assert.equal(marked.lexer(result)[0].text, target.text);
  assert.throws(() => editing.codeBlock(source, selections, target, 'bad language'));
});

test('pure table plans escape cell syntax and enforce limits', () => {
  const source = 'a|b\n*c*';
  const plan = editing.table(source, [selection(0, source.length)], 2, 2);
  const result = editing.apply(source, plan);
  assert.ok(result.includes('a\\|b<br>\\*c\\*'));
  assert.equal(marked.lexer(result)[0].rows.length, 2);
  assert.throws(() => editing.table(source, [selection(0)], 20, 12));
  assert.throws(() => editing.table(source, [selection(0)], 0, 2));
});

test('table picker dimensions include the header without dropping selected text', () => {
  const source = 'chosen';
  const one = editing.apply(source, editing.table(source, [selection(0, source.length)], 1, 2, { includesHeader: true }));
  assert.equal(one, '| chosen | Column 2 |\n| --- | --- |\n\n');
  const three = editing.apply(source, editing.table(source, [selection(0, source.length)], 3, 2, { includesHeader: true }));
  assert.equal(three, '| Column 1 | Column 2 |\n| --- | --- |\n| chosen |  |\n|  |  |\n\n');
  assert.throws(() => editing.table(source, [selection(0)], 22, 2, { includesHeader: true }));
  assert.throws(() => editing.table(source, [selection(0)], 21, 12, { includesHeader: true }));
});

test('Highlight preserves literal and escaped equals inside selected text', () => {
  for (const source of ['a==b', 'a\\==b']) {
    const plan = editing.inline(source, [selection(0, source.length)], 'highlight', marked);
    const html = marked.parse(editing.apply(source, plan));
    assert.ok(html.includes('<mark>a==b</mark>'));
    const cleared = editing.apply(editing.apply(source, plan),
      editing.inline(editing.apply(source, plan), plan.selections, 'highlight', marked));
    assert.equal(marked.parseInline(cleared), 'a==b');
  }
});

test('unfinished code fences protect the final cursor and use a literal newline', () => {
  const source = '\x60\x60\x60js\nconst value = 1;';
  const cursor = [selection(source.length)];
  assert.throws(() => editing.inline(source, cursor, 'bold', marked));
  assert.throws(() => editing.pageBreak(source, cursor, marked));
  assert.equal(editing.apply(source, editing.lineBreak(source, cursor, marked)), source + '\n');
});

test('multiline Setext styles convert once without overlapping edits', () => {
  const source = 'one\ntwo\n===';
  assert.equal(editing.apply(source, editing.lines(source, [selection(0, source.length)], 'heading', marked, 2)), '## one two');
  assert.equal(editing.apply(source, editing.lines(source, [selection(0, source.length)], 'heading', marked, 0)), 'one two');
  for (const cursor of [4, 5, 7]) {
    const plan = editing.lines(source, [selection(cursor)], 'heading', marked, 2);
    assert.equal(editing.apply(source, plan), '## one two');
    assert.deepEqual(plan.selections, [selection(3 + cursor)]);
  }
});

test('Italic inside Bold adds its own formatting without removing a Bold delimiter', () => {
  const source = '**alpha** beta';
  const plan = editing.inline(source, [selection(2, 7)], 'italic', marked);
  assert.equal(editing.apply(source, plan), '***alpha*** beta');
  assert.ok(marked.parse(editing.apply(source, plan)).includes('<em><strong>alpha</strong></em>'));
});

test('Clear keeps multiline math literal inside quote and list containers', () => {
  for (const source of ['> $$\n> x*y*z\n> $$', '- \\[\n  x*y*z\n  \\]']) {
    assert.equal(editing.apply(source, editing.clear(source, [selection(0, source.length)], marked)), source);
  }
});
