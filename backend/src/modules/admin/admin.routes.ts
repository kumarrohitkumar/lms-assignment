import { Router } from 'express';
import { Role } from '../../lib/roles';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { portfolioOverview } from '../loans/history.service';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize(Role.ADMIN));

adminRouter.get('/overview', async (_req, res) => {
  res.json(await portfolioOverview());
});
