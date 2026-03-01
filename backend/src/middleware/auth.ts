// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  id:       number;
  username: string;
  role:     string;
}

declare global {
  namespace Express {
    interface Request { user?: AuthPayload; }
  }
}

const SECRET = process.env.JWT_SECRET || 'imiss_secret_change_me';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' }); return;
  }
  try {
    req.user = jwt.verify(header.slice(7), SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' }); return;
  }
  next();
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}