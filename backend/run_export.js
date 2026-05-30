const VoipService = require('./VoipService');

async function run() {
  console.log('Exporting updated Asterisk configs...');
  const res = await VoipService.exportAsteriskPjsipConfig();
  console.log('SUCCESS!', res);
}

run().catch(console.error);
