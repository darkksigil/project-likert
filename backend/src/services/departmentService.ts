// src/services/departmentService.ts
import { pool } from '../config/db';

export async function getAllDepartments() {
  const res = await pool.query(
    'SELECT id, code, name, grp, is_active FROM departments ORDER BY grp, name'
  );
  return res.rows;
}

export async function createDepartment(data: { code: string; name: string; grp: string }) {
  const res = await pool.query(
    `INSERT INTO departments (code, name, grp)
     VALUES ($1,$2,$3) RETURNING id, code, name, grp, is_active`,
    [data.code.toUpperCase(), data.name, data.grp]
  );
  return res.rows[0];
}

export async function deleteDepartment(id: number) {
  const res = await pool.query('DELETE FROM departments WHERE id=$1 RETURNING id', [id]);
  if (!res.rows[0]) throw new Error('Department not found');
}

export async function toggleDepartment(id: number, is_active: boolean) {
  const res = await pool.query(
    'UPDATE departments SET is_active=$1 WHERE id=$2 RETURNING id, code, name, grp, is_active',
    [is_active, id]
  );
  if (!res.rows[0]) throw new Error('Department not found');
  return res.rows[0];
}