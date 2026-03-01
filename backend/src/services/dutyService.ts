// src/services/dutyService.ts
import { pool } from '../config/db';

export async function getAllDuties() {
  const { rows } = await pool.query(
    `SELECT * FROM duty_requests ORDER BY created_at DESC`
  );
  return rows;
}

export async function createDuty(data: any, userId: number) {
  const { name, department, concern, localNum, concernType } = data;
  const { rows } = await pool.query(
    `INSERT INTO duty_requests (data, status, concern_type, created_by)
     VALUES ($1, 'pending', $2, $3) RETURNING *`,
    [JSON.stringify({ name, department, concern, localNum, concernType }), concernType, userId]
  );
  return rows[0];
}

export async function updateDutyStatus(id: number, status: string, actor: any) {
  // Get current status for log
  const { rows: current } = await pool.query(
    `SELECT status FROM duty_requests WHERE id = $1`, [id]
  );
  const fromStatus = current[0]?.status ?? '';

  const { rows } = await pool.query(
    `UPDATE duty_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );

  // Log the action
  await pool.query(
    `INSERT INTO activity_log (duty_id, action, from_value, to_value, actor_id, actor_name, actor_role)
     VALUES ($1, 'status_change', $2, $3, $4, $5, $6)`,
    [id, fromStatus, status, actor.id, actor.username, actor.role]
  );

  return rows[0];
}

// ✅ Update duty details (all users)
export async function updateDutyDetails(id: number, data: any, actor: any) {
  const { name, department, concern, localNum, concernType } = data;
  const { rows } = await pool.query(
    `UPDATE duty_requests
     SET data = $1, concern_type = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [JSON.stringify({ name, department, concern, localNum, concernType }), concernType, id]
  );

  // Log the edit
  await pool.query(
    `INSERT INTO activity_log (duty_id, action, from_value, to_value, actor_id, actor_name, actor_role)
     VALUES ($1, 'edit', NULL, NULL, $2, $3, $4)`,
    [id, actor.id, actor.username, actor.role]
  );

  return rows[0];
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

export async function deleteDuty(id: number) {
  await pool.query(`DELETE FROM duty_requests WHERE id = $1`, [id]);
}

// ✅ Activity log
export async function getDutyActivityLog(dutyId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM activity_log WHERE duty_id = $1 ORDER BY created_at DESC`,
    [dutyId]
  );
  return rows;
}