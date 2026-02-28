// app/dashboard/boss/decisions/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getAllApplicants } from '@/lib/db'
import { openPdfInNewTab } from '@/lib/pdf'
import '../boss-dashboard.css'

export default function BossDecisionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [decisions, setDecisions] = useState<any[]>([])
  const [filteredDecisions, setFilteredDecisions] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'approved' | 'rejected'>('all')
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
        if (userData.role !== 'boss') {
          router.push('/')
          return
        }

        setUser(userData)
        await loadDecisions()
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [router])

  const loadDecisions = async () => {
    try {
      const allApps = await getAllApplicants()
      // Show ONLY approved and rejected (decisions made)
      const decisions = allApps.filter(
        (app: any) => app.status === 'approved' || app.status === 'rejected'
      )
      setDecisions(decisions)
      setFilteredDecisions(decisions)
    } catch (error) {
      console.error('Error loading decisions:', error)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    filterDecisions(value, filterType)
  }

  const handleFilterChange = (type: 'all' | 'approved' | 'rejected') => {
    setFilterType(type)
    filterDecisions(searchTerm, type)
  }

  const filterDecisions = (search: string, type: string) => {
    let filtered = decisions

    if (type === 'approved') {
      filtered = filtered.filter((d) => d.status === 'approved')
    } else if (type === 'rejected') {
      filtered = filtered.filter((d) => d.status === 'rejected')
    }

    if (search.trim()) {
      filtered = filtered.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    setFilteredDecisions(filtered)
  }

  if (loading) return (
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
        <h1>My Decisions</h1>
        <p className="subtitle">History of applicants you approved or rejected</p>

        {/* Search and Filter */}
        <div className="decisions-controls">
          <input
            type="text"
            placeholder="🔍 Search by name..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />

          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All ({decisions.length})
            </button>
            <button
              className={`filter-btn ${filterType === 'approved' ? 'active' : ''}`}
              onClick={() => handleFilterChange('approved')}
            >
              ✓ Approved ({decisions.filter(d => d.status === 'approved').length})
            </button>
            <button
              className={`filter-btn ${filterType === 'rejected' ? 'active' : ''}`}
              onClick={() => handleFilterChange('rejected')}
            >
              ✗ Rejected ({decisions.filter(d => d.status === 'rejected').length})
            </button>
          </div>
        </div>

        {/* Decisions Table */}
        <div className="table-wrapper">
          {filteredDecisions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No decisions found</p>
              <span className="empty-subtext">
                {searchTerm ? 'Try adjusting your search' : 'Start approving/rejecting applicants to see them here'}
              </span>
            </div>
          ) : (
            <table className="applicants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Education</th>
                  <th>Course</th>
                  <th>Position Applied</th>
                  <th>Experience</th>
                  <th>Referral</th>
                  <th>Decision</th>
                  <th>Decision Date</th>
                  <th>Resume</th>
                </tr>
              </thead>
              <tbody>
                {filteredDecisions.map((decision) => (
                  <tr key={decision.id}>
                    <td className="applicant-name">{decision.name}</td>
                    <td>{decision.age}</td>
                    <td>{decision.education}</td>
                    <td>{decision.course}</td>
                    <td>{decision.positionAppliedFor || '-'}</td>
                    <td>{decision.collectionExperience}</td>
                    <td>{decision.referral}</td>
                    <td>
                      <span className={`status-badge status-${decision.status}`}>
                        {decision.status === 'approved' ? '✓ APPROVED' : '✗ REJECTED'}
                      </span>
                    </td>
                    <td>{decision.addedDate}</td>
                    <td>
                      <button
                        onClick={() => openPdfInNewTab(decision.resumeData || decision.resumeUrl)}
                        className="btn-view-resume"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
