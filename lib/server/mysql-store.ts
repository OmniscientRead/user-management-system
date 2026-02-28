import { execute, isMySqlEnabled, query } from '@/lib/server/mysql'
import { normalizeEmail } from '@/lib/email-domain'

type JsonRow = { id: number; data: any; [key: string]: any }

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

function normalizeApplicant(row: JsonRow): any {
  const data = parseJson(row.data)
  return {
    ...data,
    id: row.id,
    name: row.name ?? data.name,
    age: row.age ?? data.age,
    education: row.education ?? data.education,
    course: row.course ?? data.course,
    positionAppliedFor: row.positionAppliedFor ?? data.positionAppliedFor,
    collectionExperience: row.collectionExperience ?? data.collectionExperience,
    referral: row.referral ?? data.referral,
    resumeUrl: row.resumeUrl ?? data.resumeUrl,
    pictureUrl: row.pictureUrl ?? data.pictureUrl,
    status: row.status ?? data.status,
    addedDate: row.addedDate ?? data.addedDate,
    addedBy: row.addedBy ?? data.addedBy,
    assignedTL: row.assignedTL ?? data.assignedTL,
    assignedUserId: row.assignedUserId ?? data.assignedUserId,
    assignedDate: row.assignedDate ?? data.assignedDate,
    approvedBy: row.approvedBy ?? data.approvedBy,
    approvedDate: row.approvedDate ?? data.approvedDate,
    rejectedBy: row.rejectedBy ?? data.rejectedBy,
    rejectedDate: row.rejectedDate ?? data.rejectedDate,
    deletedBy: row.deletedBy ?? data.deletedBy,
    deletedDate: row.deletedDate ?? data.deletedDate,
    resumeData: data.resumeData,
    pictureData: data.pictureData,
  }
}

function normalizeAssignment(row: JsonRow): any {
  const data = parseJson(row.data)
  return {
    ...data,
    id: row.id,
    applicantId: row.applicantId ?? data.applicantId,
    applicantName: row.applicantName ?? data.applicantName,
    positionAppliedFor: row.positionAppliedFor ?? data.positionAppliedFor,
    tlEmail: row.tlEmail ?? data.tlEmail,
    tlName: row.tlName ?? data.tlName,
    assignedBy: row.assignedBy ?? data.assignedBy,
    assignedDate: row.assignedDate ?? data.assignedDate,
    status: row.status ?? data.status,
    resumeUrl: row.resumeUrl ?? data.resumeUrl,
    pictureUrl: row.pictureUrl ?? data.pictureUrl,
    age: row.age ?? data.age,
    education: row.education ?? data.education,
    course: row.course ?? data.course,
    collectionExperience: row.collectionExperience ?? data.collectionExperience,
    referral: row.referral ?? data.referral,
    requestId: row.requestId ?? data.requestId,
    resumeData: data.resumeData,
    pictureData: data.pictureData,
  }
}

function normalizeManpower(row: JsonRow): any {
  const data = parseJson(row.data)
  return {
    ...data,
    id: row.id,
    teamLeadEmail: row.teamLeadEmail ?? data.teamLeadEmail,
    teamLeadName: row.teamLeadName ?? data.teamLeadName,
    tlId: row.tlId ?? data.tlId,
    position: row.position ?? data.position,
    requestedCount: row.requestedCount ?? data.requestedCount,
    limit: row.limit ?? data.limit,
    status: row.status ?? data.status,
    date: row.date ?? data.date,
    createdAt: row.createdAt ?? data.createdAt,
    pdfUrl: row.pdfUrl ?? data.pdfUrl,
    assignedCount: row.assignedCount ?? data.assignedCount,
    pdfData: data.pdfData,
  }
}

function sanitizeDate(value: any): string | undefined {
  if (!value) return undefined
  return typeof value === 'string' ? value : new Date(value).toISOString()
}

export function isUsingMySql(): boolean {
  return isMySqlEnabled()
}

export async function getApplicants(): Promise<any[]> {
  const rows = await query<JsonRow>(
    `SELECT id, data, name, age, education, course, positionAppliedFor, collectionExperience, referral,
            resumeUrl, pictureUrl, status, addedDate, addedBy, assignedTL, assignedUserId, assignedDate,
            approvedBy, approvedDate, rejectedBy, rejectedDate, deletedBy, deletedDate
     FROM ${TABLES.applicants} ORDER BY id ASC`
  )
  return rows.map(normalizeApplicant)
}

