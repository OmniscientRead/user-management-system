import { 
  initDB, 
  getAllApplicants as getApplicantsFromDB,
  addApplicant as addApplicantToDB,
  updateApplicantStatus as updateStatusInDB,
  getAllAssignments as getAssignmentsFromDB,
  addAssignment as addAssignmentToDB,
  getAssignmentsByTL as getTLAssignmentsFromDB
} from './db'
import { Applicant, ManpowerRequest, Assignment, User } from './types'

// Manpower Requests store (needs to be added to your db.ts)
const MANPOWER_STORE = 'manpower_requests'
const USERS_STORE = 'users'

class DataService {
  // ========== INITIALIZE ADDITIONAL STORES ==========
  
  async initAdditionalStores() {
    const database = await initDB()
    
    // Check if we need to add new stores
    if (!database.objectStoreNames.contains(MANPOWER_STORE)) {
      const version = database.version + 1
      database.close()
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('applicant_db', version)
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          
          if (!db.objectStoreNames.contains(MANPOWER_STORE)) {
            const store = db.createObjectStore(MANPOWER_STORE, { keyPath: 'id' })
            store.createIndex('tlId', 'tlId', { unique: false })
            store.createIndex('status', 'status', { unique: false })
            store.createIndex('requestDate', 'requestDate', { unique: false })
          }
          
          if (!db.objectStoreNames.contains(USERS_STORE)) {
            const store = db.createObjectStore(USERS_STORE, { keyPath: 'id' })
            store.createIndex('email', 'email', { unique: true })
            store.createIndex('role', 'role', { unique: false })
          }
        }
        
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }
  }

  // ========== APPLICANT OPERATIONS (using existing db.ts) ==========
  
  async getAllApplicants(): Promise<Applicant[]> {
    return await getApplicantsFromDB()
  }

  async getPendingApplicants(): Promise<Applicant[]> {
    const all = await this.getAllApplicants()
    return all.filter(a => a.status === 'pending')
  }

  async getApprovedApplicants(): Promise<Applicant[]> {
    const all = await this.getAllApplicants()
    return all.filter(a => a.status === 'approved')
  }

  async getRejectedApplicants(): Promise<Applicant[]> {
    const all = await this.getAllApplicants()
    return all.filter(a => a.status === 'rejected')
  }

  async approveApplicant(applicantId: number, approvedBy: string): Promise<Applicant | null> {
    const applicants = await this.getAllApplicants()
    const applicant = applicants.find(a => a.id === applicantId)
    
    if (applicant) {
      const updatedApplicant = {
        ...applicant,
        status: 'approved' as const,
        approvedBy,
        approvedDate: new Date().toISOString()
      }
      
      await updateStatusInDB(applicantId, 'approved')
      
      // Update additional fields in a separate operation
      await this.updateApplicantDetails(applicantId, {
        approvedBy,
        approvedDate: new Date().toISOString()
      })
      
      // Try to create assignment from approved applicant
      await this.createAssignmentFromApproval(updatedApplicant)
      
      return updatedApplicant
    }
    return null
  }

  async rejectApplicant(applicantId: number, rejectedBy: string): Promise<Applicant | null> {
    const applicants = await this.getAllApplicants()
    const applicant = applicants.find(a => a.id === applicantId)
    
    if (applicant) {
      await updateStatusInDB(applicantId, 'rejected')
      
      await this.updateApplicantDetails(applicantId, {
        rejectedBy,
        rejectedDate: new Date().toISOString()
      })
      
      return { ...applicant, status: 'rejected' }
    }
    return null
  }

  async deleteApplicant(applicantId: number, deletedBy: string): Promise<boolean> {
    await updateStatusInDB(applicantId, 'deleted')
    
    await this.updateApplicantDetails(applicantId, {
      deletedBy,
      deletedDate: new Date().toISOString()
    })
    
    // Remove from assignments
    await this.removeApplicantFromAssignments(applicantId)
    
    return true
  }

  async permanentDeleteApplicant(applicantId: number): Promise<boolean> {
    const database = await initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['applicants'], 'readwrite')
      const store = transaction.objectStore('applicants')
      const request = store.delete(applicantId)
      
      request.onsuccess = () => {
        this.removeApplicantFromAssignments(applicantId)
        resolve(true)
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async updateApplicantDetails(applicantId: number, details: any): Promise<void> {
    const database = await initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['applicants'], 'readwrite')
      const store = transaction.objectStore('applicants')
      const getRequest = store.get(applicantId)
      
      getRequest.onsuccess = () => {
        const applicant = getRequest.result
        if (applicant) {
          const updated = { ...applicant, ...details }
          store.put(updated)
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // ========== MANPOWER REQUEST OPERATIONS ==========

  async getAllManpowerRequests(): Promise<ManpowerRequest[]> {
    const database = await initDB()
    
    // Check if store exists, if not return empty array
    if (!database.objectStoreNames.contains(MANPOWER_STORE)) {
      return []
    }
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MANPOWER_STORE], 'readonly')
      const store = transaction.objectStore(MANPOWER_STORE)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getRequestsByTL(tlId: number): Promise<ManpowerRequest[]> {
    const all = await this.getAllManpowerRequests()
    return all.filter(r => r.tlId === tlId && r.status !== 'deleted')
  }

  async getPendingRequests(): Promise<ManpowerRequest[]> {
    const all = await this.getAllManpowerRequests()
    return all.filter(r => r.status === 'pending' && r.status !== 'deleted')
  }

  async createManpowerRequest(request: Omit<ManpowerRequest, 'id'>): Promise<ManpowerRequest> {
    const database = await initDB()
    await this.initAdditionalStores()
    
    const newRequest: ManpowerRequest = {
      ...request,
      id: Date.now()
    }
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MANPOWER_STORE], 'readwrite')
      const store = transaction.objectStore(MANPOWER_STORE)
      const addRequest = store.add(newRequest)
      
      addRequest.onsuccess = () => resolve(newRequest)
      addRequest.onerror = () => reject(addRequest.error)
    })
  }

  async approveManpowerRequest(requestId: number, approvedBy: string, role: 'hr' | 'admin'): Promise<ManpowerRequest | null> {
    const database = await initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MANPOWER_STORE], 'readwrite')
      const store = transaction.objectStore(MANPOWER_STORE)
      const getRequest = store.get(requestId)
      
      getRequest.onsuccess = () => {
        const request = getRequest.result
        if (request) {
          if (role === 'hr') {
            request.hrActionBy = approvedBy
            request.hrActionDate = new Date().toISOString()
          } else {
            request.status = 'approved'
            request.adminActionBy = approvedBy
            request.adminActionDate = new Date().toISOString()
          }
          
          const updateRequest = store.put(request)
          updateRequest.onsuccess = () => resolve(request)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve(null)
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteManpowerRequest(requestId: number, deletedBy: string): Promise<boolean> {
    const database = await initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MANPOWER_STORE], 'readwrite')
      const store = transaction.objectStore(MANPOWER_STORE)
      const getRequest = store.get(requestId)
      
      getRequest.onsuccess = () => {
        const request = getRequest.result
        if (request) {
          request.status = 'deleted'
          request.deletedBy = deletedBy
          request.deletedDate = new Date().toISOString()
          
          const updateRequest = store.put(request)
          updateRequest.onsuccess = () => resolve(true)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve(false)
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async permanentDeleteManpowerRequest(requestId: number): Promise<boolean> {
    const database = await initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MANPOWER_STORE], 'readwrite')
      const store = transaction.objectStore(MANPOWER_STORE)
      const request = store.delete(requestId)
      
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  // ========== USER/TL LIMIT OPERATIONS ==========

  async getAllUsers(): Promise<User[]> {
    const database = await initDB()
    
    // Check if store exists, if not return empty array
    if (!database.objectStoreNames.contains(USERS_STORE)) {
      // Initialize with default users if needed
      await this.initAdditionalStores()
      return this.getDefaultUsers()
    }
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([USERS_STORE], 'readonly')
      const store = transaction.objectStore(USERS_STORE)
      const request = store.getAll()
      
      request.onsuccess = () => {
        const users = request.result
        if (users.length === 0) {
          // If no users, initialize with defaults
          resolve(this.getDefaultUsers())
        } else {
          resolve(users)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async getDefaultUsers(): Promise<User[]> {
    const defaultUsers: User[] = [
      { id: 1, email: 'admin@constantinolawoffice.com', role: 'admin', createdAt: new Date().toISOString() },
      { id: 2, email: 'boss@constantinolawoffice.com', role: 'boss', createdAt: new Date().toISOString() },
      { id: 3, email: 'hr@constantinolawoffice.com', role: 'hr', createdAt: new Date().toISOString() },
      { id: 4, email: 'tl@constantinolawoffice.com', role: 'team-lead', createdAt: new Date().toISOString() },
    ]
    
    // Save to database
    for (const user of defaultUsers) {
      await this.saveUser(user)
    }
    
    return defaultUsers
  }

  private async saveUser(user: User): Promise<void> {
    const database = await initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([USERS_STORE], 'readwrite')
      const store = transaction.objectStore(USERS_STORE)
      const request = store.add(user)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getTeamLeads(): Promise<User[]> {
    const users = await this.getAllUsers()
    return users.filter(u => u.role === 'team-lead')
  }

  async setTLLimit(tlId: number, maxAssignments: number): Promise<User | null> {
    const database = await initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([USERS_STORE], 'readwrite')
      const store = transaction.objectStore(USERS_STORE)
      const getRequest = store.get(tlId)
      
      getRequest.onsuccess = async () => {
        const user = getRequest.result
        if (user && user.role === 'team-lead') {
          const currentAssignments = (await this.getTLAssignments(tlId)).length
          
          user.tlLimits = {
            maxAssignments,
            currentAssignments
          }
          
          const updateRequest = store.put(user)
          updateRequest.onsuccess = () => resolve(user)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve(null)
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async getTLLimit(tlId: number): Promise<number> {
    const database = await initDB()
    
    return new Promise((resolve) => {
      const transaction = database.transaction([USERS_STORE], 'readonly')
      const store = transaction.objectStore(USERS_STORE)
      const getRequest = store.get(tlId)
      
      getRequest.onsuccess = () => {
        const user = getRequest.result
        resolve(user?.tlLimits?.maxAssignments || 5)
      }
      getRequest.onerror = () => resolve(5)
    })
  }

  async canAssignMore(tlId: number): Promise<boolean> {
    const limit = await this.getTLLimit(tlId)
    const current = (await this.getTLAssignments(tlId)).length
    return current < limit
  }

  // ========== ASSIGNMENT OPERATIONS (using existing db.ts) ==========

  async getAllAssignments(): Promise<Assignment[]> {
    return await getAssignmentsFromDB()
  }

  async getTLAssignments(tlId: number): Promise<Assignment[]> {
    const all = await this.getAllAssignments()
    return all.filter(a => a.tlId === tlId && a.status === 'active')
  }

  async createAssignment(assignment: Omit<Assignment, 'id'>): Promise<Assignment | null> {
    const canAssign = await this.canAssignMore(assignment.tlId)
    if (!canAssign) return null
    
    const newAssignment: Assignment = {
      ...assignment,
      id: Date.now()
    }
    
    await addAssignmentToDB(newAssignment)
    
    // Update TL's current assignment count
    await this.updateTLCurrentAssignments(assignment.tlId)
    
    return newAssignment
  }

  private async updateTLCurrentAssignments(tlId: number) {
    const database = await initDB()
    const currentAssignments = (await this.getTLAssignments(tlId)).length
    
    return new Promise((resolve) => {
      const transaction = database.transaction([USERS_STORE], 'readwrite')
      const store = transaction.objectStore(USERS_STORE)
      const getRequest = store.get(tlId)
      
      getRequest.onsuccess = () => {
        const user = getRequest.result
        if (user && user.tlLimits) {
          user.tlLimits.currentAssignments = currentAssignments
          store.put(user)
        }
        resolve(true)
      }
      getRequest.onerror = () => resolve(false)
    })
  }

  // ========== HELPER METHODS ==========

  private async createAssignmentFromApproval(applicant: Applicant) {
    const requests = await this.getAllManpowerRequests()
    const matchingRequest = requests.find(r => 
      r.position === applicant.position && 
      r.department === applicant.department &&
      r.status === 'approved'
    )
    
    if (matchingRequest && await this.canAssignMore(matchingRequest.tlId)) {
      await this.createAssignment({
        applicantId: applicant.id,
        applicantName: applicant.name,
        tlId: matchingRequest.tlId,
        tlName: matchingRequest.tlName,
        tlEmail: matchingRequest.tlEmail,
        assignedBy: 'system',
        assignedDate: new Date().toISOString(),
        status: 'active',
        department: applicant.department,
        position: applicant.position
      })
    }
  }

  private async removeApplicantFromAssignments(applicantId: number) {
    const database = await initDB()
    const assignments = await this.getAllAssignments()
    
    for (const assignment of assignments) {
      if (assignment.applicantId === applicantId) {
        const transaction = database.transaction(['assignments'], 'readwrite')
        const store = transaction.objectStore('assignments')
        await store.delete(assignment.id)
      }
    }
  }
}

export const dataService = new DataService()
