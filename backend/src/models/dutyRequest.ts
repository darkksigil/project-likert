// src/models/dutyRequest.ts
import { z } from 'zod';

export const dutyRequestSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  concern: z.string().min(1),
  localNum: z.string().optional().default('N/A'),  // ✅ optional
});

// ✅ in_progress added
export const dutyStatusSchema = z.enum(['pending', 'in_progress', 'done', 'endorsed', 'failed']);
