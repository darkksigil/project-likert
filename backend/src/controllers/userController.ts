// src/controllers/userController.ts
import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema } from '../models/index';
import * as userService from '../services/userService';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';
import { pool } from '../config/db';

export async function getAllUsersHandler(req: Request, res: Response) {
  try {
    const isAdmin = req.user?.role === 'admin';
    const users = await userService.getAllUsers();

    if (isAdmin) {
      res.json(users);
    } else {
      res.json(users
        .filter((u: any) => u.is_active)
        .map((u: any) => ({
          id:        u.id,
          username:  u.username,
          full_name: u.full_name,
          role:      u.role,
          is_active: u.is_active,
        }))
      );
    }
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
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

export async function updateProfileHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { full_name, currentPassword, newPassword } = req.body;
 
    if (newPassword) {
      // Verify current password first
      const { rows } = await pool.query('SELECT password FROM users WHERE id=$1', [userId]);
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });
      const valid = await bcrypt.compare(currentPassword ?? '', rows[0].password);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });
    }
 
    const updates: any = {};
    if (full_name?.trim()) updates.full_name = full_name.trim();
    if (newPassword)       updates.password  = newPassword;
 
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update.' });
 
    const updated = await userService.updateUser(userId, updates);
    res.json(updated);
  } catch (e: any) {
    logger.error(e);
    res.status(500).json({ error: e.message ?? 'Failed to update profile' });
  }
}