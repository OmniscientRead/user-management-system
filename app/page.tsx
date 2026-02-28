'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { COMPANY_EMAIL_ERROR, isAllowedCompanyEmail, normalizeEmail } from '@/lib/email-domain'
import './login.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

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
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          setError(body?.error || 'Invalid email or password')
          setIsLoading(false)
          return
        }

        const user = await response.json()

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
      </div>
    </div>
  )
}
