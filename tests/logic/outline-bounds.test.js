const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');

const source = fs.readFileSync(path.resolve(__dirname, '../../assets/js/document-outline.js'), 'utf8');
const tree = acorn.parse(source, { ecmaVersion: 'latest' });

function find(node, name) {
  if (node?.type === 'FunctionDeclaration' && node.id.name === name) return node;
  if (!node || typeof node !== 'object') return null;
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      const match = find(child, name);
      if (match) return match;
    }
  }
  return null;
}

// Run the real measurement function with moving page bounds.
function harness(width = 1280, editorOnly = false) {
  const values = {};
  const bounds = { top: 180, bottom: 920, left: 600 };
  const region = { getBoundingClientRect: () => bounds };
  const root = { getBoundingClientRect: () => ({ top: 180, left: 640 }) };
  const scroller = {};
  const context = vm.createContext({
    win: { innerHeight: 900, innerWidth: width, devicePixelRatio: 1,
      getComputedStyle: () => ({ paddingLeft: '60px' }) },
    doc: { querySelector: () => null },
    navigation: { style: { setProperty: (name, value) => { values[name] = value; } } },
    root, pane: region, expanded: false, mobile: { matches: width < 768 },
    items: [], active: -1, track: { style: {} }, observedScroller: scroller,
  });
  const node = find(tree, 'measure');
  const measure = vm.runInContext(`(${source.slice(node.start, node.end)})`, context);
  const reading = { region, scroller, innerScroll: true, editorOnly, split: true };
  return { values, bounds, measure: () => measure(reading),
    pin: () => { context.expanded = true; } };
}

for (const width of [810, 1280, 1920]) {
  for (const editorOnly of [false, true]) {
    test(`TOC bottom follows the visible work area and restores at ${width}px, editor only ${editorOnly}`, () => {
      const app = harness(width, editorOnly);
      app.measure();
      assert.equal(app.values['--outline-panel-bottom'], '0px');
      app.bounds.top = 120;
      app.bounds.bottom = 840;
      app.measure();
      assert.equal(app.values['--outline-panel-bottom'], '60px');
      app.pin();
      app.measure();
      assert.equal(app.values['--outline-panel-bottom'], '60px');
      app.bounds.top = 180;
      app.bounds.bottom = 920;
      app.measure();
      assert.equal(app.values['--outline-panel-bottom'], '0px');
    });
  }
}
