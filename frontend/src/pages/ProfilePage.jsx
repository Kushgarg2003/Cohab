import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { surveyAPI } from '../api'
import Avatar from '../components/Avatar'
import BottomNav from '../components/BottomNav'

const fmt = (v) => {
  if (!v) return null
  if (Array.isArray(v)) return v.length ? v.join(', ') : null
  return v.toString().replace(/-/g, ' ').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function Row({ label, value }) {
  const display = fmt(value)
  if (!display) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textAlign: 'right' }}>{display}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{title}</p>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('userId')
  const userName = localStorage.getItem('userName')
  const userPicture = localStorage.getItem('userPicture')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    surveyAPI.getUserProfile(userId)
      .then(data => { setProfile(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  const handleSignOut = () => {
    localStorage.clear()
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'rgba(12,12,16,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/matches')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>
            Coloc<span style={{ color: 'var(--primary)' }}>sy</span>
          </span>
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '7px 14px', borderRadius: 8 }}>
            ← Back
          </button>
          <button onClick={handleSignOut} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-3)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '7px 14px', borderRadius: 8 }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, gap: 12 }}>
          <Avatar userId={userId} name={userName} picture={userPicture} size={80} />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: -0.5 }}>{userName || 'You'}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, fontWeight: 500 }}>
              {profile?.survey_completed ? 'Profile complete' : 'Profile incomplete'}
            </p>
          </div>
          <button
            onClick={() => navigate('/survey')}
            style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Edit profile
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : !profile?.survey ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>No profile yet</p>
            <p style={{ fontSize: 13, marginBottom: 24 }}>Complete your survey to start matching.</p>
            <button onClick={() => navigate('/survey')} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Complete profile →
            </button>
          </div>
        ) : (
          <>
            <Section title="Must-Haves">
              <Row label="Budget" value={profile.survey.budget_range} />
              <Row label="Locations" value={profile.survey.locations} />
              <Row label="Move-in" value={profile.survey.move_in_timeline} />
              <Row label="Room type" value={profile.survey.occupancy_type} />
            </Section>

            {(profile.survey.social_battery?.length || profile.survey.habits?.length || profile.survey.work_study?.length) ? (
              <Section title="Your Vibe">
                <Row label="Social battery" value={profile.survey.social_battery} />
                <Row label="Habits" value={profile.survey.habits} />
                <Row label="Work / Study" value={profile.survey.work_study} />
              </Section>
            ) : null}

            {(profile.survey.pets || profile.survey.smoking || profile.survey.dietary || profile.survey.gender) ? (
              <Section title="Dealbreakers">
                <Row label="Pets" value={profile.survey.pets} />
                <Row label="Smoking" value={profile.survey.smoking} />
                <Row label="Dietary" value={profile.survey.dietary} />
                <Row label="Gender pref" value={profile.survey.gender} />
              </Section>
            ) : null}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
