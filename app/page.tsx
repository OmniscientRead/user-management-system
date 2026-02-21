'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import './login.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  const DEMO_USERS = [
    { email: 'boss@company.com', password: 'boss123', role: 'boss' },
    { email: 'hr@company.com', password: 'hr123', role: 'hr' },
    { email: 'tl@company.com', password: 'tl123', role: 'team-lead' },
    { email: 'admin@company.com', password: 'admin123', role: 'admin' },
  ]

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    setTimeout(() => {
      const user = DEMO_USERS.find(
        (u) => u.email === email && u.password === password
      )

      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
        if (rememberMe) {
          localStorage.setItem('rememberMe', JSON.stringify(user))
        }
        router.push(`/dashboard/${user.role}`)
      } else {
        setError('Invalid email or password')
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
            <label htmlFor="email">👤 Username</label>
            <input
              id="email"
              type="text"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">🔒 Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="checkbox-group">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">Remember me</label>
          </div>

          <button type="submit" disabled={isLoading} className="login-button">
            {isLoading ? '⟳ Logging in...' : '➔  SIGN IN'}
          </button>
        </form>

        <div className="demo-credentials">
          <strong>Demo Credentials:</strong>
          <p>Boss: boss@company.com / boss123</p>
          <p>HR: hr@company.com / hr123</p>
          <p>Team Lead: tl@company.com / tl123</p>
          <p>Admin: admin@company.com / admin123</p>
        </div>
      </div>
    </div>
  )
}
