import { serve } from '@hono/node-server';

import server from './routes';

const port = process.env['PORT'] ? parseInt(process.env['PORT']) : 3000;

console.log(`[Hono] Starting server...`);

serve(
  {
    fetch: server.fetch,
    port,
  },
  (info) => {
    console.log(
      `[Hono] Server is running at ${info.address || 'localhost'}${info.port}`,
    );
  },
);
