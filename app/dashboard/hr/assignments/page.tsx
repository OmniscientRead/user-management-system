'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getAllAssignments } from '@/lib/db'
import '../hr-dashboard.css'

interface Assignment {
  id: number
  applicantName: string
  tlEmail: string
  tlName?: string
  assignedDate: string
  status?: string
  positionAppliedFor?: string
}

export default function HRAssignmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    const initialize = async () => {
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
      const allAssignments = await getAllAssignments()
      setAssignments(allAssignments)
    }

    initialize()
  }, [router])

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard-container">
      <Sidebar role="hr" userName={user.email} />
      <div className="dashboard-content">
        <h1>View Assignments</h1>
        <p className="subtitle">Monitor which Team Leader currently holds each applicant</p>

        <div className="table-wrapper">
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Position Applied</th>
                <th>Assigned Team Leader</th>
                <th>Assigned Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.applicantName}</td>
                    <td>{assignment.positionAppliedFor || '-'}</td>
                    <td>{assignment.tlName || assignment.tlEmail}</td>
                    <td>{new Date(assignment.assignedDate).toLocaleDateString()}</td>
                    <td>{assignment.status || 'active'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-message">
                    No assignments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

