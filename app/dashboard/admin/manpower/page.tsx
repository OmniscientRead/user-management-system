'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import './manpower.css'

interface ManpowerRequest {
  id: string
  tlId: string
  tlName: string
  position: string
  department: string
  requiredCount: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

interface TeamLead {
  id: string
  name: string
  email: string
  tlAssignmentLimit: number
  currentAssignments: number
}

export default function ManPowerPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'limits'>('overview')
  
  // Manpower limit states
  const [manPowerLimit, setManPowerLimit] = useState(50)
  const [currentApproved, setCurrentApproved] = useState(0)
  
  // Requests states
  const [requests, setRequests] = useState<ManpowerRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<ManpowerRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  
  // Team Lead limits states
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([])
  const [editingTlId, setEditingTlId] = useState<string | null>(null)
  const [newLimit, setNewLimit] = useState<number>(0)
  
  // Message state
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

  const loadAllData = () => {
    loadManpowerLimit()
    loadManpowerRequests()
    loadTeamLeads()
  }

  const loadManpowerLimit = () => {
    const storedLimit = localStorage.getItem('manPowerLimit')
    if (storedLimit) {
      setManPowerLimit(parseInt(storedLimit))
    }

    const applicants = JSON.parse(localStorage.getItem('applicants') || '[]')
    const approved = applicants.filter((a: any) => a.status === 'approved').length
    setCurrentApproved(approved)
  }

  const loadManpowerRequests = () => {
    // Get all manpower requests from localStorage
    const allRequests = JSON.parse(localStorage.getItem('manpowerRequests') || '[]')
    setRequests(allRequests)
    applyFilter(allRequests, statusFilter)
  }

  const loadTeamLeads = () => {
    // Get all users and filter team leads
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const requests = JSON.parse(localStorage.getItem('manpowerRequests') || '[]')
    
    const leads = users
      .filter((u: any) => u.role === 'team-lead')
      .map((tl: any) => ({
        id: tl.id,
        name: tl.name,
        email: tl.email,
        tlAssignmentLimit: tl.tlAssignmentLimit || 5,
        currentAssignments: requests.filter((r: any) => r.tlId === tl.id && r.status === 'APPROVED').length
      }))
    
    setTeamLeads(leads)
  }

