import { useEffect, useState } from 'react'
import { adminAPI } from '../api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(val, total) {
  if (!total) return 0
  return Math.round((val / total) * 100)
}

// ── Reusable components ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#e8481c' }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 30, fontWeight: 800, color, letterSpacing: -1, lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: '#444', fontWeight: 500 }}>{sub}</span>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14, marginTop: 0 }}>
      {children}
    </p>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', ...style }}>
      {children}
    </div>
  )
}

function BarChart({ title, data, total, color = '#e8481c', maxRows = 30 }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, maxRows)
  const max = entries[0]?.[1] || 1
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {entries.length === 0 && <p style={{ color: '#444', fontSize: 13 }}>No data yet</p>}
        {entries.map(([key, val]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>{key}</span>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{val}{total ? ` (${pct(val, total)}%)` : ''}</span>
            </div>
            <div style={{ height: 5, background: '#1e1e1e', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(val / max) * 100}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Funnel({ total_users, survey_started, survey_completed, active_users_7d, users_with_matches }) {
  const steps = [
    { label: 'Registered', val: total_users, color: '#6366f1' },
    { label: 'Survey Started', val: survey_started, color: '#f59e0b' },
    { label: 'Survey Completed', val: survey_completed, color: '#22c55e' },
    { label: 'Active (7d)', val: active_users_7d, color: '#06b6d4' },
    { label: 'Got a Match', val: users_with_matches, color: '#e8481c' },
  ]
  const max = total_users || 1
  return (
    <Card>
      <SectionTitle>Conversion Funnel</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map(s => (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#aaa', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>
                {s.val} <span style={{ color: '#555', fontWeight: 500 }}>({pct(s.val, max)}%)</span>
              </span>
            </div>
            <div style={{ height: 7, background: '#1e1e1e', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(s.val / max) * 100}%`, background: s.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SignupTrend({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <SectionTitle>Sign-ups — last 30 days</SectionTitle>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#e8481c' }}>{total}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
        {data.map(d => (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              title={`${d.date}: ${d.count} sign-up${d.count !== 1 ? 's' : ''}`}
              style={{ width: '100%', background: '#e8481c', borderRadius: '3px 3px 0 0', height: `${Math.max((d.count / max) * 76, 2)}px`, transition: 'height 0.4s ease', cursor: 'default', opacity: 0.85 }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: '#444' }}>{data[0]?.date?.slice(5)}</span>
        <span style={{ fontSize: 10, color: '#444' }}>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </Card>
  )
}

function TopLiked({ users }) {
  if (!users?.length) return null
  return (
    <Card>
      <SectionTitle>Most Liked Profiles</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map((u, i) => (
          <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: i < 3 ? '#e8481c' : '#444', width: 20, textAlign: 'center' }}>#{i + 1}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                  {u.name || 'Anonymous'}
                  {u.gender && <span style={{ marginLeft: 6, fontSize: 10, color: '#555', fontWeight: 500 }}>({u.gender})</span>}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#444' }}>{u.email}</p>
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8481c' }}>❤️ {u.likes}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

const SCORE_COLOR = s => s >= 70 ? '#22c55e' : s >= 45 ? '#f59e0b' : '#ef4444'

function MatchedPairs({ pairs }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('matched_at') // matched_at | score | messages

  const filtered = (pairs || []).filter(p => {
    const q = search.toLowerCase()
    return !q || p.user_a?.name?.toLowerCase().includes(q) || p.user_b?.name?.toLowerCase().includes(q)
      || p.user_a?.email?.toLowerCase().includes(q) || p.user_b?.email?.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
    if (sortBy === 'messages') return (b.messages || 0) - (a.messages || 0)
    return (b.matched_at || '').localeCompare(a.matched_at || '')
  })

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <SectionTitle>All Matched Pairs ({pairs?.length || 0})</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, outline: 'none', width: 200 }}
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '6px 10px', color: '#aaa', fontSize: 12, outline: 'none' }}>
            <option value="matched_at">Sort: Latest</option>
            <option value="score">Sort: Score</option>
            <option value="messages">Sort: Messages</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['User A', 'User B', 'Score', 'Messages', 'Matched At'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, color: '#444', textAlign: 'center' }}>No matches yet</td></tr>
            )}
            {sorted.map(p => (
              <tr key={p.match_id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{p.user_a?.name || 'Anonymous'}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#555' }}>{p.user_a?.gender} · {p.user_a?.email}</p>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{p.user_b?.name || 'Anonymous'}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#555' }}>{p.user_b?.gender} · {p.user_b?.email}</p>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {p.score != null
                    ? <span style={{ fontWeight: 800, color: SCORE_COLOR(p.score), fontSize: 15 }}>{p.score}</span>
                    : <span style={{ color: '#444' }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontWeight: 600, color: p.messages > 0 ? '#22c55e' : '#555' }}>
                    {p.messages > 0 ? `💬 ${p.messages}` : '— silent'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#555', fontSize: 12 }}>{p.matched_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StatsPage({ secret }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [areaFilter, setAreaFilter] = useState('')

  useEffect(() => {
    adminAPI.getStats(secret)
      .then(setStats)
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false))
  }, [secret])

  if (loading) return <div style={{ padding: 64, textAlign: 'center', color: '#555' }}>Loading stats…</div>
  if (error) return <div style={{ padding: 64, textAlign: 'center', color: '#e8481c' }}>{error}</div>

  const o = stats.overview

  // Filtered area dist
  const filteredAreas = Object.fromEntries(
    Object.entries(stats.area_dist || {}).filter(([k]) =>
      !areaFilter || k.toLowerCase().includes(areaFilter.toLowerCase())
    ).slice(0, 30)
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Overview cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 10 }}>
        <StatCard label="Total Users" value={o.total_users} />
        <StatCard label="Completed Survey" value={o.survey_completed} sub={`${pct(o.survey_completed, o.total_users)}% of registered`} color="#22c55e" />
        <StatCard label="Active (7 days)" value={o.active_users_7d} sub={`${pct(o.active_users_7d, o.survey_completed)}% of completed`} color="#06b6d4" />
        <StatCard label="Never Swiped" value={o.never_swiped} sub="completed but idle" color="#555" />
        <StatCard label="Mutual Matches" value={o.total_matches} color="#6366f1" />
        <StatCard label="Users Matched" value={o.users_with_matches} sub={`${pct(o.users_with_matches, o.survey_completed)}% of completed`} color="#f59e0b" />
        <StatCard label="Total Likes" value={o.total_likes} color="#ec4899" />
        <StatCard label="Like Rate" value={`${o.like_ratio}%`} sub="likes / total swipes" color="#ec4899" />
        <StatCard label="Reciprocity" value={`${o.reciprocity_rate}%`} sub="likes → mutual match" color="#22c55e" />
        <StatCard label="Emails Sent" value={o.emails_sent_total} color="#06b6d4" />
        <StatCard label="Unsubscribed" value={o.unsubscribed} sub={`${pct(o.unsubscribed, o.total_users)}% of users`} color="#555" />
        <StatCard label="Verified" value={o.verified_users} color="#22c55e" />
      </div>

      {/* ── Signup trend ── */}
      <SignupTrend data={stats.signups_trend} />

      {/* ── Funnel ── */}
      <Funnel
        total_users={o.total_users}
        survey_started={o.survey_started}
        survey_completed={o.survey_completed}
        active_users_7d={o.active_users_7d}
        users_with_matches={o.users_with_matches}
      />

      {/* ── Demographics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BarChart title="Gender Split" data={stats.gender_dist} total={o.total_users} color="#6366f1" />
        <BarChart title="Age Distribution" data={stats.age_dist} total={Object.values(stats.age_dist || {}).reduce((a,b)=>a+b,0)} color="#f59e0b" />
      </div>

      {/* ── Location: city + area ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BarChart title="City Distribution (top 20)" data={stats.city_dist} color="#e8481c" />
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <SectionTitle>District / Area (top 30)</SectionTitle>
            <input
              placeholder="Filter…"
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 11, outline: 'none', width: 120 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {Object.entries(filteredAreas).map(([key, val]) => {
              const max = Math.max(...Object.values(filteredAreas))
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>{key}</span>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{val}</span>
                  </div>
                  <div style={{ height: 5, background: '#1e1e1e', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(val / max) * 100}%`, background: '#06b6d4', borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(filteredAreas).length === 0 && <p style={{ color: '#444', fontSize: 13 }}>No matches</p>}
          </div>
        </Card>
      </div>

      {/* ── Preferences ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <BarChart title="Budget Range" data={stats.budget_dist} color="#f59e0b" />
        <BarChart title="Stay Duration" data={stats.duration_dist} color="#22c55e" />
        <BarChart title="Occupancy Type" data={stats.occupancy_dist} color="#06b6d4" />
      </div>

      {/* ── Dealbreakers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <BarChart title="Pets Preference" data={stats.pets_dist} color="#ec4899" />
        <BarChart title="Smoking Preference" data={stats.smoking_dist} color="#f59e0b" />
        <BarChart title="Dietary Preference" data={stats.dietary_dist} color="#22c55e" />
      </div>

      {/* ── Lifestyle tags + Score dist ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <BarChart title="Lifestyle Tags (top 15)" data={stats.lifestyle_dist} color="#6366f1" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <BarChart title="Match Score Distribution" data={stats.score_dist} color="#e8481c" />
          <BarChart title="Email Type Breakdown" data={stats.email_type_dist} color="#06b6d4" />
        </div>
      </div>

      {/* ── Top liked ── */}
      <TopLiked users={stats.top_liked} />

      {/* ── Matched pairs table ── */}
      <MatchedPairs pairs={stats.matched_pairs} />

    </div>
  )
}
