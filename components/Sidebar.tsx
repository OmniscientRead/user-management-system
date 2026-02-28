'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import './sidebar.css'

// Props are properties passed to this component
interface SidebarProps {
  role: 'boss' | 'hr' | 'team-lead' | 'admin'
  userName: string
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const router = useRouter()

  // Different menu items for each role
  // This is like a switch statement - different roles get different menus
  const getMenuItems = () => {
    const commonMenus = {
      boss: [
        { label: 'Dashboard', href: '/dashboard/boss', icon: '📊' },
        { label: 'Decisions', href: '/dashboard/boss/decisions', icon: '✅' },
        { label: 'View Assignment', href: '/dashboard/boss/assignments', icon: '📋' },
        // Boss only needs one manpower tab for reviewing requests
        
      ],
      hr: [
        { label: 'Dashboard', href: '/dashboard/hr', icon: '📊' },
        { label: 'Add Applicant', href: '/dashboard/hr/add-applicant', icon: '➕' },
        // Combined manpower tab (replaces both 'Approved Manpower' and 'Results')
        { label: 'Manpower', href: '/dashboard/hr/manpower', icon: '👥' },
        { label: 'Results', href: '/dashboard/hr/results', icon: '📋' },
      ],
      'team-lead': [
        { label: 'Dashboard', href: '/dashboard/team-lead', icon: '📊' },
        { label: 'My Assignments', href: '/dashboard/team-lead/assignments', icon: '📋' },
        // Single manpower tab for team lead
        { label: 'Manpower', href: '/dashboard/team-lead/manpower', icon: '👥' },
      ],
      admin: [
        { label: 'Dashboard', href: '/dashboard/admin', icon: '📊' },
        { label: 'Manage Users', href: '/dashboard/admin/users', icon: '👤' },
        { label: 'All Applicants', href: '/dashboard/admin/applicants', icon: '👥' },
        // Single manpower tab for admin (combines all manpower functions)
        { label: 'Manpower', href: '/dashboard/admin/manpower', icon: '👥' },
        { label: 'All Assignments', href: '/dashboard/admin/assignments', icon: '📋' },
        { label: 'Audit Logs', href: '/dashboard/admin/audit', icon: '🔎' },
      ],
    }

    return commonMenus[role] || []
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user')
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      router.push('/')
    })
  }

  const menuItems = getMenuItems()

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Sidebar header with toggle button */}
      <div className="sidebar-header">
        <div className="sidebar-logo">HR System</div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="sidebar-toggle" 
          title={isOpen ? 'Close' : 'Open'}
        >
          {isOpen ? '←' : '→'}
        </button>
      </div>

      {/* User info section */}
      <div className="sidebar-user">
        <div className="user-avatar">👤</div>
        {isOpen && (
          <div className="user-info">
            <p className="user-role">{role.replace('-', ' ').toUpperCase()}</p>
            <p className="user-email">{userName}</p>
          </div>
        )}
      </div>

      {/* Navigation menu items */}
      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className="menu-item"
          >
            <span className="menu-icon">{item.icon}</span>
            {isOpen && <span className="menu-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Logout button at the bottom */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button">
          <span className="menu-icon">🚪</span>
          {isOpen && <span className="menu-label">Logout</span>}
        </button>
      </div>
    </aside>
  )
}



