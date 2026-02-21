// app/dashboard/team-lead/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import {
  getAllApplicants,
  addAssignment,
  getAssignmentsByTL,
} from '@/lib/db'
import './team-lead-dashboard.css'

interface Applicant {
  id: number
  name: string
  age: number
  education: string
  course: string
  collectionExperience: string
  referral: string
  pictureData: string
  resumeData: string
}

interface ManpowerRequest {
  id: number
  position: string
  requestedCount: number
  limit: number | null
  assignedCount: number
  status: string
  teamLeadEmail: string
  pdfData: string
  pdfFileName: string
}

export default function TeamLeadDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [availableApplicants, setAvailableApplicants] = useState<Applicant[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [manpowerRequests, setManpowerRequests] = useState<ManpowerRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<ManpowerRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<{ src: string; name: string } | null>(null)

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        if (!storedUser) {
          router.push('/')
          return
        }

        const userData = JSON.parse(storedUser)
        if (userData.role !== 'team-lead') {
          router.push('/')
          return
        }

        setUser(userData)
        await loadDashboardData(userData.email)
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [router])

  const loadDashboardData = async (tlEmail: string) => {
    try {
      // Load TL's manpower requests from localStorage
      const savedRequests = localStorage.getItem('manpowerRequests')
      let tlRequests: ManpowerRequest[] = []
      
      if (savedRequests) {
        const allRequests = JSON.parse(savedRequests)
        tlRequests = allRequests.filter(
          (req: ManpowerRequest) => req.teamLeadEmail === tlEmail
        )
        setManpowerRequests(tlRequests)
        
        // Auto-select the first pending/approved request if none selected
        if (tlRequests.length > 0 && !selectedRequest) {
          const activeRequest = tlRequests.find(
            req => req.status === 'approved' || req.status === 'pending'
          )
          if (activeRequest) {
            setSelectedRequest(activeRequest)
          }
        }
      }

      // Load all approved applicants
      const allApplicants = await getAllApplicants()
      
      // Get TL's current assignments
      const tlAssignments = await getAssignmentsByTL(tlEmail)
      setAssignments(tlAssignments)
      
      // Get IDs of already assigned applicants
      const assignedIds = new Set(tlAssignments.map(a => a.applicantId))
      
      // Filter: ONLY approved applicants that are NOT assigned
      const available = allApplicants.filter(
        (app: any) => app.status === 'approved' && !assignedIds.has(app.id)
      )
      
      setAvailableApplicants(available)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleSelectRequest = (request: ManpowerRequest) => {
    setSelectedRequest(request)
  }

  const handleAssign = async (applicant: Applicant) => {
    if (!selectedRequest) {
      alert('❌ Please select a manpower request first')
      return
    }

    // Check if request is approved
    if (selectedRequest.status !== 'approved') {
      alert(`❌ This manpower request is still ${selectedRequest.status}. Wait for HR approval.`)
      return
    }

    // Check manpower limit
    if (selectedRequest.limit !== null && selectedRequest.assignedCount >= selectedRequest.limit) {
      alert(`❌ You have reached your manpower limit of ${selectedRequest.limit} for this position.`)
      return
    }

    try {
      // Create assignment
      const newAssignment = {
        id: Date.now(),
        applicantId: applicant.id,
        applicantName: applicant.name,
        age: applicant.age,
        education: applicant.education,
        course: applicant.course,
        collectionExperience: applicant.collectionExperience,
        referral: applicant.referral,
        pictureData: applicant.pictureData,
        resumeData: applicant.resumeData,
        assignedDate: new Date().toISOString().split('T')[0],
        tlEmail: user.email,
        tlName: user.email.split('@')[0],
        position: selectedRequest.position,
        requestId: selectedRequest.id,
      }

      await addAssignment(newAssignment)

      // Update manpower request assigned count
      const savedRequests = localStorage.getItem('manpowerRequests')
      if (savedRequests) {
        const allRequests = JSON.parse(savedRequests)
        const updatedRequests = allRequests.map((req: ManpowerRequest) => {
          if (req.id === selectedRequest.id) {
            return {
              ...req,
              assignedCount: (req.assignedCount || 0) + 1
            }
          }
          return req
        })
        localStorage.setItem('manpowerRequests', JSON.stringify(updatedRequests))
        
        // Update local state
        const updatedRequest = updatedRequests.find(
          (req: ManpowerRequest) => req.id === selectedRequest.id
        )
        setSelectedRequest(updatedRequest || null)
        
        // Refresh manpower requests list
        const tlRequests = updatedRequests.filter(
          (req: ManpowerRequest) => req.teamLeadEmail === user.email
        )
        setManpowerRequests(tlRequests)
      }

      // Refresh available applicants
      await loadDashboardData(user.email)
      
      alert(`✅ Applicant assigned successfully to ${selectedRequest.position} position!`)
    } catch (error) {
      console.error('Error assigning applicant:', error)
      alert('Failed to assign applicant. Please try again.')
    }
  }

  const handleImageClick = (pictureData: string, name: string) => {
    setSelectedImage({ src: pictureData, name })
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  const getTotalAssignedCount = () => {
    return manpowerRequests.reduce((total, req) => total + (req.assignedCount || 0), 0)
  }

  const getTotalLimit = () => {
    return manpowerRequests.reduce((total, req) => total + (req.limit || 0), 0)
  }

  if (loading) return (
    <div className="dashboard-container">
      <Sidebar role="team-lead" userName={user?.email || ''} />
      <div className="dashboard-content">
        <div className="loading-state">Loading...</div>
      </div>
    </div>
  )

  return (
    <div className="dashboard-container">
      <Sidebar role="team-lead" userName={user?.email || ''} />
      
      <div className="dashboard-content">
        <h1>Team Lead Dashboard</h1>
        <p className="subtitle">Assign approved applicants to your team based on manpower requests</p>

        {/* Manpower Requests Summary */}
        <div className="manpower-summary">
          <div className="summary-card total">
            <div className="summary-icon">📊</div>
            <div className="summary-info">
              <h3>Total Manpower</h3>
              <div className="summary-numbers">
                <span className="summary-value">{getTotalAssignedCount()} / {getTotalLimit()}</span>
                <span className="summary-label">assigned</span>
              </div>
            </div>
          </div>

          <div className="summary-card requests">
            <div className="summary-icon">📋</div>
            <div className="summary-info">
              <h3>Active Requests</h3>
              <div className="summary-numbers">
                <span className="summary-value">{manpowerRequests.filter(r => r.status === 'approved').length}</span>
                <span className="summary-label">approved</span>
              </div>
            </div>
          </div>

          <div className="summary-card pending">
            <div className="summary-icon">⏳</div>
            <div className="summary-info">
              <h3>Pending</h3>
              <div className="summary-numbers">
                <span className="summary-value">{manpowerRequests.filter(r => r.status === 'pending').length}</span>
                <span className="summary-label">requests</span>
              </div>
            </div>
          </div>
        </div>

        {/* Manpower Requests List */}
        {manpowerRequests.length > 0 && (
          <div className="requests-section">
            <h2>Your Manpower Requests</h2>
            <div className="requests-grid">
              {manpowerRequests.map((request) => (
                <div
                  key={request.id}
                  className={`request-card ${selectedRequest?.id === request.id ? 'selected' : ''} status-${request.status}`}
                  onClick={() => handleSelectRequest(request)}
                >
                  <div className="request-header">
                    <h3>{request.position}</h3>
                    <span className="request-status">{request.status}</span>
                  </div>
                  
                  <div className="request-details">
                    <div className="request-limit">
                      <span className="limit-label">Limit:</span>
                      <span className="limit-value">{request.limit !== null ? request.limit : 'Pending'}</span>
                    </div>
                    <div className="request-assigned">
                      <span className="assigned-label">Assigned:</span>
                      <span className="assigned-value">{request.assignedCount || 0}</span>
                    </div>
                  </div>

                  {request.status === 'approved' && request.limit !== null && (
                    <div className="request-progress">
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${((request.assignedCount || 0) / request.limit) * 100}%`,
                            backgroundColor: (request.assignedCount || 0) >= request.limit ? '#dc3545' : '#28a745'
                          }}
                        />
                      </div>
                      <span className="progress-text">
                        {Math.round(((request.assignedCount || 0) / request.limit) * 100)}% filled
                      </span>
                    </div>
                  )}

                  {request.pdfData && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(request.pdfData, '_blank')
                      }}
                      className="btn-view-pdf"
                    >
                      📄 View Request PDF
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Request Info */}
        {selectedRequest && (
          <div className="selected-request-info">
            <h3>Current Assignment: {selectedRequest.position}</h3>
            {selectedRequest.status === 'approved' ? (
              <p className="info-approved">
                ✓ You can assign up to {selectedRequest.limit} applicants for this position.
                {selectedRequest.assignedCount >= selectedRequest.limit! && (
                  <span className="limit-reached"> Limit reached!</span>
                )}
              </p>
            ) : (
              <p className="info-pending">
                ⏳ This request is {selectedRequest.status}. Wait for HR approval before assigning.
              </p>
            )}
          </div>
        )}

        {/* Available Applicants Section */}
        <div className="section">
          <h2>Available Applicants (Approved by Boss)</h2>
          
          {availableApplicants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No available applicants at the moment</p>
              <span className="empty-subtext">
                {selectedRequest && selectedRequest.status === 'approved' && selectedRequest.assignedCount >= selectedRequest.limit!
                  ? 'You have reached your manpower limit for this position'
                  : 'Wait for HR to add more approved applicants'}
              </span>
            </div>
          ) : (
            <div className="applicants-grid">
              {availableApplicants.map((applicant) => (
                <div key={applicant.id} className="applicant-card">
                  <div className="applicant-card-header">
                    {applicant.pictureData ? (
                      <img
                        src={applicant.pictureData}
                        alt={applicant.name}
                        className="applicant-profile-pic clickable-image"
                        onClick={() => handleImageClick(applicant.pictureData, applicant.name)}
                      />
                    ) : (
                      <div 
                        className="applicant-profile-pic-placeholder clickable-initials"
                        onClick={() => handleImageClick('', applicant.name)}
                      >
                        {applicant.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="applicant-card-body">
                    <h3>{applicant.name}</h3>
                    <p className="applicant-age">Age: {applicant.age}</p>

                    <div className="applicant-details">
                      <p><strong>Education:</strong> {applicant.education}</p>
                      <p><strong>Course:</strong> {applicant.course}</p>
                      <p><strong>Experience:</strong> {applicant.collectionExperience}</p>
                      <p><strong>Referral:</strong> {applicant.referral || 'None'}</p>
                    </div>

                    <button
                      onClick={() => window.open(applicant.resumeData, '_blank')}
                      className="btn-view-resume"
                    >
                      📄 View Resume
                    </button>

                    <button
                      onClick={() => handleAssign(applicant)}
                      className={`btn-assign ${!selectedRequest || selectedRequest.status !== 'approved' || (selectedRequest.assignedCount >= selectedRequest.limit!) ? 'disabled' : ''}`}
                      disabled={!selectedRequest || selectedRequest.status !== 'approved' || (selectedRequest.assignedCount >= (selectedRequest.limit || 0))}
                    >
                      {!selectedRequest 
                        ? 'Select Request First'
                        : selectedRequest.status !== 'approved'
                        ? 'Waiting Approval'
                        : selectedRequest.assignedCount >= (selectedRequest.limit || 0)
                        ? 'Limit Reached'
                        : `✓ Assign to ${selectedRequest.position}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Assignments Section */}
        <div className="section">
          <h2>Your Current Assignments ({assignments.length})</h2>
          
          {assignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No assignments yet</p>
              <span className="empty-subtext">Start assigning applicants to your team</span>
            </div>
          ) : (
            <div className="assignments-table-wrapper">
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Position</th>
                    <th>Education</th>
                    <th>Course</th>
                    <th>Experience</th>
                    <th>Assigned Date</th>
                    <th>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        {assignment.pictureData ? (
                          <img
                            src={assignment.pictureData}
                            alt={assignment.applicantName}
                            className="table-profile-pic clickable-image"
                            onClick={() => handleImageClick(assignment.pictureData, assignment.applicantName)}
                          />
                        ) : (
                          <div 
                            className="table-profile-placeholder clickable-initials"
                            onClick={() => handleImageClick('', assignment.applicantName)}
                          >
                            {assignment.applicantName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="applicant-name">{assignment.applicantName}</td>
                      <td>{assignment.age}</td>
                      <td>
                        <span className="position-badge">{assignment.position || 'N/A'}</span>
                      </td>
                      <td>{assignment.education}</td>
                      <td>{assignment.course}</td>
                      <td>{assignment.collectionExperience}</td>
                      <td>{assignment.assignedDate}</td>
                      <td>
                        <button
                          onClick={() => window.open(assignment.resumeData, '_blank')}
                          className="btn-view-resume-small"
                        >
                          📄 View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            {selectedImage.src ? (
              <img 
                src={selectedImage.src} 
                alt={selectedImage.name}
                className="modal-image"
              />
            ) : (
              <div className="modal-no-image">
                <div className="no-image-icon">👤</div>
                <p>No profile picture available for {selectedImage.name}</p>
              </div>
            )}
            <div className="modal-caption">{selectedImage.name}</div>
          </div>
        </div>
      )}
    </div>
  )
}