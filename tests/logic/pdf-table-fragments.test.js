const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(specs) {
  const edges = [];
  const tables = specs.map(spec => ({
    weighted: Boolean(spec.weighted),
    rows: [{ cells: Array.from({ length: spec.columns || 4 }, () => ({
      css: Object.fromEntries(['Top', 'Right', 'Bottom', 'Left'].flatMap(side => [
        [`border${side}Width`, spec.border === 'none' ? '0px' : '1px'],
        [`border${side}Color`, spec.color || 'rgb(208, 215, 222)']
      ]))
    })) }],
    tBodies: [{ rows: (spec.heights || [120]).map(height => ({
      kept: null,
      getBoundingClientRect: () => ({ height }),
      classList: { toggle(name, keep) { this.row.kept = keep; } }
    })) }],
    css: { marginBottom: spec.margin || '16px' },
    parentElement: { classList: { contains: () => false } },
    before(edge) { edges.push(edge); }
  }));
  tables.forEach(table => table.tBodies[0].rows.forEach(row => { row.classList.row = row; }));
  const window = {};
  const document = {
    querySelectorAll(selector) {
      if (selector === 'table.marktide-print-content-table') return tables.filter(table => table.weighted);
      assert.equal(selector, '.markdown-body table');
      return tables;
    },
    createElement(tag) {
      assert.equal(tag, 'div', 'Do not add or replace table footers');
      const edge = { style: { setProperty(name, value) { this[name] = value; } },
        appendChild(table) { table.parentElement = this; } };
      edge.classList = { contains: name => edge.className === name };
      return edge;
    }
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../../assets/js/print-handler.js'), 'utf8');
  vm.runInNewContext(source, { window, document, getComputedStyle: element => element.css });
  return { handler: window.MarkTidePrintHandler, tables, edges };
}

test('PDF borders cover normal and crowded tables without a column or row height gate', () => {
  const { handler, edges } = harness([
    { columns: 2 }, { columns: 3 }, { columns: 4 },
    { columns: 7, weighted: true, heights: [400] }
  ]);
  handler.preparePrintTablePagination();
  assert.equal(edges.length, 4);
  assert.ok(edges.every(edge => edge.className === 'marktide-print-fragment-edge'));
});

test('PDF border decoration leaves the existing scoped row pagination intact', () => {
  const { handler, tables } = harness([
    { heights: [100, 500] }, { weighted: true, heights: [239, 240, 241, 1200] }
  ]);
  handler.preparePrintTablePagination();
  assert.deepEqual(tables[0].tBodies[0].rows.map(row => row.kept), [null, null]);
  assert.deepEqual(tables[1].tBodies[0].rows.map(row => row.kept), [true, true, false, false]);
});

test('PDF borderless tables do not gain a visible frame', () => {
  const { handler, edges } = harness([
    { border: 'none' }, { color: 'transparent' }, { color: 'rgba(0, 0, 0, 0)' }
  ]);
  handler.preparePrintTablePagination();
  assert.equal(edges.length, 0);
});

test('PDF frames preserve authored border color and margin without duplicate preparation', () => {
  const { handler, tables, edges } = harness([{ color: 'rgb(130, 30, 45)', margin: '23px' }]);
  const rows = tables[0].rows;
  handler.preparePrintTablePagination();
  handler.preparePrintTablePagination();
  assert.equal(edges.length, 1);
  assert.equal(edges[0].style.marginBottom, '23px');
  assert.equal(edges[0].style['--marktide-print-fragment-border'], 'rgb(130, 30, 45)');
  assert.equal(tables[0].rows, rows);
});

test('PDF cut space and border painting have separate owners', () => {
  const window = {};
  const source = fs.readFileSync(path.resolve(__dirname, '../../assets/js/print-styles.js'), 'utf8');
  vm.runInNewContext(source, { window });
  const css = window.MarkTidePrintStyles.getStyles();
  const wrapper = css.match(/\.markdown-body \.marktide-print-fragment-edge\s*\{([^}]+)\}/)[1];
  assert.match(wrapper, /padding-bottom:\s*7px/);
  assert.doesNotMatch(wrapper, /outline:|border:|box-shadow:/);
  assert.match(css, /\.marktide-print-fragment-edge > table\s*\{\s*margin-bottom:\s*-7px !important/);
  assert.match(css, /> table > tbody\s*\{[^}]*outline:\s*1px solid/);
  assert.doesNotMatch(css, /tfoot\.marktide-print-fragment-edge/);
});
