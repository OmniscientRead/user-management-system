import { api } from '@/lib/api'

export const initDB = async (): Promise<null> => null

export const addApplicant = async (applicantData: any): Promise<void> => {
  await api.postEntity('applicants', applicantData)
}

export const putApplicant = async (applicantData: any): Promise<void> => {
  await api.putEntity('applicants', applicantData)
}

export const getAllApplicants = async (): Promise<any[]> => {
  return api.getEntity<any[]>('applicants')
}

export const updateApplicantStatus = async (
  id: number,
  status: string
): Promise<void> => {
  await api.putEntity('applicants', { id, status })
}

export const deleteApplicant = async (id: number): Promise<void> => {
  await api.deleteEntity('applicants', id)
}

export const getApplicantsByStatus = async (status: string): Promise<any[]> => {
  const all = await getAllApplicants()
  return all.filter((item) => item.status === status)
}

export const addAssignment = async (assignmentData: any): Promise<void> => {
  await api.postEntity('assignments', assignmentData)
}

export const putAssignment = async (assignmentData: any): Promise<void> => {
  await api.putEntity('assignments', assignmentData)
}

export const deleteAssignment = async (id: number): Promise<void> => {
  await api.deleteEntity('assignments', id)
}

export const getAllAssignments = async (): Promise<any[]> => {
  return api.getEntity<any[]>('assignments')
}

export const getAssignmentsByTL = async (tlEmail: string): Promise<any[]> => {
  const all = await getAllAssignments()
  return all.filter((item) => item.tlEmail === tlEmail)
}

export const getAllUsers = async (): Promise<any[]> => {
  return api.getEntity<any[]>('users')
}

export const addUser = async (userData: any): Promise<void> => {
  await api.postEntity('users', userData)
}

export const putUser = async (userData: any): Promise<void> => {
  await api.putEntity('users', userData)
}

export const deleteUser = async (id: number): Promise<void> => {
  await api.deleteEntity('users', id)
}

export const getAllManpowerRequests = async (): Promise<any[]> => {
  return api.getEntity<any[]>('manpowerRequests')
}

export const addManpowerRequest = async (requestData: any): Promise<void> => {
  await api.postEntity('manpowerRequests', requestData)
}

export const putManpowerRequest = async (requestData: any): Promise<void> => {
  await api.putEntity('manpowerRequests', requestData)
}

export const deleteManpowerRequest = async (id: number): Promise<void> => {
  await api.deleteEntity('manpowerRequests', id)
}

export const getSettings = async (): Promise<{ manPowerLimit: number }> => {
  return api.getEntity<{ manPowerLimit: number }>('settings')
}

export const updateSettings = async (settings: Partial<{ manPowerLimit: number }>): Promise<void> => {
  await api.putEntity('settings', settings)
}

export const claimApplicant = async (
  applicantId: number,
  tlEmail: string,
  assignedBy: string
): Promise<any> => {
  return api.claimAssignment({ applicantId, tlEmail, assignedBy })
}
