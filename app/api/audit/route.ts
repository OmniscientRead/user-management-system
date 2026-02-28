import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/server/auth'
import { getAuditLogs } from '@/lib/server/audit-log'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const logs = await getAuditLogs()
    return NextResponse.json(logs)
  } catch (error) {
    console.error('GET /api/audit error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
