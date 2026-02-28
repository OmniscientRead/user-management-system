import { NextRequest, NextResponse } from 'next/server'
import { readStore, writeStore, type AppData } from '@/lib/server/data-store'
import { COMPANY_EMAIL_ERROR, isAllowedCompanyEmail, normalizeEmail } from '@/lib/email-domain'
import { getSessionUser, hashPassword, isPasswordHash } from '@/lib/server/auth'
import { canRead, canWrite, type EntityKey } from '@/lib/server/authorize'
import { logAudit } from '@/lib/server/audit-log'
import {
  isUsingMySql,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getApplicants,
  getApplicantsById,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  getAssignments,
  getAssignmentsById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getManpowerRequests,
  getManpowerRequestById,
  createManpowerRequest,
  updateManpowerRequest,
  deleteManpowerRequest,
  getSettings,
  updateSettings,
} from '@/lib/server/mysql-store'

export const runtime = 'nodejs'

type EntityKey = keyof Pick<AppData, 'users' | 'applicants' | 'assignments' | 'manpowerRequests' | 'settings'>

const ENTITIES = new Set<EntityKey>([
  'users',
  'applicants',
  'assignments',
  'manpowerRequests',
  'settings',
])

function toEntity(entity: string): EntityKey | null {
  return ENTITIES.has(entity as EntityKey) ? (entity as EntityKey) : null
}

function nextId(items: any[]): number {
  if (!Array.isArray(items) || items.length === 0) return 1
  return Math.max(...items.map((item) => Number(item?.id) || 0)) + 1
}

function validateApplicant(payload: any): string | null {
  if (!payload) return 'Applicant payload is required'
  const required = ['name', 'age', 'education', 'course', 'positionAppliedFor', 'collectionExperience', 'referral']
  for (const field of required) {
    if (!payload[field]) return `Missing applicant field: ${field}`
  }
  if (!payload.resumeUrl && !payload.resumeData) return 'Resume file is required'
  if (!payload.pictureUrl && !payload.pictureData) return 'Picture file is required'
  return null
}

