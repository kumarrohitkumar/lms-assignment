import type { Types } from 'mongoose';
import type { Role } from '../lib/roles';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; _id: Types.ObjectId; name: string; email: string; role: Role };
    }
  }
}

export {};
