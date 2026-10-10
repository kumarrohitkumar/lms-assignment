import mongoose from 'mongoose';
import { env } from '../config/env';
import { backfillEligibility } from './backfillEligibility';

async function main() {
  await mongoose.connect(env().MONGO_URI);
  console.log('Eligibility snapshots added:', (await backfillEligibility()).updated);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