  const applyFilter = (requestsList: ManpowerRequest[], filter: string) => {
    if (filter === 'ALL') {
      setFilteredRequests(requestsList)
    } else {
      setFilteredRequests(requestsList.filter(r => r.status === filter))
    }
  }

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filter = e.target.value
    setStatusFilter(filter)
    applyFilter(requests, filter)
  }

  // Update global manpower limit
  const handleUpdateLimit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (manPowerLimit < currentApproved) {
      setMessage({ 
        text: `Cannot set limit below current approved applicants (${currentApproved})`, 
        type: 'error' 
      })
      return
    }

    localStorage.setItem('manPowerLimit', manPowerLimit.toString())
    setMessage({ text: '✓ Man power limit updated successfully!', type: 'success' })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  // Update individual TL limit
  const handleUpdateTLLimit = async (tlId: string) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const updatedUsers = users.map((u: any) => {
      if (u.id === tlId) {
        return { ...u, tlAssignmentLimit: newLimit }
      }
      return u
    })
    
    localStorage.setItem('users', JSON.stringify(updatedUsers))
    setEditingTlId(null)
    loadTeamLeads()
    setMessage({ text: '✓ Team Lead limit updated successfully!', type: 'success' })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  // Delete manpower request (Admin only - hard delete)
  const handleDeleteRequest = (requestId: string) => {
    if (confirm('Are you sure you want to permanently delete this manpower request? This will remove it from ALL users (TL, HR, Admin) and cannot be undone.')) {
      // Get all requests
      const allRequests = JSON.parse(localStorage.getItem('manpowerRequests') || '[]')
      
      // Filter out the deleted request (hard delete)
      const updatedRequests = allRequests.filter((r: any) => r.id !== requestId)
      
      // Save back to localStorage
      localStorage.setItem('manpowerRequests', JSON.stringify(updatedRequests))
      
      // Reload data
      loadManpowerRequests()
      
      setMessage({ text: '✓ Manpower request permanently deleted from system!', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    }
  }

  // Approve/Reject request (Admin can also do this)
  const handleRequestStatus = (requestId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    const allRequests = JSON.parse(localStorage.getItem('manpowerRequests') || '[]')
    
    const updatedRequests = allRequests.map((r: any) => {
      if (r.id === requestId) {
        return { ...r, status: newStatus }
      }
      return r
    })
    
    localStorage.setItem('manpowerRequests', JSON.stringify(updatedRequests))
    loadManpowerRequests()
    
    setMessage({ text: `✓ Request ${newStatus.toLowerCase()} successfully!`, type: 'success' })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

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
        <h1>Man Power Management</h1>
        <p className="subtitle">Comprehensive control over manpower requests and limits</p>

        {message.text && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            📋 All Requests
          </button>
          <button 
            className={`tab-btn ${activeTab === 'limits' ? 'active' : ''}`}
            onClick={() => setActiveTab('limits')}
          >
            👥 Team Lead Limits
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="manpower-container">
            <div className="current-stats">
              <div className="stat-card">
                <h3>Total Requests</h3>
                <div className="stat-number">{requests.length}</div>
              </div>
              <div className="stat-card">
                <h3>Pending</h3>
                <div className="stat-number">
                  {requests.filter(r => r.status === 'PENDING').length}
                </div>
              </div>
              <div className="stat-card">
                <h3>Approved</h3>
                <div className="stat-number">
                  {requests.filter(r => r.status === 'APPROVED').length}
                </div>
              </div>
              <div className="stat-card">
                <h3>Team Leads</h3>
                <div className="stat-number">{teamLeads.length}</div>
              </div>
            </div>

            <div className="progress-section">
              <h3>System Capacity</h3>
              <div className="progress-label">
                <span>Current Approved Applicants</span>
                <span>{currentApproved} / {manPowerLimit}</span>
              </div>
              <div className="progress-bar-large">
                <div 
                  className={`progress-fill ${(currentApproved / manPowerLimit) > 0.9 ? 'critical' : (currentApproved / manPowerLimit) > 0.7 ? 'warning' : ''}`}
                  style={{width: `${(currentApproved / manPowerLimit) * 100}%`}}
                ></div>
              </div>
            </div>

            <form onSubmit={handleUpdateLimit} className="limit-form">
              <h2>Update Global Man Power Limit</h2>
              <div className="form-group">
                <label>Maximum Approved Applicants</label>
                <input
                  type="number"
                  min={currentApproved}
                  max={1000}
                  value={manPowerLimit}
                  onChange={(e) => setManPowerLimit(parseInt(e.target.value))}
                  required
                />
                <small className="input-hint">
                  Current approved: {currentApproved} | Available slots: {manPowerLimit - currentApproved}
                </small>
              </div>
              <button type="submit" className="btn-update">
                Update Global Limit
              </button>
            </form>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="manpower-container">
            <div className="requests-header">
              <h2>All Manpower Requests</h2>
              <div className="filter-group">
                <label>Filter by status:</label>
                <select value={statusFilter} onChange={handleStatusFilterChange}>
                  <option value="ALL">All Requests</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
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
                      <th>Department</th>
                      <th>Required</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.tlName}</td>
                        <td>{request.position}</td>
                        <td>{request.department}</td>
                        <td>{request.requiredCount}</td>
                        <td>{request.reason}</td>
                        <td>
                          <span className={`status-badge ${request.status.toLowerCase()}`}>
                            {request.status}
                          </span>
                        </td>
                        <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            {request.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleRequestStatus(request.id, 'APPROVED')}
                                  className="btn-approve"
                                  title="Approve"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleRequestStatus(request.id, 'REJECTED')}
                                  className="btn-reject"
                                  title="Reject"
                                >
                                  ✗
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteRequest(request.id)}
                              className="btn-delete"
                              title="Permanently Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Team Lead Limits Tab */}
        {activeTab === 'limits' && (
          <div className="manpower-container">
            <h2>Team Lead Assignment Limits</h2>
            <p className="info-text">
              Set maximum assignments per team lead. This limit is enforced system-wide.
            </p>

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
                    <th>Current Assignments</th>
                    <th>Assignment Limit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamLeads.map((tl) => (
                    <tr key={tl.id}>
                      <td>{tl.name}</td>
                      <td>{tl.email}</td>
                      <td>
                        <span className={`assignment-count ${tl.currentAssignments >= tl.tlAssignmentLimit ? 'limit-reached' : ''}`}>
                          {tl.currentAssignments}
                        </span>
                      </td>
                      <td>
                        {editingTlId === tl.id ? (
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={newLimit}
                            onChange={(e) => setNewLimit(parseInt(e.target.value))}
                            className="limit-input"
                          />
                        ) : (
                          <span className="current-limit">{tl.tlAssignmentLimit}</span>
                        )}
                      </td>
                      <td>
                        {editingTlId === tl.id ? (
                          <>
                            <button 
                              onClick={() => handleUpdateTLLimit(tl.id)} 
                              className="btn-save"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingTlId(null)} 
                              className="btn-cancel"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingTlId(tl.id)
                              setNewLimit(tl.tlAssignmentLimit)
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