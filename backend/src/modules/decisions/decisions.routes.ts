import { Router } from 'express';
import { REJECTION_CATEGORIES } from '../../lib/decisions';
import { STAFF_ROLES } from '../../lib/roles';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

export const decisionsRouter = Router();
decisionsRouter.use(authenticate, authorize(...STAFF_ROLES));

decisionsRouter.get('/rejection-categories', (_req, res) => {
  res.json(REJECTION_CATEGORIES);
});
