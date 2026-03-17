// src/routes/users.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAllUsersHandler, createUserHandler, updateUserHandler,
  deleteUserHandler, updateProfileHandler, getMyDashboardHandler
} from '../controllers/userController';

const router = Router();

router.get('/users',              authenticate, requireAdmin, getAllUsersHandler);
router.post('/users',             authenticate, requireAdmin, createUserHandler);
router.patch('/users/me',         authenticate, updateProfileHandler);
router.get('/users/me/dashboard', authenticate, getMyDashboardHandler);
router.patch('/users/me', authenticate, updateProfileHandler);
router.patch('/users/:id',        authenticate, requireAdmin, updateUserHandler);
router.delete('/users/:id',       authenticate, requireAdmin, deleteUserHandler);



export default router;