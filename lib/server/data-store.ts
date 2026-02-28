import { promises as fs } from 'fs'
import path from 'path'
import { normalizeEmail } from '@/lib/email-domain'

export type Role = 'boss' | 'hr' | 'team-lead' | 'admin'

export interface UserRecord {
  id: number
  email: string
  password?: string
  role: Role
  createdAt: string
  tlAssignmentLimit?: number
}

export interface AppData {
  users: UserRecord[]
  applicants: any[]
  assignments: any[]
  manpowerRequests: any[]
  sessions: Array<{
    id: number
    userId: number
    token: string
    createdAt: string
    expiresAt: string
  }>
  auditLogs: Array<{
    id: number
    actorUserId: number
    actorEmail: string
    actorRole: string
    action: string
    entity: string
    entityId: number | string
    beforeData?: any
    afterData?: any
    createdAt: string
  }>
  settings: {
    manPowerLimit: number
  }
}

function migrateLegacyEmailDomain(email: string): string {
  const normalized = normalizeEmail(email)
  if (normalized.endsWith('@company.com')) {
    const localPart = normalized.split('@')[0]
    return `${localPart}@constantinolawoffice.com`
  }
  return normalized
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

const defaultUsers: UserRecord[] = [
  { id: 1, email: 'boss@constantinolawoffice.com', password: 'boss123', role: 'boss', createdAt: new Date().toISOString() },
  { id: 2, email: 'hr@constantinolawoffice.com', password: 'hr123', role: 'hr', createdAt: new Date().toISOString() },
  { id: 3, email: 'tl@constantinolawoffice.com', password: 'tl123', role: 'team-lead', createdAt: new Date().toISOString(), tlAssignmentLimit: 5 },
  { id: 4, email: 'admin@constantinolawoffice.com', password: 'admin123', role: 'admin', createdAt: new Date().toISOString() },
]

const defaultData = (): AppData => ({
  users: defaultUsers,
  applicants: [],
  assignments: [],
  manpowerRequests: [],
  sessions: [],
  auditLogs: [],
  settings: {
    manPowerLimit: 50,
  },
})

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true })

  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData(), null, 2), 'utf-8')
  }
}

export async function readStore(): Promise<AppData> {
  await ensureStore()
  const raw = await fs.readFile(DATA_FILE, 'utf-8')

  try {
    const parsed = JSON.parse(raw) as AppData
    const nextData: AppData = {
      ...defaultData(),
      ...parsed,
      users: Array.isArray(parsed.users)
        ? parsed.users.map((user) => ({
            ...user,
            email: migrateLegacyEmailDomain(String(user?.email || '')),
          }))
        : defaultData().users,
      settings: {
        ...defaultData().settings,
        ...(parsed.settings || {}),
      },
    }

    const hasLegacyDomain = Array.isArray(parsed.users)
      && parsed.users.some((user) => String(user?.email || '').toLowerCase().endsWith('@company.com'))

    if (hasLegacyDomain) {
      await fs.writeFile(DATA_FILE, JSON.stringify(nextData, null, 2), 'utf-8')
    }

    return nextData
  } catch {
    const fallback = defaultData()
    await fs.writeFile(DATA_FILE, JSON.stringify(fallback, null, 2), 'utf-8')
    return fallback
  }
}

export async function writeStore(data: AppData): Promise<void> {
  await ensureStore()
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}
