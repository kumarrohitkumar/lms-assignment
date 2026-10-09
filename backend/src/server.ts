import mongoose from 'mongoose';
import { createApp } from './app';
import { env } from './config/env';
import { createStorage } from './storage';

async function main() {
  const config = env();
  await mongoose.connect(config.MONGO_URI);
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));

  const app = createApp({ storage: createStorage(config), corsOrigins: config.CORS_ORIGINS });
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
