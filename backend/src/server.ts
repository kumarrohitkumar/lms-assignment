import mongoose from 'mongoose';
import { createApp } from './app';
import { env } from './config/env';
import { SEED_PASSWORD, seedIfEmpty } from './scripts/seedUsers';
import { createStorage } from './storage';

async function main() {
  const config = env();
  await mongoose.connect(config.MONGO_URI);
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));

  const seedOnStart = config.SEED_ON_START ? config.SEED_ON_START === 'true' : config.NODE_ENV !== 'production';
  if (seedOnStart && (await seedIfEmpty())) {
    console.log(`Empty database: created the demo accounts (password ${SEED_PASSWORD}).`);
  }

  const app = createApp({
    storage: createStorage(config),
    corsOrigins: config.CORS_ORIGINS,
    trustProxyHops: config.TRUST_PROXY_HOPS,
  });
  const server = app.listen(config.PORT, () => {
    console.log(`LMS API listening on http://localhost:${config.PORT} (storage: ${config.STORAGE_DRIVER})`);
  });

  const shutdown = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
