'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { getAllApplicants, getAllAssignments, getAllUsers, getSettings } from '@/lib/db'
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
    let isMounted = true

    const initialize = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        if (!storedUser) {
          router.replace('/')
          return
        }

        let userData: { email?: string; role?: string } | null = null
        try {
          userData = JSON.parse(storedUser)
        } catch {
          localStorage.removeItem('user')
          router.replace('/')
          return
        }

        if (!userData || userData.role !== 'admin') {
          router.replace('/')
          return
        }

        if (!isMounted) return
        setUser(userData)
        await loadDashboardStats()
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [router])

  const loadDashboardStats = async () => {
    const users = await getAllUsers()
    const applicants = await getAllApplicants()
    const assignments = await getAllAssignments()
    const settings = await getSettings()
    const manPowerLimit = settings.manPowerLimit ?? 50
    
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
      <div className="admin-dashboard-container">
        <Sidebar role="admin" userName={user?.email || 'Admin'} />
        <div className="admin-dashboard-content">
          <div className="admin-loading-state">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard-container">
      <Sidebar role="admin" userName={user?.email || 'Admin'} />
      
      <div className="admin-dashboard-content">
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
