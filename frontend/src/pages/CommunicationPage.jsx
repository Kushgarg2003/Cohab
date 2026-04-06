import { useState, useEffect } from 'react'
import { adminAPI } from '../api'
import api from '../api'

const RESEND_DAILY_LIMIT = 100

const EMAIL_TYPE_LABELS = {
  survey_reminder_1: 'Survey Reminder #1',
  survey_reminder_2: 'Survey Reminder #2',
  survey_reminder_3: 'Survey Reminder #3',
  has_likes: 'Someone Liked You',
  welcome: 'Welcome',
  match: 'Match',
  custom: 'Custom Broadcast',
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '16px 20px', minWidth: 130 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent || '#fff' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: '#555', marginTop: 3, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

export default function CommunicationPage({ secret }) {
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsFilter, setLogsFilter] = useState('')
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [running, setRunning] = useState(null)
  const [results, setResults] = useState({})
  const [customSubject, setCustomSubject] = useState('')
  const [customBody, setCustomBody] = useState('')

  const headers = { 'x-admin-secret': secret }

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const res = await api.get('/api/admin/communication/stats', { headers })
      setStats(res.data.data)
    } catch { /* ignore */ }
    finally { setLoadingStats(false) }
  }

  const loadLogs = async (filter = '') => {
    setLoadingLogs(true)
    try {
      const params = { limit: 50, offset: 0 }
      if (filter) params.email_type = filter
      const res = await api.get('/api/admin/communication/logs', { headers, params })
      setLogs(res.data.data.logs || [])
      setLogsTotal(res.data.data.total || 0)
    } catch { /* ignore */ }
    finally { setLoadingLogs(false) }
  }

  useEffect(() => {
    loadStats()
    loadLogs()
  }, [])

  const runCampaign = async (type, label, extra = {}) => {
    const eligible = type === 'survey_reminder'
      ? stats?.survey_reminder_eligible
      : type === 'has_likes'
        ? stats?.has_likes_eligible
        : stats?.total_subscribers
    if (!confirm(`Send "${label}" to ${eligible ?? '?'} eligible users?`)) return
    setRunning(type)
    try {
      const res = await api.post('/api/admin/communication/campaign', { type, ...extra }, { headers })
      setResults(prev => ({ ...prev, [type]: res.data.data }))
      loadStats()
      loadLogs(logsFilter)
    } catch (err) {
      alert('Failed: ' + (err?.response?.data?.detail || err.message))
    } finally {
      setRunning(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Communication</h1>
          <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
            Manage email campaigns · Resend free: {RESEND_DAILY_LIMIT}/day · hello@colocsy.com
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <StatCard label="Active Subscribers" value={stats?.total_subscribers} accent="#22c55e" />
          <StatCard label="Unsubscribed" value={stats?.unsubscribed} accent="#ef4444" />
          <StatCard label="Sent Today" value={stats?.sent_today} />
          <StatCard label="Sent This Month" value={stats?.sent_month} />
        </div>

        {/* Automated triggers info */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Automated Triggers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Someone Liked You', desc: 'Fires automatically when a user gets a like · 7-day cooldown · skips unsubscribed' },
              { label: 'Match Notification', desc: 'Fires automatically on mutual match · always sends' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#0d0d0d', borderRadius: 8, border: '1px solid #1e1e1e' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{t.desc}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 20 }}>ON</span>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Campaigns */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Manual Campaigns</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>

            {/* Survey Reminder */}
            <CampaignCard
              title="Survey Reminder"
              description="Sends next reminder in sequence (1→2→3). Max 3 per user, then stops forever. Skips unsubscribed."
              eligible={stats?.survey_reminder_eligible}
              result={results['survey_reminder']}
              running={running === 'survey_reminder'}
              onSend={() => runCampaign('survey_reminder', 'Survey Reminder')}
              accent="#e8481c"
              warning={stats?.survey_reminder_eligible > RESEND_DAILY_LIMIT}
              dailyLimit={RESEND_DAILY_LIMIT}
            />

            {/* Has Likes */}
            <CampaignCard
              title="Someone Liked You"
              description="Notifies users who have incoming likes. 7-day cooldown per user. Skips unsubscribed."
              eligible={stats?.has_likes_eligible}
              result={results['has_likes']}
              running={running === 'has_likes'}
              onSend={() => runCampaign('has_likes', 'Someone Liked You')}
              accent="#6c47ff"
              warning={stats?.has_likes_eligible > RESEND_DAILY_LIMIT}
              dailyLimit={RESEND_DAILY_LIMIT}
            />

            {/* Custom Broadcast */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Custom Broadcast</div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                  Sends to all {stats?.total_subscribers ?? '…'} active subscribers.
                  {stats?.total_subscribers > RESEND_DAILY_LIMIT && (
                    <span style={{ color: '#f59e0b', display: 'block', marginTop: 3 }}>⚠️ Exceeds {RESEND_DAILY_LIMIT}/day Resend limit</span>
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
                placeholder="Body HTML (e.g. <p>We just launched something new…</p>)"
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
                rows={4}
                style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
              {results['custom'] && <CampaignResult result={results['custom']} />}
              <button
                onClick={() => runCampaign('custom', 'Custom Broadcast', { subject: customSubject, body_html: customBody })}
                disabled={running === 'custom' || !stats || !customSubject.trim() || !customBody.trim()}
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (running === 'custom' || !stats || !customSubject.trim() || !customBody.trim()) ? 0.4 : 1 }}
              >
                {running === 'custom' ? 'Sending…' : 'Send to all subscribers'}
              </button>
            </div>

          </div>
        </div>

        {/* Email Log */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Email Log</span>
              <span style={{ fontSize: 12, color: '#555', marginLeft: 8 }}>{logsTotal} total</span>
            </div>
            <select
              value={logsFilter}
              onChange={e => { setLogsFilter(e.target.value); loadLogs(e.target.value) }}
              style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none' }}
            >
              <option value="">All types</option>
              {Object.entries(EMAIL_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {loadingLogs ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#444', fontSize: 13 }}>Loading…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#444', fontSize: 13 }}>No emails sent yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                  {['User', 'Email', 'Type', 'Subject', 'Sent At'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #161616' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{log.name || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#666' }}>{log.email}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(108,71,255,0.15)', color: '#818cf8' }}>
                        {EMAIL_TYPE_LABELS[log.email_type] || log.email_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#555' }}>
                      {new Date(log.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

function CampaignCard({ title, description, eligible, result, running, onSend, accent, warning, dailyLimit }) {
  const accentRgb = accent === '#e8481c' ? '232,72,28' : '108,71,255'
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: eligible != null ? '#fff' : '#333' }}>{eligible ?? '—'}</span>
        <span style={{ fontSize: 12, color: '#555' }}>eligible users</span>
        {warning && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>⚠️ &gt;{dailyLimit}/day</span>}
      </div>
      {result && <CampaignResult result={result} />}
      <button
        onClick={onSend}
        disabled={running || eligible == null || eligible === 0}
        style={{
          background: `rgba(${accentRgb},0.1)`,
          border: `1px solid rgba(${accentRgb},0.3)`,
          color: accent,
          borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 700,
          cursor: (running || eligible == null || eligible === 0) ? 'not-allowed' : 'pointer',
          opacity: (running || eligible == null || eligible === 0) ? 0.4 : 1,
        }}
      >
        {running ? 'Sending…' : `Send to ${eligible ?? '…'} users`}
      </button>
    </div>
  )
}

function CampaignResult({ result }) {
  if (!result) return null
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: result.failed > 0 ? '#f59e0b' : '#22c55e' }}>
      ✓ Sent {result.sent} · Skipped {result.skipped} · Failed {result.failed}
    </div>
  )
}
