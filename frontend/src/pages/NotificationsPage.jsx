import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupsAPI } from '../api'
import Avatar from '../components/Avatar'
import BottomNav from '../components/BottomNav'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [invitations, setInvitations] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(null)
  const userId = localStorage.getItem('userId')

  const load = async () => {
    if (!userId) { navigate('/'); return }
    try {
      const data = await groupsAPI.getNotifications(userId)
      setInvitations(data.invitations || [])
      setMatches(data.matches || [])
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  const handleRespond = async (invId, action) => {
    setResponding(invId + action)
    try {
      const result = await groupsAPI.respondToInvitation(invId, userId, action)
      if (action === 'accept' && result.group_id) {
        navigate(`/group/${result.group_id}`)
        return
      }
      setInvitations(prev => prev.filter(i => i.id !== invId))
    } catch (e) {
      // ignore
    } finally {
      setResponding(null)
    }
  }

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'rgba(12,12,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/matches')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
            Coloc<span style={{ color: 'var(--primary)' }}>sy</span>
          </span>
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Notifications</span>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            {/* Group invitations */}
            {invitations.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  Group Invitations · {invitations.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {invitations.map(inv => (
                    <div key={inv.id} style={{ background: 'var(--surface)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Avatar userId={inv.inviter_id} name={inv.inviter_name} picture={inv.inviter_picture} size={36} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                            {inv.inviter_name} invited you to join
                          </p>
                          <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>📍 {inv.group_name}</p>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{timeAgo(inv.created_at)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleRespond(inv.id, 'accept')} disabled={!!responding}
                          style={{ flex: 1, padding: '9px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: responding ? 0.6 : 1 }}>
                          {responding === inv.id + 'accept' ? '…' : '✓ Accept'}
                        </button>
                        <button onClick={() => handleRespond(inv.id, 'reject')} disabled={!!responding}
                          style={{ flex: 1, padding: '9px', background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border-2)', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: responding ? 0.6 : 1 }}>
                          {responding === inv.id + 'reject' ? '…' : '✕ Decline'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent matches */}
            {matches.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  Recent Matches
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {matches.map(m => (
                    <div key={m.id} style={{ background: 'var(--surface)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar userId={m.user_id} name={m.name} picture={m.picture} size={36} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>🎉 Matched with {m.name || 'Anonymous'}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{timeAgo(m.matched_at)}</p>
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

            {invitations.length === 0 && matches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
                <p style={{ fontWeight: 600, fontSize: 15 }}>No notifications yet</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Match with people to see activity here.</p>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav />
    </div>
  )
}
