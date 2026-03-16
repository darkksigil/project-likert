// src/controllers/dutyController.ts
import { Request, Response } from 'express';
import {
  getAllDuties, createDuty, updateDutyStatus,
  updateDutyDetails, updateDutyConcernType,
  deleteDuty, getDutyActivityLog
} from '../services/dutyService';
import { logger } from '../utils/logger';

export async function getAllDutiesHandler(req: Request, res: Response) {
  try { res.json(await getAllDuties()); }
  catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to fetch' }); }
}

export async function createDutyHandler(req: Request, res: Response) {
  try {
    const actor = (req as any).user;
    const duty  = await createDuty(req.body, actor.id, actor); // ← pass actor
    res.status(201).json(duty);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to create' }); }
}

export async function updateDutyStatusHandler(req: Request, res: Response) {
  try {
    const { status, joNumber, joVerified } = req.body;
    const actor = (req as any).user;
    const duty  = await updateDutyStatus(Number(req.params.id), status, actor, joNumber, joVerified);
    res.json(duty);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to update status' }); }
}

export async function updateDutyDetailsHandler(req: Request, res: Response) {
  try {
    const actor = (req as any).user;
    const duty  = await updateDutyDetails(Number(req.params.id), req.body, actor);
    res.json(duty);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to update details' }); }
}

export async function updateDutyConcernTypeHandler(req: Request, res: Response) {
  try {
    const { concernType } = req.body;
    const duty = await updateDutyConcernType(Number(req.params.id), concernType);
    res.json(duty);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to update concern type' }); }
}

export async function deleteDutyHandler(req: Request, res: Response) {
  try {
    const actor = (req as any).user;
    await deleteDuty(Number(req.params.id), actor); // ← pass actor
    res.json({ success: true });
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to delete' }); }
}

export async function getDutyActivityLogHandler(req: Request, res: Response) {
  try {
    const logs = await getDutyActivityLog(Number(req.params.id));
    res.json(logs);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Failed to fetch activity log' }); }
}