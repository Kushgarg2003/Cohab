import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { swipesAPI, groupsAPI } from '../api'
import Avatar from '../components/Avatar'
import BottomNav from '../components/BottomNav'
import { useNotifications } from '../hooks/useNotifications'

const SCORE_COLOR = (s) => s >= 70 ? '#22C55E' : s >= 45 ? '#F59E0B' : '#EF4444'
const SCORE_LABEL = (s) => s >= 70 ? 'Great match' : s >= 45 ? 'Decent match' : 'Low match'

function ScoreRing({ score }) {
  const color = SCORE_COLOR(score)
  const r = 28, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(score)}</span>
      </div>
    </div>
  )
}

function SwipeCard({ person, isTop }) {
  const snap = person.survey_snapshot || {}
  const tags = [...(snap.social_battery || []), ...(snap.habits || []), ...(snap.work_study || [])].slice(0, 4)
  const score = person.score

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 24,
      border: `1px solid ${isTop ? 'var(--border-2)' : 'var(--border)'}`,
      boxShadow: isTop ? '0 24px 64px rgba(0,0,0,0.7)' : '0 4px 16px rgba(0,0,0,0.4)',
      transform: isTop ? 'scale(1)' : 'scale(0.95)',
      transition: 'all 0.3s ease',
      width: '100%', maxWidth: 440,
      overflow: 'hidden'
    }}>
      {/* Score banner */}
      <div style={{ background: `linear-gradient(135deg, ${SCORE_COLOR(score)}18 0%, transparent 60%)`, borderBottom: '1px solid var(--border)', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar userId={person.user_id} name={person.name} picture={person.picture} size={52} />
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>{person.name || 'Anonymous'}</div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: SCORE_COLOR(score) + '20', color: SCORE_COLOR(score), letterSpacing: 0.3 }}>
              {SCORE_LABEL(score)}
            </span>
          </div>
        </div>
        <ScoreRing score={score} />
      </div>

      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Score bar */}
        <div>
          <div style={{ display: 'flex', gap: 3, height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 7 }}>
            <div style={{ flex: person.breakdown?.hard_constraints || 0, background: '#6366f1' }} />
            <div style={{ flex: person.breakdown?.dealbreakers || 0, background: 'var(--amber)' }} />
            <div style={{ flex: person.breakdown?.lifestyle || 0, background: 'var(--green)' }} />
            <div style={{ flex: Math.max(0, 100 - score), background: 'var(--border-2)' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
            <span><span style={{ color: '#6366f1' }}>■</span> Logistics {person.breakdown?.hard_constraints ?? 0}</span>
            <span><span style={{ color: 'var(--amber)' }}>■</span> Dealbreakers {person.breakdown?.dealbreakers ?? 0}</span>
            <span><span style={{ color: 'var(--green)' }}>■</span> Lifestyle {person.breakdown?.lifestyle ?? 0}</span>
          </div>
        </div>

        {/* Key info */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border)' }}>
          {snap.budget_range && <Row icon="💰" label="Budget" value={snap.budget_range} />}
          {snap.locations?.length > 0 && <Row icon="📍" label="Areas" value={snap.locations.join(', ')} />}
          {snap.move_in_timeline && <Row icon="📅" label="Move-in" value={snap.move_in_timeline} />}
          {snap.occupancy_type && <Row icon="🏠" label="Room" value={snap.occupancy_type} />}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.map(t => (
              <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{icon} {label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{value}</span>
    </div>
  )
}

function MatchModal({ match, onClose }) {
  const navigate = useNavigate()
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 28, padding: 40, textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,0.8)', border: '1px solid var(--border-2)', animation: 'slideUp 0.4s ease' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: -0.5 }}>It's a Match!</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          You and <strong style={{ color: 'var(--text)' }}>{match.name || 'your match'}</strong> both liked each other. A group chat has been created!
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => navigate(`/group/${match.group_id}/chat`)}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            💬 Start chatting →
          </button>
          <button onClick={() => navigate(`/group/${match.group_id}`)}
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            View Group
          </button>
          <button onClick={onClose}
            style={{ background: 'none', color: 'var(--text-3)', border: 'none', padding: '8px', fontSize: 13, cursor: 'pointer' }}>
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
  const [swipeDir, setSwipeDir] = useState(null) // 'like' | 'pass' for animation
  const userId = localStorage.getItem('userId')
  const { notify } = useNotifications()

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    Promise.all([
      swipesAPI.getQueue(userId),
      swipesAPI.getMatches(userId),
    ]).then(([q, m]) => {
      setQueue(q.queue || [])
      setIsRevisit(q.is_revisit || false)
      setMutualMatches(m.matches || [])
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [userId])

  const handleSwipe = useCallback(async (action) => {
    if (swiping || currentIndex >= queue.length) return
    const person = queue[currentIndex]
    setSwiping(true)
    setSwipeDir(action)
    try {
      const result = await swipesAPI.swipe(userId, person.user_id, action)
      if (result.mutual_match) {
        setMatchModal({ name: person.name, group_id: result.group_id })
        setMutualMatches(prev => [...prev, { user_id: person.user_id, name: person.name, picture: person.picture, group_id: result.group_id }])
        notify("It's a Match!", `You and ${person.name} liked each other.`)
      }
      setTimeout(() => {
        setCurrentIndex(i => i + 1)
        setSwipeDir(null)
        setSwiping(false)
      }, 200)
    } catch (e) {
      setSwiping(false)
      setSwipeDir(null)
    }
  }, [swiping, currentIndex, queue, userId])

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
      <p style={{ color: 'var(--text-3)', marginTop: 16, fontSize: 14 }}>Finding your matches…</p>
    </div>
  )

  if (error) return (
    <div style={S.centered}>
      <p style={{ color: 'var(--red)', marginBottom: 16, fontSize: 14 }}>{error}</p>
      <button onClick={() => navigate('/survey')} style={S.btnPrimary}>← Back to survey</button>
    </div>
  )

  const current = queue[currentIndex]
  const next = queue[currentIndex + 1]
  const exhausted = currentIndex >= queue.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      {matchModal && <MatchModal match={matchModal} onClose={() => setMatchModal(null)} />}

      {/* Header */}
      <div style={{ background: 'rgba(12,12,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ background: '#fff', borderRadius: 6, padding: '3px 8px', display: 'inline-flex', alignItems: 'center' }}>
          <img src="/logo.jpeg" alt="Colocsy" style={{ height: 26, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {mutualMatches.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'var(--green-light)', padding: '4px 10px', borderRadius: 20 }}>
              🎉 {mutualMatches.length} matched
            </span>
          )}
          <button
            onClick={() => { localStorage.clear(); navigate('/') }}
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
          >Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>

        {/* Revisit indicator only */}
        {isRevisit && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>🔄 Revisiting passes</span>
          </div>
        )}

        {/* Card stack */}
        {mutualMatches.length >= 3 ? (
          <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 40, textAlign: 'center', border: '1px solid var(--border)', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h3 style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 8, fontSize: 20 }}>Matches exhausted</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
              You've reached the limit of 3 active matches.<br />
              To match with new people, unmatch from an existing group first.
            </p>
          </div>
        ) : !exhausted ? (
          <>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              {next && (
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 440, pointerEvents: 'none' }}>
                  <SwipeCard person={next} isTop={false} />
                </div>
              )}
              <div style={{
                position: 'relative', width: '100%', maxWidth: 440, zIndex: 2,
                transform: swipeDir === 'like' ? 'translateX(60px) rotate(6deg) scale(0.96)' : swipeDir === 'pass' ? 'translateX(-60px) rotate(-6deg) scale(0.96)' : 'none',
                opacity: swipeDir ? 0.7 : 1,
                transition: swipeDir ? 'all 0.2s ease' : 'none'
              }}>
                <SwipeCard person={current} isTop={true} />
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <button onClick={() => handleSwipe('pass')} disabled={swiping} title="Pass (←)"
                style={{ width: 60, height: 60, borderRadius: '50%', border: '1.5px solid var(--border-2)', background: 'var(--surface)', color: '#EF4444', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
              <button onClick={() => handleSwipe('like')} disabled={swiping} title="Like (→)"
                style={{ width: 72, height: 72, borderRadius: '50%', border: '1.5px solid rgba(232,72,28,0.3)', background: 'var(--primary)', color: 'white', fontSize: 26, cursor: 'pointer', boxShadow: '0 8px 24px rgba(232,72,28,0.4)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ♥
              </button>
              <div style={{ width: 60, height: 60 }} /> {/* spacer for balance */}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginBottom: 32 }}>← → arrow keys also work</p>
          </>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 48, textAlign: 'center', border: '1px solid var(--border)', marginBottom: 32, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 8, fontSize: 20 }}>You've seen everyone!</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
              {mutualMatches.length > 0
                ? `You have ${mutualMatches.length} mutual match${mutualMatches.length > 1 ? 'es' : ''}. Check your groups!`
                : 'Share Colocsy with friends to get more matches.'}
            </p>
          </div>
        )}

        {/* Mutual matches */}
        {mutualMatches.length > 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5 }}>Your Matches</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mutualMatches.map(m => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar userId={m.user_id} name={m.name} picture={m.picture} size={36} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{m.name || 'Anonymous'}</span>
                  </div>
                  {m.group_id && (
                    <button onClick={() => navigate(`/group/${m.group_id}/chat`)}
                      style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid rgba(232,72,28,0.2)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      💬 Chat
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

const S = {
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 },
  spinner: { width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  btnPrimary: { background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}
