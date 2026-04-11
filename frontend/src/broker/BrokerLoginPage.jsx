import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { brokerAuthAPI } from '../api'

export default function BrokerLoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await brokerAuthAPI.login(form.email, form.password)
      localStorage.setItem('broker_token', data.token)
      navigate('/broker/dashboard')
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Colocsy for Owners</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>List your PG or flat</p>
        </div>
        <div style={{ padding: '28px 32px 32px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: '#fff' }}>Sign in</h2>
          <form onSubmit={submit}>
            <label style={labelStyle}>Email</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={inputStyle} placeholder="you@example.com"
            />
            <label style={labelStyle}>Password</label>
            <input
              type="password" required value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={inputStyle} placeholder="••••••••"
            />
            {error && <p style={{ color: '#f44', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
            Don't have an account?{' '}
            <Link to="/broker/register" style={{ color: '#a855f7', textDecoration: 'none' }}>Request access</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh', background: '#0f0f0f',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const cardStyle = {
  width: '100%', maxWidth: 420, background: '#1a1a1a',
  border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden',
}
const headerStyle = {
  background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
  padding: '24px 32px', textAlign: 'center',
}
const labelStyle = { display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 14 }
const inputStyle = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  borderRadius: 8, padding: '10px 12px', color: '#e5e5e5', fontSize: 14,
  boxSizing: 'border-box', outline: 'none', marginBottom: 4,
}
const btnStyle = {
  width: '100%', background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
  color: '#fff', border: 'none', borderRadius: 10, padding: '13px',
  fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8,
}
