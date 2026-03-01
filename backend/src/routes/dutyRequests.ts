// src/routes/dutyRequests.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllDutiesHandler, createDutyHandler,
  updateDutyStatusHandler, updateDutyDetailsHandler,
  updateDutyConcernTypeHandler, deleteDutyHandler,
  getDutyActivityLogHandler
} from '../controllers/dutyController';

const router = Router();

router.get   ('/duty-requests',                    authenticate, getAllDutiesHandler);
router.post  ('/duty-requests',                    authenticate, createDutyHandler);
router.patch ('/duty-requests/:id',                authenticate, updateDutyStatusHandler);
router.patch ('/duty-requests/:id/details',        authenticate, updateDutyDetailsHandler);      // ✅ all users
router.patch ('/duty-requests/:id/concern-type',   authenticate, updateDutyConcernTypeHandler);
router.delete('/duty-requests/:id',                authenticate, deleteDutyHandler);
router.get   ('/duty-requests/:id/activity',       authenticate, getDutyActivityLogHandler);     // ✅ activity log

export default router;