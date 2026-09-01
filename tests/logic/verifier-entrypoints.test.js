const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const testsRoot = path.resolve(__dirname, '..');

function runVerifier(filename) {
  return spawnSync(process.execPath, [path.join(__dirname, filename)], {
    cwd: testsRoot,
    encoding: 'utf8',
  });
}

[
  ['style centralization verifier', 'style-centralization.verify.js'],
  ['Markdown runtime verifier', 'markdown-runtime.verify.js'],
].forEach(([name, filename]) => {
  test(`${name} runs from the self contained test workspace`, () => {
    const result = runVerifier(filename);

    assert.equal(
      result.status,
      0,
      `${result.stdout}\n${result.stderr}`.trim()
    );
    assert.match(result.stdout, /PASS/);
  });
});
