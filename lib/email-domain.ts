export const ALLOWED_COMPANY_DOMAINS = [
  'constantinolawoffice.com',
  'constantinolawoffice.net',
] as const

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase()
}

export function isAllowedCompanyEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  const atIndex = normalized.lastIndexOf('@')
  if (atIndex <= 0) return false
  const domain = normalized.slice(atIndex + 1)
  return ALLOWED_COMPANY_DOMAINS.includes(domain as (typeof ALLOWED_COMPANY_DOMAINS)[number])
}

export const COMPANY_EMAIL_ERROR =
  'Email must use @constantinolawoffice.com or @constantinolawoffice.net'
