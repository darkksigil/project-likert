// src/controllers/departmentController.ts
import { Request, Response } from 'express';
import { departmentSchema } from '../models/index';
import * as deptService from '../services/departmentService';
import { logger } from '../utils/logger';

export async function getAllDepartmentsHandler(req: Request, res: Response) {
  try { res.json(await deptService.getAllDepartments()); }
  catch (err: any) { logger.error(err); res.status(500).json({ error: err.message }); }
}

export async function createDepartmentHandler(req: Request, res: Response) {
  try {
    const data = departmentSchema.parse(req.body);
    res.status(201).json(await deptService.createDepartment(data));
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message }); }
}

export async function deleteDepartmentHandler(req: Request, res: Response) {
  try {
    await deptService.deleteDepartment(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) {
    logger.error(err);
    res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message });
  }
}