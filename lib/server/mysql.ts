import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function isMySqlEnabled(): boolean {
  return Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER)
}

export function getMysqlDatabaseName(): string {
  return process.env.MYSQL_DATABASE || 'user-management-system'
}

export function getPool(): mysql.Pool {
  if (pool) return pool

  if (!isMySqlEnabled()) {
    throw new Error('MySQL is not configured. Set MYSQL_HOST and MYSQL_USER.')
  }

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: getMysqlDatabaseName(),
    connectionLimit: 10,
    namedPlaceholders: true,
    dateStrings: true,
  })

  return pool
}

export async function query<T = any>(sql: string, params?: any): Promise<T[]> {
  const [rows] = await getPool().query(sql, params)
  return rows as T[]
}

export async function execute(sql: string, params?: any) {
  const [result] = await getPool().execute(sql, params)
  return result as mysql.ResultSetHeader
}

