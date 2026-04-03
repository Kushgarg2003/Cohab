import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { authAPI } from '../api'
import api from '../api'

const HOW_IT_WORKS = [
  { step: '01', title: 'Tell us how you live', desc: 'Budget, locations, sleep schedule, cleanliness — answer honestly in 5 minutes.' },
  { step: '02', title: 'Swipe on your matches', desc: 'We score compatibility 0–100. Like or pass on ranked profiles, one at a time.' },
  { step: '03', title: 'Match & move in together', desc: 'Mutual likes unlock a shared group, chat, and property wishlist. Zero broker fees.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Pre-warm the Render backend on page load to avoid cold-start lag on sign-in
  useEffect(() => {
    api.get('/health').catch(() => {})
    api.get('/api/survey/questions').catch(() => {})
  }, [])

  const handleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authAPI.googleLogin(credentialResponse.credential)
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.user_id)
      if (data.name) localStorage.setItem('userName', data.name)
      if (data.picture) localStorage.setItem('userPicture', data.picture)
      navigate(data.survey_completed ? '/matches' : '/survey')
    } catch {
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
          Coloc<span style={{ color: 'var(--primary)' }}>sy</span>
        </span>
        {localStorage.getItem('token') && (
          <button onClick={() => navigate('/matches')} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: 14, padding: '8px 16px', borderRadius: 8 }}>
            Continue →
          </button>
        )}
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 60px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        {/* Background video */}
        <video autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.18 }}>
          <source src="/roommates.mp4" type="video/mp4" />
        </video>
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse at 50% 0%, rgba(232,72,28,0.08) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.6s ease' }}>
          {/* Badge */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2.5, marginBottom: 28, textTransform: 'uppercase', background: 'var(--primary-light)', padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(232,72,28,0.2)' }}>
            Find your roommate, anywhere
          </div>

          <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 800, lineHeight: 1.05, color: 'var(--text)', marginBottom: 24, letterSpacing: -2.5, maxWidth: 720 }}>
            Find roommates<br />
            <span style={{ color: 'var(--primary)' }}>you'll actually like.</span>
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 40, maxWidth: 460, fontWeight: 400 }}>
            Answer a few honest questions about how you live. Get matched with people who share your vibe — not just your budget.
          </p>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)', fontWeight: 500 }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border-2)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Signing you in…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError('Google sign-in was cancelled or failed.')}
                useOneTap
                text="continue_with"
                shape="rectangular"
                size="large"
                theme="filled_black"
              />
              <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Takes 5 minutes · No broker fees ever</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--red)', fontSize: 14, fontWeight: 500, marginTop: 16 }}>{error}</p>}
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 48, letterSpacing: -1 }}>
            From survey to roommate in 3 steps
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '28px 24px', border: '1px solid var(--border)', animation: `slideUp 0.5s ease ${i * 0.1}s both` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 14, letterSpacing: 1 }}>{item.step}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 10, letterSpacing: -0.3 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '28px 24px', display: 'flex', justifyContent: 'center', gap: 'clamp(32px, 8vw, 80px)', flexWrap: 'wrap', background: 'var(--bg)' }}>
        {[['100pt', 'compatibility score'], ['5 mins', 'to complete'], ['0 fees', 'no broker ever']].map(([val, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>{val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
