import './broker/bullmq/workers/index.ts';

import { server } from './app.ts';

server.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  // biome-ignore lint/suspicious/noConsole: Oppss
  console.log('HTTP server running!');
});
