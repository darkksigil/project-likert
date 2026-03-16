// src/routes/endorse.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  endorseDutyHandler,
  getEndorsedToMeHandler,
  getEndorsementCountHandler,
  unendorseDutyHandler,
} from '../controllers/endorseController';

const router = Router();

router.post('/duty-requests/:id/endorse', authenticate, endorseDutyHandler);
router.get('/duty-requests/endorsed-to-me',  authenticate, getEndorsedToMeHandler);
router.get('/duty-requests/endorsement-count', authenticate, getEndorsementCountHandler);
router.delete('/duty-requests/:id/endorse', authenticate, unendorseDutyHandler);

export default router;