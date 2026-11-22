const fs = require('node:fs');
const path = require('node:path');

function canExecute(filename) {
  try {
    fs.accessSync(filename, fs.constants.X_OK);
    return fs.statSync(filename).isFile();
  } catch {
    return false;
  }
}

function resolveBrowserExecutable({
  override = process.env.MARKTIDE_BROWSER_EXECUTABLE,
  bundledExecutable,
  platform = process.platform,
  environment = process.env,
  isExecutable = canExecute,
} = {}) {
  if (override) {
    if (isExecutable(override)) return override;
    throw new Error(`MARKTIDE_BROWSER_EXECUTABLE is not executable: ${override}`);
  }

  if (bundledExecutable && isExecutable(bundledExecutable)) return bundledExecutable;

  const candidates = platform === 'win32'
    ? [environment.PROGRAMFILES, environment['PROGRAMFILES(X86)'], environment.LOCALAPPDATA]
      .filter(Boolean).flatMap(directory => [
        path.win32.join(directory, 'Google/Chrome/Application/chrome.exe'),
        path.win32.join(directory, 'Microsoft/Edge/Application/msedge.exe'),
        path.win32.join(directory, 'BraveSoftware/Brave-Browser/Application/brave.exe'),
      ])
    : platform === 'darwin'
      ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      ]
      : [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/opt/brave.com/brave/brave',
        '/usr/bin/brave-browser',
      ];

  const installed = candidates.find(isExecutable);
  if (installed) return installed;
  throw new Error('No usable Chromium browser found. Set MARKTIDE_BROWSER_EXECUTABLE to an installed browser, or install the pinned Playwright browser separately. No installation was attempted.');
}

module.exports = { resolveBrowserExecutable };
