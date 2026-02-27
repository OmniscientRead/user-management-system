'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ConfirmDialog from '@/components/ConfirmDialog'
import { deleteAssignment, getAllAssignments, putAssignment } from '@/lib/db'
import './assignments.css'

interface Assignment {
  id: number
  applicantId: number
  applicantName: string
  tlEmail: string
  tlName?: string
  assignedBy: string
  assignedDate: string
  positionAppliedFor?: string
  status: 'active' | 'completed' | 'cancelled'
  completionDate?: string
  notes?: string
}

export default function AdminAssignmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [message, setMessage] = useState({ text: '', type: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
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
    loadAssignments()
  }, [router])

  const loadAssignments = async () => {
    const allAssignments = await getAllAssignments()
    setAssignments(allAssignments)
  }

  const handleCancelAssignment = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Cancel Assignment',
      message: 'Cancel this assignment? The applicant will no longer be active.',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }))
        const target = assignments.find((a) => a.id === id)
        if (!target) return

        await putAssignment({ ...target, status: 'cancelled' })
        await loadAssignments()
        setMessage({ text: 'Assignment cancelled', type: 'success' })
        setTimeout(() => setMessage({ text: '', type: '' }), 3000)
      },
    })
  }

  const handleCompleteAssignment = async (id: number) => {
    const target = assignments.find((a) => a.id === id)
    if (!target) return

    await putAssignment({
      ...target,
      status: 'completed',
      completionDate: new Date().toISOString(),
    })
    await loadAssignments()
    setMessage({ text: 'Assignment marked as completed', type: 'success' })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleDeleteAssignment = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Delete Assignment',
      message: 'Delete this assignment record? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }))
        await deleteAssignment(id)
        await loadAssignments()
        setMessage({ text: 'Assignment deleted', type: 'success' })
        setTimeout(() => setMessage({ text: '', type: '' }), 3000)
      },
    })
  }

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.applicantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.tlEmail.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (!user)
    return (
      <div className="admin-assignments-container">
        <Sidebar role="admin" userName="Admin" />
        <div className="admin-assignments-content">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    )

  return (
    <div className="admin-assignments-container">
      <Sidebar role="admin" userName={user.email} />

      <div className="admin-assignments-content">
        <h1>All Assignments</h1>
        <p className="subtitle">View and manage all applicant assignments</p>

        {message.text && <div className={`message message-${message.type}`}>{message.text}</div>}

        <div className="assignment-stats">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{assignments.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active</span>
            <span className="stat-value active">{assignments.filter((a) => a.status === 'active').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed</span>
            <span className="stat-value completed">{assignments.filter((a) => a.status === 'completed').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Cancelled</span>
            <span className="stat-value cancelled">{assignments.filter((a) => a.status === 'cancelled').length}</span>
          </div>
        </div>

        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by applicant or TL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="assignments-table-wrapper">
          <table className="assignments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Applicant</th>
                <th>Position Applied</th>
                <th>Team Lead</th>
                <th>Assigned By</th>
                <th>Assigned Date</th>
                <th>Status</th>
                <th>Completion Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.id}</td>
                    <td>
                      <strong>{assignment.applicantName}</strong>
                    </td>
                    <td>{assignment.positionAppliedFor || '-'}</td>
                    <td>{assignment.tlName || assignment.tlEmail}</td>
                    <td>{assignment.assignedBy}</td>
                    <td>{new Date(assignment.assignedDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${assignment.status}`}>{assignment.status}</span>
                    </td>
                    <td>
                      {assignment.completionDate ? new Date(assignment.completionDate).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {assignment.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleCompleteAssignment(assignment.id)}
                              className="btn-complete"
                              title="Mark Complete"
                            >
                              ?
                            </button>
                            <button
                              onClick={() => handleCancelAssignment(assignment.id)}
                              className="btn-cancel"
                              title="Cancel"
                            >
                              ×
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id)}
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
                  <td colSpan={9} className="empty-message">
                    No assignments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

