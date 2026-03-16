// src/routes/sse.ts
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { addClient, removeClient } from '../services/sseService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret';

router.get('/events', (req: Request, res: Response) => {
  // Accept token from query param (EventSource can't set headers)
  const token = req.query.token as string;
  if (!token) return res.status(401).json({ error: 'No token' });

  let userId: number;
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    userId = payload.id;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  const pingInterval = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(pingInterval); }
  }, 30000);

  addClient(userId, res);

  req.on('close', () => {
    clearInterval(pingInterval);
    removeClient(userId, res);
  });
});

export default router;