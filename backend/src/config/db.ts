// src/config/db.ts
import { Pool } from 'pg';

// ✅ Use environment variables — never hardcode credentials
export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'duty_system',
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
});

console.log('DB CONFIG:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD ? '***set***' : 'UNDEFINED',
  port: process.env.DB_PORT,
});