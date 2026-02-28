'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import './audit.css'

type AuditRecord = {
  id: number
  actorUserId: number
  actorEmail: string
  actorRole: string
  action: string
  entity: string
  entityId: string
  createdAt: string
}

export default function AdminAuditPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [logs, setLogs] = useState<AuditRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')

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
    loadLogs()
  }, [router])

  const loadLogs = async () => {
    const response = await fetch('/api/audit')
    if (!response.ok) return
    const data = await response.json()
    setLogs(data)
  }

  const filtered = logs.filter((log) => {
    const term = searchTerm.toLowerCase()
    return (
      log.actorEmail.toLowerCase().includes(term) ||
      log.entity.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      String(log.entityId).toLowerCase().includes(term)
    )
  })

  if (!user) return <div>Loading...</div>

  return (
    <div className="admin-audit-container">
      <Sidebar role="admin" userName={user.email} />

      <div className="admin-audit-content">
        <h1>Audit Logs</h1>
        <p className="subtitle">System actions and changes for traceability</p>

        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by user, action, entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td>{log.id}</td>
                    <td>{log.actorEmail}</td>
                    <td>{log.actorRole}</td>
                    <td>{log.action}</td>
                    <td>{log.entity}</td>
                    <td>{log.entityId}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-message">
                    No audit logs found
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
