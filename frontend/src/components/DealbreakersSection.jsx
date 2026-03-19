import React, { useState } from 'react'
import useSurvey from '../hooks/useSurvey'

const BADGES = {
  pets: {
    emoji: '🐾',
    label: 'Pets',
    question: 'What\'s your preference on pets?',
    options: [
      { value: 'have', short: 'I have pets', label: 'I have pets — roommate must be ok with them' },
      { value: 'love', short: 'Love pets', label: 'I love pets, would be great if they had one' },
      { value: 'no',   short: 'No pets',   label: 'I prefer no pets in the house' },
    ]
  },
  smoking: {
    emoji: '🚬',
    label: 'Smoking',
    question: 'What\'s your smoking preference?',
    options: [
      { value: 'smoker',       short: 'I smoke',        label: 'I smoke — I prefer a roommate who smokes too' },
      { value: 'non-smoker',   short: 'Non-smoker',     label: 'I prefer a non-smoker roommate' },
      { value: 'outside-only', short: 'Outside only',   label: 'Outside-only smoking is fine with me' },
    ]
  },
  dietary: {
    emoji: '🥦',
    label: 'Dietary',
    question: 'What\'s your dietary preference?',
    options: [
      { value: 'veg',     short: 'Veg household', label: 'I prefer a strictly vegetarian household' },
      { value: 'non-veg', short: 'Non-veg ok',    label: 'I\'m fine with non-veg cooking at home' },
    ]
  },
  gender: {
    emoji: '🚻',
    label: 'Gender',
    question: 'What\'s your roommate gender preference?',
    options: [
      { value: 'male',    short: 'Male roommate',   label: 'I prefer a male roommate' },
      { value: 'female',  short: 'Female roommate', label: 'I prefer a female roommate' },
      { value: 'neutral', short: 'Any gender',      label: 'I\'m open to any gender' },
    ]
  },
}

export default function DealbreakersSection({ onNext, onBack }) {
  const { dealbreakers, setDealbreakers } = useSurvey()
  const [activeModal, setActiveModal] = useState(null)

  const handleSelect = (badge, value) => {
    setDealbreakers({ [badge]: dealbreakers[badge] === value ? null : value })
    setActiveModal(null)
  }

  const getShort = (key) => {
    const val = dealbreakers[key]
    if (!val) return null
    return BADGES[key].options.find(o => o.value === val)?.short || null
  }

  return (
    <div style={S.card}>
      <h2 style={S.question}>Your roommate preferences</h2>
      <p style={S.hint}>These filter out incompatible matches. All optional — tap each to set.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {Object.entries(BADGES).map(([key, badge]) => {
          const short = getShort(key)
          return (
            <button key={key} onClick={() => setActiveModal(activeModal === key ? null : key)}
              style={{ ...S.badge, ...(short ? S.badgeSelected : {}) }}>
              <span style={{ fontSize: 26, marginBottom: 8 }}>{badge.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{badge.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: short ? 'var(--primary)' : 'var(--text-3)', marginTop: 4, textAlign: 'center', lineHeight: 1.3 }}>
                {short || 'Tap to set'}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={S.btnSecondary}>← Back</button>
        <button onClick={onNext} style={{ ...S.btnPrimary, flex: 1 }}>Next section →</button>
      </div>

      {/* Bottom-sheet modal */}
      {activeModal && (
        <div style={S.overlay} onClick={() => setActiveModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{BADGES[activeModal].emoji}</span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{BADGES[activeModal].question}</h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, fontWeight: 500 }}>Tap again to deselect</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BADGES[activeModal].options.map(opt => {
                const chosen = dealbreakers[activeModal] === opt.value
                return (
                  <button key={opt.value} onClick={() => handleSelect(activeModal, opt.value)}
                    style={{ ...S.modalOption, ...(chosen ? S.modalOptionSelected : {}) }}>
                    <span style={{ textAlign: 'left', lineHeight: 1.4 }}>{opt.label}</span>
                    {chosen && <span style={{ flexShrink: 0, marginLeft: 10 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  card: { background: 'var(--white)', borderRadius: 'var(--radius)', padding: '36px 28px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-md)' },
  question: { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: -0.4 },
  hint: { fontSize: 13, color: 'var(--text-3)', marginBottom: 24, fontWeight: 500 },
  badge: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px', border: '2px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--white)', cursor: 'pointer', transition: 'all 0.15s', gap: 2 },
  badgeSelected: { borderColor: 'var(--primary)', background: 'var(--primary-light)' },
  btnPrimary: { background: 'var(--primary)', color: 'white', border: 'none', padding: '13px 24px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { background: 'var(--white)', color: 'var(--text-2)', border: '2px solid var(--border)', padding: '13px 20px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: 'var(--white)', borderRadius: 'var(--radius)', padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' },
  modalOption: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', border: '2px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--text)', transition: 'all 0.15s', textAlign: 'left' },
  modalOptionSelected: { borderColor: 'var(--primary)', background: 'var(--primary-light)', fontWeight: 700 },
}
