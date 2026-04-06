import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI, surveyAPI } from '../api'
import CommunicationPage from './CommunicationPage'
import StatsPage from './StatsPage'

const RESEND_FREE_DAILY_LIMIT = 100

export default function AdminPage({ initialTab = 'users' }) {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [adminTab, setAdminTab] = useState(initialTab)
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
  const [verifyingId, setVerifyingId] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editFields, setEditFields] = useState({})
  const [saving, setSaving] = useState(false)

  // Email campaigns
  const [campaignPreview, setCampaignPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [runningCampaign, setRunningCampaign] = useState(null) // campaign type string
  const [campaignResults, setCampaignResults] = useState({}) // { type: { sent, failed } }
  const [customSubject, setCustomSubject] = useState('')
  const [customBody, setCustomBody] = useState('')

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

  const handleToggleVerify = async (user) => {
    setVerifyingId(user.user_id)
    try {
      const data = await adminAPI.toggleVerify(user.user_id, secret)
      setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_verified: data.is_verified } : u))
    } catch {
      alert('Failed to update verification.')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleViewProfile = async (user) => {
    setLoadingProfile(user.user_id)
    try {
      const data = await surveyAPI.getUserProfile(user.user_id)
      setProfileModal({ user, survey: data.survey })
      setEditMode(false)
      setEditFields({})
    } catch {
      alert('Failed to load profile.')
    } finally {
      setLoadingProfile(null)
    }
  }

  const handleStartEdit = () => {
    const u = profileModal.user
    const s = profileModal.survey || {}
    setEditFields({
      name: u.name || '',
      phone: u.phone || '',
      gender: u.gender || '',
      date_of_birth: u.date_of_birth || '',
      locations: (s.locations || []).join(', '),
      budget_ranges: (s.budget_ranges || []).join(', '),
      move_in_timelines: (s.move_in_timelines || []).join(', '),
      occupancy_types: (s.occupancy_types || []).join(', '),
      smoking: s.smoking || '',
      pets: s.pets || '',
      dietary: s.dietary || '',
      gender_pref: s.gender || '',
      social_battery: (s.social_battery || []).join(', '),
      habits: (s.habits || []).join(', '),
      work_study: (s.work_study || []).join(', '),
    })
    setEditMode(true)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    const splitCSV = str => str.split(',').map(s => s.trim()).filter(Boolean)
    try {
      const payload = {
        name: editFields.name.trim(),
        phone: editFields.phone.trim(),
        gender: editFields.gender,
        date_of_birth: editFields.date_of_birth,
        locations: splitCSV(editFields.locations),
        budget_ranges: splitCSV(editFields.budget_ranges),
        move_in_timelines: splitCSV(editFields.move_in_timelines),
        occupancy_types: splitCSV(editFields.occupancy_types),
        smoking: editFields.smoking,
        pets: editFields.pets,
        dietary: editFields.dietary,
        gender_pref: editFields.gender_pref,
        social_battery: splitCSV(editFields.social_battery),
        habits: splitCSV(editFields.habits),
        work_study: splitCSV(editFields.work_study),
      }
      await adminAPI.editUser(profileModal.user.user_id, secret, payload)
      setUsers(prev => prev.map(u => u.user_id === profileModal.user.user_id
        ? { ...u, name: payload.name, phone: payload.phone, gender: payload.gender } : u))
      setProfileModal(prev => ({
        ...prev,
        user: { ...prev.user, name: payload.name, phone: payload.phone, gender: payload.gender, date_of_birth: payload.date_of_birth },
        survey: { ...prev.survey, ...payload }
      }))
      setEditMode(false)
    } catch (err) {
      alert('Failed to save: ' + (err?.response?.data?.detail || err.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleLoadPreview = async () => {
    setLoadingPreview(true)
    try {
      const data = await adminAPI.emailCampaignPreview(secret)
      setCampaignPreview(data)
    } catch {
      alert('Failed to load campaign preview.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleRunCampaign = async (type, label) => {
    const preview = campaignPreview?.[type]
    const count = preview?.count ?? '?'
    if (count > RESEND_FREE_DAILY_LIMIT) {
      if (!confirm(`⚠️ This will send ${count} emails but your Resend free plan allows only ${RESEND_FREE_DAILY_LIMIT}/day. Some emails may fail. Continue anyway?`)) return
    } else {
      if (!confirm(`Send "${label}" email to ${count} user${count !== 1 ? 's' : ''}?`)) return
    }
    setRunningCampaign(type)
    try {
      const extra = type === 'custom' ? { subject: customSubject, body_html: customBody } : {}
      const res = await adminAPI.runEmailCampaign(secret, type, extra)
      setCampaignResults(prev => ({ ...prev, [type]: res.data }))
      // Refresh preview counts
      const updated = await adminAPI.emailCampaignPreview(secret)
      setCampaignPreview(updated)
    } catch (err) {
      alert('Campaign failed: ' + (err?.response?.data?.detail || err.message || 'unknown error'))
    } finally {
      setRunningCampaign(null)
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

  if (adminTab === 'communication') {
    return (
      <>
        <AdminTabBar tab={adminTab} setTab={setAdminTab} />
        <CommunicationPage secret={secret} />
      </>
    )
  }

  if (adminTab === 'stats') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
        <AdminTabBar tab={adminTab} setTab={setAdminTab} />
        <StatsPage secret={secret} />
      </div>
    )
  }

  return (
    <>
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '32px 24px' }}>
      {/* Tab bar */}
      <AdminTabBar tab={adminTab} setTab={setAdminTab} />
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

        {/* Email Campaigns */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Email Campaigns</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>Resend free plan: {RESEND_FREE_DAILY_LIMIT} emails/day · sending from hello@colocsy.com</p>
            </div>
            <button
              onClick={handleLoadPreview}
              disabled={loadingPreview}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#aaa', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {loadingPreview ? 'Loading…' : campaignPreview ? 'Refresh counts' : 'Load audience counts'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {/* Campaign: Incomplete Survey */}
            <CampaignCard
              title="Complete Your Survey"
              description="Nudge users who signed up but never filled out their roommate profile."
              count={campaignPreview?.incomplete_survey?.count}
              result={campaignResults['incomplete_survey']}
              running={runningCampaign === 'incomplete_survey'}
              onSend={() => handleRunCampaign('incomplete_survey', 'Complete Your Survey')}
              previewLoaded={!!campaignPreview}
              dailyLimit={RESEND_FREE_DAILY_LIMIT}
              accentColor="#e8481c"
            />

            {/* Campaign: Has Likes */}
            <CampaignCard
              title="Someone Liked You"
              description="Remind users with completed profiles that others have liked them — bring them back to swipe."
              count={campaignPreview?.has_likes?.count}
              result={campaignResults['has_likes']}
              running={runningCampaign === 'has_likes'}
              onSend={() => handleRunCampaign('has_likes', 'Someone Liked You')}
              previewLoaded={!!campaignPreview}
              dailyLimit={RESEND_FREE_DAILY_LIMIT}
              accentColor="#6c47ff"
            />

            {/* Campaign: Custom Broadcast */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Custom Broadcast</div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                  Send a custom message to all {campaignPreview ? campaignPreview.all_users.count : '…'} users with an email address.
                  {campaignPreview?.all_users?.count > RESEND_FREE_DAILY_LIMIT && (
                    <span style={{ color: '#f59e0b', display: 'block', marginTop: 4 }}>⚠️ Exceeds daily limit of {RESEND_FREE_DAILY_LIMIT}</span>
                  )}
                </div>
              </div>
              <input
                placeholder="Subject line…"
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
              />
              <textarea
                placeholder="Body (HTML allowed, e.g. <p>Hi there!</p>)"
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
                rows={4}
                style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
              {campaignResults['custom'] && (
                <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                  Sent {campaignResults['custom'].sent} · Failed {campaignResults['custom'].failed}
                </div>
              )}
              <button
                onClick={() => handleRunCampaign('custom', 'Custom Broadcast')}
                disabled={runningCampaign === 'custom' || !campaignPreview || !customSubject.trim() || !customBody.trim()}
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (runningCampaign === 'custom' || !campaignPreview || !customSubject.trim() || !customBody.trim()) ? 0.5 : 1 }}
              >
                {runningCampaign === 'custom' ? 'Sending…' : 'Send to all users'}
              </button>
            </div>
          </div>
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
                        onClick={() => handleToggleVerify(user)}
                        disabled={verifyingId === user.user_id}
                        style={{ background: user.is_verified ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${user.is_verified ? 'rgba(59,130,246,0.4)' : '#333'}`, color: user.is_verified ? '#60a5fa' : '#555', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {verifyingId === user.user_id ? '…' : user.is_verified ? '✓ Verified' : 'Verify'}
                      </button>
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
            <div style={{ display: 'flex', gap: 8 }}>
              {!editMode
                ? <button onClick={handleStartEdit} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                : <>
                    <button onClick={handleSaveEdit} disabled={saving} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditMode(false)} style={{ background: 'none', border: '1px solid #333', color: '#666', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  </>
              }
              <button onClick={() => setProfileModal(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
          </div>

          {/* Basic info */}
          <Section title="Basic Info">
            {editMode ? <>
              <EditRow label="Name" value={editFields.name} onChange={v => setEditFields(p => ({ ...p, name: v }))} maxLength={100} />
              <EditRow label="Phone" value={editFields.phone} onChange={v => setEditFields(p => ({ ...p, phone: v }))} maxLength={20} placeholder="+91XXXXXXXXXX" />
              <EditRow label="DOB" value={editFields.date_of_birth} onChange={v => setEditFields(p => ({ ...p, date_of_birth: v }))} placeholder="YYYY-MM-DD" maxLength={10} />
              <SelectRow label="Gender" value={editFields.gender} onChange={v => setEditFields(p => ({ ...p, gender: v }))}
                options={[['', '— clear —'], ['male', 'Male'], ['female', 'Female'], ['other', 'Other']]} />
            </> : <>
              <Row label="Phone" value={profileModal.user.phone} />
              <Row label="DOB" value={profileModal.user.date_of_birth} />
              <Row label="Gender" value={profileModal.user.gender} />
              <Row label="Survey" value={profileModal.user.survey_completed ? 'Completed' : 'Pending'} highlight={profileModal.user.survey_completed} />
            </>}
          </Section>

          {profileModal.survey ? (
            <>
              <Section title="Basics">
                {editMode ? <>
                  <MultiSelectRow label="Budget" value={editFields.budget_ranges} onChange={v => setEditFields(p => ({ ...p, budget_ranges: v }))}
                    options={['5k-10k', '10k-15k', '15k-20k', '20k-30k', '30k-50k', '50k+']} />
                  <EditRow label="Locations" value={editFields.locations} onChange={v => setEditFields(p => ({ ...p, locations: v }))} placeholder="City - Area, City (comma-separated)" />
                  <MultiSelectRow label="Move-in" value={editFields.move_in_timelines} onChange={v => setEditFields(p => ({ ...p, move_in_timelines: v }))}
                    options={['ASAP', '1-month', '3-months', '6-months', 'flexible']} />
                  <MultiSelectRow label="Room type" value={editFields.occupancy_types} onChange={v => setEditFields(p => ({ ...p, occupancy_types: v }))}
                    options={['private', 'twin-sharing', 'triple-sharing', 'any']} />
                </> : <>
                  <Row label="Budget" value={profileModal.survey.budget_ranges?.join(', ') || profileModal.survey.budget_range} />
                  <Row label="Locations" value={profileModal.survey.locations?.join(', ')} />
                  <Row label="Move-in" value={(profileModal.survey.move_in_timelines || [profileModal.survey.move_in_timeline]).filter(Boolean).join(', ')} />
                  <Row label="Room type" value={(profileModal.survey.occupancy_types || [profileModal.survey.occupancy_type]).filter(Boolean).join(', ')} />
                </>}
              </Section>

              <Section title="Lifestyle Tags">
                {editMode ? <>
                  <MultiSelectRow label="Social" value={editFields.social_battery} onChange={v => setEditFields(p => ({ ...p, social_battery: v }))}
                    options={['extrovert', 'introvert', 'ambivert', 'social_butterfly', 'homebody', 'ghost']} />
                  <MultiSelectRow label="Habits" value={editFields.habits} onChange={v => setEditFields(p => ({ ...p, habits: v }))}
                    options={['early_bird', 'night_owl', 'clean_freak', 'messy', 'chef', 'fitness_freak', 'bookworm', 'gamer']} />
                  <MultiSelectRow label="Work/Study" value={editFields.work_study} onChange={v => setEditFields(p => ({ ...p, work_study: v }))}
                    options={['wfh_warrior', 'office_goer', 'student', 'freelancer', 'hybrid']} />
                </> : <>
                  <TagRow label="Social" tags={profileModal.survey.social_battery} />
                  <TagRow label="Habits" tags={profileModal.survey.habits} />
                  <TagRow label="Work/Study" tags={profileModal.survey.work_study} />
                </>}
              </Section>

              <Section title="Dealbreakers">
                {editMode ? <>
                  <SelectRow label="Pets" value={editFields.pets} onChange={v => setEditFields(p => ({ ...p, pets: v }))}
                    options={[['', '— clear —'], ['love', 'Love pets'], ['have', 'Have pets'], ['no', 'No pets']]} />
                  <SelectRow label="Smoking" value={editFields.smoking} onChange={v => setEditFields(p => ({ ...p, smoking: v }))}
                    options={[['', '— clear —'], ['non-smoker', 'Non-smoker'], ['smoker', 'Smoker'], ['smoker-prefer-smoker', 'Smoker (prefer smoker)'], ['outside-only', 'Outside only'], ['indifferent', 'Indifferent']]} />
                  <SelectRow label="Dietary" value={editFields.dietary} onChange={v => setEditFields(p => ({ ...p, dietary: v }))}
                    options={[['', '— clear —'], ['veg', 'Vegetarian'], ['non-veg', 'Non-vegetarian']]} />
                  <SelectRow label="Gender pref" value={editFields.gender_pref} onChange={v => setEditFields(p => ({ ...p, gender_pref: v }))}
                    options={[['', '— clear —'], ['male', 'Male only'], ['female', 'Female only'], ['neutral', 'No preference']]} />
                </> : <>
                  <Row label="Pets" value={profileModal.survey.pets} />
                  <Row label="Smoking" value={profileModal.survey.smoking} />
                  <Row label="Dietary" value={profileModal.survey.dietary} />
                  <Row label="Gender pref" value={profileModal.survey.gender} />
                </>}
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

function AdminTabBar({ tab, setTab }) {
  return (
    <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1e1e1e', display: 'flex', paddingLeft: 24 }}>
      {[['users', 'Users'], ['stats', 'Stats'], ['communication', 'Communication']].map(([key, label]) => (
        <button key={key} onClick={() => setTab(key)}
          style={{
            padding: '14px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: 'none', border: 'none',
            color: tab === key ? '#fff' : '#555',
            borderBottom: tab === key ? '2px solid #e8481c' : '2px solid transparent',
          }}>
          {label}
        </button>
      ))}
    </div>
  )
}

function CampaignCard({ title, description, count, result, running, onSend, previewLoaded, dailyLimit, accentColor }) {
  const overLimit = count > dailyLimit
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: previewLoaded ? '#fff' : '#333' }}>
          {previewLoaded ? (count ?? 0) : '—'}
        </span>
        <span style={{ fontSize: 12, color: '#555' }}>users</span>
        {overLimit && (
          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginLeft: 4 }}>⚠️ &gt;{dailyLimit}/day limit</span>
        )}
      </div>
      {result && (
        <div style={{ fontSize: 12, fontWeight: 600, color: result.failed > 0 ? '#f59e0b' : '#22c55e' }}>
          Sent {result.sent} · Failed {result.failed}
        </div>
      )}
      <button
        onClick={onSend}
        disabled={running || !previewLoaded || count === 0}
        style={{
          background: `rgba(${accentColor === '#e8481c' ? '232,72,28' : '108,71,255'},0.1)`,
          border: `1px solid rgba(${accentColor === '#e8481c' ? '232,72,28' : '108,71,255'},0.3)`,
          color: accentColor,
          borderRadius: 8,
          padding: '8px 0',
          fontSize: 13,
          fontWeight: 700,
          cursor: (running || !previewLoaded || count === 0) ? 'not-allowed' : 'pointer',
          opacity: (running || !previewLoaded || count === 0) ? 0.5 : 1,
        }}
      >
        {running ? 'Sending…' : `Send to ${previewLoaded ? count : '…'} users`}
      </button>
    </div>
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

function EditRow({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px', borderBottom: '1px solid #161616', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#555', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 13, outline: 'none', width: '60%', textAlign: 'right' }}
      />
    </div>
  )
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px', borderBottom: '1px solid #161616', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#555', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 13, outline: 'none', width: '60%', textAlign: 'right' }}>
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </div>
  )
}

function MultiSelectRow({ label, value, onChange, options }) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]
    onChange(next.join(', '))
  }
  return (
    <div style={{ padding: '8px 16px', borderBottom: '1px solid #161616' }}>
      <div style={{ fontSize: 13, color: '#555', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => toggle(opt)}
            style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', border: '1px solid', background: selected.includes(opt) ? 'rgba(99,102,241,0.2)' : 'transparent', color: selected.includes(opt) ? '#818cf8' : '#444', borderColor: selected.includes(opt) ? 'rgba(99,102,241,0.5)' : '#333' }}>
            {opt.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
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
