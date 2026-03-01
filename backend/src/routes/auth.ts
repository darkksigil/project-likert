// src/routes/auth.ts
import { Router } from 'express';
import { loginHandler, meHandler } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.post('/auth/login', loginHandler);
router.get('/auth/me', authenticate, meHandler);
export default router;