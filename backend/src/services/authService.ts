// src/services/authService.ts
import bcrypt from 'bcrypt';
import { pool } from '../config/db';
import { generateToken } from '../middleware/auth';

export async function login(username: string, password: string) {
  const res = await pool.query(
    'SELECT id, username, password, full_name, role, is_active FROM users WHERE username=$1',
    [username]
  );
  const user = res.rows[0];
  if (!user) throw new Error('Invalid username or password');
  if (!user.is_active) throw new Error('Account is disabled');
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Invalid username or password');
  const token = generateToken({ id: user.id, username: user.username, role: user.role });
  return {
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
  };
}