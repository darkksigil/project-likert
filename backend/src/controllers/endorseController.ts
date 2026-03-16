// src/controllers/endorseController.ts
import { Request, Response } from 'express';
import { endorseDuty, getEndorsedToMe, getEndorsementCount, unendorseDuty } from '../services/endorseService';
import { logger } from '../utils/logger';

export async function endorseDutyHandler(req: Request, res: Response) {
  try {
    const actor       = (req as any).user;
    const { endorsedToId } = req.body;
    if (!endorsedToId) return res.status(400).json({ error: 'endorsedToId is required' });
    const duty = await endorseDuty(Number(req.params.id), Number(endorsedToId), actor);
    res.json(duty);
  } catch (e: any) {
    logger.error(e);
    res.status(500).json({ error: e.message ?? 'Failed to endorse' });
  }
}

export async function getEndorsedToMeHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const duties = await getEndorsedToMe(userId);
    res.json(duties);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to fetch endorsed duties' });
  }
}

export async function getEndorsementCountHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const count  = await getEndorsementCount(userId);
    res.json({ count });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
}

export async function unendorseDutyHandler(req: Request, res: Response) {
  try {
    const actor = (req as any).user;
    const duty  = await unendorseDuty(Number(req.params.id), actor);
    res.json(duty);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to unendorse' }); }
}