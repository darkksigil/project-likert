// src/services/joService.ts
import sql from 'mssql';

export interface JOResult {
  found:           boolean;
  jo_number?:      string;
  department?:     string;
  nature_of_work?: string;
  computer_name?:  string;
  created_by?:     string;
  start?:          string;
  finish?:         string;
  error?:          string;
}

const sqlConfig: sql.config = {
  server:   process.env.MSSQL_SERVER!,
  database: process.env.MSSQL_DATABASE!,
  user:     process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  port:     Number(process.env.MSSQL_PORT) || 1433,
  options: {
    trustServerCertificate: true,
    encrypt:                false,
  },
  connectionTimeout: 5000,
  requestTimeout:    5000,
};

// 4-6 digits only
const JO_SHORT_REGEX = /^\d{4,6}$/;

export function isValidJOInput(input: string): boolean {
  return JO_SHORT_REGEX.test(input.trim());
}

export async function verifyJobOrder(joInput: string): Promise<JOResult> {
  const trimmed = joInput.trim();

  if (!isValidJOInput(trimmed)) {
    return {
      found: false,
      error: 'Please enter a valid 4–6 digit job order number.'
    };
  }

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input('jo_suffix', sql.NVarChar, trimmed)
      .query(`
        SELECT TOP 1
          j.job_order_no,
          j.nature_of_work,
          j.computer_name,
          j.start_timestamp,
          j.finish_timestamp,
          j.created_by,
          a.short_area AS department
        FROM tbltsk_joborder j
        INNER JOIN tblsys_area a ON a.PK_sysarea = j.FK_sysarea
        WHERE j.job_order_no LIKE '%-' + @jo_suffix
          AND j.active_flag  = 1
          AND j.delete_flag  = 0
        ORDER BY j.PK_tskjoborder DESC
      `);

    if (result.recordset.length === 0) {
      return { found: false };
    }

    const row = result.recordset[0];
    return {
      found:          true,
      jo_number:      row.job_order_no,
      department:     row.department,
      nature_of_work: row.nature_of_work,
      computer_name:  row.computer_name,
      created_by:     row.created_by,
      start:          row.start_timestamp,
      finish:         row.finish_timestamp,
    };

  } catch (err: any) {
    console.error('[JO] SQL Server error:', err.message);
    return {
      found: false,
      error: 'Could not reach job order database.'
    };
  } finally {
    if (pool) await pool.close();
  }
}