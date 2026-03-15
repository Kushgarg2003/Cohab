import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { swipesAPI, groupsAPI } from '../api'

const SCORE_COLOR = (s) => s >= 70 ? '#10b981' : s >= 45 ? '#f59e0b' : '#ef4444'
const SCORE_LABEL = (s) => s >= 70 ? 'Great match' : s >= 45 ? 'Decent match' : 'Low match'
const AVATAR_COLORS = ['#E8481C', '#7C3AED', '#0D9488', '#D97706', '#2563EB', '#DC2626', '#059669']
const avatarColor = (id) => AVATAR_COLORS[(id?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

function Avatar({ userId, name, size = 72 }) {
  const initials = name
    ? name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (userId ? userId.slice(0, 2).toUpperCase() : '??')
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(userId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.32, fontWeight: 800, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function ScoreRing({ score }) {
  const color = SCORE_COLOR(score)
  const r = 32, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: 76, height: 76 }}>
      <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(score)}</span>
        <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  )
}

function Tag({ label }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
      {label.replace(/_/g, ' ')}
    </span>
  )
}

function SwipeCard({ person, onLike, onPass, isTop }) {
  const snap = person.survey_snapshot || {}
  const tags = [...(snap.social_battery || []), ...(snap.habits || []), ...(snap.work_study || [])].slice(0, 5)
  const score = person.score

  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: 28,
      boxShadow: isTop ? '0 20px 60px rgba(0,0,0,0.15)' : '0 4px 20px rgba(0,0,0,0.07)',
      border: '1px solid #e5e7eb',
      transform: isTop ? 'scale(1)' : 'scale(0.96)',
      transition: 'transform 0.3s ease',
      width: '100%', maxWidth: 420
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <Avatar userId={person.user_id} name={person.name} size={72} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
            {person.name || 'Anonymous'}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: SCORE_COLOR(score) + '18', color: SCORE_COLOR(score) }}>
            {SCORE_LABEL(score)}
          </span>
        </div>
        <ScoreRing score={score} />
      </div>

      {/* Score breakdown bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 3, height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ flex: person.breakdown?.hard_constraints || 0, background: '#6366f1', borderRadius: 2 }} />
          <div style={{ flex: person.breakdown?.dealbreakers || 0, background: '#f59e0b', borderRadius: 2 }} />
          <div style={{ flex: person.breakdown?.lifestyle || 0, background: '#10b981', borderRadius: 2 }} />
          <div style={{ flex: Math.max(0, 100 - score), background: '#e5e7eb', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
          <span><span style={{ color: '#6366f1' }}>■</span> Logistics {person.breakdown?.hard_constraints ?? 0}pt</span>
          <span><span style={{ color: '#f59e0b' }}>■</span> Dealbreakers {person.breakdown?.dealbreakers ?? 0}pt</span>
          <span><span style={{ color: '#10b981' }}>■</span> Lifestyle {person.breakdown?.lifestyle ?? 0}pt</span>
        </div>
      </div>

      {/* Key info */}
      <div style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#374151', fontWeight: 500, lineHeight: 1.8 }}>
        {snap.budget_range && <div>💰 Budget: <strong>{snap.budget_range}</strong></div>}
        {snap.locations?.length > 0 && <div>📍 Locations: <strong>{snap.locations.join(', ')}</strong></div>}
        {snap.move_in_timeline && <div>📅 Move-in: <strong>{snap.move_in_timeline}</strong></div>}
        {snap.occupancy_type && <div>🏠 Room type: <strong>{snap.occupancy_type}</strong></div>}
      </div>

      {/* Lifestyle tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tags.map(t => <Tag key={t} label={t} />)}
        </div>
      )}
    </div>
  )
}

function MatchModal({ match, onClose }) {
  const navigate = useNavigate()
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 8 }}>It's a Match!</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>
          You and <strong>{match.name || 'your match'}</strong> both liked each other.<br />A group has been created for you!
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => navigate(`/group/${match.group_id}/chat`)}
            style={{ background: '#111827', color: 'white', border: 'none', padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            💬 Start chatting →
          </button>
          <button
            onClick={() => navigate(`/group/${match.group_id}`)}
            style={{ background: 'transparent', color: '#374151', border: '1.5px solid #e5e7eb', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            View Group
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: '#9ca3af', border: 'none', padding: '8px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MatchesPage() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mutualMatches, setMutualMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [matchModal, setMatchModal] = useState(null)
  const [isRevisit, setIsRevisit] = useState(false)
  const [swiping, setSwiping] = useState(false)
  const [myGroups, setMyGroups] = useState([])
  const userId = localStorage.getItem('userId')

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    Promise.all([
      swipesAPI.getQueue(userId),
      swipesAPI.getMatches(userId),
      groupsAPI.getMyGroups(userId).catch(() => ({ groups: [] }))
    ]).then(([q, m, g]) => {
      setQueue(q.queue || [])
      setIsRevisit(q.is_revisit || false)
      setMutualMatches(m.matches || [])
      setMyGroups(g.groups || [])
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [userId])

  const handleSwipe = useCallback(async (action) => {
    if (swiping || currentIndex >= queue.length) return
    const person = queue[currentIndex]
    setSwiping(true)
    try {
      const result = await swipesAPI.swipe(userId, person.user_id, action)
      if (result.mutual_match) {
        setMatchModal({ name: person.name, group_id: result.group_id })
        setMutualMatches(prev => [...prev, { user_id: person.user_id, name: person.name, group_id: result.group_id }])
      }
      setCurrentIndex(i => i + 1)
    } catch (e) {
      console.error(e)
    }
    setSwiping(false)
  }, [swiping, currentIndex, queue, userId])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') handleSwipe('pass')
      if (e.key === 'ArrowRight') handleSwipe('like')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSwipe])

  if (loading) return (
    <div style={S.centered}>
      <div style={S.spinner} />
      <p style={{ color: '#6b7280', marginTop: 16, fontWeight: 500 }}>Finding your matches…</p>
    </div>
  )

  if (error) return (
    <div style={S.centered}>
      <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>
      <button onClick={() => navigate('/survey')} style={S.btnPrimary}>← Back to survey</button>
    </div>
  )

  const current = queue[currentIndex]
  const next = queue[currentIndex + 1]
  const exhausted = currentIndex >= queue.length

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {matchModal && <MatchModal match={matchModal} onClose={() => setMatchModal(null)} />}

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
          Co<span style={{ color: '#E8481C' }}>hab</span>
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {mutualMatches.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
              🎉 {mutualMatches.length} match{mutualMatches.length > 1 ? 'es' : ''}
            </span>
          )}
          <button onClick={() => navigate('/survey')} style={S.textBtn}>Edit survey</button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px 80px' }}>

        {/* Progress */}
        {queue.length > 0 && (
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
              {isRevisit ? '🔄 Revisiting passed users' : `${Math.min(currentIndex + 1, queue.length)} of ${queue.length}`}
            </p>
            <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2, marginTop: 8 }}>
              <div style={{ height: '100%', background: '#E8481C', borderRadius: 2, width: `${(currentIndex / queue.length) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Card stack */}
        {!exhausted ? (
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            {/* Next card (behind) */}
            {next && (
              <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, pointerEvents: 'none' }}>
                <SwipeCard person={next} isTop={false} />
              </div>
            )}
            {/* Current card */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 420, zIndex: 2 }}>
              <SwipeCard person={current} isTop={true} />
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 20, padding: 48, textAlign: 'center', border: '1px solid #e5e7eb', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>You've seen everyone!</h3>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>
              {mutualMatches.length > 0
                ? `You have ${mutualMatches.length} mutual match${mutualMatches.length > 1 ? 'es' : ''}. Check your groups!`
                : 'Share Cohab with friends to get more matches.'}
            </p>
          </div>
        )}

        {/* Action buttons */}
        {!exhausted && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 32 }}>
            <button
              onClick={() => handleSwipe('pass')}
              disabled={swiping}
              style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #fca5a5', background: 'white', fontSize: 26, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.15)', transition: 'transform 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Pass (←)"
            >✗</button>
            <button
              onClick={() => handleSwipe('like')}
              disabled={swiping}
              style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #6ee7b7', background: 'white', fontSize: 26, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.15)', transition: 'transform 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Like (→)"
            >♥</button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#d1d5db', marginBottom: 32 }}>Use ← → arrow keys to swipe</p>

        {/* Mutual matches list */}
        {mutualMatches.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #e5e7eb', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Your Matches</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mutualMatches.map(m => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar userId={m.user_id} name={m.name} size={36} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{m.name || 'Anonymous'}</span>
                  </div>
                  {m.group_id && (
                    <button onClick={() => navigate(`/group/${m.group_id}`)} style={S.btnSmall}>View group →</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups */}
        <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Groups</p>
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
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 24 },
  spinner: { width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #E8481C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  btnPrimary: { background: '#111827', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: '#374151', border: '1.5px solid #e5e7eb', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSmall: { background: '#f3f4f6', color: '#374151', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  textBtn: { background: 'none', border: 'none', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
