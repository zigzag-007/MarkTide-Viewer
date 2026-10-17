const fs = require('node:fs');
const path = require('node:path');

const fixturesDirectory = process.env.MARKTIDE_FIXTURE_DIR
  ? path.resolve(process.env.MARKTIDE_FIXTURE_DIR)
  : path.resolve(__dirname, '..', 'fixtures');

function loadFixture(filename) {
  return fs.readFileSync(path.join(fixturesDirectory, filename), 'utf8');
}

function listFixtures() {
  return fs.readdirSync(fixturesDirectory)
    .filter((name) => name.endsWith('.md'))
    .sort();
}

module.exports = {
  fixturesDirectory,
  listFixtures,
  loadFixture,
};
