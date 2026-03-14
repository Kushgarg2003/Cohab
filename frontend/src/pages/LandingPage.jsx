import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
          NO<span style={{ color: 'var(--primary)' }}>broker</span>
        </span>
        <button
          onClick={() => navigate('/survey')}
          style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          Already started? Continue →
        </button>
      </nav>

      {/* Hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 24px', textAlign: 'center',
        animation: 'fadeIn 0.5s ease'
      }}>
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
          letterSpacing: -2, maxWidth: 680
        }}>
          Find roommates<br />you'll actually like.
        </h1>

        <p style={{
          fontSize: 18, color: 'var(--text-2)', lineHeight: 1.7,
          marginBottom: 44, maxWidth: 420
        }}>
          Answer a few honest questions about how you live.
          Get matched with people who share your vibe — not just your budget.
        </p>

        <button
          onClick={() => navigate('/survey')}
          style={{
            background: 'var(--primary)', color: 'white', border: 'none',
            padding: '16px 44px', borderRadius: 12, fontSize: 17,
            fontWeight: 700, cursor: 'pointer', letterSpacing: -0.3,
            boxShadow: '0 4px 16px rgba(232,72,28,0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(232,72,28,0.35)' }}
          onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 16px rgba(232,72,28,0.3)' }}
        >
          Get matched free →
        </button>
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-3)' }}>No login needed. Takes about 5 minutes.</p>
      </div>

      {/* Feature row */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '32px 24px',
        display: 'flex', justifyContent: 'center',
        gap: 'clamp(24px, 6vw, 64px)', flexWrap: 'wrap'
      }}>
        {[
          ['100pt', 'compatibility score'],
          ['4 sections', 'logistics → lifestyle'],
          ['0 fees', 'no broker ever'],
        ].map(([val, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
