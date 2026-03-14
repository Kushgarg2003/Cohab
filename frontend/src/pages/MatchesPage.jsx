import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchingAPI, groupsAPI } from '../api'

const SCORE_COLOR = (s) => s >= 70 ? 'var(--green)' : s >= 45 ? 'var(--amber)' : 'var(--red)'
const SCORE_BG = (s) => s >= 70 ? 'var(--green-light)' : s >= 45 ? 'var(--amber-light)' : 'var(--red-light)'
const SCORE_LABEL = (s) => s >= 70 ? 'Great match' : s >= 45 ? 'Decent match' : 'Low match'

// Generate a consistent color from a string
const AVATAR_COLORS = ['#E8481C', '#7C3AED', '#0D9488', '#D97706', '#2563EB', '#DC2626', '#059669']
const avatarColor = (id) => AVATAR_COLORS[(id?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

function Avatar({ userId, name, size = 48 }) {
  const initials = name
    ? name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (userId ? userId.slice(0, 2).toUpperCase() : '??')
  const bg = avatarColor(userId)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3, fontWeight: 800, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function ScoreRing({ score }) {
  const color = SCORE_COLOR(score)
  const r = 28, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color }}>{Math.round(score)}</span>
      </div>
    </div>
  )
}

function MatchCard({ match, index }) {
  const score = match.score
  const snap = match.survey_snapshot
  const tags = [...(snap.social_battery || []), ...(snap.habits || [])].slice(0, 3)

  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', animation: `fadeIn 0.3s ease ${index * 0.05}s both` }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <Avatar userId={match.user_id} name={match.name} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{match.name || `Match ${index + 1}`}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: SCORE_BG(score), color: SCORE_COLOR(score) }}>
              {SCORE_LABEL(score)}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
            {[snap.locations?.join(', '), snap.budget_range, snap.occupancy_type].filter(Boolean).join(' · ')}
          </p>
        </div>
        <ScoreRing score={score} />
      </div>

      {/* Score breakdown */}
      <div style={{ display: 'flex', gap: 2, height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ flex: match.breakdown.hard_constraints, background: '#6366f1', borderRadius: 2 }} />
        <div style={{ flex: match.breakdown.dealbreakers, background: 'var(--amber)', borderRadius: 2 }} />
        <div style={{ flex: match.breakdown.lifestyle, background: 'var(--green)', borderRadius: 2 }} />
        <div style={{ flex: 100 - score, background: 'var(--border)', borderRadius: 2 }} />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: tags.length ? 14 : 0 }}>
        <span style={{ color: '#6366f1' }}>■</span> Logistics {match.breakdown.hard_constraints}pt
        <span style={{ color: 'var(--amber)' }}>■</span> Dealbreakers {match.breakdown.dealbreakers}pt
        <span style={{ color: 'var(--green)' }}>■</span> Lifestyle {match.breakdown.lifestyle}pt
      </div>

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          {tags.map(tag => (
            <span key={tag} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: 'var(--bg)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MatchesPage() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [myGroups, setMyGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const userId = localStorage.getItem('userId')

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    Promise.all([
      matchingAPI.getMatches(userId),
      groupsAPI.getMyGroups(userId).catch(() => ({ groups: [] }))
    ]).then(([m, g]) => {
      setMatches(m.matches || [])
      setMyGroups(g.groups || [])
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [userId])

  if (loading) return (
    <div style={S.centered}>
      <div style={S.spinner} />
      <p style={{ color: 'var(--text-2)', marginTop: 16, fontWeight: 500 }}>Finding your matches…</p>
    </div>
  )

  if (error) return (
    <div style={S.centered}>
      <p style={{ color: 'var(--red)', marginBottom: 16, fontWeight: 500 }}>{error}</p>
      <button onClick={() => navigate('/survey')} style={S.btnPrimary}>← Back to survey</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
          Co<span style={{ color: 'var(--primary)' }}>hab</span>
        </span>
        <button onClick={() => navigate('/survey')} style={S.textBtn}>Edit survey</button>
      </div>

      <div style={{ maxWidth: 580, margin: '0 auto', padding: '32px 16px 80px' }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 4 }}>Your matches</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 500 }}>
            {matches.length > 0 ? `${matches.length} compatible roommate${matches.length > 1 ? 's' : ''} found` : 'No matches yet'}
          </p>
        </div>

        {/* Match cards */}
        {matches.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {matches.map((m, i) => <MatchCard key={m.user_id} match={m} index={i} />)}
          </div>
        ) : (
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 48, textAlign: 'center', border: '1px solid var(--border)', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No matches yet</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Share NObroker with friends to get matched.</p>
          </div>
        )}

        {/* Group actions */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 20, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Groups</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/group/new')} style={S.btnPrimary}>+ Create group</button>
            <button onClick={() => navigate('/group/join')} style={S.btnOutline}>Join group</button>
            {myGroups.map(g => (
              <button key={g.group_id} onClick={() => navigate(`/group/${g.group_id}`)} style={S.btnOutline}>
                🏠 {g.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 },
  spinner: { width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  btnPrimary: { background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: 'var(--text)', border: '1.5px solid var(--border)', padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  textBtn: { background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
