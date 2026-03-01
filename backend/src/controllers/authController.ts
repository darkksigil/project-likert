// src/controllers/authController.ts
import { Request, Response } from 'express';
import { loginSchema } from '../models/index';
import * as authService from '../services/authService';
import { logger } from '../utils/logger';

export async function loginHandler(req: Request, res: Response) {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await authService.login(username, password);
    res.json(result);
  } catch (err: any) {
    logger.error(err.message, { stack: err.stack });
    res.status(401).json({ error: err.message });
  }
}

export function meHandler(req: Request, res: Response) {
  res.json(req.user);
}