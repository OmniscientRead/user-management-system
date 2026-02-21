'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import '../team-lead-dashboard.css'

export default function TeamLeadManpowerPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [manpowerRequests, setManpowerRequests] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    position: '',
    requestedCount: '',
    pdfFile: null,
  })
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }

    const userData = JSON.parse(storedUser)
    if (userData.role !== 'team-lead') {
      router.push('/')
      return
    }

    setUser(userData)

    // Load manpower requests from localStorage
    const savedRequests = localStorage.getItem('manpowerRequests')
    if (savedRequests) {
      const allRequests = JSON.parse(savedRequests)
      // Filter only this team lead's requests
      const tlRequests = allRequests.filter(
        (req) => req.teamLeadEmail === userData.email
      )
      setManpowerRequests(tlRequests)
    }
  }, [router])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle file input
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setFormData((prev) => ({
        ...prev,
        pdfFile: file,
      }))
    } else {
      alert('Please upload a valid PDF file')
    }
  }

  // Submit manpower request
  const handleSubmitRequest = (e) => {
    e.preventDefault()

    if (!formData.position || !formData.requestedCount || !formData.pdfFile) {
      alert('Please fill in all fields and select a PDF file')
      return
    }

    // Read file and convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const pdfBase64 = event.target.result

      // Create new request with PDF data
      const newRequest = {
        id: Date.now(),
        position: formData.position,
        requestedCount: parseInt(formData.requestedCount),
        approvedCount: 0,
        assignedCount: 0,
        limit: null,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        teamLeadEmail: user.email,
        teamLeadName: user.email.split('@')[0],
        pdfFileName: formData.pdfFile.name,
        pdfData: pdfBase64, // Store the base64 encoded PDF
      }

      // Add to localStorage
      const savedRequests = localStorage.getItem('manpowerRequests')
      const allRequests = savedRequests ? JSON.parse(savedRequests) : []
      allRequests.push(newRequest)
      localStorage.setItem('manpowerRequests', JSON.stringify(allRequests))

      // Update state
      setManpowerRequests([...manpowerRequests, newRequest])

      // Reset form
      setFormData({ position: '', requestedCount: '', pdfFile: null })
      setShowForm(false)
      setSuccessMessage('Manpower request submitted successfully!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    }
    reader.readAsDataURL(formData.pdfFile)
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard-container">
      <Sidebar role="team-lead" userName={user.email} />

      <div className="dashboard-content">
        <h1>Manpower Requests</h1>
        <p className="subtitle">Submit and view your manpower requests</p>

        {successMessage && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '20px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '4px',
              border: '1px solid #c3e6cb',
            }}
          >
            {successMessage}
          </div>
        )}

        <div
          style={{
            marginBottom: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px' }}>Your Requests</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {showForm ? 'Cancel' : 'New Request'}
          </button>
        </div>

        {showForm && (
          <div
            style={{
              backgroundColor: '#f9f9f9',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px',
              border: '1px solid #ddd',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
              Submit Manpower Request
            </h3>
            <form onSubmit={handleSubmitRequest}>
              <div
                style={{
                  marginBottom: '15px',
                  display: 'flex',
                  gap: '15px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Position Name
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="e.g., Software Developer"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Number of Positions Needed
                  </label>
                  <input
                    type="number"
                    name="requestedCount"
                    value={formData.requestedCount}
                    onChange={handleInputChange}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Upload Manpower Request (PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
                {formData.pdfFile && (
                  <p
                    style={{
                      marginTop: '8px',
                      color: '#28a745',
                      fontSize: '14px',
                    }}
                  >
                    ✓ {formData.pdfFile.name}
                  </p>
                )}
              </div>

              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Submit Request
              </button>
            </form>
          </div>
        )}

        <div className="assignments-table-wrapper">
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Requested</th>
                <th>Approved Limit</th>
                <th>Assigned</th>
                <th>Status</th>
                <th>PDF</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {manpowerRequests.length > 0 ? (
                manpowerRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.position}</td>
                    <td>{request.requestedCount}</td>
                    <td>{request.limit !== null ? request.limit : 'Pending'}</td>
                    <td>{request.assignedCount}</td>
                    <td>
                      <span
                        className={`status-badge status-${request.status}`}
                      >
                        {request.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          alert(`PDF: ${request.pdfFileName}`)
                        }}
                        style={{ color: '#007bff', textDecoration: 'none' }}
                      >
                        View PDF
                      </a>
                    </td>
                    <td>{request.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-message">
                    No manpower requests yet
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
