// Creates the local env files from the examples on first install. Never overwrites an existing file.
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pairs = [
  ['backend/.env.example', 'backend/.env'],
  ['frontend/.env.example', 'frontend/.env.local'],
];

for (const [from, to] of pairs) {
  const target = path.join(root, to);
  if (existsSync(target)) {
    console.log(`  kept     ${to} (already exists)`);
  } else {
    copyFileSync(path.join(root, from), target);
    console.log(`  created  ${to} from ${from}`);
  }
}
