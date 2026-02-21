'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import './admin-dashboard.css'

interface DashboardStats {
  totalUsers: number
  totalApplicants: number
  totalAssignments: number
  pendingApplicants: number
  approvedApplicants: number
  totalTeamLeads: number
  manPowerLimit: number
  usedManPower: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalApplicants: 0,
    totalAssignments: 0,
    pendingApplicants: 0,
    approvedApplicants: 0,
    totalTeamLeads: 0,
    manPowerLimit: 50,
    usedManPower: 0
  })
  const [loading, setLoading] = useState(true)

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
    loadDashboardStats()
    setLoading(false)
  }, [router])

  const loadDashboardStats = () => {
    // Load from localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const applicants = JSON.parse(localStorage.getItem('applicants') || '[]')
    const assignments = JSON.parse(localStorage.getItem('assignments') || '[]')
    const manPowerLimit = parseInt(localStorage.getItem('manPowerLimit') || '50')
    
    const teamLeads = users.filter((u: any) => u.role === 'team-lead')
    const pendingApps = applicants.filter((a: any) => a.status === 'pending')
    const approvedApps = applicants.filter((a: any) => a.status === 'approved')
    
    setStats({
      totalUsers: users.length,
      totalApplicants: applicants.length,
      totalAssignments: assignments.length,
      pendingApplicants: pendingApps.length,
      approvedApplicants: approvedApps.length,
      totalTeamLeads: teamLeads.length,
      manPowerLimit: manPowerLimit,
      usedManPower: approvedApps.length
    })
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar role="admin" userName={user?.email || 'Admin'} />
        <div className="dashboard-content">
          <div className="loading-state">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Sidebar role="admin" userName={user?.email || 'Admin'} />
      
      <div className="dashboard-content">
        <h1>Master Admin Dashboard</h1>
        <p className="subtitle">Complete control over users, applicants, and assignments</p>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <p className="stat-label">Total Users</p>
              <p className="stat-value">{stats.totalUsers}</p>
              <p className="stat-sub">Team Leads: {stats.totalTeamLeads}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-content">
              <p className="stat-label">Total Applicants</p>
              <p className="stat-value">{stats.totalApplicants}</p>
              <p className="stat-sub">Pending: {stats.pendingApplicants}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <p className="stat-label">Approved</p>
              <p className="stat-value">{stats.approvedApplicants}</p>
              <p className="stat-sub">Ready for assignment</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <p className="stat-label">Assignments</p>
              <p className="stat-value">{stats.totalAssignments}</p>
              <p className="stat-sub">Total assignments</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <p className="stat-label">Man Power</p>
              <p className="stat-value">{stats.usedManPower}/{stats.manPowerLimit}</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${(stats.usedManPower / stats.manPowerLimit) * 100}%`}}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link href="/dashboard/admin/users" className="action-button">
              <span className="action-icon">👥</span>
              <span className="action-text">Manage Users</span>
            </Link>
            <Link href="/dashboard/admin/applicants" className="action-button">
              <span className="action-icon">📄</span>
              <span className="action-text">Manage Applicants</span>
            </Link>
            <Link href="/dashboard/admin/assignments" className="action-button">
              <span className="action-icon">📋</span>
              <span className="action-text">View Assignments</span>
            </Link>
            <Link href="/dashboard/admin/manpower" className="action-button">
              <span className="action-icon">⚡</span>
              <span className="action-text">Set Man Power</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}