export async function getAssignments(): Promise<any[]> {
  const rows = await query<JsonRow>(
    `SELECT id, data, applicantId, applicantName, positionAppliedFor, tlEmail, tlName, assignedBy, assignedDate,
            status, resumeUrl, pictureUrl, age, education, course, collectionExperience, referral, requestId
     FROM ${TABLES.assignments} ORDER BY id ASC`
  )
  return rows.map(normalizeAssignment)
}

export async function getManpowerRequests(): Promise<any[]> {
  const rows = await query<JsonRow>(
    `SELECT id, data, teamLeadEmail, teamLeadName, tlId, position, requestedCount, \`limit\`, status,
            date, createdAt, pdfUrl, assignedCount
     FROM ${TABLES.manpowerRequests} ORDER BY id ASC`
  )
  return rows.map(normalizeManpower)
}

export async function getApplicantsById(id: number): Promise<any | null> {
  const rows = await query<JsonRow>(
    `SELECT id, data, name, age, education, course, positionAppliedFor, collectionExperience, referral,
            resumeUrl, pictureUrl, status, addedDate, addedBy, assignedTL, assignedUserId, assignedDate,
            approvedBy, approvedDate, rejectedBy, rejectedDate, deletedBy, deletedDate
     FROM ${TABLES.applicants} WHERE id = ?`,
    [id]
  )
  if (!rows.length) return null
  return normalizeApplicant(rows[0])
}

export async function getAssignmentsById(id: number): Promise<any | null> {
  const rows = await query<JsonRow>(
    `SELECT id, data, applicantId, applicantName, positionAppliedFor, tlEmail, tlName, assignedBy, assignedDate,
            status, resumeUrl, pictureUrl, age, education, course, collectionExperience, referral, requestId
     FROM ${TABLES.assignments} WHERE id = ?`,
    [id]
  )
  if (!rows.length) return null
  return normalizeAssignment(rows[0])
}

export async function getManpowerRequestById(id: number): Promise<any | null> {
  const rows = await query<JsonRow>(
    `SELECT id, data, teamLeadEmail, teamLeadName, tlId, position, requestedCount, \`limit\`, status,
            date, createdAt, pdfUrl, assignedCount
     FROM ${TABLES.manpowerRequests} WHERE id = ?`,
    [id]
  )
  if (!rows.length) return null
  return normalizeManpower(rows[0])
}

export async function createApplicant(payload: any): Promise<any> {
  const data = { ...payload }
  delete data.id
  const result = await execute(
    `INSERT INTO ${TABLES.applicants}
      (name, age, education, course, positionAppliedFor, collectionExperience, referral,
       resumeUrl, pictureUrl, status, addedDate, addedBy, assignedTL, assignedUserId, assignedDate,
       approvedBy, approvedDate, rejectedBy, rejectedDate, deletedBy, deletedDate, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name ?? null,
      data.age ?? null,
      data.education ?? null,
      data.course ?? null,
      data.positionAppliedFor ?? null,
      data.collectionExperience ?? null,
      data.referral ?? null,
      data.resumeUrl ?? null,
      data.pictureUrl ?? null,
      data.status ?? null,
      data.addedDate ?? null,
      data.addedBy ?? null,
      data.assignedTL ?? null,
      data.assignedUserId ?? null,
      data.assignedDate ?? null,
      data.approvedBy ?? null,
      data.approvedDate ?? null,
      data.rejectedBy ?? null,
      data.rejectedDate ?? null,
      data.deletedBy ?? null,
      data.deletedDate ?? null,
      JSON.stringify(data),
    ]
  )
  return { ...data, id: result.insertId }
}

export async function createAssignment(payload: any): Promise<any> {
  const data = { ...payload }
  delete data.id
  const result = await execute(
    `INSERT INTO ${TABLES.assignments}
      (applicantId, applicantName, positionAppliedFor, tlEmail, tlName, assignedBy, assignedDate,
       status, resumeUrl, pictureUrl, age, education, course, collectionExperience, referral, requestId, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.applicantId ?? null,
      data.applicantName ?? null,
      data.positionAppliedFor ?? null,
      data.tlEmail ?? null,
      data.tlName ?? null,
      data.assignedBy ?? null,
      data.assignedDate ?? null,
      data.status ?? null,
      data.resumeUrl ?? null,
      data.pictureUrl ?? null,
      data.age ?? null,
      data.education ?? null,
      data.course ?? null,
      data.collectionExperience ?? null,
      data.referral ?? null,
      data.requestId ?? null,
      JSON.stringify(data),
    ]
  )
  return { ...data, id: result.insertId }
}

