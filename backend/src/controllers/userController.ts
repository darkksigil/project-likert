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

// src/controllers/userController.ts — add this handler
// GET /api/users/me/dashboard

export async function getMyDashboardHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const {
      page = 1, limit = 25,
      search, status, concernType,
      joStatus, dateFrom, dateTo
    } = req.query;
 
    const offset = (Number(page) - 1) * Number(limit);
 
    // ── Stats (always by user, unfiltered) ──
    const statsResult = await pool.query(`
      SELECT
        COUNT(*)                                                           AS total,
        COUNT(*) FILTER (WHERE status = 'pending')                        AS pending,
        COUNT(*) FILTER (WHERE status = 'in_progress')                    AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done')                           AS done,
        COUNT(*) FILTER (WHERE status = 'endorsed')                       AS endorsed,
        COUNT(*) FILTER (WHERE jo_number IS NOT NULL AND jo_number != '')  AS with_jo,
        COUNT(*) FILTER (WHERE jo_number IS NULL OR jo_number = '')        AS without_jo
      FROM duty_requests
      WHERE created_by = $1
    `, [userId]);
    const stats = statsResult.rows[0];
 
    // ── Records: activity log joined with duty_requests ──
    // Shows every status change the user's requests went through
    const conditions: string[] = ['dr.created_by = $1'];
    const values: any[] = [userId];
    let i = 2;
 
    if (search) {
      conditions.push(`(
        dr.data->>'concern'    ILIKE $${i} OR
        dr.data->>'department' ILIKE $${i} OR
        CAST(dr.id AS TEXT)    LIKE  $${i}
      )`);
      values.push(`%${search}%`); i++;
    }
    if (status) {
      conditions.push(`dr.status = $${i}`);
      values.push(status); i++;
    }
    if (concernType) {
      conditions.push(`dr.concern_type = $${i}`);
      values.push(concernType); i++;
    }
    if (joStatus === 'with_jo') {
      conditions.push(`dr.jo_number IS NOT NULL AND dr.jo_number != ''`);
    } else if (joStatus === 'without_jo') {
      conditions.push(`(dr.jo_number IS NULL OR dr.jo_number = '')`);
    }
    if (dateFrom) {
      conditions.push(`dr.created_at >= $${i}`);
      values.push(dateFrom); i++;
    }
    if (dateTo) {
      conditions.push(`dr.created_at < $${i}::date + interval '1 day'`);
      values.push(dateTo); i++;
    }
 
    const where = conditions.join(' AND ');
 
    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM duty_requests dr WHERE ${where}`,
      values
    );
    const totalCount = Number(countResult.rows[0].count);
 
    // Records with latest activity log entry per duty
    const recordsResult = await pool.query(`
      SELECT
        dr.id,
        dr.status,
        dr.concern_type,
        dr.jo_number,
        dr.jo_verified,
        dr.created_at,
        dr.updated_at,
        dr.data->>'department'  AS department,
        dr.data->>'concern'     AS concern,
        dr.data->>'name'        AS requester_name,
        -- latest activity
        al.action               AS last_action,
        al.from_value           AS last_from,
        al.to_value             AS last_to,
        al.actor_name           AS last_actor,
        al.created_at           AS last_activity_at
      FROM duty_requests dr
      LEFT JOIN LATERAL (
        SELECT action, from_value, to_value, actor_name, created_at
        FROM activity_log
        WHERE duty_id = dr.id
        ORDER BY created_at DESC
        LIMIT 1
      ) al ON true
      WHERE ${where}
      ORDER BY dr.updated_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `, [...values, Number(limit), offset]);
 
    res.json({
      stats: {
        total:       Number(stats.total),
        pending:     Number(stats.pending),
        in_progress: Number(stats.in_progress),
        done:        Number(stats.done),
        endorsed:    Number(stats.endorsed),
        with_jo:     Number(stats.with_jo),
        without_jo:  Number(stats.without_jo),
      },
      records: recordsResult.rows,
      total:   totalCount,
      page:    Number(page),
      pages:   Math.ceil(totalCount / Number(limit)),
    });
 
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}

