// src/routes/jo.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { verifyJOHandler } from '../controllers/joController';

const router = Router();

router.post('/jo/verify', authenticate, verifyJOHandler);

export default router;