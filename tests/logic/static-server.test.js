const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { startStaticServer } = require('../server/static-server');

test('static server exposes the real app from an automatic port', async (context) => {
  const rootDirectory = path.resolve(__dirname, '..', '..');
  const server = await startStaticServer({ rootDirectory });
  context.after(() => server.close());

  const response = await fetch(`${server.url}/index.html`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(html, /<title>MarkTide/);
});

test('static server serves local modules with a browser safe content type', async (context) => {
  const rootDirectory = path.resolve(__dirname, '..', '..');
  const server = await startStaticServer({ rootDirectory });
  context.after(() => server.close());

  const response = await fetch(`${server.url}/assets/vendor/prettier/standalone.mjs`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/javascript/);
});

test('static server serves the Monaco icon font with a font content type', async (context) => {
  const rootDirectory = path.resolve(__dirname, '..', '..');
  const server = await startStaticServer({ rootDirectory });
  context.after(() => server.close());

  const response = await fetch(`${server.url}/assets/vendor/monaco/vs/base/browser/ui/codicons/codicon/codicon.ttf`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^font\/ttf/);
});

test('static server rejects paths outside the app root', async (context) => {
  const rootDirectory = path.resolve(__dirname, '..', '..');
  const server = await startStaticServer({ rootDirectory });
  context.after(() => server.close());

  const response = await fetch(`${server.url}/..%2F..%2Fpackage.json`);

  assert.equal(response.status, 403);
});
