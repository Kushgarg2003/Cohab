import { useEffect, useState } from 'react'
import { adminAPI } from '../api'

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(val, total) {
  if (!total) return 0
  return Math.round((val / total) * 100)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#e8481c' }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: -1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: '#444', fontWeight: 500 }}>{sub}</span>}
    </div>
  )
}

function BarChart({ title, data, total, color = '#e8481c' }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] || 1
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0 && <p style={{ color: '#444', fontSize: 13 }}>No data yet</p>}
        {entries.map(([key, val]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#aaa', fontWeight: 500 }}>{key}</span>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{val}{total ? ` (${pct(val, total)}%)` : ''}</span>
            </div>
            <div style={{ height: 6, background: '#1e1e1e', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(val / max) * 100}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Funnel({ survey_started, survey_completed, total_users }) {
  const steps = [
    { label: 'Registered', val: total_users, color: '#6366f1' },
    { label: 'Survey Started', val: survey_started, color: '#f59e0b' },
    { label: 'Survey Completed', val: survey_completed, color: '#22c55e' },
  ]
  const max = total_users || 1
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Conversion Funnel</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map(s => (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: '#aaa', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.val} <span style={{ color: '#555', fontWeight: 500 }}>({pct(s.val, max)}%)</span></span>
            </div>
            <div style={{ height: 8, background: '#1e1e1e', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(s.val / max) * 100}%`, background: s.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SignupTrend({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Sign-ups (last 30 days)</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {data.map(d => (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              title={`${d.date}: ${d.count}`}
              style={{ width: '100%', background: '#e8481c', borderRadius: '3px 3px 0 0', height: `${Math.max((d.count / max) * 72, 2)}px`, transition: 'height 0.4s ease', cursor: 'default' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: '#444' }}>{data[0]?.date?.slice(5)}</span>
        <span style={{ fontSize: 10, color: '#444' }}>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  )
}

function TopLiked({ users }) {
  if (!users?.length) return null
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Most Liked Profiles</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map((u, i) => (
          <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? '#e8481c' : '#444', width: 18, textAlign: 'center' }}>#{i + 1}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.name || 'Anonymous'}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#555' }}>{u.email}</p>
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8481c' }}>❤️ {u.likes}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StatsPage({ secret }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminAPI.getStats(secret)
      .then(setStats)
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false))
  }, [secret])

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>Loading stats…</div>
  )
  if (error) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#e8481c' }}>{error}</div>
  )

  const o = stats.overview

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Total Users" value={o.total_users} />
        <StatCard label="Survey Completed" value={o.survey_completed} sub={`${pct(o.survey_completed, o.total_users)}% completion`} color="#22c55e" />
        <StatCard label="Mutual Matches" value={o.total_matches} color="#6366f1" />
        <StatCard label="Users Matched" value={o.users_with_matches} sub={`${pct(o.users_with_matches, o.survey_completed)}% of completed`} color="#f59e0b" />
        <StatCard label="Total Likes" value={o.total_likes} color="#ec4899" />
        <StatCard label="Total Passes" value={o.total_passes} color="#555" />
        <StatCard label="Emails Sent" value={o.emails_sent_total} color="#06b6d4" />
        <StatCard label="Unsubscribed" value={o.unsubscribed} sub={`${pct(o.unsubscribed, o.total_users)}% of users`} color="#555" />
        <StatCard label="Verified" value={o.verified_users} color="#22c55e" />
      </div>

      {/* Signup trend */}
      <SignupTrend data={stats.signups_trend} />

      {/* Funnel + Gender side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Funnel
          total_users={o.total_users}
          survey_started={o.survey_started}
          survey_completed={o.survey_completed}
        />
        <BarChart
          title="Gender Split"
          data={stats.gender_dist}
          total={o.total_users}
          color="#6366f1"
        />
      </div>

      {/* City + Budget side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BarChart title="City Distribution" data={stats.city_dist} color="#e8481c" />
        <BarChart title="Budget Range" data={stats.budget_dist} color="#f59e0b" />
      </div>

      {/* Duration + Occupancy + Top liked */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <BarChart title="Stay Duration" data={stats.duration_dist} color="#22c55e" />
        <BarChart title="Occupancy Type" data={stats.occupancy_dist} color="#06b6d4" />
        <TopLiked users={stats.top_liked} />
      </div>

    </div>
  )
}
