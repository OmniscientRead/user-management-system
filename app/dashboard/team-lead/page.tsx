'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import {
  claimApplicant,
  getAllApplicants,
  getAllAssignments,
  getAllManpowerRequests,
} from '@/lib/db'
import { openPdfInNewTab } from '@/lib/pdf'
import './team-lead-dashboard.css'

interface Applicant {
  id: number
  name: string
  age: number
  education: string
  course: string
  positionAppliedFor?: string
  collectionExperience: string
  referral: string
  pictureData?: string
  resumeData?: string
  status: string
  assignedTL?: string
  assignedUserId?: number
}

interface ManpowerRequest {
  id: number
  position: string
  limit: number | null
  assignedCount: number
  status: string
  teamLeadEmail: string
  pdfData?: string
}

export default function TeamLeadDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ src: string; name: string } | null>(null)

  const [availableApplicants, setAvailableApplicants] = useState<Applicant[]>([])
  const [manpowerRequests, setManpowerRequests] = useState<ManpowerRequest[]>([])
  const [assignmentCount, setAssignmentCount] = useState(0)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' })

  useEffect(() => {
    const initialize = async () => {
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
        await loadData(userData.email)
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [router])

  const loadData = async (tlEmail: string) => {
    const [allApplicants, allRequests, allAssignments] = await Promise.all([
      getAllApplicants(),
      getAllManpowerRequests(),
      getAllAssignments(),
    ])

    const tlRequests = (allRequests as ManpowerRequest[]).filter((req) => req.teamLeadEmail === tlEmail)
    const myActiveAssignments = (allAssignments as any[]).filter(
      (item) => item.tlEmail === tlEmail && (item.status || 'active') === 'active'
    )

    const available = (allApplicants as Applicant[]).filter((applicant) => {
      const isClaimableStatus = applicant.status === 'approved'
      const hasOwner = Boolean(applicant.assignedTL || applicant.assignedUserId)
      return isClaimableStatus && !hasOwner
    })

    setManpowerRequests(tlRequests)
    setAssignmentCount(myActiveAssignments.length)
    setAvailableApplicants(available)
  }

  const approvedRequests = useMemo(
    () => manpowerRequests.filter((request) => request.status === 'approved' && request.limit !== null),
    [manpowerRequests]
  )

  const canClaimPosition = (position?: string) => {
    if (!position) return false
    const positionRequests = approvedRequests.filter((item) => item.position === position)
    if (positionRequests.length === 0) return false

    const totalLimit = positionRequests.reduce((sum, item) => sum + Number(item.limit || 0), 0)
    const totalAssigned = positionRequests.reduce((sum, item) => sum + Number(item.assignedCount || 0), 0)
    return totalAssigned < totalLimit
  }

  const handleClaim = async (applicant: Applicant) => {
    if (!user) return

    setSubmittingId(applicant.id)
    setMessage({ text: '', type: '' })

    try {
      await claimApplicant(applicant.id, user.email, user.email)
      await loadData(user.email)
      setMessage({ text: `${applicant.name} has been assigned to you.`, type: 'success' })
    } catch (error: any) {
      const rawMessage = error?.message || 'Failed to assign applicant.'
      setMessage({ text: rawMessage.replace(/^\{"error":"|"\}$/g, ''), type: 'error' })
      await loadData(user.email)
    } finally {
      setSubmittingId(null)
    }
  }

  const getTotalAssignedCount = () => manpowerRequests.reduce((total, req) => total + (req.assignedCount || 0), 0)
  const getTotalLimit = () => manpowerRequests.reduce((total, req) => total + (req.limit || 0), 0)

  if (loading || !user) {
    return (
      <div className="dashboard-container">
        <Sidebar role="team-lead" userName={user?.email || ''} />
        <div className="dashboard-content">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Sidebar role="team-lead" userName={user.email} />

      <div className="dashboard-content">
        <h1>Team Lead Dashboard</h1>
        <p className="subtitle">Available applicants are shown below in profile cards. Assigned applicants are in My Assignments.</p>

        {message.text && <div className={`message-banner ${message.type}`}>{message.text}</div>}

        <div className="manpower-summary">
          <div className="summary-card total">
            <div className="summary-icon">T</div>
            <div className="summary-info">
              <h3>Total Manpower</h3>
              <div className="summary-numbers">
                <span className="summary-value">{getTotalAssignedCount()} / {getTotalLimit()}</span>
                <span className="summary-label">assigned</span>
              </div>
            </div>
          </div>

          <div className="summary-card requests">
            <div className="summary-icon">A</div>
            <div className="summary-info">
              <h3>Active Assignments</h3>
              <div className="summary-numbers">
                <span className="summary-value">{assignmentCount}</span>
                <span className="summary-label">claimed</span>
              </div>
            </div>
          </div>

          <div className="summary-card pending">
            <div className="summary-icon">P</div>
            <div className="summary-info">
              <h3>Pending Requests</h3>
              <div className="summary-numbers">
                <span className="summary-value">{manpowerRequests.filter((r) => r.status === 'pending').length}</span>
                <span className="summary-label">requests</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h2>Available Applicants</h2>
          {availableApplicants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">-</div>
              <p>No available applicants right now.</p>
              <span className="empty-subtext">When someone else claims an applicant, they are removed immediately from this list.</span>
            </div>
          ) : (
            <div className="applicants-grid">
              {availableApplicants.map((applicant) => {
                const claimAllowed = canClaimPosition(applicant.positionAppliedFor)
                return (
                  <div key={applicant.id} className="applicant-card">
                    <div className="applicant-card-header">
                      {applicant.pictureData ? (
                        <img
                          src={applicant.pictureData}
                          alt={applicant.name}
                          className="applicant-profile-pic clickable-image"
                          onClick={() => setSelectedImage({ src: applicant.pictureData || '', name: applicant.name })}
                        />
                      ) : (
                        <div
                          className="applicant-profile-pic-placeholder clickable-initials"
                          onClick={() => setSelectedImage({ src: '', name: applicant.name })}
                        >
                          {applicant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="applicant-card-body">
                      <h3>{applicant.name}</h3>
                      <p className="applicant-age">Age: {applicant.age}</p>
                      <div className="applicant-details">
                        <p><strong>Position Applied:</strong> {applicant.positionAppliedFor || '-'}</p>
                        <p><strong>Education:</strong> {applicant.education}</p>
                        <p><strong>Course:</strong> {applicant.course}</p>
                        <p><strong>Experience:</strong> {applicant.collectionExperience || '-'}</p>
                        <p><strong>Referral:</strong> {applicant.referral || '-'}</p>
                      </div>

                      <button
                        onClick={() => openPdfInNewTab(applicant.resumeData)}
                        className="btn-view-resume"
                        disabled={!applicant.resumeData}
                      >
                        View Resume
                      </button>

                      <button
                        onClick={() => handleClaim(applicant)}
                        className="btn-assign"
                        disabled={!claimAllowed || submittingId === applicant.id}
                      >
                        {submittingId === applicant.id
                          ? 'Assigning...'
                          : claimAllowed
                          ? 'Assign to Me'
                          : 'No approved manpower slot'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedImage(null)}>x</button>
            {selectedImage.src ? (
              <img src={selectedImage.src} alt={selectedImage.name} className="modal-image" />
            ) : (
              <div className="modal-no-image">
                <div className="no-image-icon">N/A</div>
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
