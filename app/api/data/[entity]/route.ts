import { NextRequest, NextResponse } from 'next/server'
import { readStore, writeStore, type AppData } from '@/lib/server/data-store'
import { COMPANY_EMAIL_ERROR, isAllowedCompanyEmail, normalizeEmail } from '@/lib/email-domain'
import {
  isUsingMySql,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getApplicants,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getManpowerRequests,
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

    if (isUsingMySql()) {
      if (key === 'users') return NextResponse.json(await getUsers())
      if (key === 'applicants') return NextResponse.json(await getApplicants())
      if (key === 'assignments') return NextResponse.json(await getAssignments())
      if (key === 'manpowerRequests') {
        const [requests, assignments] = await Promise.all([getManpowerRequests(), getAssignments()])
        return NextResponse.json(withManpowerCounts(requests, assignments))
      }
      if (key === 'settings') return NextResponse.json(await getSettings())
    }

    const store = await readStore()
    if (key === 'manpowerRequests') {
      return NextResponse.json(withManpowerCounts(store.manpowerRequests as any[], store.assignments as any[]))
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

    const payload = await req.json()

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
        const created = await createUser({ ...payload, email })
        return NextResponse.json(created, { status: 201 })
      }

      if (key === 'applicants') return NextResponse.json(await createApplicant(payload), { status: 201 })
      if (key === 'assignments') return NextResponse.json(await createAssignment(payload), { status: 201 })
      if (key === 'manpowerRequests') {
        return NextResponse.json(await createManpowerRequest(payload), { status: 201 })
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
    }

    if (item.id === undefined || item.id === null) item.id = nextId(list)
    list.push(item)
    await writeStore(store)
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

    const payload = await req.json()

    if (isUsingMySql()) {
      if (key === 'settings') {
        return NextResponse.json(await updateSettings(payload))
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
        const updated = await updateUser(id, payload)
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json(updated)
      }

      if (key === 'applicants') {
        const updated = await updateApplicant(id, payload)
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json(updated)
      }

      if (key === 'assignments') {
        const updated = await updateAssignment(id, payload)
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json(updated)
      }

      if (key === 'manpowerRequests') {
        const updated = await updateManpowerRequest(id, payload)
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json(updated)
      }
    }

    const store = await readStore()

    if (key === 'settings') {
      store.settings = {
        ...store.settings,
        ...payload,
      }
      await writeStore(store)
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

    list[idx] = {
      ...list[idx],
      ...payload,
      id,
    }
    await writeStore(store)
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

    const id = Number(req.nextUrl.searchParams.get('id'))
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 })
    }

    if (isUsingMySql()) {
      let deleted = false
      if (key === 'users') deleted = await deleteUser(id)
      if (key === 'applicants') deleted = await deleteApplicant(id)
      if (key === 'assignments') deleted = await deleteAssignment(id)
      if (key === 'manpowerRequests') deleted = await deleteManpowerRequest(id)
      if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    const store = await readStore()
    const list = store[key] as any[]
    const next = list.filter((item) => Number(item?.id) !== id)
    if (next.length === list.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    ;(store[key] as any[]) = next
    await writeStore(store)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/data error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
