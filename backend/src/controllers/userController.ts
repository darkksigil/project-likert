// src/controllers/userController.ts
import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema } from '../models/index';
import * as userService from '../services/userService';
import { logger } from '../utils/logger';

export async function getAllUsersHandler(req: Request, res: Response) {
  try {
    res.json(await userService.getAllUsers());
  } catch (err: any) { logger.error(err); res.status(500).json({ error: err.message }); }
}

export async function createUserHandler(req: Request, res: Response) {
  try {
    const data = createUserSchema.parse(req.body);
    res.status(201).json(await userService.createUser(data));
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message }); }
}

export async function updateUserHandler(req: Request, res: Response) {
  try {
    const data = updateUserSchema.parse(req.body);
    res.json(await userService.updateUser(Number(req.params.id), data));
  } catch (err: any) {
    logger.error(err);
    res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message });
  }
}

export async function deleteUserHandler(req: Request, res: Response) {
  try {
    await userService.deleteUser(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) {
    logger.error(err);
    res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message });
  }
}