function withManpowerCounts(requests: any[], assignments: any[]) {
  return requests.map((request) => {
    const position = String(request?.position || '')
    const tlEmail = String(request?.teamLeadEmail || '')
    const requestId = Number(request?.id)

    const assignedCount = assignments.filter((assignment: any) => {
      const isActive = (assignment?.status || 'active') === 'active'
      if (!isActive) return false
      if (Number(assignment?.requestId) === requestId) return true
      const legacyMatch =
        !assignment?.requestId &&
        assignment?.tlEmail === tlEmail &&
        String(assignment?.positionAppliedFor || '') === position
      return legacyMatch
    }).length

    return {
      ...request,
      assignedCount,
    }
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params
    const key = toEntity(entity)
    if (!key) return NextResponse.json({ error: 'Unknown entity' }, { status: 404 })

    const sessionUser = await getSessionUser(_req)
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canRead(key, sessionUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (isUsingMySql()) {
      if (key === 'users') {
        const users = await getUsers()
        return NextResponse.json(users.map(({ password, ...rest }) => rest))
      }
      if (key === 'applicants') return NextResponse.json(await getApplicants())
      if (key === 'assignments') {
        const assignments = await getAssignments()
        if (sessionUser.role === 'team-lead') {
          return NextResponse.json(assignments.filter((a: any) => a.tlEmail === sessionUser.email))
        }
        return NextResponse.json(assignments)
      }
      if (key === 'manpowerRequests') {
        const [requests, assignments] = await Promise.all([getManpowerRequests(), getAssignments()])
        const withCounts = withManpowerCounts(requests, assignments)
        if (sessionUser.role === 'team-lead') {
          return NextResponse.json(withCounts.filter((r: any) => r.teamLeadEmail === sessionUser.email))
        }
        return NextResponse.json(withCounts)
      }
      if (key === 'settings') return NextResponse.json(await getSettings())
    }

  const store = await readStore()
  if (key === 'manpowerRequests') {
      const withCounts = withManpowerCounts(store.manpowerRequests as any[], store.assignments as any[])
      if (sessionUser.role === 'team-lead') {
        return NextResponse.json(withCounts.filter((r: any) => r.teamLeadEmail === sessionUser.email))
      }
      return NextResponse.json(withCounts)
    }

    if (key === 'users') {
      return NextResponse.json((store[key] as any[]).map(({ password, ...rest }) => rest))
    }

  if (key === 'assignments') {
    const assignments = store[key] as any[]
    if (sessionUser.role === 'team-lead') {
      return NextResponse.json(assignments.filter((a) => a.tlEmail === sessionUser.email))
    }
    return NextResponse.json(assignments)
  }

  return NextResponse.json(store[key])
  } catch (error) {
    console.error('GET /api/data error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params
    const key = toEntity(entity)
    if (!key) return NextResponse.json({ error: 'Unknown entity' }, { status: 404 })
    if (key === 'settings') return NextResponse.json({ error: 'Use PUT for settings' }, { status: 400 })

    const sessionUser = await getSessionUser(req)
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canWrite(key, sessionUser, 'POST')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await req.json()

    if (key === 'applicants') {
      const validation = validateApplicant(payload)
      if (validation) return NextResponse.json({ error: validation }, { status: 400 })
    }

    if (isUsingMySql()) {
      if (key === 'users') {
        const email = normalizeEmail(String(payload?.email || ''))
        if (!isAllowedCompanyEmail(email)) {
          return NextResponse.json({ error: COMPANY_EMAIL_ERROR }, { status: 400 })
        }
        const users = await getUsers()
        const exists = users.some((entry) => normalizeEmail(String(entry?.email || '')) === email)
        if (exists) {
          return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
        }
        if (payload?.password) {
          payload.password = isPasswordHash(payload.password)
            ? payload.password
            : await hashPassword(String(payload.password))
        }
        const created = await createUser({ ...payload, email })
        await logAudit(sessionUser, 'create', key, created.id, null, created)
        return NextResponse.json(created, { status: 201 })
      }

      if (key === 'applicants') {
        const created = await createApplicant(payload)
        await logAudit(sessionUser, 'create', key, created.id, null, created)
        return NextResponse.json(created, { status: 201 })
      }
      if (key === 'assignments') {
        const created = await createAssignment(payload)
        await logAudit(sessionUser, 'create', key, created.id, null, created)
        return NextResponse.json(created, { status: 201 })
      }
      if (key === 'manpowerRequests') {
        const created = await createManpowerRequest(payload)
        await logAudit(sessionUser, 'create', key, created.id, null, created)
        return NextResponse.json(created, { status: 201 })
      }
    }

    const store = await readStore()
    const list = store[key] as any[]
    const item = { ...payload }

    if (key === 'users') {
      const email = normalizeEmail(String(item?.email || ''))
      if (!isAllowedCompanyEmail(email)) {
        return NextResponse.json({ error: COMPANY_EMAIL_ERROR }, { status: 400 })
      }
      const exists = list.some((entry) => normalizeEmail(String(entry?.email || '')) === email)
      if (exists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      }
      item.email = email
      if (item?.password) {
        item.password = isPasswordHash(item.password)
          ? item.password
          : await hashPassword(String(item.password))
      }
    }

    if (item.id === undefined || item.id === null) item.id = nextId(list)
    list.push(item)
    await writeStore(store)
    await logAudit(sessionUser, 'create', key, item.id, null, item)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('POST /api/data error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params
    const key = toEntity(entity)
    if (!key) return NextResponse.json({ error: 'Unknown entity' }, { status: 404 })

    const sessionUser = await getSessionUser(req)
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canWrite(key, sessionUser, 'PUT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await req.json()

    if (isUsingMySql()) {
      if (key === 'settings') {
        const before = await getSettings()
        const updated = await updateSettings(payload)
        await logAudit(sessionUser, 'update', key, 1, before, updated)
        return NextResponse.json(updated)
      }

      const id = Number(payload?.id)
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: 'Missing numeric id in payload' }, { status: 400 })
      }

    if (key === 'users') {
      if (payload?.email !== undefined && payload?.email !== null) {
        const nextEmail = normalizeEmail(String(payload.email))
        if (!isAllowedCompanyEmail(nextEmail)) {
          return NextResponse.json({ error: COMPANY_EMAIL_ERROR }, { status: 400 })
        }
          const users = await getUsers()
          const emailTaken = users.some(
            (entry) => Number(entry?.id) !== id && normalizeEmail(String(entry?.email || '')) === nextEmail
          )
        if (emailTaken) {
          return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
        }
        payload.email = nextEmail
      }
      if (payload?.password) {
        payload.password = isPasswordHash(payload.password)
          ? payload.password
          : await hashPassword(String(payload.password))
      }
      const before = await getUserById(id)
      const updated = await updateUser(id, payload)
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await logAudit(sessionUser, 'update', key, id, before, updated)
      return NextResponse.json(updated)
    }

    if (key === 'applicants') {
      const before = await getApplicantsById(id)
      const updated = await updateApplicant(id, payload)
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await logAudit(sessionUser, 'update', key, id, before, updated)
      return NextResponse.json(updated)
    }

    if (key === 'assignments') {
      const before = await getAssignmentsById(id)
      const updated = await updateAssignment(id, payload)
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await logAudit(sessionUser, 'update', key, id, before, updated)
      return NextResponse.json(updated)
    }

    if (key === 'manpowerRequests') {
      const before = await getManpowerRequestById(id)
      const updated = await updateManpowerRequest(id, payload)
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await logAudit(sessionUser, 'update', key, id, before, updated)
      return NextResponse.json(updated)
    }
    }

    const store = await readStore()

    if (key === 'settings') {
      const before = store.settings
      store.settings = {
        ...store.settings,
        ...payload,
      }
      await writeStore(store)
      await logAudit(sessionUser, 'update', key, 1, before, store.settings)
      return NextResponse.json(store.settings)
    }

    const id = Number(payload?.id)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Missing numeric id in payload' }, { status: 400 })
    }

    const list = store[key] as any[]
    const idx = list.findIndex((item) => Number(item?.id) === id)
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (key === 'users') {
      const hasEmail = payload?.email !== undefined && payload?.email !== null
      if (hasEmail) {
        const nextEmail = normalizeEmail(String(payload.email))
        if (!isAllowedCompanyEmail(nextEmail)) {
          return NextResponse.json({ error: COMPANY_EMAIL_ERROR }, { status: 400 })
        }
        const emailTaken = list.some(
          (entry) =>
            Number(entry?.id) !== id &&
            normalizeEmail(String(entry?.email || '')) === nextEmail
        )
        if (emailTaken) {
          return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
        }
        payload.email = nextEmail
      }
    }

    const before = list[idx]
    list[idx] = {
      ...list[idx],
      ...payload,
      id,
    }
    await writeStore(store)
    await logAudit(sessionUser, 'update', key, id, before, list[idx])
    return NextResponse.json(list[idx])
  } catch (error) {
    console.error('PUT /api/data error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params
    const key = toEntity(entity)
    if (!key) return NextResponse.json({ error: 'Unknown entity' }, { status: 404 })
    if (key === 'settings') return NextResponse.json({ error: 'Cannot delete settings' }, { status: 400 })

    const sessionUser = await getSessionUser(req)
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canWrite(key, sessionUser, 'DELETE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = Number(req.nextUrl.searchParams.get('id'))
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 })
    }

    if (isUsingMySql()) {
      let before: any | null = null
      if (key === 'users') before = await getUserById(id)
      if (key === 'applicants') before = await getApplicantsById(id)
      if (key === 'assignments') before = await getAssignmentsById(id)
      if (key === 'manpowerRequests') before = await getManpowerRequestById(id)

      let deleted = false
      if (key === 'users') deleted = await deleteUser(id)
      if (key === 'applicants') deleted = await deleteApplicant(id)
      if (key === 'assignments') deleted = await deleteAssignment(id)
      if (key === 'manpowerRequests') deleted = await deleteManpowerRequest(id)
      if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await logAudit(sessionUser, 'delete', key, id, before, null)
      return NextResponse.json({ ok: true })
    }

    const store = await readStore()
    const list = store[key] as any[]
    const before = list.find((item) => Number(item?.id) === id) || null
    const next = list.filter((item) => Number(item?.id) !== id)
    if (next.length === list.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    ;(store[key] as any[]) = next
    await writeStore(store)
    await logAudit(sessionUser, 'delete', key, id, before, null)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/data error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
