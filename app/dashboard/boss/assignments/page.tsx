'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getAllAssignments } from '@/lib/db'
import '../boss-dashboard.css'

interface Assignment {
  id: number
  applicantName: string
  tlEmail: string
  tlName?: string
  assignedDate: string
  status?: string
  positionAppliedFor?: string
}

export default function BossAssignmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const initialize = async () => {
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
      const allAssignments = await getAllAssignments()
      setAssignments(allAssignments)
    }

    initialize()
  }, [router])

  const filteredAssignments = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    if (!searchValue) return assignments
    return assignments.filter((assignment) => {
      const tlLabel = assignment.tlName || assignment.tlEmail || ''
      return (
        assignment.applicantName?.toLowerCase().includes(searchValue) ||
        tlLabel.toLowerCase().includes(searchValue)
      )
    })
  }, [assignments, search])

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard-container">
      <Sidebar role="boss" userName={user.email} />
      <div className="dashboard-content">
        <h1>View Assignments</h1>
        <p className="subtitle">Track which Team Leader currently holds each applicant</p>

        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search applicant or TL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="assignments-table-wrapper">
          <table className="assignments-table">
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
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
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

