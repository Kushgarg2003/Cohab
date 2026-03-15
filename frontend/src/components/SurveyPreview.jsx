import React from 'react'
import useSurvey from '../hooks/useSurvey'

const fmt = (v) => {
  if (!v) return 'Not specified'
  if (Array.isArray(v)) return v.length ? v.join(', ') : 'Not specified'
  return v.toString().replace(/-/g, ' ').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function Section({ title, rows }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([label, value]) => value && fmt(value) !== 'Not specified' ? (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textAlign: 'right' }}>{fmt(value)}</span>
          </div>
        ) : null)}
      </div>
    </div>
  )
}

export default function SurveyPreview({ onSubmit, onBack }) {
  const survey = useSurvey()
  const pct = survey.getCompletionPercentage()

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '32px 24px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6, letterSpacing: -0.5 }}>Review your profile</h2>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24, fontWeight: 500 }}>Everything looks good? Submit to start matching.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <Section title="Must-Haves" rows={[
          ['Budget', survey.mandatoryData.budget_range],
          ['Locations', survey.mandatoryData.locations],
          ['Move-in', survey.mandatoryData.move_in_timeline],
          ['Room type', survey.mandatoryData.occupancy_type],
        ]} />

        {(survey.lifestyleTags.social_battery.length > 0 || survey.lifestyleTags.habits.length > 0 || survey.lifestyleTags.work_study.length > 0) && (
          <Section title="Your Vibe" rows={[
            ['Social battery', survey.lifestyleTags.social_battery],
            ['Habits', survey.lifestyleTags.habits],
            ['Work / Study', survey.lifestyleTags.work_study],
          ]} />
        )}

        {(survey.dealbreakers.pets || survey.dealbreakers.smoking || survey.dealbreakers.dietary || survey.dealbreakers.gender) && (
          <Section title="Dealbreakers" rows={[
            ['Pets', survey.dealbreakers.pets],
            ['Smoking', survey.dealbreakers.smoking],
            ['Dietary', survey.dealbreakers.dietary],
            ['Gender', survey.dealbreakers.gender],
          ]} />
        )}

        {Object.values(survey.deepDiveResponses).some(v => v?.trim()) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>About You</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(survey.deepDiveResponses).map(([prompt, response]) =>
                response?.trim() ? (
                  <div key={prompt} style={{ borderLeft: '2px solid var(--border-2)', paddingLeft: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>{prompt}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{response}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>

      {/* Completion */}
      <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(232,72,28,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 4, background: 'rgba(232,72,28,0.15)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{pct}% complete</span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)', padding: '13px 20px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          ← Edit
        </button>
        <button onClick={onSubmit} style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '13px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          Submit & find matches →
        </button>
      </div>
    </div>
  )
}
