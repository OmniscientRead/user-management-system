'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers } from '@/lib/db'
import { COMPANY_EMAIL_ERROR, isAllowedCompanyEmail, normalizeEmail } from '@/lib/email-domain'
import './login.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  type LoginUser = {
    email: string
    password?: string
    role: 'boss' | 'hr' | 'team-lead' | 'admin'
  }

  const DEMO_USERS: LoginUser[] = [
    { email: 'boss@constantinolawoffice.com', password: 'boss123', role: 'boss' },
    { email: 'hr@constantinolawoffice.com', password: 'hr123', role: 'hr' },
    { email: 'tl@constantinolawoffice.com', password: 'tl123', role: 'team-lead' },
    { email: 'admin@constantinolawoffice.com', password: 'admin123', role: 'admin' },
  ]

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const normalizedEmail = normalizeEmail(email)
    if (!isAllowedCompanyEmail(normalizedEmail)) {
      setError(COMPANY_EMAIL_ERROR)
      return
    }

    setIsLoading(true)

    setTimeout(async () => {
      try {
        const storedUsers = (await getAllUsers()) as LoginUser[]
        const mergedUsers: LoginUser[] = [...DEMO_USERS]

      storedUsers.forEach((storedUser: LoginUser) => {
        const existingIndex = mergedUsers.findIndex(
          (demoUser) => normalizeEmail(demoUser.email) === normalizeEmail(storedUser.email)
        )

        if (existingIndex >= 0) {
          mergedUsers[existingIndex] = {
            ...mergedUsers[existingIndex],
            ...storedUser,
          }
          return
        }

        mergedUsers.push(storedUser)
      })

        const user = mergedUsers.find(
          (u) => normalizeEmail(u.email) === normalizedEmail && u.password === password
        )

        if (user) {
          // Cleanup legacy localStorage payloads from the pre-backend version.
          localStorage.removeItem('users')
          localStorage.removeItem('applicants')
          localStorage.removeItem('assignments')
          localStorage.removeItem('manpowerRequests')
          localStorage.removeItem('manPowerLimit')

          localStorage.setItem('user', JSON.stringify(user))
          if (rememberMe) {
            localStorage.setItem('rememberMe', JSON.stringify(user))
          }
          router.push(`/dashboard/${user.role}`)
        } else {
          setError('Invalid email or password')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Login error:', error)
        setError('Login failed. Please try again.')
        setIsLoading(false)
      }
    }, 500)
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">Applicant Portal</h1>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input
              id="email"
              type="email"
              placeholder="name@constantinolawoffice.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={isLoading} className="login-button">
            {isLoading ? '⟳ Logging in...' : '➔  SIGN IN'}
          </button>
        </form>

        <div className="demo-credentials">
          <strong>Demo Credentials:</strong>
          <p>Boss: boss@constantinolawoffice.com / boss123</p>
          <p>HR: hr@constantinolawoffice.com / hr123</p>
          <p>Team Lead: tl@constantinolawoffice.com / tl123</p>
          <p>Admin: admin@constantinolawoffice.com / admin123</p>
        </div>
      </div>
    </div>
  )
}
