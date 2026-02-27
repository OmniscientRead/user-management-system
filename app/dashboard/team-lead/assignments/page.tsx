'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getAssignmentsByTL } from '@/lib/db'
import { openPdfInNewTab } from '@/lib/pdf'
import '../team-lead-dashboard.css'
import './assignments.css'

interface Assignment {
  id: number
  applicantId: number
  applicantName: string
  age?: number
  education?: string
  course?: string
  positionAppliedFor?: string
  collectionExperience?: string
  referral?: string
  assignedDate: string
  status?: string
  resumeData?: string
}

export default function TeamLeadAssignmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])

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
    const myAssignments = await getAssignmentsByTL(tlEmail)
    setAssignments((myAssignments as Assignment[]).filter((item) => (item.status || 'active') === 'active'))
  }

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
        <h1>My Assignments</h1>
        <p className="subtitle">Assigned applicants for your account only.</p>

        <div className="section">
          <h2>Assigned Applicants ({assignments.length})</h2>
          <div className="assignments-table-wrapper tl-assignments-table-wrapper">
            <table className="assignments-table tl-assignments-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Position Applied</th>
                  <th>Age</th>
                  <th>Education</th>
                  <th>Course</th>
                  <th>Experience</th>
                  <th>Referral</th>
                  <th>Assigned Date</th>
                  <th>Resume</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length > 0 ? (
                  assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="applicant-name">{assignment.applicantName}</td>
                      <td>{assignment.positionAppliedFor || '-'}</td>
                      <td>{assignment.age ?? '-'}</td>
                      <td>{assignment.education || '-'}</td>
                      <td>{assignment.course || '-'}</td>
                      <td>{assignment.collectionExperience || '-'}</td>
                      <td>{assignment.referral || '-'}</td>
                      <td>{new Date(assignment.assignedDate).toLocaleDateString()}</td>
                      <td>
                        {assignment.resumeData ? (
                          <button
                            className="btn-view-resume-small"
                            onClick={() => openPdfInNewTab(assignment.resumeData)}
                          >
                            View
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      You do not have active assignments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
