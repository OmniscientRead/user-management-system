import crypto from 'crypto'
import { readStore, writeStore } from '@/lib/server/data-store'
import { execute, query } from '@/lib/server/mysql'
import { isUsingMySql } from '@/lib/server/mysql-store'

type SessionRecord = {
  id: number
  userId: number
  token: string
  createdAt: string
  expiresAt: string
}

const DEFAULT_TTL_HOURS = 24

function nowIso() {
  return new Date().toISOString()
}

function addHours(hours: number) {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString()
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: number, ttlHours = DEFAULT_TTL_HOURS): Promise<SessionRecord> {
  const token = generateToken()
  const createdAt = nowIso()
  const expiresAt = addHours(ttlHours)

  if (isUsingMySql()) {
    const result = await execute(
      'INSERT INTO sessions (userId, token, createdAt, expiresAt) VALUES (?, ?, ?, ?)',
      [userId, token, createdAt, expiresAt]
    )
    return { id: result.insertId, userId, token, createdAt, expiresAt }
  }

  const store = await readStore()
  const nextId = Math.max(0, ...store.sessions.map((s) => s.id)) + 1
  const session = { id: nextId, userId, token, createdAt, expiresAt }
  store.sessions.push(session)
  await writeStore(store)
  return session
}

export async function getSessionByToken(token: string): Promise<SessionRecord | null> {
  if (!token) return null

  if (isUsingMySql()) {
    const rows = await query<SessionRecord>(
      'SELECT id, userId, token, createdAt, expiresAt FROM sessions WHERE token = ? LIMIT 1',
      [token]
    )
    if (!rows.length) return null
    const session = rows[0]
    if (new Date(session.expiresAt) <= new Date()) {
      await deleteSession(token)
      return null
    }
    return session
  }

  const store = await readStore()
  const session = store.sessions.find((s) => s.token === token)
  if (!session) return null
  if (new Date(session.expiresAt) <= new Date()) {
    store.sessions = store.sessions.filter((s) => s.token !== token)
    await writeStore(store)
    return null
  }
  return session
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return

  if (isUsingMySql()) {
    await execute('DELETE FROM sessions WHERE token = ?', [token])
    return
  }

  const store = await readStore()
  store.sessions = store.sessions.filter((s) => s.token !== token)
  await writeStore(store)
}
