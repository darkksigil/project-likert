// src/routes/departments.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getAllDepartmentsHandler, createDepartmentHandler, deleteDepartmentHandler } from '../controllers/departmentController';

const router = Router();
// GET is public (needed for modal dropdown)
router.get('/departments', authenticate, getAllDepartmentsHandler);
router.post('/departments', authenticate, requireAdmin, createDepartmentHandler);
router.delete('/departments/:id', authenticate, requireAdmin, deleteDepartmentHandler);
// Write ops are admin only
router.post('/departments', authenticate, requireAdmin, createDepartmentHandler);
router.delete('/departments/:id', authenticate, requireAdmin, deleteDepartmentHandler);
export default router;