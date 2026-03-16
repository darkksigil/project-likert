// src/services/sseService.ts
import { Response } from 'express';

export type SSEEventType =
  | 'duty_created'
  | 'duty_updated'
  | 'duty_deleted'
  | 'duty_endorsed'
  | 'duty_unendorsed';

export interface SSEEvent {
  type:        SSEEventType;
  payload:     any;
  actor?:      string;
  actorRole?:  string;
  endorsedTo?: number;  // user id — for targeted endorsement events
}

// Connected clients map: userId → Response[]
const clients = new Map<number, Response[]>();

export function addClient(userId: number, res: Response) {
  const existing = clients.get(userId) ?? [];
  clients.set(userId, [...existing, res]);
}

export function removeClient(userId: number, res: Response) {
  const existing = clients.get(userId) ?? [];
  const updated  = existing.filter(r => r !== res);
  if (updated.length === 0) clients.delete(userId);
  else clients.set(userId, updated);
}

export function broadcast(event: SSEEvent, excludeUserId?: number) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((responses, userId) => {
    if (userId === excludeUserId) return;
    responses.forEach(res => {
      try { res.write(data); } catch { /* client disconnected */ }
    });
  });
}

export function sendToUser(userId: number, event: SSEEvent) {
  const responses = clients.get(userId) ?? [];
  const data = `data: ${JSON.stringify(event)}\n\n`;
  responses.forEach(res => {
    try { res.write(data); } catch { /* client disconnected */ }
  });
}