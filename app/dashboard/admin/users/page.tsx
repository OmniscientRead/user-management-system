'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { addUser, deleteUser, getAllUsers, putUser } from '@/lib/db'
import { COMPANY_EMAIL_ERROR, isAllowedCompanyEmail, normalizeEmail } from '@/lib/email-domain'
import './users.css'

interface User {
  id: number
  email: string
  password?: string
  role: 'boss' | 'hr' | 'team-lead' | 'admin'
  createdAt: string
  lastLogin?: string
}

export default function ManageUsersPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'hr' as User['role'],
  })

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
    loadUsers()
  }, [router])

  const loadUsers = async () => {
    const allUsers = await getAllUsers()
    setUsers(allUsers)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    const normalizedEmail = normalizeEmail(formData.email)

    if (!normalizedEmail || !formData.password || !formData.role) {
      showToast('Please fill all fields', 'error')
      return
    }

    if (!isAllowedCompanyEmail(normalizedEmail)) {
      showToast(COMPANY_EMAIL_ERROR, 'error')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    if (formData.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    if (users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
      showToast('Email already exists', 'error')
      return
    }

    const newUser: Omit<User, 'id'> = {
      email: normalizedEmail,
      password: formData.password,
      role: formData.role,
      createdAt: new Date().toISOString(),
    }

    await addUser(newUser)
    await loadUsers()

    showToast('User added successfully', 'success')
    setFormData({ email: '', password: '', confirmPassword: '', role: 'hr' })
    setShowAddForm(false)
  }

  const handleDeleteUser = async (id: number, email: string) => {
    if (normalizeEmail(email) === 'admin@constantinolawoffice.com') {
      showToast('Cannot delete master admin account', 'error')
      return
    }

    if (!confirm(`Are you sure you want to delete user ${email}?`)) {
      return
    }

    await deleteUser(id)
    await loadUsers()
    showToast('User deleted successfully', 'success')
  }

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt('Enter new password (min 6 characters):')

    if (!newPassword) {
      return
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    const targetUser = users.find((u) => u.id === userId)
    if (!targetUser) {
      showToast('User not found', 'error')
      return
    }

    await putUser({ ...targetUser, password: newPassword })
    await loadUsers()
    showToast('Password reset successfully', 'success')
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (!user) {
    return (
      <div className="admin-users-container">
        <Sidebar role="admin" userName="Admin" />
        <div className="admin-users-content">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-users-container">
      <Sidebar role="admin" userName={user.email} />

      <div className="admin-users-content">
        <div className="page-header">
          <h1>Manage Users</h1>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-add-user">
            {showAddForm ? 'Cancel' : '+ Add New User'}
          </button>
        </div>

        {message.text && <div className={`message message-${message.type}`}>{message.text}</div>}

        {showAddForm && (
          <div className="add-user-form">
            <h2>Add New User</h2>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="user@constantinolawoffice.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select name="role" value={formData.role} onChange={handleInputChange}>
                  <option value="boss">Boss</option>
                  <option value="hr">HR</option>
                  <option value="team-lead">Team Lead</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button type="submit" className="btn-submit">
                Create User
              </button>
            </form>
          </div>
        )}

        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="role-filter"
          >
            <option value="all">All Roles</option>
            <option value="boss">Boss</option>
            <option value="hr">HR</option>
            <option value="team-lead">Team Lead</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>{u.role.replace('-', ' ').toUpperCase()}</span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => handleResetPassword(u.id)} className="btn-reset" title="Reset Password">
                        Reset
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="btn-delete"
                        disabled={normalizeEmail(u.email) === 'admin@constantinolawoffice.com'}
                        title={normalizeEmail(u.email) === 'admin@constantinolawoffice.com' ? 'Cannot delete master admin' : 'Delete user'}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-message">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-summary">Showing {filteredUsers.length} of {users.length} users</div>
      </div>
    </div>
  )
}
