const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
  });
  response.end(body);
}

function createRequestHandler(rootDirectory) {
  const resolvedRoot = path.resolve(rootDirectory);

  return (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch (error) {
      send(response, 400, 'Bad request');
      return;
    }

    const parts = pathname.split('/').filter(Boolean);
    if (parts.includes('..')) {
      send(response, 403, 'Forbidden');
      return;
    }

    const relativePath = parts.length ? parts.join(path.sep) : 'index.html';
    const filePath = path.resolve(resolvedRoot, relativePath);
    const relativeToRoot = path.relative(resolvedRoot, filePath);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      send(response, 403, 'Forbidden');
      return;
    }

    fs.readFile(filePath, (error, body) => {
      if (error) {
        send(response, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Server error');
        return;
      }

      const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      send(response, 200, body, contentType);
    });
  };
}

function startStaticServer(options = {}) {
  const rootDirectory = options.rootDirectory || path.resolve(__dirname, '..', '..');
  const host = options.host || '127.0.0.1';
  const port = Number.isInteger(options.port) ? options.port : 0;
  const server = http.createServer(createRequestHandler(rootDirectory));

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      const address = server.address();
      resolve({
        close: () => new Promise((closeResolve, closeReject) => {
          server.close((error) => error ? closeReject(error) : closeResolve());
        }),
        server,
        url: `http://${host}:${address.port}`,
      });
    });
  });
}

module.exports = {
  createRequestHandler,
  startStaticServer,
};
