// src/routes/users.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getAllUsersHandler, createUserHandler, updateUserHandler, deleteUserHandler } from '../controllers/userController';

const router = Router();
// ✅ requireAdmin scoped per-route, NOT via router.use()
router.get('/users',      authenticate, requireAdmin, getAllUsersHandler);
router.post('/users',     authenticate, requireAdmin, createUserHandler);
router.patch('/users/:id',  authenticate, requireAdmin, updateUserHandler);
router.delete('/users/:id', authenticate, requireAdmin, deleteUserHandler);
export default router;