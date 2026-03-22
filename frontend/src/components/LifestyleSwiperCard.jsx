import React, { useState } from 'react'
import useSurvey from '../hooks/useSurvey'

const CATEGORY_META = {
  social_battery: { label: 'Social Battery', emoji: '🔋', desc: 'How do you recharge?' },
  habits: { label: 'Habits', emoji: '🏠', desc: 'How you keep the space' },
  work_study: { label: 'Work & Study', emoji: '💻', desc: 'Your daily rhythm' },
}

export default function LifestyleSwiperCard({ lifestyleTagsData, onNext, onBack }) {
  const { lifestyleTags, toggleLifestyleTag } = useSurvey()
  const [category, setCategory] = useState('social_battery')
  const [currentIndex, setCurrentIndex] = useState(0)

  const categories = ['social_battery', 'habits', 'work_study']
  const currentTags = lifestyleTagsData[category] || []
  const currentTag = currentTags[currentIndex]
  const isSelected = lifestyleTags[category]?.includes(currentTag?.tag_key) || false
  const selectedTotal = Object.values(lifestyleTags).reduce((sum, arr) => sum + (arr?.length || 0), 0)

  const goNext = () => {
    if (currentIndex < currentTags.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      const ci = categories.indexOf(category)
      if (ci < categories.length - 1) {
        setCategory(categories[ci + 1])
        setCurrentIndex(0)
      } else {
        onNext()
      }
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else {
      const ci = categories.indexOf(category)
      if (ci > 0) {
        const prevCat = categories[ci - 1]
        setCategory(prevCat)
        setCurrentIndex((lifestyleTagsData[prevCat] || []).length - 1)
      } else {
        onBack()
      }
    }
  }

  const handleToggle = () => { toggleLifestyleTag(category, currentTag.tag_key) }
  const handleSkip = () => goNext()

  if (!currentTag) return null

  const meta = CATEGORY_META[category]
  const progress = (currentIndex + 1) / currentTags.length

  return (
    <div style={S.card}>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setCurrentIndex(0) }}
            style={{ ...S.tab, ...(category === cat ? S.tabActive : {}) }}>
            {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--primary)', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>

      {/* Card */}
      <div style={{ ...S.tagCard, ...(isSelected ? S.tagCardSelected : {}) }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
          {meta.desc}
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text)', lineHeight: 1.4, letterSpacing: -0.3 }}>
          {currentTag.tag_label}
        </p>
        <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 12, color: isSelected ? 'var(--primary)' : 'var(--text-3)', fontWeight: 600 }}>
          {currentIndex + 1} / {currentTags.length}
        </div>
        {isSelected && (
          <div style={{ position: 'absolute', bottom: 16, right: 16, fontSize: 20 }}>✓</div>
        )}
      </div>

      {/* Toggle button */}
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleToggle} style={{ ...S.addBtn, width: '100%', ...(isSelected ? S.addBtnSelected : {}) }}>
          {isSelected ? '✓ This is me — tap to remove' : '+ This is me'}
        </button>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <button onClick={goBack} style={S.skipBtn}>← Back</button>
        <button onClick={handleSkip} style={{ ...S.skipBtn, flex: 1 }}>
          {currentIndex === currentTags.length - 1 && categories.indexOf(category) === categories.length - 1 ? 'Finish →' : 'Next →'}
        </button>
      </div>

      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
          {selectedTotal} trait{selectedTotal !== 1 ? 's' : ''} selected
        </span>
      </div>
    </div>
  )
}

const S = {
  card: { background: 'var(--white)', borderRadius: 'var(--radius)', padding: '28px 24px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-md)' },
  tab: { padding: '6px 12px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', whiteSpace: 'nowrap' },
  tabActive: { borderColor: 'var(--primary)', background: 'var(--primary-light)', color: 'var(--primary)' },
  tagCard: { position: 'relative', background: 'var(--bg)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px 28px', minHeight: 160, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 20, transition: 'all 0.2s' },
  tagCardSelected: { background: 'var(--primary-light)', borderColor: 'var(--primary)' },
  skipBtn: { flex: 1, padding: '13px', border: '2px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', fontSize: 15, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' },
  addBtn: { flex: 2, padding: '13px', border: '2px solid var(--primary)', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', transition: 'all 0.15s' },
  addBtnSelected: { background: 'var(--primary-light)', color: 'var(--primary)' },
  backLink: { background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 },
}
