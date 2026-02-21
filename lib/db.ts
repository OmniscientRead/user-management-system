// IndexedDB utility for storing applicant data with files
const DB_NAME = 'applicant_db'
const DB_VERSION = 2
const STORE_NAME = 'applicants'
const ASSIGNMENTS_STORE = 'assignments'

let db: IDBDatabase | null = null

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('addedDate', 'addedDate', { unique: false })
      }
      if (!database.objectStoreNames.contains(ASSIGNMENTS_STORE)) {
        const store = database.createObjectStore(ASSIGNMENTS_STORE, {
          keyPath: 'id',
        })
        store.createIndex('applicantId', 'applicantId', { unique: false })
        store.createIndex('assignedDate', 'assignedDate', { unique: false })
        store.createIndex('tlEmail', 'tlEmail', { unique: false })
      }
    }
  })
}

export const addApplicant = async (applicantData: any): Promise<void> => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(applicantData)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export const getAllApplicants = async (): Promise<any[]> => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export const updateApplicantStatus = async (
  id: number,
  status: string
): Promise<void> => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const applicant = getRequest.result
      if (applicant) {
        applicant.status = status
        const updateRequest = store.put(applicant)
        updateRequest.onerror = () => reject(updateRequest.error)
        updateRequest.onsuccess = () => resolve()
      } else {
        reject(new Error('Applicant not found'))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export const getApplicantsByStatus = async (status: string): Promise<any[]> => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('status')
    const request = index.getAll(status)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export const addAssignment = async (assignmentData: any): Promise<void> => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ASSIGNMENTS_STORE], 'readwrite')
    const store = transaction.objectStore(ASSIGNMENTS_STORE)
    const request = store.add(assignmentData)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export const getAllAssignments = async (): Promise<any[]> => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ASSIGNMENTS_STORE], 'readonly')
    const store = transaction.objectStore(ASSIGNMENTS_STORE)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export const getAssignmentsByTL = async (tlEmail: string): Promise<any[]> => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ASSIGNMENTS_STORE], 'readonly')
    const store = transaction.objectStore(ASSIGNMENTS_STORE)
    const index = store.index('tlEmail')
    const request = index.getAll(tlEmail)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}
