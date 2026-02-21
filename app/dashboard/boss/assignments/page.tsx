'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import '../boss-dashboard.css'

export default function BossAssignmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
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
  }, [router])

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard-container">
      <Sidebar role="boss" userName={user.email} />
      <div className="dashboard-content">
        <h1>View Assignments</h1>
        <p className="subtitle">
          See which applicants have been assigned to team leads
        </p>
        <div className="empty-state">
          <p>View all applicant assignments to team leads here</p>
        </div>
      </div>
    </div>
  )
}
