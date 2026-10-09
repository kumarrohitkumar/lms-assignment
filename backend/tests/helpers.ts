import { createApp } from '../src/app';
import { createMemoryStorage } from '../src/storage/memoryStorage';

export function buildTestApp() {
  return createApp({ storage: createMemoryStorage() });
}
