const { spawnSync } = require('node:child_process');
const path = require('node:path');

const argumentsList = process.argv.slice(2);
const enableCdnHealth = argumentsList[0] === '--cdn';
const playwrightArguments = enableCdnHealth ? argumentsList.slice(1) : argumentsList;
const environment = { ...process.env };
const playwrightDirectory = path.dirname(require.resolve('playwright/package.json'));
const playwrightCli = path.join(playwrightDirectory, 'cli.js');

if (enableCdnHealth) {
  environment.MARKTIDE_CDN_HEALTH = '1';
}

const result = spawnSync(
  process.execPath,
  [playwrightCli, 'test', ...playwrightArguments],
  {
    cwd: __dirname,
    encoding: 'utf8',
    env: environment,
    stdio: 'inherit',
  }
);

if (result.error) {
  console.error(result.error);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
