import { Router } from 'express';
import { MODULE_ROLES } from '../../lib/roles';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { listLeads } from './sales.service';

export const salesRouter = Router();
salesRouter.use(authenticate, authorize(...MODULE_ROLES.sales));

salesRouter.get('/leads', async (_req, res) => {
  res.json({ leads: await listLeads() });
});
