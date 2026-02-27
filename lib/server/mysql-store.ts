import { execute, isMySqlEnabled, query } from '@/lib/server/mysql'
import { normalizeEmail } from '@/lib/email-domain'

type JsonRow = { id: number; data: any }

const TABLES = {
  applicants: 'applicants',
  assignments: 'assignments',
  manpowerRequests: 'manpower_requests',
}

function parseJson(value: any): any {
  if (value === null || value === undefined) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return {}
  }
}

function withId(row: JsonRow): any {
  const data = parseJson(row.data)
  return { ...data, id: row.id }
}

function sanitizeDate(value: any): string | undefined {
  if (!value) return undefined
  return typeof value === 'string' ? value : new Date(value).toISOString()
}

export function isUsingMySql(): boolean {
  return isMySqlEnabled()
}

export async function getApplicants(): Promise<any[]> {
  const rows = await query<JsonRow>(`SELECT id, data FROM ${TABLES.applicants} ORDER BY id ASC`)
  return rows.map(withId)
}

export async function getAssignments(): Promise<any[]> {
  const rows = await query<JsonRow>(`SELECT id, data FROM ${TABLES.assignments} ORDER BY id ASC`)
  return rows.map(withId)
}

export async function getManpowerRequests(): Promise<any[]> {
  const rows = await query<JsonRow>(`SELECT id, data FROM ${TABLES.manpowerRequests} ORDER BY id ASC`)
  return rows.map(withId)
}

export async function getApplicantsById(id: number): Promise<any | null> {
  const rows = await query<JsonRow>(`SELECT id, data FROM ${TABLES.applicants} WHERE id = ?`, [id])
  if (!rows.length) return null
  return withId(rows[0])
}

export async function getAssignmentsById(id: number): Promise<any | null> {
  const rows = await query<JsonRow>(`SELECT id, data FROM ${TABLES.assignments} WHERE id = ?`, [id])
  if (!rows.length) return null
  return withId(rows[0])
}

export async function getManpowerRequestById(id: number): Promise<any | null> {
  const rows = await query<JsonRow>(`SELECT id, data FROM ${TABLES.manpowerRequests} WHERE id = ?`, [id])
  if (!rows.length) return null
  return withId(rows[0])
}

export async function createApplicant(payload: any): Promise<any> {
  const data = { ...payload }
  delete data.id
  const result = await execute(
    `INSERT INTO ${TABLES.applicants} (data) VALUES (?)`,
    [JSON.stringify(data)]
  )
  return { ...data, id: result.insertId }
}

export async function createAssignment(payload: any): Promise<any> {
  const data = { ...payload }
  delete data.id
  const result = await execute(
    `INSERT INTO ${TABLES.assignments} (data) VALUES (?)`,
    [JSON.stringify(data)]
  )
  return { ...data, id: result.insertId }
}

export async function createManpowerRequest(payload: any): Promise<any> {
  const data = { ...payload }
  delete data.id
  const result = await execute(
    `INSERT INTO ${TABLES.manpowerRequests} (data) VALUES (?)`,
    [JSON.stringify(data)]
  )
  return { ...data, id: result.insertId }
}

export async function updateApplicant(id: number, payload: any): Promise<any | null> {
  const existing = await getApplicantsById(id)
  if (!existing) return null
  const updated = { ...existing, ...payload, id }
  await execute(
    `UPDATE ${TABLES.applicants} SET data = ? WHERE id = ?`,
    [JSON.stringify(updated), id]
  )
  return updated
}

export async function updateAssignment(id: number, payload: any): Promise<any | null> {
  const existing = await getAssignmentsById(id)
  if (!existing) return null
  const updated = { ...existing, ...payload, id }
  await execute(
    `UPDATE ${TABLES.assignments} SET data = ? WHERE id = ?`,
    [JSON.stringify(updated), id]
  )
  return updated
}

export async function updateManpowerRequest(id: number, payload: any): Promise<any | null> {
  const existing = await getManpowerRequestById(id)
  if (!existing) return null
  const updated = { ...existing, ...payload, id }
  await execute(
    `UPDATE ${TABLES.manpowerRequests} SET data = ? WHERE id = ?`,
    [JSON.stringify(updated), id]
  )
  return updated
}

export async function deleteApplicant(id: number): Promise<boolean> {
  const result = await execute(`DELETE FROM ${TABLES.applicants} WHERE id = ?`, [id])
  return result.affectedRows > 0
}

export async function deleteAssignment(id: number): Promise<boolean> {
  const result = await execute(`DELETE FROM ${TABLES.assignments} WHERE id = ?`, [id])
  return result.affectedRows > 0
}

export async function deleteManpowerRequest(id: number): Promise<boolean> {
  const result = await execute(`DELETE FROM ${TABLES.manpowerRequests} WHERE id = ?`, [id])
  return result.affectedRows > 0
}

