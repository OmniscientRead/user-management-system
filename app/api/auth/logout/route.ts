import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/server/session-store'
import { getSessionCookieName } from '@/lib/server/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const token = cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${getSessionCookieName()}=`))
      ?.split('=')[1]

    if (token) {
      await deleteSession(token)
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(getSessionCookieName(), '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return response
  } catch (error) {
    console.error('POST /api/auth/logout error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
