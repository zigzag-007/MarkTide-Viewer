const path = require('node:path');
const { startStaticServer } = require('./static-server');

function readPort(argumentsList) {
  const index = argumentsList.indexOf('--port');
  return index >= 0 ? Number(argumentsList[index + 1]) : 4173;
}

async function main() {
  const instance = await startStaticServer({
    port: readPort(process.argv.slice(2)),
    rootDirectory: path.resolve(__dirname, '..', '..'),
  });

  console.log(`MarkTide test server listening at ${instance.url}`);

  const close = async () => {
    await instance.close();
    process.exit(0);
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
