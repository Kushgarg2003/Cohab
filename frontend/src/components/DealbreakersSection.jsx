import React, { useState } from 'react'
import useSurvey from '../hooks/useSurvey'

const BADGES = {
  pets:     { emoji: '🐾', label: 'Pets',     options: ['have', 'love', 'no'] },
  smoking:  { emoji: '🚬', label: 'Smoking',  options: ['smoker', 'non-smoker', 'outside-only'] },
  dietary:  { emoji: '🥦', label: 'Dietary',  options: ['veg', 'non-veg'] },
  gender:   { emoji: '🚻', label: 'Gender',   options: ['male', 'female', 'neutral'] },
}

const fmt = (v) => v ? v.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null

export default function DealbreakersSection({ onNext, onBack }) {
  const { dealbreakers, setDealbreakers } = useSurvey()
  const [activeModal, setActiveModal] = useState(null)

  const handleSelect = (badge, value) => {
    setDealbreakers({ [badge]: dealbreakers[badge] === value ? null : value })
    setActiveModal(null)
  }

  return (
    <div style={S.card}>
      <h2 style={S.question}>Your dealbreakers</h2>
      <p style={S.hint}>These filter out incompatible matches. Tap each to set your preference.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {Object.entries(BADGES).map(([key, badge]) => {
          const selected = dealbreakers[key]
          return (
            <button key={key} onClick={() => setActiveModal(activeModal === key ? null : key)}
              style={{ ...S.badge, ...(selected ? S.badgeSelected : {}) }}>
              <span style={{ fontSize: 26, marginBottom: 8 }}>{badge.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{badge.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: selected ? 'var(--primary)' : 'var(--text-3)', marginTop: 4 }}>
                {fmt(selected) || 'Tap to set'}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={S.btnSecondary}>← Back</button>
        <button onClick={onNext} style={{ ...S.btnPrimary, flex: 1 }}>Next section →</button>
      </div>

      {/* Modal */}
      {activeModal && (
        <div style={S.overlay} onClick={() => setActiveModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>{BADGES[activeModal].emoji}</span>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{BADGES[activeModal].label}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BADGES[activeModal].options.map(opt => {
                const chosen = dealbreakers[activeModal] === opt
                return (
                  <button key={opt} onClick={() => handleSelect(activeModal, opt)}
                    style={{ ...S.modalOption, ...(chosen ? S.modalOptionSelected : {}) }}>
                    <span>{fmt(opt)}</span>
                    {chosen && <span>✓</span>}
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(26,18,6,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: 'var(--white)', borderRadius: 'var(--radius)', padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 -4px 32px rgba(26,18,6,0.12)' },
  modalOption: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', border: '2px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: 'var(--text)', transition: 'all 0.15s' },
  modalOptionSelected: { borderColor: 'var(--primary)', background: 'var(--primary-light)', fontWeight: 700 },
}
