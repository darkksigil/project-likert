// src/routes/users.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getAllUsersHandler, createUserHandler, updateUserHandler, deleteUserHandler, updateProfileHandler } from '../controllers/userController';

const router = Router();
// ✅ requireAdmin scoped per-route, NOT via router.use()
router.get('/users', authenticate, getAllUsersHandler);
router.post('/users',     authenticate, requireAdmin, createUserHandler);
router.patch('/users/me', authenticate, updateProfileHandler);
router.patch('/users/:id',  authenticate, requireAdmin, updateUserHandler);
router.delete('/users/:id', authenticate, requireAdmin, deleteUserHandler);
export default router;