export async function createManpowerRequest(payload: any): Promise<any> {
  const data = { ...payload }
  delete data.id
  const result = await execute(
    `INSERT INTO ${TABLES.manpowerRequests}
      (teamLeadEmail, teamLeadName, tlId, position, requestedCount, \`limit\`, status, date, createdAt, pdfUrl, assignedCount, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.teamLeadEmail ?? null,
      data.teamLeadName ?? null,
      data.tlId ?? null,
      data.position ?? null,
      data.requestedCount ?? null,
      data.limit ?? null,
      data.status ?? null,
      data.date ?? null,
      data.createdAt ?? null,
      data.pdfUrl ?? null,
      data.assignedCount ?? null,
      JSON.stringify(data),
    ]
  )
  return { ...data, id: result.insertId }
}

export async function updateApplicant(id: number, payload: any): Promise<any | null> {
  const existing = await getApplicantsById(id)
  if (!existing) return null
  const updated = { ...existing, ...payload, id }
  await execute(
    `UPDATE ${TABLES.applicants}
     SET name = ?, age = ?, education = ?, course = ?, positionAppliedFor = ?, collectionExperience = ?, referral = ?,
         resumeUrl = ?, pictureUrl = ?, status = ?, addedDate = ?, addedBy = ?, assignedTL = ?, assignedUserId = ?,
         assignedDate = ?, approvedBy = ?, approvedDate = ?, rejectedBy = ?, rejectedDate = ?, deletedBy = ?, deletedDate = ?,
         data = ?
     WHERE id = ?`,
    [
      updated.name ?? null,
      updated.age ?? null,
      updated.education ?? null,
      updated.course ?? null,
      updated.positionAppliedFor ?? null,
      updated.collectionExperience ?? null,
      updated.referral ?? null,
      updated.resumeUrl ?? null,
      updated.pictureUrl ?? null,
      updated.status ?? null,
      updated.addedDate ?? null,
      updated.addedBy ?? null,
      updated.assignedTL ?? null,
      updated.assignedUserId ?? null,
      updated.assignedDate ?? null,
      updated.approvedBy ?? null,
      updated.approvedDate ?? null,
      updated.rejectedBy ?? null,
      updated.rejectedDate ?? null,
      updated.deletedBy ?? null,
      updated.deletedDate ?? null,
      JSON.stringify(updated),
      id,
    ]
  )
  return updated
}

export async function updateAssignment(id: number, payload: any): Promise<any | null> {
  const existing = await getAssignmentsById(id)
  if (!existing) return null
  const updated = { ...existing, ...payload, id }
  await execute(
    `UPDATE ${TABLES.assignments}
     SET applicantId = ?, applicantName = ?, positionAppliedFor = ?, tlEmail = ?, tlName = ?, assignedBy = ?, assignedDate = ?,
         status = ?, resumeUrl = ?, pictureUrl = ?, age = ?, education = ?, course = ?, collectionExperience = ?, referral = ?, requestId = ?,
         data = ?
     WHERE id = ?`,
    [
      updated.applicantId ?? null,
      updated.applicantName ?? null,
      updated.positionAppliedFor ?? null,
      updated.tlEmail ?? null,
      updated.tlName ?? null,
      updated.assignedBy ?? null,
      updated.assignedDate ?? null,
      updated.status ?? null,
      updated.resumeUrl ?? null,
      updated.pictureUrl ?? null,
      updated.age ?? null,
      updated.education ?? null,
      updated.course ?? null,
      updated.collectionExperience ?? null,
      updated.referral ?? null,
      updated.requestId ?? null,
      JSON.stringify(updated),
      id,
    ]
  )
  return updated
}

export async function updateManpowerRequest(id: number, payload: any): Promise<any | null> {
  const existing = await getManpowerRequestById(id)
  if (!existing) return null
  const updated = { ...existing, ...payload, id }
  await execute(
    `UPDATE ${TABLES.manpowerRequests}
     SET teamLeadEmail = ?, teamLeadName = ?, tlId = ?, position = ?, requestedCount = ?, \`limit\` = ?, status = ?, date = ?,
         createdAt = ?, pdfUrl = ?, assignedCount = ?, data = ?
     WHERE id = ?`,
    [
      updated.teamLeadEmail ?? null,
      updated.teamLeadName ?? null,
      updated.tlId ?? null,
      updated.position ?? null,
      updated.requestedCount ?? null,
      updated.limit ?? null,
      updated.status ?? null,
      updated.date ?? null,
      updated.createdAt ?? null,
      updated.pdfUrl ?? null,
      updated.assignedCount ?? null,
      JSON.stringify(updated),
      id,
    ]
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
