// src/models/dutyRequest.ts
import { z } from 'zod';

export const dutyRequestSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  concern: z.string().min(1),
  localNum: z.string().min(1),
});

// ✅ Added 'in_progress' to match Angular frontend
export const dutyStatusSchema = z.enum(['pending', 'in_progress', 'done', 'endorsed', 'failed']);
