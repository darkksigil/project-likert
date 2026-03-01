// src/models/index.ts
import { z } from 'zod';

export const dutyRequestSchema = z.object({
  name:        z.string().optional().default(''),
  department:  z.string().min(1),
  concern:     z.string().min(1),
  localNum:    z.string().optional().default('N/A'),
  concernType: z.enum(['hardware','network','system','data','other']).default('other'),
});

export const dutyStatusSchema = z.enum(['pending','in_progress','done','endorsed','failed']);

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  username:  z.string().min(3).max(100),
  password:  z.string().min(8),
  full_name: z.string().min(1),
  role:      z.enum(['administrative','hardware','system','data','cybersecurity']),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(1).optional(),
  role:      z.enum(['administrative','hardware','system','data','cybersecurity']).optional(),
  is_active: z.boolean().optional(),
  password:  z.string().min(8).optional(),
});

export const departmentSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1),
  grp:  z.string().optional().default(''),
});