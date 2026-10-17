const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturesDirectory = path.resolve(__dirname, '..', 'fixtures');
const expectedFixtures = [
  '01_basic_typography.md',
  '02-Tables-old.md',
  '02_tables.md',
  '03_mermaid_diagrams.md',
  '04_syntax_highlighting.md',
  '05_math_latex.md',
  '06_lists.md',
  '07_links_and_images.md',
  '08_blockquotes_callouts.md',
  '09_raw_html.md',
  '10_front_matter.md',
  '11_extended_extensions.md',
  '12_edge_cases.md',
  '13_flavor_compatibility.md',
  '14_security_xss_tests.md',
  '15_unicode_typography.md',
  'Mega Markdown Artifact_ Stress-Test Suite.md',
  'beautiful-markdown.md',
];

function readFixture(name) {
  return fs.readFileSync(path.join(fixturesDirectory, name), 'utf8');
}

function extractMermaidBlocks(source) {
  return [...source.matchAll(/^```mermaid\s*$([\s\S]*?)^```\s*$/gm)];
}

function countUnclosedFences(source) {
  let openFence = null;

  source.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!match) return;

    const marker = match[1];
    const trailing = match[2] || '';
    if (!openFence) {
      if (marker[0] === '`' && trailing.includes('`')) return;
      openFence = { character: marker[0], length: marker.length };
      return;
    }

    if (
      marker[0] === openFence.character
      && marker.length >= openFence.length
      && trailing.trim() === ''
    ) {
      openFence = null;
    }
  });

  return openFence ? 1 : 0;
}

test('tracked fixture folder contains the complete Markdown suite', () => {
  const actualFixtures = fs.existsSync(fixturesDirectory)
    ? fs.readdirSync(fixturesDirectory).filter((name) => name.endsWith('.md')).sort()
    : [];

  assert.deepEqual(actualFixtures, [...expectedFixtures].sort());
});

test('Mermaid fixture keeps the supported diagram coverage', () => {
  const source = readFixture('03_mermaid_diagrams.md');
  const blocks = extractMermaidBlocks(source);
  const diagramStarts = blocks.map((match) => match[1].trim().split(/\s+/)[0]);

  assert.equal(blocks.length, 25);
  [
    'flowchart',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram-v2',
    'erDiagram',
    'gantt',
    'pie',
    'gitGraph',
    'mindmap',
    'timeline',
    'requirementDiagram',
    'quadrantChart',
    'xychart-beta',
    'block-beta',
  ].forEach((diagramType) => {
    assert.ok(diagramStarts.includes(diagramType), `missing Mermaid type: ${diagramType}`);
  });
});

test('complete fixture corpus keeps its Mermaid engine distribution', () => {
  const counts = {};
  let total = 0;

  expectedFixtures.forEach((name) => {
    extractMermaidBlocks(readFixture(name)).forEach((block) => {
      const diagramType = block[1].trim().split(/\s+/)[0];
      counts[diagramType] = (counts[diagramType] || 0) + 1;
      total += 1;
    });
  });

  assert.equal(total, 36);
  assert.deepEqual(
    Object.fromEntries(Object.entries(counts).sort()),
    {
      'block-beta': 1,
      classDiagram: 3,
      erDiagram: 1,
      flowchart: 14,
      gantt: 2,
      gitGraph: 1,
      graph: 1,
      mindmap: 2,
      pie: 1,
      quadrantChart: 1,
      requirementDiagram: 1,
      sequenceDiagram: 4,
      'stateDiagram-v2': 2,
      timeline: 1,
      'xychart-beta': 1,
    }
  );
});

test('known fixture probes remain intentional and stable', () => {
  const edgeCases = readFixture('12_edge_cases.md');
  const flavorCompatibility = readFixture('13_flavor_compatibility.md');
  const mega = readFixture('Mega Markdown Artifact_ Stress-Test Suite.md');

  assert.equal(countUnclosedFences(edgeCases), 0);
  assert.match(flavorCompatibility, /\[\^pandoc test\]/);
  assert.match(flavorCompatibility, /\[\^pandoc-test\]:/);
  assert.equal(extractMermaidBlocks(mega).length, 4);
  assert.match(mega, /^```\s*\r?\ngantt$/m);
  assert.match(mega, /^```\s*\r?\nerDiagram$/m);
});
