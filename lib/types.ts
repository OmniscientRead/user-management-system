export interface User {
  id: number
  email: string
  password?: string
  role: 'boss' | 'hr' | 'team-lead' | 'admin'
  createdAt: string
  lastLogin?: string
  tlLimits?: {
    maxAssignments: number
    currentAssignments: number
  }
}

export interface Applicant {
  id: number
  name: string
  email: string
  phone: string
  position: string
  department: string
  age: number
  education: string
  experience: number
  resume?: string
  resumeFile?: File
  image?: string
  status: 'pending' | 'approved' | 'rejected' | 'deleted'
  addedDate: string
  approvedBy?: string
  approvedDate?: string
  rejectedBy?: string
  rejectedDate?: string
  deletedBy?: string
  deletedDate?: string
  notes?: string
}

export interface ManpowerRequest {
  id: number
  tlId: number
  tlName: string
  tlEmail: string
  position: string
  department: string
  numberOfRequests: number
  status: 'pending' | 'approved' | 'rejected' | 'deleted'
  requestDate: string
  hrActionBy?: string
  hrActionDate?: string
  adminActionBy?: string
  adminActionDate?: string
  adminNotes?: string
  deletedBy?: string
  deletedDate?: string
}

export interface Assignment {
  id: number
  applicantId: number
  applicantName: string
  tlId: number
  tlName: string
  tlEmail: string
  assignedBy: string
  assignedDate: string
  status: 'active' | 'completed' | 'cancelled'
  department: string
  position: string
}