'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ConfirmDialog from '@/components/ConfirmDialog'
import { addManpowerRequest, getAllManpowerRequests } from '@/lib/db'
import { POSITION_OPTIONS } from '@/lib/positions'
import '../team-lead-dashboard.css'

type TLUser = {
  id?: number
  email: string
  role: 'team-lead'
}

type ManpowerRequest = {
  id: number
  position: string
  requestedCount: number
  approvedCount: number
  assignedCount: number
  limit: number | null
  status: 'pending' | 'approved' | 'rejected'
  date: string
  createdAt: string
  teamLeadEmail: string
  teamLeadName: string
  tlId: number | null
  pdfFileName: string
  pdfData: string
}

export default function TeamLeadManpowerPage() {
  const router = useRouter()
  const [user, setUser] = useState<TLUser | null>(null)
  const [manpowerRequests, setManpowerRequests] = useState<ManpowerRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    position: '',
    requestedCount: '',
    pdfFile: null as File | null,
  })
  const [successMessage, setSuccessMessage] = useState('')
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
    const initialize = async () => {
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

      const tlUser: TLUser = {
        id: typeof userData.id === 'number' ? userData.id : undefined,
        email: userData.email,
        role: 'team-lead',
      }

      setUser(tlUser)

      const allRequests = await getAllManpowerRequests()
      const tlRequests = allRequests.filter((req) => req.teamLeadEmail === tlUser.email)
      setManpowerRequests(tlRequests)
    }

    initialize()
  }, [router])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (!file) {
      setFormData((prev) => ({ ...prev, pdfFile: null }))
      return
    }

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file')
      return
    }

    setFormData((prev) => ({
      ...prev,
      pdfFile: file,
    }))
  }

  const submitRequest = () => {
    if (!user) {
      alert('User session not found. Please login again.')
      return
    }

    if (!formData.position || !formData.requestedCount || !formData.pdfFile) {
      alert('Please fill in all fields and select a PDF file')
      return
    }

    const requestedCount = Number(formData.requestedCount)
    if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
      alert('Requested count must be a valid number greater than 0')
      return
    }

    const reader = new FileReader()

    reader.onerror = () => {
      alert('Failed to read PDF file. Please try again.')
    }

    reader.onload = async () => {
      const pdfBase64 = typeof reader.result === 'string' ? reader.result : ''
      if (!pdfBase64) {
        alert('Invalid PDF data. Please try another file.')
        return
      }

      const newRequest: ManpowerRequest = {
        id: Date.now(),
        position: formData.position,
        requestedCount,
        approvedCount: 0,
        assignedCount: 0,
        limit: null,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        teamLeadEmail: user.email,
        teamLeadName: user.email.split('@')[0],
        tlId: user.id ?? null,
        pdfFileName: formData.pdfFile?.name || 'request.pdf',
        pdfData: pdfBase64,
      }

      await addManpowerRequest(newRequest)
      const allRequests = await getAllManpowerRequests()
      const updatedTLRequests = allRequests.filter((req) => req.teamLeadEmail === user.email)
      setManpowerRequests(updatedTLRequests)
      setFormData({ position: '', requestedCount: '', pdfFile: null })
      setShowForm(false)
      setSuccessMessage('Manpower request submitted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    }

    reader.readAsDataURL(formData.pdfFile)
  }

  const handleSubmitRequest = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setConfirmState({
      open: true,
      title: 'Submit Manpower Request',
      message: 'Submit this manpower request now?',
      variant: 'default',
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }))
        submitRequest()
      },
    })
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
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Submit Manpower Request</h3>
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
                  <label style={{ display: 'block', marginBottom: '5px' }}>Position Name *</label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="" disabled>Select a position</option>
                    {POSITION_OPTIONS.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Number of Positions Needed *</label>
                  <input
                    type="number"
                    name="requestedCount"
                    value={formData.requestedCount}
                    onChange={handleInputChange}
                    min="1"
                    required
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
                <label style={{ display: 'block', marginBottom: '5px' }}>Upload Manpower Request (PDF) *</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  required
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
                    {formData.pdfFile.name}
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
                      <span className={`status-badge status-${request.status}`}>{request.status.toUpperCase()}</span>
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
                  <td colSpan={7} className="empty-message">
                    No manpower requests yet
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
