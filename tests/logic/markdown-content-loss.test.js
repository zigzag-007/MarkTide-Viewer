const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fixture = require('../helpers/markdown-content-loss.json');
const marked = require('../../assets/vendor/marked/marked.min');

const window = { marked };
const context = { window, marked, localStorage: { getItem: () => null } };
for (const file of ['utils.js', 'code-block-renderer.js', 'markdown-renderer.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../assets/js', file), 'utf8'), context);
}
window.MarkTideRenderer.setupMarked();

test('content loss fixture keeps the complete original bytes', () => {
  assert.equal(crypto.createHash('sha256').update(fixture.markdown).digest('hex'), fixture.sha256);
});

test('complete reproduction keeps its placeholder and all later Markdown structure', () => {
  for (const enhanced of [true, false]) {
    const renderer = window.MarkTideCodeBlockRenderer.createRenderer({ enhanced });
    const html = window.MarkTideRenderer.parseMarkdown(fixture.markdown, { renderer });
    assert.match(html, /Terminal Test Cases - Title &lt;Title&gt;<\/h1>/);
    assert.doesNotMatch(html, /<title\b/i);
    assert.equal((html.match(/<h[123]>/g) || []).length, 9);
    assert.equal((html.match(/<li>/g) || []).length, 7);
    assert.equal((html.match(/<pre\b/g) || []).length, 4);
    assert.match(html, /Error handling and unusual but realistic situations/);
    assert.match(html, /Exact terminal output/);
  }
});

test('bare placeholders stay text in headings, prose, lists and raw HTML blocks', () => {
  for (const placeholder of ['<Title>', '<title>', '<TiTlE >', '<Title/>', '<Name>', '<filename>',
    '<textarea>', '<xmp>', '<noembed>', '<noframes>', '<plaintext>']) {
    for (const source of [`# Label ${placeholder}\n\n## Later`, `Text ${placeholder} here.`,
      `- Value ${placeholder}\n- Later`, `${placeholder}\n\n## Later`,
      `> Value ${placeholder}\n\nLater`, `| Value |\n| --- |\n| ${placeholder} |`,
      `Label ${placeholder}\n===`,
      `<div>\n\nText ${placeholder} here.\n\n</div>`]) {
      const html = window.MarkTideRenderer.parseMarkdown(source);
      assert.ok(html.includes(placeholder.replace('<', '&lt;').replace('>', '&gt;')), html);
    }
  }
});

test('intentional HTML, code, autolinks and escaped placeholders keep their meaning', () => {
  const source = '# Mixed\n\n<div class="note"><strong>Raw HTML</strong><br><em>Emphasis</em></div>\n\n'
    + '<details><summary>More</summary><p>Details body</p></details>\n\n'
    + 'Use <span>inline HTML</span> and <https://example.com>.\n\n'
    + '`<Title>` and &lt;Title&gt; and \\<Title>\n\n```html\n<Title>\n```';
  const html = window.MarkTideRenderer.parseMarkdown(source);
  assert.match(html, /<div class="note"><strong>Raw HTML<\/strong><br><em>Emphasis<\/em><\/div>/);
  assert.match(html, /<details><summary>More<\/summary><p>Details body<\/p><\/details>/);
  assert.match(html, /<span>inline HTML<\/span>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /<code>&lt;Title&gt;<\/code>/);
  assert.doesNotMatch(html, /&amp;lt;Title/);
  assert.match(window.MarkTideRenderer.parseMarkdown('<title>Intentional title</title>'), /<title>Intentional title<\/title>/);
});

test('HTML comments, attributes, optional closing tags and SVG titles stay authored HTML', () => {
  const source = '<div title="<Title>"><!-- <Name> -->\n<p>Paragraph<br><hr>\n</div>\n\n'
    + '<svg viewBox="0 0 10 10"><title>Diagram</title><g><path d="M0 0L10 10" /></g></svg>';
  assert.equal(window.MarkTideRenderer.parseMarkdown(source), marked.parse(source));
  for (const name of ['title', 'textarea', 'xmp', 'noembed', 'noframes']) {
    const html = `<${name}><Name> is literal here</${name}>`;
    assert.equal(window.MarkTideRenderer.parseMarkdown(html), marked.parse(html));
  }
});
