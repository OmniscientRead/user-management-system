import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getSessionUser } from '@/lib/server/auth'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getExtension(filename: string, mime: string) {
  if (filename && filename.includes('.')) {
    return path.extname(filename)
  }
  if (mime === 'application/pdf') return '.pdf'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/jpeg') return '.jpg'
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr', 'team-lead'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 })
    }

    const mime = file.type
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(mime)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const filename = sanitizeFilename(file.name || 'upload')
    const ext = getExtension(filename, mime)
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(path.join(uploadsDir, safeName), buffer)

    return NextResponse.json({ url: `/uploads/${safeName}` })
  } catch (error) {
    console.error('POST /api/uploads error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
