'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import {
  deleteManpowerRequest,
  getAllManpowerRequests,
  getAllUsers,
  putManpowerRequest,
  putUser,
} from '@/lib/db'
import './manpower.css'

type RequestStatus = 'pending' | 'approved' | 'rejected'

interface ManpowerRequest {
  id: number | string
  teamLeadEmail?: string
  teamLeadName?: string
  tlId?: number | string
  tlName?: string
  position: string
  requestedCount?: number
  requiredCount?: number
  limit?: number | null
  assignedCount?: number
  status: string
  date?: string
  createdAt?: string
}

interface TeamLeadUser {
  id: number
  email: string
  name?: string
  role: 'boss' | 'hr' | 'team-lead' | 'admin'
  tlAssignmentLimit?: number
}

export default function ManPowerPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'requests' | 'limits'>('requests')
  const [requests, setRequests] = useState<ManpowerRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all')
  const [teamLeads, setTeamLeads] = useState<TeamLeadUser[]>([])
  const [editingTlId, setEditingTlId] = useState<number | null>(null)
  const [newLimit, setNewLimit] = useState<number>(5)
  const [message, setMessage] = useState({ text: '', type: '' })

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
    loadAllData()
  }, [router])

  const loadAllData = async () => {
    const allRequests = (await getAllManpowerRequests()) as ManpowerRequest[]
    setRequests(allRequests)

    const allUsers = (await getAllUsers()) as TeamLeadUser[]
    setTeamLeads(allUsers.filter((u) => u.role === 'team-lead'))
  }

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const normalizeStatus = (status: string): RequestStatus => {
    const normalized = status.toLowerCase()
    if (normalized === 'approved') return 'approved'
    if (normalized === 'rejected') return 'rejected'
    return 'pending'
  }

  const getRequestedCount = (request: ManpowerRequest): number =>
    Number(request.requestedCount ?? request.requiredCount ?? 0)

  const getRequestDate = (request: ManpowerRequest): string =>
    request.date || request.createdAt || new Date().toISOString().split('T')[0]

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (statusFilter === 'all') return true
      return normalizeStatus(request.status) === statusFilter
    })
  }, [requests, statusFilter])

  const handleSetRequestLimit = async (requestId: number | string, value: string) => {
    const parsedLimit = Number(value)
    if (Number.isNaN(parsedLimit) || parsedLimit < 0) {
      showToast('Please enter a valid non-negative limit', 'error')
      return
    }

    const target = requests.find((request) => request.id === requestId)
    if (!target) return

    const updatedRequest = {
      ...target,
      limit: parsedLimit,
      approvedCount: parsedLimit,
    }
    await putManpowerRequest(updatedRequest)
    await loadAllData()
    showToast('Request limit updated', 'success')
  }

  const handleRequestStatus = async (requestId: number | string, status: RequestStatus) => {
    const target = requests.find((request) => request.id === requestId)
    if (!target) return

    const updatedRequest = {
      ...target,
      status,
      approvedCount: status === 'approved' ? Number(target.limit ?? getRequestedCount(target)) : 0,
    }
    await putManpowerRequest(updatedRequest)
    await loadAllData()
    showToast(`Request ${status}`, 'success')
  }

  const handleDeleteRequest = async (requestId: number | string) => {
    if (!confirm('Delete this manpower request?')) return

    await deleteManpowerRequest(Number(requestId))
    await loadAllData()
    showToast('Manpower request deleted', 'success')
  }

  const handleUpdateTLLimit = async (tlId: number) => {
    if (newLimit < 1) {
      showToast('Limit must be at least 1', 'error')
      return
    }

    const targetUser = teamLeads.find((u) => u.id === tlId)
    if (!targetUser) {
      showToast('Team lead not found', 'error')
      return
    }

    await putUser({ ...targetUser, tlAssignmentLimit: newLimit })
    await loadAllData()
    setEditingTlId(null)
    showToast('Team Lead manpower limit updated', 'success')
  }

  if (!user) {
    return (
      <div className="admin-manpower-container">
        <Sidebar role="admin" userName="Admin" />
        <div className="admin-manpower-content">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-manpower-container">
      <Sidebar role="admin" userName={user.email} />

      <div className="admin-manpower-content">
        <h1>Man Power Management</h1>
        <p className="subtitle">Approve/reject TL requests and set Team Lead limits</p>

        {message.text && <div className={`message message-${message.type}`}>{message.text}</div>}

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            All Requests
          </button>
          <button
            className={`tab-btn ${activeTab === 'limits' ? 'active' : ''}`}
            onClick={() => setActiveTab('limits')}
          >
            Team Lead Limits
          </button>
        </div>

        {activeTab === 'requests' && (
          <div className="manpower-container">
            <div className="requests-header">
              <h2>All Manpower Requests</h2>
              <div className="filter-group">
                <label>Filter status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | RequestStatus)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="empty-state">
                <p>No manpower requests found</p>
              </div>
            ) : (
              <div className="requests-table-container">
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>Team Lead</th>
                      <th>Position</th>
                      <th>Requested</th>
                      <th>Limit</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const normalizedStatus = normalizeStatus(request.status)
                      const requestedCount = getRequestedCount(request)
                      const tlLabel = request.teamLeadEmail || request.teamLeadName || request.tlName || '-'

                      return (
                        <tr key={request.id}>
                          <td>{tlLabel}</td>
                          <td>{request.position}</td>
                          <td>{requestedCount}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              defaultValue={request.limit ?? requestedCount}
                              className="limit-input"
                              onBlur={(e) => handleSetRequestLimit(request.id, e.target.value)}
                            />
                          </td>
                          <td>
                            <span className={`status-badge ${normalizedStatus}`}>{normalizedStatus.toUpperCase()}</span>
                          </td>
                          <td>{new Date(getRequestDate(request)).toLocaleDateString()}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => handleRequestStatus(request.id, 'approved')}
                                className="btn-approve"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRequestStatus(request.id, 'rejected')}
                                className="btn-reject"
                              >
                                Reject
                              </button>
                              <button onClick={() => handleDeleteRequest(request.id)} className="btn-delete">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'limits' && (
          <div className="manpower-container">
            <h2>Team Lead Assignment Limits</h2>
            <p className="info-text">Set maximum manpower request limit per Team Lead.</p>

            {teamLeads.length === 0 ? (
              <div className="empty-state">
                <p>No team leads found</p>
              </div>
            ) : (
              <table className="limits-table">
                <thead>
                  <tr>
                    <th>Team Lead</th>
                    <th>Email</th>
                    <th>Current Limit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamLeads.map((tl) => (
                    <tr key={tl.id}>
                      <td>{tl.name || tl.email.split('@')[0]}</td>
                      <td>{tl.email}</td>
                      <td>
                        {editingTlId === tl.id ? (
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={newLimit}
                            onChange={(e) => setNewLimit(Number(e.target.value))}
                            className="limit-input"
                          />
                        ) : (
                          <span className="current-limit">{tl.tlAssignmentLimit || 5}</span>
                        )}
                      </td>
                      <td>
                        {editingTlId === tl.id ? (
                          <>
                            <button onClick={() => handleUpdateTLLimit(tl.id)} className="btn-save">
                              Save
                            </button>
                            <button onClick={() => setEditingTlId(null)} className="btn-cancel">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingTlId(tl.id)
                              setNewLimit(tl.tlAssignmentLimit || 5)
                            }}
                            className="btn-edit"
                          >
                            Edit Limit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
