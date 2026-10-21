import { createApp } from './app.js';
import { prisma } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`[aurevia] API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
