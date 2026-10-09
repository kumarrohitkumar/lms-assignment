import { Router } from 'express';
import multer from 'multer';
import { MAX_SLIP_BYTES } from '../../lib/fileSignature';
import { Role } from '../../lib/roles';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import type { StorageDriver } from '../../storage';
import { serializeLoan } from '../../lib/serializers';
import { profileSchema } from './borrower.schemas';
import { getProfile, profileView, saveProfile, saveSalarySlip } from './borrower.service';
import { applyLoanSchema } from './loan.schemas';
import { applyForLoan, listBorrowerLoans } from './loan.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SLIP_BYTES, files: 1 } });

export function createBorrowerRouter({ storage }: { storage: StorageDriver }) {
  const router = Router();
  router.use(authenticate, authorize(Role.BORROWER));

  router.get('/profile', async (req, res) => {
    res.json(profileView(await getProfile(req.user!._id)));
  });

  router.put('/profile', validateBody(profileSchema), async (req, res) => {
    res.json(profileView(await saveProfile(req.user!._id, req.body)));
  });

  router.post('/salary-slip', upload.single('file'), async (req, res) => {
    const profile = await saveSalarySlip(req.user!._id, req.file, storage);
    res.status(201).json(profileView(profile));
  });

  router.get('/loans', async (req, res) => {
    const loans = await listBorrowerLoans(req.user!._id);
    res.json({ loans: loans.map(serializeLoan) });
  });

  router.post('/loans', validateBody(applyLoanSchema), async (req, res) => {
    const loan = await applyForLoan(req.user!._id, req.body);
    res.status(201).json({ loan: serializeLoan(loan) });
  });

  return router;
}