export async function getUsers(): Promise<any[]> {
  const rows = await query<any>(
    `SELECT id, email, password, role, createdAt, lastLogin, tlAssignmentLimit, tlCurrentAssignments
     FROM users ORDER BY id ASC`
  )
  return rows.map((row) => {
    const tlLimits =
      row.tlAssignmentLimit !== null || row.tlCurrentAssignments !== null
        ? {
            maxAssignments: row.tlAssignmentLimit ?? 0,
            currentAssignments: row.tlCurrentAssignments ?? 0,
          }
        : undefined

    return {
      id: row.id,
      email: row.email,
      password: row.password ?? undefined,
      role: row.role,
      createdAt: sanitizeDate(row.createdAt) || new Date().toISOString(),
      lastLogin: sanitizeDate(row.lastLogin),
      tlLimits,
    }
  })
}

export async function getUserById(id: number): Promise<any | null> {
  const rows = await query<any>(
    `SELECT id, email, password, role, createdAt, lastLogin, tlAssignmentLimit, tlCurrentAssignments
     FROM users WHERE id = ?`,
    [id]
  )
  if (!rows.length) return null
  const row = rows[0]
  const tlLimits =
    row.tlAssignmentLimit !== null || row.tlCurrentAssignments !== null
      ? {
          maxAssignments: row.tlAssignmentLimit ?? 0,
          currentAssignments: row.tlCurrentAssignments ?? 0,
        }
      : undefined
  return {
    id: row.id,
    email: row.email,
    password: row.password ?? undefined,
    role: row.role,
    createdAt: sanitizeDate(row.createdAt) || new Date().toISOString(),
    lastLogin: sanitizeDate(row.lastLogin),
    tlLimits,
  }
}

export async function createUser(payload: any): Promise<any> {
  const createdAt = payload.createdAt || new Date().toISOString()
  const tlLimits = payload.tlLimits || {}

  const result = await execute(
    `INSERT INTO users (email, password, role, createdAt, lastLogin, tlAssignmentLimit, tlCurrentAssignments)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizeEmail(String(payload.email || '')),
      payload.password || null,
      payload.role,
      createdAt,
      payload.lastLogin || null,
      tlLimits.maxAssignments ?? null,
      tlLimits.currentAssignments ?? null,
    ]
  )

  return {
    id: result.insertId,
    email: normalizeEmail(String(payload.email || '')),
    password: payload.password || undefined,
    role: payload.role,
    createdAt,
    lastLogin: payload.lastLogin,
    tlLimits:
      tlLimits.maxAssignments !== undefined || tlLimits.currentAssignments !== undefined
        ? {
            maxAssignments: tlLimits.maxAssignments ?? 0,
            currentAssignments: tlLimits.currentAssignments ?? 0,
          }
        : undefined,
  }
}

export async function updateUser(id: number, payload: any): Promise<any | null> {
  const existing = await getUserById(id)
  if (!existing) return null

  const nextEmail = payload.email !== undefined ? normalizeEmail(String(payload.email)) : existing.email
  const nextPassword = payload.password !== undefined ? payload.password : existing.password
  const nextRole = payload.role !== undefined ? payload.role : existing.role
  const nextCreatedAt = payload.createdAt !== undefined ? payload.createdAt : existing.createdAt
  const nextLastLogin = payload.lastLogin !== undefined ? payload.lastLogin : existing.lastLogin

  const payloadTl = payload.tlLimits || {}
  const existingTl = existing.tlLimits || {}
  const nextTlLimit =
    payload.tlAssignmentLimit !== undefined
      ? payload.tlAssignmentLimit
      : payloadTl.maxAssignments !== undefined
        ? payloadTl.maxAssignments
        : existingTl.maxAssignments ?? null
  const nextTlCurrent =
    payload.tlCurrentAssignments !== undefined
      ? payload.tlCurrentAssignments
      : payloadTl.currentAssignments !== undefined
        ? payloadTl.currentAssignments
        : existingTl.currentAssignments ?? null

  await execute(
    `UPDATE users
     SET email = ?, password = ?, role = ?, createdAt = ?, lastLogin = ?, tlAssignmentLimit = ?, tlCurrentAssignments = ?
     WHERE id = ?`,
    [
      nextEmail,
      nextPassword || null,
      nextRole,
      nextCreatedAt,
      nextLastLogin || null,
      nextTlLimit,
      nextTlCurrent,
      id,
    ]
  )

  return {
    id,
    email: nextEmail,
    password: nextPassword,
    role: nextRole,
    createdAt: nextCreatedAt,
    lastLogin: nextLastLogin,
    tlLimits:
      nextTlLimit !== null || nextTlCurrent !== null
        ? {
            maxAssignments: nextTlLimit ?? 0,
            currentAssignments: nextTlCurrent ?? 0,
          }
        : undefined,
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  const result = await execute('DELETE FROM users WHERE id = ?', [id])
  return result.affectedRows > 0
}

export async function getSettings(): Promise<{ manPowerLimit: number }> {
  const rows = await query<any>('SELECT id, data FROM settings WHERE id = 1')
  if (!rows.length) {
    return { manPowerLimit: 50 }
  }
  const data = parseJson(rows[0].data)
  return {
    manPowerLimit: Number(data?.manPowerLimit) || 50,
  }
}

export async function updateSettings(payload: Partial<{ manPowerLimit: number }>): Promise<{ manPowerLimit: number }> {
  const current = await getSettings()
  const next = { ...current, ...payload }

  await execute(
    'INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [JSON.stringify(next)]
  )

  return next
}

