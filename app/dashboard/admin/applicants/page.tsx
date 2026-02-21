'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import './applicants.css'

interface Applicant {
  id: number
  name: string
  age: number
  education: string
  course: string
  collectionExperience: string
  referral: string
  resumeData: string
  pictureData: string
  status: 'pending' | 'approved' | 'rejected' | 'assigned'
  addedDate: string
  assignedTo?: string
  assignedTL?: string
}

export default function AdminApplicantsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [teamLeads, setTeamLeads] = useState<any[]>([])
  const [message, setMessage] = useState({ text: '', type: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [showResume, setShowResume] = useState(false)

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

  const loadData = () => {
    // Load applicants
    const storedApplicants = localStorage.getItem('applicants')
    if (storedApplicants) {
      setApplicants(JSON.parse(storedApplicants))
    }

    // Load team leads from users
    const storedUsers = localStorage.getItem('users')
    if (storedUsers) {
      const users = JSON.parse(storedUsers)
      const leads = users.filter((u: any) => u.role === 'team-lead')
      setTeamLeads(leads)
    }
  }

  const handleStatusChange = (id: number, newStatus: 'approved' | 'rejected') => {
    if (newStatus === 'approved') {
      // Check man power limit
      const manPowerLimit = parseInt(localStorage.getItem('manPowerLimit') || '50')
      const approvedCount = applicants.filter(a => a.status === 'approved').length
      if (approvedCount >= manPowerLimit) {
        setMessage({ text: `Man power limit reached (${manPowerLimit} approved applicants)`, type: 'error' })
        setTimeout(() => setMessage({ text: '', type: '' }), 3000)
        return
      }
    }

    const updatedApplicants = applicants.map(a => 
      a.id === id ? { ...a, status: newStatus } : a
    )
    setApplicants(updatedApplicants)
    localStorage.setItem('applicants', JSON.stringify(updatedApplicants))
    setMessage({ text: `✓ Applicant ${newStatus} successfully!`, type: 'success' })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleAssignToTL = (applicantId: number, tlEmail: string) => {
    const updatedApplicants = applicants.map(a =>
      a.id === applicantId ? { ...a, assignedTL: tlEmail, status: 'assigned' } : a
    )
    setApplicants(updatedApplicants)
    localStorage.setItem('applicants', JSON.stringify(updatedApplicants))

    // Create assignment record
    const assignments = JSON.parse(localStorage.getItem('assignments') || '[]')
    const applicant = applicants.find(a => a.id === applicantId)
    const newAssignment = {
      id: assignments.length + 1,
      applicantId,
      applicantName: applicant?.name,
      tlEmail,
      assignedBy: user?.email,
      assignedDate: new Date().toISOString(),
      status: 'active'
    }
    assignments.push(newAssignment)
    localStorage.setItem('assignments', JSON.stringify(assignments))

    setMessage({ text: '✓ Applicant assigned to Team Lead', type: 'success' })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleDeleteApplicant = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete applicant "${name}"?`)) {
      const updatedApplicants = applicants.filter(a => a.id !== id)
      setApplicants(updatedApplicants)
      localStorage.setItem('applicants', JSON.stringify(updatedApplicants))
      setMessage({ text: '✓ Applicant deleted successfully!', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    }
  }

  const viewResume = (applicant: Applicant) => {
    setSelectedApplicant(applicant)
    setShowResume(true)
  }

  // Filter applicants
  const filteredApplicants = applicants.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.education.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (!user) return (
    <div className="dashboard-container">
      <Sidebar role="admin" userName="Admin" />
      <div className="dashboard-content">
        <div className="loading-state">Loading...</div>
      </div>
    </div>
  )

  return (
    <div className="dashboard-container">
      <Sidebar role="admin" userName={user.email} />
      
      <div className="dashboard-content">
        <h1>Manage Applicants</h1>
        <p className="subtitle">Review, approve, reject, and assign applicants</p>

        {/* Message display */}
        {message.text && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Stats Summary */}
        <div className="applicant-stats">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{applicants.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">
              {applicants.filter(a => a.status === 'pending').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Approved</span>
            <span className="stat-value approved">
              {applicants.filter(a => a.status === 'approved').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Rejected</span>
            <span className="stat-value rejected">
              {applicants.filter(a => a.status === 'rejected').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Assigned</span>
            <span className="stat-value assigned">
              {applicants.filter(a => a.status === 'assigned').length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by name or education..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="assigned">Assigned</option>
          </select>
        </div>

        {/* Applicants Table */}
        <div className="applicants-table-wrapper">
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name & Age</th>
                <th>Education</th>
                <th>Course</th>
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
                        <img 
                          src={applicant.pictureData} 
                          alt={applicant.name}
                          className="applicant-thumb"
                        />
                      ) : (
                        <div className="applicant-initials">
                          {applicant.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{applicant.name}</strong>
                      <div className="applicant-age">{applicant.age} years</div>
                    </td>
                    <td>{applicant.education}</td>
                    <td>{applicant.course}</td>
                    <td>{applicant.collectionExperience}</td>
                    <td>{applicant.referral || '—'}</td>
                    <td>
                      <span className={`status-badge status-${applicant.status}`}>
                        {applicant.status}
                      </span>
                    </td>
                    <td>
                      {applicant.assignedTL ? (
                        <span className="assigned-tl">{applicant.assignedTL}</span>
                      ) : (
                        <span className="not-assigned">—</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => viewResume(applicant)}
                          className="btn-view"
                          title="View Resume"
                        >
                          📄
                        </button>
                        
                        {applicant.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(applicant.id, 'approved')}
                              className="btn-approve"
                              title="Approve"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleStatusChange(applicant.id, 'rejected')}
                              className="btn-reject"
                              title="Reject"
                            >
                              ✗
                            </button>
                          </>
                        )}

                        {applicant.status === 'approved' && (
                          <select
                            onChange={(e) => handleAssignToTL(applicant.id, e.target.value)}
                            className="assign-select"
                            defaultValue=""
                          >
                            <option value="" disabled>Assign to TL...</option>
                            {teamLeads.map(tl => (
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
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="empty-message">
                    No applicants found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resume Modal */}
        {showResume && selectedApplicant && (
          <div className="modal-overlay" onClick={() => setShowResume(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedApplicant.name}'s Resume</h2>
                <button onClick={() => setShowResume(false)} className="modal-close">✕</button>
              </div>
              <div className="modal-body">
                {selectedApplicant.resumeData ? (
                  <iframe 
                    src={selectedApplicant.resumeData}
                    className="resume-viewer"
                    title="Resume"
                  />
                ) : (
                  <div className="no-resume">No resume uploaded</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}