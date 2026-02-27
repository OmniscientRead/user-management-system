// app/dashboard/hr/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { getAllApplicants, getAllAssignments } from '@/lib/db'
import { openPdfInNewTab } from '@/lib/pdf'
import './hr-dashboard.css'

export default function HRDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [pendingApplicants, setPendingApplicants] = useState<any[]>([])
  const [approvedApplicants, setApprovedApplicants] = useState<any[]>([])
  const [rejectedApplicants, setRejectedApplicants] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        if (!storedUser) {
          router.push('/')
          return
        }

        const userData = JSON.parse(storedUser)
        if (userData.role !== 'hr') {
          router.push('/')
          return
        }

        setUser(userData)
        await loadDashboardData()
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [router])

  const loadDashboardData = async () => {
    try {
      const allApplicants = await getAllApplicants()
      const allAssignments = await getAllAssignments()
      
      setPendingApplicants(allApplicants.filter((app: any) => app.status === 'pending'))
      setApprovedApplicants(allApplicants.filter((app: any) => app.status === 'approved'))
      setRejectedApplicants(allApplicants.filter((app: any) => app.status === 'rejected'))
      setAssignments(allAssignments)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const getTLAssignment = (applicantId: number) => {
    return assignments.find((a: any) => a.applicantId === applicantId)
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar role="hr" userName={user?.email || ''} />
        <div className="dashboard-content">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Sidebar role="hr" userName={user?.email || ''} />
      
      <div className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h1>HR Dashboard</h1>
          <Link href="/dashboard/hr/add-applicant" className="btn-add-applicant">
            <span style={{ fontSize: '18px' }}>➕</span> Add New Applicant
          </Link>
        </div>
        <p className="subtitle">Track applicants through the approval process</p>

        {/* Statistics Cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-number">{pendingApplicants.length}</div>
            <div className="stat-label">Pending Review</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{approvedApplicants.length}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{rejectedApplicants.length}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{assignments.length}</div>
            <div className="stat-label">Endorsed to TLs</div>
          </div>
        </div>

        {/* Pending Applicants Section */}
        <div className="hr-section">
          <h2>⏳ Pending Boss Approval</h2>
          <div className="table-wrapper">
            {pendingApplicants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <p>No pending applicants</p>
                <span className="empty-subtext">All applicants have been reviewed by boss</span>
              </div>
            ) : (
              <table className="applicants-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Education</th>
                    <th>Course</th>
                    <th>Experience</th>
                    <th>Referral</th>
                    <th>Added Date</th>
                    <th>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApplicants.map((applicant) => (
                    <tr key={applicant.id}>
                      <td style={{ fontWeight: 600, color: '#880808' }}>{applicant.name}</td>
                      <td>{applicant.age}</td>
                      <td>{applicant.education}</td>
                      <td>{applicant.course}</td>
                      <td>{applicant.collectionExperience}</td>
                      <td>{applicant.referral}</td>
                      <td>{applicant.addedDate}</td>
                      <td>
                        <button
                          onClick={() => openPdfInNewTab(applicant.resumeData)}
                          className="btn-view-resume"
                        >
                          📄 View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Approved Applicants Section */}
        <div className="hr-section">
          <h2>✓ Approved by Boss</h2>
          <div className="table-wrapper">
            {approvedApplicants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>No approved applicants yet</p>
                <span className="empty-subtext">Approved applicants will appear here</span>
              </div>
            ) : (
              <table className="applicants-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Education</th>
                    <th>Course</th>
                    <th>Experience</th>
                    <th>Referral</th>
                    <th>Assigned to TL</th>
                    <th>Status</th>
                    <th>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedApplicants.map((applicant) => {
                    const tlAssignment = getTLAssignment(applicant.id)
                    return (
                      <tr key={applicant.id}>
                        <td style={{ fontWeight: 600 }}>{applicant.name}</td>
                        <td>{applicant.age}</td>
                        <td>{applicant.education}</td>
                        <td>{applicant.course}</td>
                        <td>{applicant.collectionExperience}</td>
                        <td>{applicant.referral}</td>
                        <td>
                          {tlAssignment ? (
                            <span className="tl-badge">
                              👤 {tlAssignment.tlName}
                            </span>
                          ) : (
                            <span className="unassigned-badge">
                              ⏳ Not Assigned
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="status-badge status-approved">
                            ✓ APPROVED
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => openPdfInNewTab(applicant.resumeData)}
                            className="btn-view-resume"
                          >
                            📄 View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Rejected Applicants Section */}
        <div className="hr-section">
          <h2>✗ Rejected by Boss</h2>
          <div className="table-wrapper">
            {rejectedApplicants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No rejected applicants</p>
                <span className="empty-subtext">All applicants have been processed</span>
              </div>
            ) : (
              <table className="applicants-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Education</th>
                    <th>Course</th>
                    <th>Experience</th>
                    <th>Referral</th>
                    <th>Decision Date</th>
                    <th>Status</th>
                    <th>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedApplicants.map((applicant) => (
                    <tr key={applicant.id}>
                      <td>{applicant.name}</td>
                      <td>{applicant.age}</td>
                      <td>{applicant.education}</td>
                      <td>{applicant.course}</td>
                      <td>{applicant.collectionExperience}</td>
                      <td>{applicant.referral}</td>
                      <td>{applicant.addedDate}</td>
                      <td>
                        <span className="status-badge status-rejected">
                          ✗ REJECTED
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => openPdfInNewTab(applicant.resumeData)}
                          className="btn-view-resume"
                        >
                          📄 View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="hr-section" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' }}>
          <h2>⚡ Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <Link href="/dashboard/hr/add-applicant" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'all 0.3s',
                border: '2px solid transparent',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#880808'
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(136,8,8,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>➕</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>Add Applicant</div>
              </div>
            </Link>
            
            <Link href="/dashboard/hr/manpower" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'all 0.3s',
                border: '2px solid transparent',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#880808'
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(136,8,8,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>👥</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>Manpower Requests</div>
              </div>
            </Link>
            
            <Link href="/dashboard/hr/results" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'all 0.3s',
                border: '2px solid transparent',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#880808'
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(136,8,8,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>View Results</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
