import { useState } from 'react'
import { adminAPI } from '../api'

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [flushing, setFlushing] = useState(false)
  const [search, setSearch] = useState('')

  const login = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await adminAPI.getUsers(secret)
      setUsers(data.users)
      setTotal(data.total)
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
                {['User', 'Email', 'Survey', 'Joined', 'Profile', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#444' }}>No users found.</td></tr>
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
                  {/* Survey preview */}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#555', maxWidth: 200 }}>
                    {user.survey
                      ? `${user.survey.budget_range || ''} · ${(user.survey.locations || []).join(', ')}`
                      : <span style={{ color: '#333' }}>—</span>
                    }
                  </td>
                  {/* Delete */}
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleDelete(user.user_id, user.name)}
                      disabled={deletingId === user.user_id}
                      style={{ background: 'rgba(232,72,28,0.1)', border: '1px solid rgba(232,72,28,0.2)', color: '#e8481c', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {deletingId === user.user_id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
