'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  addApplicant,
  claimApplicant,
  deleteApplicant,
  deleteAssignment,
  getAllApplicants,
  getAllAssignments,
  getAllUsers,
  getSettings,
  updateApplicantStatus,
} from '@/lib/db'
import { getPdfObjectUrl } from '@/lib/pdf'
import { POSITION_OPTIONS } from '@/lib/positions'
import './applicants.css'

interface Applicant {
  id: number
  name: string
  age: number
  education: string
  course: string
  positionAppliedFor?: string
  collectionExperience: string
  referral: string
  resumeData: string
  pictureData: string
  status: 'pending' | 'approved' | 'rejected' | 'assigned'
  addedDate: string
  assignedTL?: string
}

interface UserRecord {
  id: number
  email: string
  role: 'boss' | 'hr' | 'team-lead' | 'admin'
}

export default function AdminApplicantsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [teamLeads, setTeamLeads] = useState<UserRecord[]>([])
  const [message, setMessage] = useState({ text: '', type: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [showResume, setShowResume] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    message: string
    variant: 'danger' | 'warning' | 'default'
    onConfirm: () => void
  }>({
    open: false,
    title: 'Confirm Action',
    message: '',
    variant: 'warning',
    onConfirm: () => {},
  })
  const [resumeUrl, setResumeUrl] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    education: '',
    course: '',
    positionAppliedFor: '',
    collectionExperience: '',
    referral: '',
    resume: null as File | null,
    picture: null as File | null,
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }

    const userData = JSON.parse(storedUser)
    if (userData.role !== 'admin') {
      router.push('/')
      return
    }

    setUser(userData)
    loadData()
  }, [router])

  const loadData = async () => {
    const allApplicants = (await getAllApplicants()) as Applicant[]
    setApplicants(allApplicants)

    const allUsers = (await getAllUsers()) as UserRecord[]
    setTeamLeads(allUsers.filter((u) => u.role === 'team-lead'))
  }

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleStatusChange = async (id: number, newStatus: 'approved' | 'rejected') => {
    if (newStatus === 'approved') {
      const settings = await getSettings()
      const manPowerLimit = Number(settings.manPowerLimit || 50)
      const approvedCount = applicants.filter((a) => a.status === 'approved').length
      if (approvedCount >= manPowerLimit) {
        showToast(`Man power limit reached (${manPowerLimit} approved applicants)`, 'error')
        return
      }
    }

    await updateApplicantStatus(id, newStatus)
    await loadData()
    showToast(`Applicant ${newStatus} successfully`, 'success')
  }

  const handleAssignToTL = async (applicantId: number, tlEmail: string) => {
    const applicantToAssign = applicants.find((a) => a.id === applicantId)
    if (!applicantToAssign) {
      showToast('Applicant not found', 'error')
      return
    }

    try {
      await claimApplicant(applicantId, tlEmail, user?.email || 'admin')
      await loadData()
      showToast('Applicant assigned to Team Lead', 'success')
    } catch (error: any) {
      const rawMessage = error?.message || 'Failed to assign applicant'
      showToast(rawMessage.replace(/^\{\"error\":\"|\"\}$/g, ''), 'error')
      await loadData()
    }
  }

  const handleDeleteApplicant = async (id: number, name: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Applicant',
      message: `Delete applicant "${name}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }))
        await deleteApplicant(id)

        const assignments = await getAllAssignments()
        const assignmentsToDelete = assignments.filter((a: { applicantId: number }) => a.applicantId === id)
        for (const assignment of assignmentsToDelete) {
          await deleteAssignment(Number(assignment.id))
        }

        await loadData()
        showToast('Applicant deleted successfully', 'success')
      },
    })
  }

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (!file) {
      setFormData((prev) => ({ ...prev, resume: null }))
      return
    }

    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF resume', 'error')
      return
    }

    setFormData((prev) => ({ ...prev, resume: file }))
  }

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (!file) {
      setFormData((prev) => ({ ...prev, picture: null }))
      return
    }

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      showToast('Please upload PNG or JPG photo', 'error')
      return
    }

    setFormData((prev) => ({ ...prev, picture: file }))
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const handleAddApplicant = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.name ||
      !formData.age ||
      !formData.education ||
      !formData.course ||
      !formData.positionAppliedFor ||
      !formData.collectionExperience ||
      !formData.referral ||
      !formData.resume ||
      !formData.picture
    ) {
      showToast('Please complete all applicant fields', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      setConfirmState({
        open: true,
        title: 'Add Applicant',
        message: 'Add this applicant now?',
        variant: 'default',
        onConfirm: async () => {
          setConfirmState((prev) => ({ ...prev, open: false }))
          const [resumeData, pictureData] = await Promise.all([
            fileToBase64(formData.resume),
            fileToBase64(formData.picture),
          ])

          await addApplicant({
            id: Date.now(),
            name: formData.name,
            age: Number(formData.age),
            education: formData.education,
            course: formData.course,
            positionAppliedFor: formData.positionAppliedFor,
            collectionExperience: formData.collectionExperience,
            referral: formData.referral,
            resumeData,
            pictureData,
            status: 'pending',
            addedDate: new Date().toISOString().split('T')[0],
            addedBy: user?.email,
          })

          setFormData({
            name: '',
            age: '',
            education: '',
            course: '',
            positionAppliedFor: '',
            collectionExperience: '',
            referral: '',
            resume: null,
            picture: null,
          })
          setShowAddForm(false)
          await loadData()
          showToast('Applicant added successfully', 'success')
        },
      })
    } catch {
      showToast('Failed to add applicant', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const viewResume = (applicant: Applicant) => {
    setSelectedApplicant(applicant)
    setShowResume(true)
  }

  useEffect(() => {
    if (!showResume || !selectedApplicant?.resumeData) {
      if (resumeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(resumeUrl)
      }
      setResumeUrl('')
      return
    }

    const nextUrl = getPdfObjectUrl(selectedApplicant.resumeData)
    if (resumeUrl.startsWith('blob:')) {
      URL.revokeObjectURL(resumeUrl)
    }
    setResumeUrl(nextUrl)
    return () => {
      if (nextUrl.startsWith('blob:')) {
        URL.revokeObjectURL(nextUrl)
      }
    }
  }, [showResume, selectedApplicant?.resumeData])

  const filteredApplicants = applicants.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.education.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (!user) {
    return (
      <div className="admin-applicants-container">
        <Sidebar role="admin" userName="Admin" />
        <div className="admin-applicants-content">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-applicants-container">
      <Sidebar role="admin" userName={user.email} />

      <div className="admin-applicants-content">
        <h1>Manage Applicants</h1>
        <p className="subtitle">Review, approve/reject, assign, add, and delete applicants</p>

        {message.text && <div className={`message message-${message.type}`}>{message.text}</div>}

        <div className="applicants-actions">
          <button className="btn-add-applicant" onClick={() => setShowAddForm((prev) => !prev)}>
            {showAddForm ? 'Close Add Applicant' : 'Add Applicant'}
          </button>
        </div>

        {showAddForm && (
          <div className="add-user-form add-applicant-form">
            <h2>Add Applicant</h2>
            <form onSubmit={handleAddApplicant}>
              <div className="form-group">
                <label>Name *</label>
                <input name="name" value={formData.name} onChange={handleFieldChange} required />
              </div>

              <div className="form-group">
                <label>Age *</label>
                <input type="number" min="18" name="age" value={formData.age} onChange={handleFieldChange} required />
              </div>

              <div className="form-group">
                <label>Education *</label>
                <input name="education" value={formData.education} onChange={handleFieldChange} required />
              </div>

              <div className="form-group">
                <label>Course *</label>
                <input name="course" value={formData.course} onChange={handleFieldChange} required />
              </div>

              <div className="form-group">
                <label>Position Applied For *</label>
                <select
                  name="positionAppliedFor"
                  value={formData.positionAppliedFor}
                  onChange={handleFieldChange}
                  className="position-select"
                  required
                >
                  <option value="" disabled>Select position</option>
                  {POSITION_OPTIONS.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Collection Experience *</label>
                <input name="collectionExperience" value={formData.collectionExperience} onChange={handleFieldChange} required />
              </div>

              <div className="form-group">
                <label>Referral *</label>
                <input name="referral" value={formData.referral} onChange={handleFieldChange} required />
              </div>

              <div className="form-group">
                <label>Resume PDF *</label>
                <input type="file" accept=".pdf" onChange={handleResumeChange} required />
              </div>

              <div className="form-group">
                <label>Photo (PNG/JPG) *</label>
                <input type="file" accept=".png,.jpg,.jpeg" onChange={handlePictureChange} required />
              </div>

              <button type="submit" className="btn-approve" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Applicant'}
              </button>
            </form>
          </div>
        )}

        <div className="applicant-stats">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{applicants.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{applicants.filter((a) => a.status === 'pending').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Approved</span>
            <span className="stat-value approved">{applicants.filter((a) => a.status === 'approved').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Rejected</span>
            <span className="stat-value rejected">{applicants.filter((a) => a.status === 'rejected').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Assigned</span>
            <span className="stat-value assigned">{applicants.filter((a) => a.status === 'assigned').length}</span>
          </div>
        </div>

        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by name or education..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="assigned">Assigned</option>
          </select>
        </div>

        <div className="applicants-table-wrapper">
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name & Age</th>
                <th>Education</th>
                <th>Course</th>
                <th>Position</th>
                <th>Experience</th>
                <th>Referral</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.length > 0 ? (
                filteredApplicants.map((applicant) => (
                  <tr key={applicant.id}>
                    <td>
                      {applicant.pictureData ? (
                        <img src={applicant.pictureData} alt={applicant.name} className="applicant-thumb" />
                      ) : (
                        <div className="applicant-initials">
                          {applicant.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{applicant.name}</strong>
                      <div className="applicant-age">{applicant.age} years</div>
                    </td>
                    <td>{applicant.education}</td>
                    <td>{applicant.course}</td>
                    <td>{applicant.positionAppliedFor || '-'}</td>
                    <td>{applicant.collectionExperience}</td>
                    <td>{applicant.referral || '-'}</td>
                    <td>
                      <span className={`status-badge status-${applicant.status}`}>{applicant.status}</span>
                    </td>
                    <td>{applicant.assignedTL ? <span className="assigned-tl">{applicant.assignedTL}</span> : <span className="not-assigned">-</span>}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => viewResume(applicant)} className="btn-view" title="View Resume">
                          Resume
                        </button>

                        {applicant.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(applicant.id, 'approved')}
                              className="btn-approve"
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(applicant.id, 'rejected')}
                              className="btn-reject"
                              title="Reject"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {applicant.status === 'approved' && (
                          <select
                            onChange={(e) => handleAssignToTL(applicant.id, e.target.value)}
                            className="assign-select"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Assign to TL...
                            </option>
                            {teamLeads.map((tl) => (
                              <option key={tl.id} value={tl.email}>
                                {tl.email}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          onClick={() => handleDeleteApplicant(applicant.id, applicant.name)}
                          className="btn-delete"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="empty-message">
                    No applicants found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showResume && selectedApplicant && (
          <div className="modal-overlay" onClick={() => setShowResume(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedApplicant.name}'s Resume</h2>
                <button onClick={() => setShowResume(false)} className="modal-close">
                  Close
                </button>
              </div>
              <div className="modal-body">
                {selectedApplicant.resumeData ? (
                  <iframe src={resumeUrl} className="resume-viewer" title="Resume" />
                ) : (
                  <div className="no-resume">No resume uploaded</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
