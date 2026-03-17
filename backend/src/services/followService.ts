// src/services/followService.ts (BACKEND)
import { pool } from '../config/db';
import { sendToUser } from './sseService';

export async function followDuty(userId: number, dutyId: number) {
  await pool.query(
    `INSERT INTO user_follows (user_id, duty_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, dutyId]
  );
  return { following: true };
}

export async function unfollowDuty(userId: number, dutyId: number) {
  await pool.query(
    `DELETE FROM user_follows WHERE user_id = $1 AND duty_id = $2`,
    [userId, dutyId]
  );
  return { following: false };
}

export async function getFollowedIds(userId: number): Promise<number[]> {
  const { rows } = await pool.query(
    `SELECT duty_id FROM user_follows WHERE user_id = $1`,
    [userId]
  );
  return rows.map(r => r.duty_id);
}

export async function getFollowersOfDuty(dutyId: number): Promise<number[]> {
  const { rows } = await pool.query(
    `SELECT user_id FROM user_follows WHERE duty_id = $1`,
    [dutyId]
  );
  return rows.map(r => r.user_id);
}

// Called from dutyService when a status changes — notifies all followers
export async function notifyFollowers(dutyId: number, excludeUserId: number, event: any) {
  const followers = await getFollowersOfDuty(dutyId);
  followers
    .filter(uid => uid !== excludeUserId)
    .forEach(uid => sendToUser(uid, event));
}