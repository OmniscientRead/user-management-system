import { NextRequest, NextResponse } from 'next/server'
import { COMPANY_EMAIL_ERROR, isAllowedCompanyEmail, normalizeEmail } from '@/lib/email-domain'
import { createSession } from '@/lib/server/session-store'
import { getUsers } from '@/lib/server/mysql-store'
import { readStore } from '@/lib/server/data-store'
import { getSessionCookieName, isPasswordHash, upgradePlaintextPassword, verifyPassword } from '@/lib/server/auth'
import { isUsingMySql } from '@/lib/server/mysql-store'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const normalizedEmail = normalizeEmail(String(email || ''))

    if (!isAllowedCompanyEmail(normalizedEmail)) {
      return NextResponse.json({ error: COMPANY_EMAIL_ERROR }, { status: 400 })
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    let user: any | undefined
    if (isUsingMySql()) {
      const users = await getUsers()
      user = users.find((u) => normalizeEmail(u.email) === normalizedEmail)
    } else {
      const store = await readStore()
      user = store.users.find((u) => normalizeEmail(u.email) === normalizedEmail)
    }

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const storedPassword = String(user.password || '')
    const isHash = isPasswordHash(storedPassword)
    const matches = isHash
      ? await verifyPassword(String(password), storedPassword)
      : storedPassword === String(password)

    if (!matches) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!isHash) {
      await upgradePlaintextPassword(user.id, String(password))
    }

    const session = await createSession(user.id)
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    response.cookies.set(getSessionCookieName(), session.token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    return response
  } catch (error) {
    console.error('POST /api/auth/login error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
