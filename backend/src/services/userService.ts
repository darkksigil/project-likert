// src/services/userService.ts
import bcrypt from 'bcrypt';
import { pool } from '../config/db';

export async function getAllUsers() {
  const res = await pool.query(
    'SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  return res.rows;
}

export async function createUser(data: {
  username: string; password: string; full_name: string; role: string;
}) {
  const hashed = await bcrypt.hash(data.password, 10);
  const res = await pool.query(
    `INSERT INTO users (username, password, full_name, role)
     VALUES ($1,$2,$3,$4)
     RETURNING id, username, full_name, role, is_active, created_at`,
    [data.username, hashed, data.full_name, data.role]
  );
  return res.rows[0];
}

export async function updateUser(id: number, data: {
  full_name?: string; role?: string; is_active?: boolean; password?: string;
}) {
  const fields: string[] = [];
  const values: any[]   = [];
  let i = 1;

  if (data.full_name !== undefined) { fields.push(`full_name=$${i++}`); values.push(data.full_name); }
  if (data.role      !== undefined) { fields.push(`role=$${i++}`);      values.push(data.role); }
  if (data.is_active !== undefined) { fields.push(`is_active=$${i++}`); values.push(data.is_active); }
  if (data.password  !== undefined) {
    const hashed = await bcrypt.hash(data.password, 10);
    fields.push(`password=$${i++}`); values.push(hashed);
  }

  if (!fields.length) throw new Error('Nothing to update');
  fields.push(`updated_at=NOW()`);
  values.push(id);

  const res = await pool.query(
    `UPDATE users SET ${fields.join(',')} WHERE id=$${i} RETURNING id, username, full_name, role, is_active`,
    values
  );
  if (!res.rows[0]) throw new Error('User not found');
  return res.rows[0];
}

export async function deleteUser(id: number) {
  const res = await pool.query('DELETE FROM users WHERE id=$1 AND role!=\'admin\' RETURNING id', [id]);
  if (!res.rows[0]) throw new Error('User not found or cannot delete admin');
}