import React, { useState, useEffect } from 'react'
import useSurvey from '../hooks/useSurvey'

export default function SurveyCard({ questions, onNext, onBack }) {
  const { mandatoryData, setMandatoryData } = useSurvey()
  const [step, setStep] = useState(0)
  const [locationSearch, setLocationSearch] = useState('')

  useEffect(() => { setLocationSearch('') }, [step])

  const fields = [
    { key: 'budget_range', label: questions?.budget_range?.label, options: questions?.budget_range?.options },
    { key: 'locations', label: questions?.locations?.label, options: questions?.locations?.options, isMulti: true },
    { key: 'move_in_timeline', label: questions?.move_in_timeline?.label, options: questions?.move_in_timeline?.options },
    { key: 'occupancy_type', label: questions?.occupancy_type?.label, options: questions?.occupancy_type?.options }
  ]

  const currentField = fields[step]

  const handleSelect = (value) => {
    if (currentField.isMulti) {
      const locations = mandatoryData.locations.includes(value)
        ? mandatoryData.locations.filter(l => l !== value)
        : [...mandatoryData.locations, value]
      setMandatoryData({ locations })
    } else {
      setMandatoryData({ [currentField.key]: value })
    }
  }

  const handleNext = () => {
    if (step < fields.length - 1) setStep(step + 1)
    else onNext()
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
    else onBack()
  }

  const isAnswered = () => currentField.isMulti
    ? mandatoryData.locations.length > 0
    : mandatoryData[currentField.key] !== null

  const isSelected = (option) => currentField.isMulti
    ? mandatoryData.locations.includes(option)
    : mandatoryData[currentField.key] === option

  return (
    <div style={S.card}>
      {/* Mini progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {fields.map((_, i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? 'var(--primary)' : 'var(--border)', transition: 'background 0.3s' }} />
        ))}
      </div>

      <h2 style={S.question}>{currentField.label}</h2>
      {currentField.isMulti && <p style={S.hint}>Select all that apply</p>}

      {currentField.isMulti ? (
        <div style={{ marginBottom: 32 }}>
          {/* Search input */}
          <input
            placeholder="Search city or area…"
            value={locationSearch}
            onChange={e => setLocationSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid var(--border)', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 16, background: 'var(--white)', color: 'var(--text)', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {/* Selected count */}
          {mandatoryData.locations.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, marginBottom: 12 }}>
              {mandatoryData.locations.length} selected
            </p>
          )}
          {/* Grouped or filtered chips */}
          {(() => {
            const options = currentField.options || []
            if (locationSearch.trim()) {
              const filtered = options.filter(o => o.toLowerCase().includes(locationSearch.toLowerCase()))
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {filtered.map(option => {
                    const selected = isSelected(option)
                    const area = option.includes(' - ') ? option.split(' - ')[1] : option
                    return (
                      <button key={option} onClick={() => handleSelect(option)} style={{ ...S.chip, ...(selected ? S.chipSelected : {}) }}>
                        {selected && <span style={{ marginRight: 4 }}>✓</span>}{area}
                      </button>
                    )
                  })}
                  {filtered.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No results found.</p>}
                </div>
              )
            }
            // Group by city
            const groups = {}
            options.forEach(o => {
              const city = o.includes(' - ') ? o.split(' - ')[0] : 'Other'
              if (!groups[city]) groups[city] = []
              groups[city].push(o)
            })
            return Object.entries(groups).map(([city, areas]) => (
              <div key={city} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{city}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {areas.map(option => {
                    const selected = isSelected(option)
                    const area = option.split(' - ')[1]
                    return (
                      <button key={option} onClick={() => handleSelect(option)} style={{ ...S.chip, ...(selected ? S.chipSelected : {}) }}>
                        {selected && <span style={{ marginRight: 4 }}>✓</span>}{area}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {currentField.options?.map((option) => {
            const selected = isSelected(option)
            return (
              <button key={option} onClick={() => handleSelect(option)} style={{ ...S.option, ...(selected ? S.optionSelected : {}) }}>
                <span>{option}</span>
                {selected && <span style={{ color: 'var(--primary)', fontSize: 18, lineHeight: 1 }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleBack} style={S.btnSecondary}>← Back</button>
        <button onClick={handleNext} disabled={!isAnswered()} style={{ ...S.btnPrimary, flex: 1, opacity: isAnswered() ? 1 : 0.4 }}>
          {step === fields.length - 1 ? 'Next section →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

const S = {
  card: { background: 'var(--white)', borderRadius: 'var(--radius)', padding: '36px 28px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-md)' },
  question: { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3, letterSpacing: -0.4 },
  hint: { fontSize: 13, color: 'var(--text-3)', marginBottom: 20, fontWeight: 500 },
  option: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '2px solid var(--border)', borderRadius: 10, background: 'var(--white)', fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', color: 'var(--text)' },
  optionSelected: { borderColor: 'var(--primary)', background: 'var(--primary-light)', fontWeight: 600 },
  btnPrimary: { background: 'var(--primary)', color: 'white', border: 'none', padding: '13px 24px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { background: 'var(--white)', color: 'var(--text-2)', border: '2px solid var(--border)', padding: '13px 20px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  chip: { padding: '7px 14px', border: '2px solid var(--border)', borderRadius: 20, background: 'var(--white)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text)', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  chipSelected: { borderColor: 'var(--primary)', background: 'var(--primary-light)', fontWeight: 700, color: 'var(--primary)' },
}
