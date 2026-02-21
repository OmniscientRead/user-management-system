'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getAllApplicants } from '@/lib/db'
import '../hr-dashboard.css'

export default function HRDecisionsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allApplicants, setAllApplicants] = useState([])
  const [filteredApplicants, setFilteredApplicants] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedImage, setSelectedImage] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)

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
        await loadDecisions()
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      }
    }

    initializeDashboard()
  }, [router])

  const loadDecisions = async () => {
    // Load applicants from IndexedDB that have been approved or rejected
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

  const handleImageClick = (imageData, name) => {
    setSelectedImage({ data: imageData, name })
    setShowImageModal(true)
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard-container">
      <Sidebar role="hr" userName={user.email} />

      <div className="dashboard-content">
        <h1>Boss Decisions</h1>
        <p className="subtitle">
          View all applicants the boss approved or rejected
        </p>

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
                  <td colSpan="8" className="empty-message">
                    No decisions found matching your filters
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
