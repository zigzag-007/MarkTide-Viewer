const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveBrowserExecutable } = require('../helpers/browser-executable');

function resolve(options, available) {
  return resolveBrowserExecutable({
    override: '', environment: {}, platform: 'linux',
    isExecutable: filename => available.includes(filename), ...options,
  });
}

test('explicit browser selection wins over bundled and installed browsers', () => {
  assert.equal(resolve({ override: '/custom/browser', bundledExecutable: '/bundled/chrome' },
    ['/custom/browser', '/bundled/chrome', '/usr/bin/chromium']), '/custom/browser');
  assert.throws(() => resolve({ override: '/missing/browser' }, ['/usr/bin/chromium']),
    /MARKTIDE_BROWSER_EXECUTABLE is not executable/);
});

test('bundled Chromium remains preferred when available', () => {
  assert.equal(resolve({ bundledExecutable: '/bundled/chrome' },
    ['/bundled/chrome', '/opt/brave.com/brave/brave']), '/bundled/chrome');
});

test('missing managed browser falls back to installed Linux browsers', () => {
  assert.equal(resolve({ bundledExecutable: '/missing/chrome' },
    ['/opt/brave.com/brave/brave']), '/opt/brave.com/brave/brave');
  assert.equal(resolve({}, ['/usr/bin/chromium', '/opt/brave.com/brave/brave']),
    '/usr/bin/chromium');
});

test('macOS and Windows browser discovery use their own paths', () => {
  const macBrowser = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  assert.equal(resolve({ platform: 'darwin' }, [macBrowser]), macBrowser);
  const windowsBrowser = 'C:\\Apps\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.equal(resolve({ platform: 'win32', environment: { PROGRAMFILES: 'C:\\Apps' } },
    [windowsBrowser]), windowsBrowser);
});

test('missing browsers fail early with repair guidance and no installation', () => {
  assert.throws(() => resolve({}, []), /No usable Chromium browser found.*No installation was attempted/);
});
