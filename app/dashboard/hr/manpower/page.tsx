// app/dashboard/hr/manpower/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import '../hr-dashboard.css'

export default function HRManpowerPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [manpowerRequests, setManpowerRequests] = useState<any[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLimit, setEditLimit] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [selectedPdf, setSelectedPdf] = useState<any>(null)

  useEffect(() => {
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
    loadManpowerRequests()
  }, [router])

  const loadManpowerRequests = () => {
    const savedRequests = localStorage.getItem('manpowerRequests')
    if (savedRequests) {
      const requests = JSON.parse(savedRequests)
      setManpowerRequests(requests)
    }
  }

  const handleSetLimit = (requestId: number, currentLimit: number | null) => {
    setEditingId(requestId)
    setEditLimit(currentLimit?.toString() || '')
  }

  const handleSaveLimit = (requestId: number) => {
    const limit = parseInt(editLimit)
    
    if (isNaN(limit) || limit < 0) {
      alert('Please enter a valid number')
      return
    }

    const updatedRequests = manpowerRequests.map((req) => {
      if (req.id === requestId) {
        return {
          ...req,
          limit: limit,
          status: limit > 0 ? 'approved' : 'rejected',
          assignedCount: 0 // Reset assigned count when new limit is set
        }
      }
      return req
    })

    setManpowerRequests(updatedRequests)
    localStorage.setItem('manpowerRequests', JSON.stringify(updatedRequests))
    setEditingId(null)
    setEditLimit('')
    setSuccessMessage(`✅ Manpower limit set to ${limit} successfully!`)
    
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleViewPdf = (pdfData: string, fileName: string) => {
    setSelectedPdf({ data: pdfData, name: fileName })
    setShowPdfModal(true)
  }

  const handleDownloadPdf = (pdfData: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = pdfData
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="dashboard-container">
      <Sidebar role="hr" userName={user?.email || ''} />
      
      <div className="dashboard-content">
        <h1>Manpower Requests</h1>
        <p className="subtitle">Set assignment limits for team leads</p>

        {successMessage && (
          <div className="message-success">
            {successMessage}
          </div>
        )}

        {manpowerRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No manpower requests yet</p>
            <span className="empty-subtext">Team leads will appear here when they submit requests</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="manpower-table">
              <thead>
                <tr>
                  <th>Team Lead</th>
                  <th>Position</th>
                  <th>Requested</th>
                  <th>Set Limit</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th>Request File</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {manpowerRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="tl-name">{request.teamLeadName}</td>
                    <td>{request.position}</td>
                    <td className="requested-count">{request.requestedCount}</td>
                    <td className="limit-cell">
                      {editingId === request.id ? (
                        <div className="limit-edit">
                          <input
                            type="number"
                            value={editLimit}
                            onChange={(e) => setEditLimit(e.target.value)}
                            min="0"
                            max={request.requestedCount}
                            placeholder={`Max ${request.requestedCount}`}
                          />
                          <button
                            onClick={() => handleSaveLimit(request.id)}
                            className="btn-save-limit"
                          >
                            ✓ Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn-cancel-limit"
                          >
                            ✗ Cancel
                          </button>
                        </div>
                      ) : (
                        <span className={request.limit ? 'limit-set' : 'limit-not-set'}>
                          {request.limit !== null ? `${request.limit} slots` : '—'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="assigned-count">
                        {request.assignedCount || 0} / {request.limit || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${request.status}`}>
                        {request.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="pdf-actions">
                        <button
                          onClick={() => handleViewPdf(request.pdfData, request.pdfFileName)}
                          className="btn-view-pdf"
                        >
                          📄 View
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(request.pdfData, request.pdfFileName)}
                          className="btn-download-pdf"
                        >
                          ⬇️ Download
                        </button>
                      </div>
                    </td>
                    <td>{request.date}</td>
                    <td>
                      {editingId !== request.id && (
                        <button
                          onClick={() => handleSetLimit(request.id, request.limit)}
                          className="btn-set-limit"
                        >
                          {request.limit !== null ? '✏️ Update' : '⚡ Set Limit'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PDF Modal */}
        {showPdfModal && selectedPdf && (
          <div className="pdf-modal-overlay" onClick={() => setShowPdfModal(false)}>
            <div className="pdf-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pdf-modal-header">
                <h3>{selectedPdf.name}</h3>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="modal-close-btn"
                >
                  ✗
                </button>
              </div>
              <iframe
                src={selectedPdf.data}
                className="pdf-viewer"
                title="PDF Viewer"
              />
              <div className="pdf-modal-footer">
                <button
                  onClick={() => handleDownloadPdf(selectedPdf.data, selectedPdf.name)}
                  className="btn-download"
                >
                  ⬇️ Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}