import { useState } from 'react'
import { adminAPI, surveyAPI } from '../api'

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [mutualMatches, setMutualMatches] = useState(0)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [flushing, setFlushing] = useState(false)
  const [search, setSearch] = useState('')
  const [profileModal, setProfileModal] = useState(null) // { user, survey }
  const [loadingProfile, setLoadingProfile] = useState(null)

  const login = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await adminAPI.getUsers(secret)
      setUsers(data.users)
      setTotal(data.total)
      setMutualMatches(data.mutual_matches || 0)
      setAuthed(true)
    } catch {
      setError('Wrong secret key.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    setDeletingId(userId)
    try {
      await adminAPI.deleteUser(userId, secret)
      setUsers(prev => prev.filter(u => u.user_id !== userId))
      setTotal(prev => prev - 1)
    } catch {
      alert('Failed to delete user.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleFlush = async () => {
    if (!confirm('Flush all cached match scores? They will recompute fresh on next load.')) return
    setFlushing(true)
    try {
      const res = await adminAPI.flushMatchScores(secret)
      alert(res.message)
    } catch {
      alert('Failed to flush scores.')
    } finally {
      setFlushing(false)
    }
  }

  const handleViewProfile = async (user) => {
    setLoadingProfile(user.user_id)
    try {
      const data = await surveyAPI.getUserProfile(user.user_id)
      setProfileModal({ user, survey: data.survey })
    } catch {
      alert('Failed to load profile.')
    } finally {
      setLoadingProfile(null)
    }
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={login} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 40, width: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>Admin Access</h2>
          <input
            type="password"
            placeholder="Admin secret key"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
            autoFocus
          />
          {error && <p style={{ color: '#e8481c', fontSize: 13, margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !secret}
            style={{ background: '#e8481c', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              Coloc<span style={{ color: '#e8481c' }}>sy</span> Admin
            </h1>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>{total} total users</p>
          </div>
          <button
            onClick={handleFlush}
            disabled={flushing}
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {flushing ? 'Flushing…' : 'Flush Match Scores'}
          </button>
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: 14, width: 260, outline: 'none' }}
          />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            ['Total Users', total],
            ['Mutual Matches', mutualMatches],
            ['Survey Done', users.filter(u => u.survey_completed).length],
            ['No Survey', users.filter(u => !u.survey_completed).length],
          ].map(([label, val]) => (
            <div key={label} style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '16px 24px', minWidth: 140 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{val}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                {['User', 'Email', 'DOB', 'Phone', 'Gender', 'Survey', 'Joined', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#444' }}>No users found.</td></tr>
              )}
              {filtered.map(user => (
                <tr key={user.user_id} style={{ borderBottom: '1px solid #161616' }}>
                  {/* User */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {user.picture
                        ? <img src={user.picture} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#555' }}>{user.name?.[0] || '?'}</div>
                      }
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{user.name || '—'}</span>
                    </div>
                  </td>
                  {/* Email */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#888' }}>{user.email || '—'}</td>
                  {/* DOB */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#888' }}>{user.date_of_birth || '—'}</td>
                  {/* Phone */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#888' }}>{user.phone || '—'}</td>
                  {/* Gender */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#888', textTransform: 'capitalize' }}>{user.gender || '—'}</td>
                  {/* Survey */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: user.survey_completed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: user.survey_completed ? '#22c55e' : '#555' }}>
                      {user.survey_completed ? 'Done' : 'Pending'}
                    </span>
                  </td>
                  {/* Joined */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>
                    {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleViewProfile(user)}
                        disabled={loadingProfile === user.user_id}
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {loadingProfile === user.user_id ? '…' : 'View'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.user_id, user.name)}
                        disabled={deletingId === user.user_id}
                        style={{ background: 'rgba(232,72,28,0.1)', border: '1px solid rgba(232,72,28,0.2)', color: '#e8481c', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {deletingId === user.user_id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Profile modal */}
    {profileModal && (
      <div onClick={() => setProfileModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 32, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {profileModal.user.picture
                ? <img src={profileModal.user.picture} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#555' }}>{profileModal.user.name?.[0] || '?'}</div>
              }
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{profileModal.user.name || '—'}</div>
                <div style={{ fontSize: 13, color: '#555' }}>{profileModal.user.email}</div>
              </div>
            </div>
            <button onClick={() => setProfileModal(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>

          {/* Basic info */}
          <Section title="Basic Info">
            <Row label="Phone" value={profileModal.user.phone} />
            <Row label="DOB" value={profileModal.user.date_of_birth} />
            <Row label="Gender" value={profileModal.user.gender} />
            <Row label="Survey" value={profileModal.user.survey_completed ? 'Completed' : 'Pending'} highlight={profileModal.user.survey_completed} />
          </Section>

          {profileModal.survey ? (
            <>
              <Section title="Basics">
                <Row label="Budget" value={profileModal.survey.budget_ranges?.join(', ') || profileModal.survey.budget_range} />
                <Row label="Locations" value={profileModal.survey.locations?.join(', ')} />
                <Row label="Move-in" value={profileModal.survey.move_in_timeline} />
                <Row label="Room type" value={profileModal.survey.occupancy_type} />
              </Section>

              <Section title="Lifestyle Tags">
                <TagRow label="Social" tags={profileModal.survey.social_battery} />
                <TagRow label="Habits" tags={profileModal.survey.habits} />
                <TagRow label="Work/Study" tags={profileModal.survey.work_study} />
              </Section>

              <Section title="Dealbreakers">
                <Row label="Pets" value={profileModal.survey.pets} />
                <Row label="Smoking" value={profileModal.survey.smoking} />
                <Row label="Dietary" value={profileModal.survey.dietary} />
                <Row label="Gender pref" value={profileModal.survey.gender} />
              </Section>

              {profileModal.survey.deep_dive_responses && Object.keys(profileModal.survey.deep_dive_responses).length > 0 && (
                <Section title="Deep Dive">
                  {Object.entries(profileModal.survey.deep_dive_responses).map(([prompt, response]) => (
                    <div key={prompt} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 4 }}>{prompt}</div>
                      <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{response}</div>
                    </div>
                  ))}
                </Section>
              )}
            </>
          ) : (
            <p style={{ color: '#555', fontSize: 14, textAlign: 'center', marginTop: 24 }}>No survey data yet.</p>
          )}
        </div>
      </div>
    )}
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>{title}</div>
      <div style={{ background: '#0d0d0d', borderRadius: 8, border: '1px solid #1e1e1e', padding: '4px 0' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid #161616' }}>
      <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: highlight ? '#22c55e' : '#aaa', fontWeight: 600, textTransform: 'capitalize' }}>{value || '—'}</span>
    </div>
  )
}

function TagRow({ label, tags }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 16px', borderBottom: '1px solid #161616', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#555', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
        {tags?.length > 0
          ? tags.map(t => <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{t.replace(/_/g, ' ')}</span>)
          : <span style={{ fontSize: 13, color: '#333' }}>—</span>
        }
      </div>
    </div>
  )
}
