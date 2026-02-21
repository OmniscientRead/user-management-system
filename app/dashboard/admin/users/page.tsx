'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
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
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'hr' as User['role']
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

  const loadUsers = () => {
    const storedUsers = localStorage.getItem('users')
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers))
    } else {
      // Initial users
      const initialUsers = [
        { id: 1, email: 'boss@company.com', role: 'boss', createdAt: new Date().toISOString() },
        { id: 2, email: 'hr@company.com', role: 'hr', createdAt: new Date().toISOString() },
        { id: 3, email: 'tl@company.com', role: 'team-lead', createdAt: new Date().toISOString() },
        { id: 4, email: 'admin@company.com', role: 'admin', createdAt: new Date().toISOString() },
      ]
      setUsers(initialUsers)
      localStorage.setItem('users', JSON.stringify(initialUsers))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email || !formData.password || !formData.role) {
      setMessage({ text: 'Please fill all fields', type: 'error' })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' })
      return
    }

    if (formData.password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters', type: 'error' })
      return
    }

    if (users.some(u => u.email === formData.email)) {
      setMessage({ text: 'Email already exists', type: 'error' })
      return
    }

    // Add new user
    const newUser: User = {
      id: users.length + 1,
      email: formData.email,
      role: formData.role,
      createdAt: new Date().toISOString()
    }

    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    localStorage.setItem('users', JSON.stringify(updatedUsers))
    
    setMessage({ text: '✓ User added successfully!', type: 'success' })
    setFormData({ email: '', password: '', confirmPassword: '', role: 'hr' })
    setShowAddForm(false)

    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleDeleteUser = (id: number, email: string) => {
    if (email === 'admin@company.com') {
      setMessage({ text: 'Cannot delete master admin account', type: 'error' })
      return
    }

    if (confirm(`Are you sure you want to delete user ${email}?`)) {
      const updatedUsers = users.filter(u => u.id !== id)
      setUsers(updatedUsers)
      localStorage.setItem('users', JSON.stringify(updatedUsers))
      setMessage({ text: '✓ User deleted successfully!', type: 'success' })
      
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    }
  }

  const handleResetPassword = (userId: number) => {
    const newPassword = prompt('Enter new password (min 6 characters):')
    if (newPassword && newPassword.length >= 6) {
      setMessage({ text: '✓ Password reset successfully!', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } else if (newPassword) {
      setMessage({ text: 'Password must be at least 6 characters', type: 'error' })
    }
  }

  // Filter users based on search and role
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (!user) return (
    <div className="dashboard-container">
      <Sidebar role="admin" userName="Admin" />
      <div className="dashboard-content">
        <div className="loading-state">Loading...</div>
      </div>
    </div>
  )

  return (
    <div className="dashboard-container">
      <Sidebar role="admin" userName={user.email} />
      
      <div className="dashboard-content">
        <div className="page-header">
          <h1>Manage Users</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-add-user"
          >
            {showAddForm ? '✕ Cancel' : '+ Add New User'}
          </button>
        </div>

        {/* Message display */}
        {message.text && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Add user form */}
        {showAddForm && (
          <div className="add-user-form">
            <h2>Add New User</h2>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="user@company.com"
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

        {/* Filters */}
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

        {/* Users table */}
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
                      <span className={`role-badge role-${u.role}`}>
                        {u.role.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        className="btn-reset"
                        title="Reset Password"
                      >
                        🔑
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="btn-delete"
                        disabled={u.email === 'admin@company.com'}
                        title={u.email === 'admin@company.com' ? 'Cannot delete master admin' : 'Delete user'}
                      >
                        🗑️
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

        {/* Summary */}
        <div className="table-summary">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>
    </div>
  )
}