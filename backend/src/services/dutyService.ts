// src/services/dutyService.ts
import { pool } from '../config/db';
import { broadcast } from './sseService';

export async function getAllDuties() {
  const { rows } = await pool.query(
    `SELECT * FROM duty_requests ORDER BY created_at DESC`
  );
  return rows;
}

export async function createDuty(data: any, userId: number, actor: any) {
  const { name, department, concern, localNum, concernType } = data;
  const { rows } = await pool.query(
    `INSERT INTO duty_requests (data, status, concern_type, created_by)
     VALUES ($1, 'pending', $2, $3) RETURNING *`,
    [JSON.stringify({ name, department, concern, localNum, concernType }), concernType, userId]
  );
  const duty = rows[0];

  broadcast({
    type:      'duty_created',
    payload:   duty,
    actor:     actor.username,
    actorRole: actor.role,
  });

  return duty;
}

export async function updateDutyStatus(
  id: number, status: string, actor: any,
  joNumber?: string, joVerified?: boolean
) {
  const { rows: current } = await pool.query(
    `SELECT status FROM duty_requests WHERE id = $1`, [id]
  );
  const fromStatus = current[0]?.status ?? '';

  const { rows } = await pool.query(
    `UPDATE duty_requests
     SET status      = $1,
         updated_at  = NOW(),
         jo_number   = COALESCE($3, jo_number),
         jo_verified = COALESCE($4, jo_verified)
     WHERE id = $2 RETURNING *`,
    [status, id, joNumber ?? null, joVerified ?? null]
  );

  await pool.query(
    `INSERT INTO activity_log (duty_id, action, from_value, to_value, actor_id, actor_name, actor_role)
     VALUES ($1, 'status_change', $2, $3, $4, $5, $6)`,
    [id, fromStatus, status, actor.id, actor.username, actor.role]
  );

  const duty = rows[0];

  broadcast({
    type:      'duty_updated',
    payload:   duty,
    actor:     actor.username,
    actorRole: actor.role,
  }, actor.id); // exclude the actor — they already updated optimistically

  return duty;
}

export async function updateDutyDetails(id: number, data: any, actor: any) {
  const { name, department, concern, localNum, concernType } = data;
  const { rows } = await pool.query(
    `UPDATE duty_requests
     SET data = $1, concern_type = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [JSON.stringify({ name, department, concern, localNum, concernType }), concernType, id]
  );

  await pool.query(
    `INSERT INTO activity_log (duty_id, action, from_value, to_value, actor_id, actor_name, actor_role)
     VALUES ($1, 'edit', NULL, NULL, $2, $3, $4)`,
    [id, actor.id, actor.username, actor.role]
  );

  const duty = rows[0];

  broadcast({
    type:      'duty_updated',
    payload:   duty,
    actor:     actor.username,
    actorRole: actor.role,
  }, actor.id);

  return duty;
}

export async function updateDutyConcernType(id: number, concernType: string) {
  const { rows } = await pool.query(
    `UPDATE duty_requests SET concern_type = $1,
       data = jsonb_set(data::jsonb, '{concernType}', $2::jsonb)::json,
       updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [concernType, JSON.stringify(concernType), id]
  );
  return rows[0];
}

export async function deleteDuty(id: number, actor?: any) {
  await pool.query(`DELETE FROM duty_requests WHERE id = $1`, [id]);

  broadcast({
    type:    'duty_deleted',
    payload: { id },
    actor:   actor?.username,
  }, actor?.id);
}

export async function getDutyActivityLog(dutyId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM activity_log WHERE duty_id = $1 ORDER BY created_at DESC`,
    [dutyId]
  );
  return rows;
}