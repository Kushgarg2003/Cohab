import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { groupsAPI } from '../api'

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  topbar: { background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontSize: 16, fontWeight: 800, color: 'var(--text)' },
  body: { maxWidth: 580, margin: '0 auto', padding: '32px 16px 80px' },
  card: { background: 'var(--white)', borderRadius: 'var(--radius)', padding: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  h1: { fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, color: 'var(--text-2)', fontWeight: 500, marginBottom: 24 },
  input: { width: '100%', padding: '13px 16px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16, color: 'var(--text)', background: 'var(--white)', fontFamily: 'inherit' },
  btnPrimary: { background: 'var(--primary)', color: 'white', border: 'none', padding: '13px 24px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: 'var(--text-2)', border: '2px solid var(--border)', padding: '13px 20px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  backBtn: { background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 24 },
  label: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
}

const Topbar = ({ backTo, backLabel }) => {
  const navigate = useNavigate()
  return (
    <div style={S.topbar}>
      <span style={S.logo}>NO<span style={{ color: 'var(--primary)' }}>broker</span></span>
      <button onClick={() => navigate(backTo)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        ← {backLabel}
      </button>
    </div>
  )
}

// ─── Create Group ─────────────────────────────────────────────────────────────

export function CreateGroupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const userId = localStorage.getItem('userId')

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const data = await groupsAPI.createGroup(userId, name.trim())
      navigate(`/group/${data.group_id}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create group')
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <Topbar backTo="/matches" backLabel="Matches" />
      <div style={S.body}>
        <div style={{ ...S.card, maxWidth: 440 }}>
          <h1 style={S.h1}>Create a group</h1>
          <p style={S.sub}>Name your group and share the invite code with your matches.</p>
          <input style={S.input} placeholder="e.g. Team Gachibowli" value={name}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/matches')} style={S.btnOutline}>Cancel</button>
            <button onClick={handleCreate} disabled={!name.trim() || loading}
              style={{ ...S.btnPrimary, flex: 1, opacity: (!name.trim() || loading) ? 0.5 : 1 }}>
              {loading ? 'Creating…' : 'Create group →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Join Group ───────────────────────────────────────────────────────────────

export function JoinGroupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const userId = localStorage.getItem('userId')

  const handleJoin = async () => {
    if (code.length !== 8) return
    setLoading(true)
    try {
      const data = await groupsAPI.joinGroup(userId, code.trim())
      navigate(`/group/${data.group_id}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Invalid invite code')
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <Topbar backTo="/matches" backLabel="Matches" />
      <div style={S.body}>
        <div style={{ ...S.card, maxWidth: 440 }}>
          <h1 style={S.h1}>Join a group</h1>
          <p style={S.sub}>Enter the 8-character invite code your match shared with you.</p>
          <input style={{ ...S.input, textTransform: 'uppercase', letterSpacing: 6, fontSize: 22, textAlign: 'center', fontWeight: 800 }}
            placeholder="ABC12345" value={code} maxLength={8}
            onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleJoin()} autoFocus />
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/matches')} style={S.btnOutline}>Cancel</button>
            <button onClick={handleJoin} disabled={code.length !== 8 || loading}
              style={{ ...S.btnPrimary, flex: 1, opacity: (code.length !== 8 || loading) ? 0.5 : 1 }}>
              {loading ? 'Joining…' : 'Join group →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Group Dashboard ──────────────────────────────────────────────────────────

export function GroupDashboardPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const userId = localStorage.getItem('userId')

  useEffect(() => {
    groupsAPI.getGroup(groupId).then(data => { setGroup(data); setLoading(false) }).catch(() => setLoading(false))
  }, [groupId])

  const copyCode = () => {
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
  if (!group) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--red)' }}>Group not found.</p></div>

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Topbar backTo="/matches" backLabel="Matches" />
      <div style={S.body}>

        <h1 style={{ ...S.h1, marginBottom: 4 }}>{group.name}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500, marginBottom: 28 }}>
          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
        </p>

        {/* Invite code */}
        <div style={{ background: 'var(--primary-light)', border: '1.5px solid var(--primary)', borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Invite code</p>
            <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: 6, color: 'var(--text)' }}>{group.invite_code}</p>
          </div>
          <button onClick={copyCode} style={{ ...S.btnPrimary, padding: '10px 18px', fontSize: 14 }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Members */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <p style={S.label}>Members</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {group.members.map((m, i) => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: 13 }}>
                  {m.user_id.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                      {m.user_id === userId ? `You${m.name ? ` (${m.name})` : ''}` : (m.name || `Member ${i + 1}`)}
                    </span>
                    {m.role === 'admin' && <span style={{ fontSize: 10, background: 'var(--amber-light)', color: 'var(--amber)', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>Admin</span>}
                  </div>
                  {m.survey && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{m.survey.budget_range} · {m.survey.locations?.join(', ')}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => navigate(`/group/${groupId}/wishlist`)} style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 16 }}>
          View property wishlist →
        </button>
      </div>
    </div>
  )
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

const STATUS_COLOR = { PENDING: 'var(--amber)', SHORTLISTED: 'var(--green)', REJECTED: 'var(--red)' }
const STATUS_BG = { PENDING: 'var(--amber-light)', SHORTLISTED: 'var(--green-light)', REJECTED: 'var(--red-light)' }

export function WishlistPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [group, setGroup] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', rent: '', location: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const userId = localStorage.getItem('userId')

  const load = async () => {
    const [groupData, wishlistData] = await Promise.all([groupsAPI.getGroup(groupId), groupsAPI.getWishlist(groupId)])
    setGroup(groupData); setItems(wishlistData.items || []); setLoading(false)
  }
  useEffect(() => { load() }, [groupId])

  const handleAdd = async () => {
    if (!form.title.trim()) return
    await groupsAPI.addWishlistItem(groupId, userId, { title: form.title, url: form.url || undefined, rent: form.rent ? parseInt(form.rent) : undefined, location: form.location || undefined, notes: form.notes || undefined })
    setForm({ title: '', url: '', rent: '', location: '', notes: '' }); setShowForm(false); load()
  }

  const handleVote = async (itemId, vote) => { await groupsAPI.castVote(groupId, itemId, userId, vote); load() }
  const handleDelete = async (itemId) => { await groupsAPI.deleteWishlistItem(groupId, itemId, userId); load() }

  if (loading) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Topbar backTo={`/group/${groupId}`} backLabel={group?.name || 'Group'} />
      <div style={S.body}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={S.h1}>Property wishlist</h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{items.length} propert{items.length !== 1 ? 'ies' : 'y'} · vote to shortlist</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ ...S.btnPrimary, padding: '10px 18px', fontSize: 14 }}>+ Add</button>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ ...S.card, marginBottom: 16 }}>
            <p style={{ ...S.label, marginBottom: 16 }}>Add property</p>
            {[
              { key: 'title', placeholder: 'Property name / description *' },
              { key: 'location', placeholder: 'Location (e.g. HSR Layout, Sector 2)' },
              { key: 'url', placeholder: 'Listing URL' },
              { key: 'rent', placeholder: 'Monthly rent (₹)', type: 'number' },
              { key: 'notes', placeholder: 'Notes (pros, cons, anything…)' },
            ].map(f => (
              <input key={f.key} style={{ ...S.input, marginBottom: 10 }} placeholder={f.placeholder} type={f.type || 'text'}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            ))}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={S.btnOutline}>Cancel</button>
              <button onClick={handleAdd} disabled={!form.title.trim()} style={{ ...S.btnPrimary, flex: 1, opacity: !form.title.trim() ? 0.5 : 1 }}>Add to wishlist</button>
            </div>
          </div>
        )}

        {/* Items */}
        {items.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
            <p style={{ color: 'var(--text-2)', fontWeight: 500 }}>No properties yet.</p>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>Add one to start voting.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(item => {
              const myVote = item.votes?.[userId]
              const total = item.tally.yes + item.tally.no + item.tally.maybe
              const status = item.status?.toUpperCase() || 'PENDING'
              return (
                <div key={item.item_id} style={{ ...S.card, borderLeft: `4px solid ${STATUS_COLOR[status] || 'var(--border)'}`, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{item.title}</h3>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: STATUS_BG[status], color: STATUS_COLOR[status], textTransform: 'capitalize' }}>
                          {item.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                        {item.location && <span style={{ fontSize: 13, color: 'var(--text-2)' }}>📍 {item.location}</span>}
                        {item.rent && <span style={{ fontSize: 13, color: 'var(--text-2)' }}>₹{item.rent.toLocaleString()}/mo</span>}
                        {item.url && <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>View listing ↗</a>}
                      </div>
                      {item.notes && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>"{item.notes}"</p>}
                    </div>
                    {item.added_by === userId && (
                      <button onClick={() => handleDelete(item.item_id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, padding: 0, flexShrink: 0 }}>×</button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                    <span>{total}/{item.member_count} voted</span>
                    <span style={{ color: 'var(--green)' }}>✓ {item.tally.yes}</span>
                    <span style={{ color: 'var(--red)' }}>✗ {item.tally.no}</span>
                    <span style={{ color: 'var(--amber)' }}>~ {item.tally.maybe}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['yes', '✓ Yes', 'var(--green)'], ['maybe', '~ Maybe', 'var(--amber)'], ['no', '✗ No', 'var(--red)']].map(([v, label, color]) => (
                      <button key={v} onClick={() => handleVote(item.item_id, v)}
                        style={{ flex: 1, padding: '9px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `2px solid ${color}`, background: myVote === v ? color : 'transparent', color: myVote === v ? 'white' : color, transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
