export const POSITION_OPTIONS = [
  'Telecollector',
  'Bank Admin',
  'Team Leader',
  'Repossessor',
  'Field Collector',
  'Messenger',
  'Maintenance',
  'Company Driver',
  'Security Personnel',
  'Human Resource',
  'Accounting',
  'Analytics',
  'IT Department',
] as const

export type PositionOption = (typeof POSITION_OPTIONS)[number]

