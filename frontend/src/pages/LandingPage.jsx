import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { authAPI } from '../api'

export default function LandingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
      <nav style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
          Co<span style={{ color: 'var(--primary)' }}>hab</span>
        </span>
        {localStorage.getItem('token') && (
          <button onClick={() => navigate('/survey')} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Continue →
          </button>
        )}
      </nav>

      {/* Hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 24px', textAlign: 'center',
        animation: 'fadeIn 0.5s ease',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Background video */}
        <video autoPlay loop muted playsInline style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 0
        }}>
          <source src="/roommates.mp4" type="video/mp4" />
        </video>
        {/* Overlay to fade video and keep content readable */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'rgba(248, 248, 250, 0.4)',
          backdropFilter: 'blur(1px)'
        }} />
        {/* Content above video */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'var(--primary)',
          letterSpacing: 2.5, marginBottom: 24, textTransform: 'uppercase',
          background: 'var(--primary-light)', padding: '6px 14px',
          borderRadius: 20, display: 'inline-block'
        }}>
          Roommate matching · Bangalore, Mumbai, Hyderabad
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 7vw, 62px)', fontWeight: 800,
          lineHeight: 1.1, color: 'var(--text)', marginBottom: 24,
          letterSpacing: -2, maxWidth: 680,
          textShadow: '0 1px 8px rgba(255,255,255,0.8)'
        }}>
          Find roommates<br />you'll actually like.
        </h1>

        <p style={{
          fontSize: 18, color: 'var(--text)', lineHeight: 1.7,
          marginBottom: 44, maxWidth: 420,
          textShadow: '0 1px 6px rgba(255,255,255,0.9)'
        }}>
          Answer a few honest questions about how you live.
          Get matched with people who share your vibe — not just your budget.
        </p>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)', fontWeight: 500 }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Signing you in…
          </div>
        ) : (
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Google sign-in was cancelled or failed.')}
            useOneTap
            text="continue_with"
            shape="rectangular"
            size="large"
            theme="outline"
          />
        )}

        {error && <p style={{ color: 'var(--red)', fontSize: 14, fontWeight: 500, marginTop: 16 }}>{error}</p>}
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text)', fontWeight: 600, textShadow: '0 1px 6px rgba(255,255,255,0.9)' }}>Takes about 5 minutes. No broker fees ever.</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        borderTop: '1px solid var(--border)', padding: '32px 24px',
        display: 'flex', justifyContent: 'center',
        gap: 'clamp(24px, 6vw, 64px)', flexWrap: 'wrap'
      }}>
        {[['100pt', 'compatibility score'], ['4 sections', 'logistics → lifestyle'], ['0 fees', 'no broker ever']].map(([val, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
