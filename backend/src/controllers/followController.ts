// src/controllers/followController.ts (BACKEND)
import { Request, Response } from 'express';
import * as followService from '../services/followService';
import { logger } from '../utils/logger';

export async function followHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const dutyId = Number(req.params.id);
    const result = await followService.followDuty(userId, dutyId);
    res.json(result);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to follow' }); }
}

export async function unfollowHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const dutyId = Number(req.params.id);
    const result = await followService.unfollowDuty(userId, dutyId);
    res.json(result);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to unfollow' }); }
}

export async function getFollowingHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const ids = await followService.getFollowedIds(userId);
    res.json({ ids });
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to fetch follows' }); }
}