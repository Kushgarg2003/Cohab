import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupsAPI } from '../api'
import Avatar from '../components/Avatar'
import BottomNav from '../components/BottomNav'

export default function MyGroupsPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const userId = localStorage.getItem('userId')

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    groupsAPI.getMyGroups(userId)
      .then(data => { setGroups(data.groups || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'rgba(12,12,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/matches')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
            Coloc<span style={{ color: 'var(--primary)' }}>sy</span>
          </span>
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>My Groups</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <button onClick={() => navigate('/group/new')}
            style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Create group
          </button>
          <button onClick={() => navigate('/group/join')}
            style={{ flex: 1, padding: '12px', background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Join with code
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 24px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>👥</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>No groups yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Groups are auto-created when you mutually match.<br />
              You can also create one and invite your matches.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map(g => (
              <div key={g.group_id}
                style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => navigate(`/group/${g.group_id}`)}>

                <div style={{ padding: '18px 18px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>{g.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
                          👥 {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                        </span>
                        {g.role === 'admin' && (
                          <span style={{ fontSize: 10, background: 'var(--amber-light)', color: 'var(--amber)', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>Admin</span>
                        )}
                      </div>
                    </div>
                    <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(232,72,28,0.2)', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--primary)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 1 }}>Code</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: 3 }}>{g.invite_code}</p>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
                  <button onClick={e => { e.stopPropagation(); navigate(`/group/${g.group_id}/chat`) }}
                    style={{ flex: 1, padding: '11px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRight: '1px solid var(--border)' }}>
                    💬 Chat
                  </button>
                  <button onClick={e => { e.stopPropagation(); navigate(`/group/${g.group_id}/wishlist`) }}
                    style={{ flex: 1, padding: '11px', background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRight: '1px solid var(--border)' }}>
                    🏠 Wishlist
                  </button>
                  <button onClick={e => { e.stopPropagation(); navigate(`/group/${g.group_id}`) }}
                    style={{ flex: 1, padding: '11px', background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    View →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav />
    </div>
  )
}
