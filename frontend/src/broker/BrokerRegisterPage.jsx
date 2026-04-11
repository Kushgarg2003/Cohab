import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { brokerAuthAPI } from '../api'

export default function BrokerRegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ display_name: '', email: '', phone: '', city: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      const data = await brokerAuthAPI.register({
        display_name: form.display_name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        password: form.password,
      })
      localStorage.setItem('broker_token', data.token)
      navigate('/broker/dashboard')
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Request Access</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            List your PG or flat on Colocsy — free during beta
          </p>
        </div>
        <div style={{ padding: '24px 28px 28px' }}>
          <form onSubmit={submit}>
            <Field label="Full name / Business name">
              <input required value={form.display_name} onChange={set('display_name')} style={inputStyle} placeholder="Sharma PG" />
            </Field>
            <Field label="Email">
              <input type="email" required value={form.email} onChange={set('email')} style={inputStyle} placeholder="you@example.com" />
            </Field>
            <Field label="Phone">
              <input type="tel" value={form.phone} onChange={set('phone')} style={inputStyle} placeholder="9876543210" />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={set('city')} style={inputStyle} placeholder="Hyderabad" />
            </Field>
            <Field label="Password">
              <input type="password" required value={form.password} onChange={set('password')} style={inputStyle} placeholder="Min 8 characters" />
            </Field>
            <Field label="Confirm password">
              <input type="password" required value={form.confirm} onChange={set('confirm')} style={inputStyle} placeholder="••••••••" />
            </Field>

            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
              Your account will be reviewed by our team before you can post listings. Usually approved within 24 hours.
            </p>

            {error && <p style={{ color: '#f44', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Submitting…' : 'Request Access'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 16 }}>
            Already have an account?{' '}
            <Link to="/broker/login" style={{ color: '#a855f7', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh', background: '#0f0f0f',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const cardStyle = {
  width: '100%', maxWidth: 440, background: '#1a1a1a',
  border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden',
}
const headerStyle = {
  background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
  padding: '22px 28px', textAlign: 'center',
}
const inputStyle = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  borderRadius: 8, padding: '10px 12px', color: '#e5e5e5', fontSize: 14,
  boxSizing: 'border-box', outline: 'none',
}
const btnStyle = {
  width: '100%', background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
  color: '#fff', border: 'none', borderRadius: 10, padding: '13px',
  fontSize: 15, fontWeight: 600, cursor: 'pointer',
}
