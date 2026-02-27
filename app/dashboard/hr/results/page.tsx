'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getAllApplicants, getAllAssignments } from '@/lib/db'
import '../hr-dashboard.css'

type ViewType = 'assignments' | 'decisions'

export default function HRResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [activeView, setActiveView] = useState<ViewType>('assignments')

  // Assignments state
  const [assignments, setAssignments] = useState([])

  // Decisions state
  const [allApplicants, setAllApplicants] = useState([])
  const [filteredApplicants, setFilteredApplicants] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

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
        await loadAssignments()
        await loadDecisions()
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      }
    }

    initializeDashboard()
  }, [router])

  const loadAssignments = async () => {
    try {
      const allAssignments = await getAllAssignments()
      setAssignments(allAssignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const loadDecisions = async () => {
    try {
      const allApps = await getAllApplicants()
      // Filter only approved and rejected (exclude pending)
      const decisions = allApps.filter(
        (app) => app.status === 'approved' || app.status === 'rejected'
      )
      setAllApplicants(decisions)
      setFilteredApplicants(decisions)
    } catch (error) {
      console.error('Error loading decisions:', error)
    }
  }

  const handleSearch = (value) => {
    setSearchTerm(value)
    filterApplicants(value, filterType)
  }

  const handleFilterChange = (type) => {
    setFilterType(type)
    filterApplicants(searchTerm, type)
  }

  const filterApplicants = (search, type) => {
    let filtered = allApplicants

    // Filter by type (approved/rejected/all)
    if (type === 'approved') {
      filtered = filtered.filter((app) => app.status === 'approved')
    } else if (type === 'rejected') {
      filtered = filtered.filter((app) => app.status === 'rejected')
    }

    // Filter by search term
    if (search.trim()) {
      filtered = filtered.filter((app) =>
        app.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    setFilteredApplicants(filtered)
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard-container">
      <Sidebar role="hr" userName={user.email} />

      <div className="dashboard-content">
        <h1>Results</h1>
        <p className="subtitle">View TL assignments and boss decisions</p>

        {/* Toggle buttons */}
        <div className="results-toggle-buttons">
          <button
            className={`toggle-btn ${activeView === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveView('assignments')}
          >
            TL Assignments
          </button>
          <button
            className={`toggle-btn ${activeView === 'decisions' ? 'active' : ''}`}
            onClick={() => setActiveView('decisions')}
          >
            Boss Decisions
          </button>
        </div>

        {/* TL Assignments View */}
        {activeView === 'assignments' && (
          <div className="view-section">
            <h2>Team Lead Assignments</h2>
            <div className="table-wrapper">
              <table className="applicants-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Position Applied</th>
                    <th>Assigned TL</th>
                    <th>Age</th>
                    <th>Education</th>
                    <th>Course</th>
                    <th>Position Applied</th>
                    <th>Experience</th>
                    <th>Referral</th>
                    <th>Assigned Date</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length > 0 ? (
                    assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>{assignment.applicantName}</td>
                        <td>{assignment.positionAppliedFor || '-'}</td>
                        <td>{assignment.tlName || assignment.tlEmail || '-'}</td>
                        <td>{assignment.age}</td>
                        <td>{assignment.education}</td>
                        <td>{assignment.course}</td>
                        <td>{assignment.collectionExperience}</td>
                        <td>{assignment.referral}</td>
                        <td>{assignment.assignedDate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-message">
                        No assignments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Boss Decisions View */}
        {activeView === 'decisions' && (
          <div className="view-section">
            <h2>Boss Decisions</h2>

            {/* Search and Filter Controls */}
            <div className="decisions-controls">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />

              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('all')}
                >
                  All ({allApplicants.length})
                </button>
                <button
                  className={`filter-btn ${filterType === 'approved' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('approved')}
                >
                  Approved (
                  {allApplicants.filter((a) => a.status === 'approved').length})
                </button>
                <button
                  className={`filter-btn ${filterType === 'rejected' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('rejected')}
                >
                  Rejected (
                  {allApplicants.filter((a) => a.status === 'rejected').length})
                </button>
              </div>
            </div>

            {/* Decisions Table */}
            <div className="table-wrapper">
              <table className="applicants-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Education</th>
                    <th>Course</th>
                    <th>Experience</th>
                    <th>Referral</th>
                    <th>Status</th>
                    <th>Decision Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicants.length > 0 ? (
                    filteredApplicants.map((applicant) => (
                      <tr key={applicant.id}>
                        <td>{applicant.name}</td>
                        <td>{applicant.age}</td>
                        <td>{applicant.education}</td>
                        <td>{applicant.course}</td>
                        <td>{applicant.positionAppliedFor || '-'}</td>
                        <td>{applicant.collectionExperience}</td>
                        <td>{applicant.referral}</td>
                        <td>
                          <span
                            className={`status-badge status-${applicant.status}`}
                          >
                            {applicant.status.charAt(0).toUpperCase() +
                              applicant.status.slice(1)}
                          </span>
                        </td>
                        <td>{applicant.addedDate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-message">
                        No decisions found matching your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
