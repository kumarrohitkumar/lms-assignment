import mongoose from 'mongoose';
import { env } from '../config/env';
import { SEED_PASSWORD, seedUsers } from './seedUsers';

async function main() {
  await mongoose.connect(env().MONGO_URI);
  const accounts = await seedUsers();
  console.log('Seeded accounts (password for all: %s)', SEED_PASSWORD);
  console.table(accounts.map(({ role, email }) => ({ role, email })));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
