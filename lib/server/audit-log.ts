import { execute, query } from '@/lib/server/mysql'
import { isUsingMySql } from '@/lib/server/mysql-store'
import { readStore, writeStore } from '@/lib/server/data-store'
import type { SessionUser } from '@/lib/server/auth'

type AuditRecord = {
  id: number
  actorUserId: number
  actorEmail: string
  actorRole: string
  action: 'create' | 'update' | 'delete' | 'assign' | 'approve' | 'reject'
  entity: string
  entityId: number | string
  beforeData?: any
  afterData?: any
  createdAt: string
}

export async function logAudit(
  actor: SessionUser,
  action: AuditRecord['action'],
  entity: string,
  entityId: number | string,
  beforeData: any,
  afterData: any
) {
  const createdAt = new Date().toISOString()
  if (isUsingMySql()) {
    await execute(
      `INSERT INTO audit_logs
        (actorUserId, actorEmail, actorRole, action, entity, entityId, beforeData, afterData, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actor.id,
        actor.email,
        actor.role,
        action,
        entity,
        String(entityId),
        beforeData ? JSON.stringify(beforeData) : null,
        afterData ? JSON.stringify(afterData) : null,
        createdAt,
      ]
    )
    return
  }

  const store = await readStore()
  const nextId = Math.max(0, ...((store as any).auditLogs || []).map((r: any) => Number(r.id) || 0)) + 1
  const record = {
    id: nextId,
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    entity,
    entityId,
    beforeData,
    afterData,
    createdAt,
  }
  ;(store as any).auditLogs = [...((store as any).auditLogs || []), record]
  await writeStore(store as any)
}

export async function getAuditLogs(): Promise<AuditRecord[]> {
  if (isUsingMySql()) {
    const rows = await query<any>(
      `SELECT id, actorUserId, actorEmail, actorRole, action, entity, entityId, beforeData, afterData, createdAt
       FROM audit_logs ORDER BY id DESC`
    )
    return rows.map((row) => ({
      ...row,
      beforeData: row.beforeData ? JSON.parse(row.beforeData) : null,
      afterData: row.afterData ? JSON.parse(row.afterData) : null,
    }))
  }

  const store = await readStore()
  return ((store as any).auditLogs || []) as AuditRecord[]
}
