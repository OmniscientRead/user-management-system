import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { getSessionByToken } from '@/lib/server/session-store'
import { getUsers, updateUser } from '@/lib/server/mysql-store'
import { readStore, writeStore } from '@/lib/server/data-store'
import { isUsingMySql } from '@/lib/server/mysql-store'

export type SessionUser = {
  id: number
  email: string
  role: 'boss' | 'hr' | 'team-lead' | 'admin'
}

const SESSION_COOKIE = 'session_token'

export function getSessionCookieName() {
  return SESSION_COOKIE
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function isPasswordHash(value?: string | null): boolean {
  return Boolean(value && value.startsWith('$2'))
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const cookie = req.headers.get('cookie') || ''
  const token = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.split('=')[1]

  if (!token) return null

  const session = await getSessionByToken(token)
  if (!session) return null

  if (isUsingMySql()) {
    const users = await getUsers()
    const match = users.find((u) => Number(u.id) === Number(session.userId))
    if (!match) return null
    return { id: match.id, email: match.email, role: match.role }
  }

  const store = await readStore()
  const match = store.users.find((u) => Number(u.id) === Number(session.userId))
  if (!match) return null
  return { id: match.id, email: match.email, role: match.role }
}

export async function upgradePlaintextPassword(userId: number, plain: string): Promise<void> {
  const hashed = await hashPassword(plain)
  if (isUsingMySql()) {
    await updateUser(userId, { password: hashed })
    return
  }

  const store = await readStore()
  const idx = store.users.findIndex((u) => Number(u.id) === Number(userId))
  if (idx >= 0) {
    store.users[idx] = { ...store.users[idx], password: hashed }
    await writeStore(store)
  }
}
