import type { IncomingMessage, ServerResponse } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { createStorage } from '../src/storage';

/**
 * Vercel serverless entry point. The Express app and the Mongo connection are created once per
 * function instance and reused across invocations; src/server.ts is the long-running equivalent.
 */
const config = env();
const app = createApp({
  storage: createStorage(config),
  corsOrigins: config.CORS_ORIGINS,
  trustProxyHops: config.TRUST_PROXY_HOPS,
});

let connection: Promise<typeof mongoose> | undefined;

function connect() {
  connection ??= mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10_000 }).catch((err) => {
    connection = undefined; // let the next request retry
    throw err;
  });
  return connection;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await connect();
  } catch (err) {
    console.error('MongoDB connection failed', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is unavailable. Try again shortly.' } }));
    return;
  }
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
