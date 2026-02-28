import { SessionUser } from '@/lib/server/auth'

export type EntityKey = 'users' | 'applicants' | 'assignments' | 'manpowerRequests' | 'settings'
export type WriteMethod = 'POST' | 'PUT' | 'DELETE'

export function canRead(entity: EntityKey, user: SessionUser): boolean {
  if (entity === 'users') return user.role === 'admin'
  if (entity === 'settings') return user.role === 'admin'
  if (entity === 'assignments') return ['admin', 'hr', 'boss', 'team-lead'].includes(user.role)
  if (entity === 'applicants') return ['admin', 'hr', 'boss', 'team-lead'].includes(user.role)
  if (entity === 'manpowerRequests') return ['admin', 'hr', 'team-lead'].includes(user.role)
  return false
}

export function canWrite(entity: EntityKey, user: SessionUser, method: WriteMethod): boolean {
  if (entity === 'users') return user.role === 'admin'
  if (entity === 'settings') return user.role === 'admin'
  if (entity === 'manpowerRequests') {
    if (method === 'POST') return user.role === 'team-lead'
    return user.role === 'admin' || user.role === 'hr'
  }
  if (entity === 'assignments') {
    return user.role === 'admin'
  }
  if (entity === 'applicants') {
    if (method === 'POST') return user.role === 'admin' || user.role === 'hr'
    if (method === 'PUT') return user.role === 'admin' || user.role === 'hr' || user.role === 'boss'
    if (method === 'DELETE') return user.role === 'admin'
  }
  return false
}
