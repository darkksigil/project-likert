// src/services/endorseService.ts
import { pool } from '../config/db';
import { broadcast, sendToUser } from './sseService';

const AUTO_PROGRESS_ROLES = ['admin', 'duty'];

export async function endorseDuty(id: number, endorsedToId: number, actor: any) {
  const { rows: current } = await pool.query(
    `SELECT status, data FROM duty_requests WHERE id = $1`, [id]
  );
  const fromStatus = current[0]?.status ?? '';

  const { rows: toUser } = await pool.query(
    `SELECT id, username, full_name FROM users WHERE id = $1`, [endorsedToId]
  );
  if (!toUser.length) throw new Error('User not found');

  // admin + duty auto-move to in_progress, others go to endorsed
  const newStatus = AUTO_PROGRESS_ROLES.includes(actor.role) ? 'in_progress' : 'endorsed';

  const { rows } = await pool.query(
    `UPDATE duty_requests
     SET status      = $1,
         endorsed_to = $2,
         endorsed_by = $3,
         endorsed_at = NOW(),
         updated_at  = NOW()
     WHERE id = $4 RETURNING *`,
    [newStatus, endorsedToId, actor.id, id]
  );

  await pool.query(
    `INSERT INTO activity_log
       (duty_id, action, from_value, to_value, actor_id, actor_name, actor_role)
     VALUES ($1, 'status_change', $2, $3, $4, $5, $6)`,
    [id, fromStatus, `${newStatus} → endorsed to ${toUser[0].username}`, actor.id, actor.username, actor.role]
  );

  const duty = { ...rows[0], endorsed_by_name: actor.username };

  broadcast({
    type:       'duty_endorsed',
    payload:    duty,
    actor:      actor.username,
    actorRole:  actor.role,
    endorsedTo: endorsedToId,
  }, actor.id);

  sendToUser(endorsedToId, {
    type:       'duty_endorsed',
    payload:    duty,
    actor:      actor.username,
    endorsedTo: endorsedToId,
  });

  return rows[0];
}

export async function unendorseDuty(id: number, actor: any) {
  const { rows } = await pool.query(
    `UPDATE duty_requests
     SET status      = 'pending',
         endorsed_to = NULL,
         endorsed_by = NULL,
         endorsed_at = NULL,
         updated_at  = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );

  await pool.query(
    `INSERT INTO activity_log
       (duty_id, action, from_value, to_value, actor_id, actor_name, actor_role)
     VALUES ($1, 'status_change', $2, $3, $4, $5, $6)`,
    [id, 'endorsed', 'pending (unendorsed)', actor.id, actor.username, actor.role]
  );

  const duty = rows[0];

  broadcast({
    type:    'duty_unendorsed',
    payload: duty,
    actor:   actor.username,
  }, actor.id);

  return duty;
}

export async function getEndorsedToMe(userId: number) {
  const { rows } = await pool.query(
    `SELECT dr.*,
            u.username AS endorsed_by_name
     FROM duty_requests dr
     LEFT JOIN users u ON u.id = dr.endorsed_by
     WHERE dr.endorsed_to = $1
       AND dr.status IN ('endorsed', 'in_progress')
     ORDER BY dr.endorsed_at DESC`,
    [userId]
  );

  return rows.map(r => ({
    ...r,
    data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
  }));
}

export async function getEndorsementCount(userId: number) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS count FROM duty_requests
     WHERE endorsed_to = $1 AND status IN ('endorsed', 'in_progress')`,
    [userId]
  );
  return Number(rows[0].count);
}