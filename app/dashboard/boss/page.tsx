// app/dashboard/boss/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getAllApplicants, updateApplicantStatus } from '@/lib/db'
import { openPdfInNewTab } from '@/lib/pdf'
import './boss-dashboard.css'

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
  status: 'pending' | 'approved' | 'rejected'
  addedDate: string
}

export default function BossDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [pendingApplicants, setPendingApplicants] = useState<Applicant[]>([])
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
        if (userData.role !== 'boss') {
          router.push('/')
          return
        }

        setUser(userData)
        await loadPendingApplicants()
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [router])

  const loadPendingApplicants = async () => {
    try {
      const allApplicants = await getAllApplicants()
      const pending = allApplicants.filter((app: Applicant) => app.status === 'pending')
      setPendingApplicants(pending)
    } catch (error) {
      console.error('Error loading applicants:', error)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await updateApplicantStatus(id, 'approved')
      setPendingApplicants(pendingApplicants.filter((app) => app.id !== id))
    } catch (error) {
      console.error('Error approving applicant:', error)
    }
  }

  const handleReject = async (id: number) => {
    try {
      await updateApplicantStatus(id, 'rejected')
      setPendingApplicants(pendingApplicants.filter((app) => app.id !== id))
    } catch (error) {
      console.error('Error rejecting applicant:', error)
    }
  }

  const handleImageClick = (pictureData: string, name: string) => {
    setSelectedImage({ src: pictureData, name })
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  if (loading)
    return (
      <div className="dashboard-container">
        <Sidebar role="boss" userName={user?.email || ''} />
        <div className="dashboard-content">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    )

  return (
    <div className="dashboard-container">
      <Sidebar role="boss" userName={user?.email || ''} />

      <div className="dashboard-content">
        <h1>Boss Dashboard</h1>
        <p className="subtitle">Review and approve/reject applicants from HR</p>

        <div className="status-container">
          <div className="status-badge-large">
            <span className="status-label">Pending Review</span>
            <span className="status-number">{pendingApplicants.length}</span>
          </div>
        </div>

        <div className="profiles-section">
          <h2 className="section-title">Applicants Awaiting Your Decision</h2>

          {pendingApplicants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">OK</div>
              <p>No pending applicants to review</p>
              <span className="empty-subtext">All caught up!</span>
            </div>
          ) : (
            <div className="profiles-grid">
              {pendingApplicants.map((applicant) => (
                <div key={applicant.id} className="profile-card">
                  <div className="profile-card-header">
                    {applicant.pictureData ? (
                      <img
                        src={applicant.pictureData}
                        alt={applicant.name}
                        className="profile-card-image clickable-image"
                        onClick={() => handleImageClick(applicant.pictureData, applicant.name)}
                      />
                    ) : (
                      <div
                        className="profile-card-initials clickable-initials"
                        onClick={() => handleImageClick('', applicant.name)}
                      >
                        {applicant.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="profile-card-status">
                      <span className="status-badge status-pending">PENDING</span>
                    </div>
                  </div>

                  <div className="profile-card-body">
                    <h3 className="profile-card-name">{applicant.name}</h3>

                    <div className="profile-card-details">
                      <div className="detail-item">
                        <span className="detail-icon">Age</span>
                        <span className="detail-text">{applicant.age} years</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">Education</span>
                        <span className="detail-text">{applicant.education}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">Course</span>
                        <span className="detail-text">{applicant.course}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">Position</span>
                        <span className="detail-text">{applicant.positionAppliedFor || 'Not specified'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">Experience</span>
                        <span className="detail-text">{applicant.collectionExperience}</span>
                      </div>
                      {applicant.referral && (
                        <div className="detail-item">
                          <span className="detail-icon">Referral</span>
                          <span className="detail-text">Referred by: {applicant.referral}</span>
                        </div>
                      )}
                    </div>

                    <div className="profile-card-actions">
                      <button onClick={() => openPdfInNewTab(applicant.resumeData)} className="btn-view-resume">
                        View Resume
                      </button>
                    </div>
                  </div>

                  <div className="profile-card-footer">
                    <button onClick={() => handleApprove(applicant.id)} className="btn-approve-card">
                      Approve
                    </button>
                    <button onClick={() => handleReject(applicant.id)} className="btn-reject-card">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="image-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              x
            </button>
            {selectedImage.src ? (
              <img src={selectedImage.src} alt={selectedImage.name} className="modal-image" />
            ) : (
              <div className="modal-no-image">
                <div className="no-image-icon">User</div>
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
