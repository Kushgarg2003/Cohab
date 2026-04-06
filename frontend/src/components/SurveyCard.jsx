import React, { useState, useEffect } from 'react'
import useSurvey from '../hooks/useSurvey'

export default function SurveyCard({ questions, onNext, onBack }) {
  const { mandatoryData, setMandatoryData } = useSurvey()
  const [step, setStep] = useState(0)
  const [selectedCity, setSelectedCity] = useState(null)

  // Derive selected city from existing locations on mount (for edit mode)
  useEffect(() => {
    if (mandatoryData.locations?.length > 0) {
      const city = mandatoryData.locations[0].split(' - ')[0]
      setSelectedCity(city)
    }
  }, [])


  const fields = [
    { key: 'budget_ranges',     label: questions?.budget_range?.label,    options: questions?.budget_range?.options,    isSimpleMulti: true },
    { key: 'locations',         label: questions?.locations?.label,        options: questions?.locations?.options,        isMulti: true },
    { key: 'move_in_timelines', label: questions?.move_in_timeline?.label, options: questions?.move_in_timeline?.options, isSimpleMulti: true },
    { key: 'occupancy_types',   label: questions?.occupancy_type?.label,   options: questions?.occupancy_type?.options,   isSimpleMulti: true },
    { key: 'stay_duration',     label: questions?.stay_duration?.label,    options: questions?.stay_duration?.options,    isSingle: true },
  ]

  const currentField = fields[step]

  const handleSelect = (value) => {
    if (currentField.isMulti) {
      const locations = mandatoryData.locations.includes(value)
        ? mandatoryData.locations.filter(l => l !== value)
        : [...mandatoryData.locations, value]
      setMandatoryData({ locations })
    } else if (currentField.isSimpleMulti) {
      const current = mandatoryData[currentField.key] || []
      const updated = current.includes(value) ? current.filter(r => r !== value) : [...current, value]
      setMandatoryData({ [currentField.key]: updated })
    } else {
      // isSingle: toggle off if same value selected again
      setMandatoryData({ [currentField.key]: mandatoryData[currentField.key] === value ? null : value })
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

  const isAnswered = () => {
    if (currentField.isMulti) {
      if (selectedCity === 'Others') return true  // Others bypasses area selection
      return selectedCity !== null && mandatoryData.locations.length > 0
    }
    if (currentField.isSimpleMulti) return (mandatoryData[currentField.key] || []).length > 0
    if (currentField.isSingle) return mandatoryData[currentField.key] !== null
    return mandatoryData[currentField.key] !== null
  }

  const isSelected = (option) => {
    if (currentField.isMulti) return mandatoryData.locations.includes(option)
    if (currentField.isSimpleMulti) return (mandatoryData[currentField.key] || []).includes(option)
    return mandatoryData[currentField.key] === option
  }

  return (
    <div style={S.card}>
      {/* Mini progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {fields.map((_, i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? 'var(--primary)' : 'var(--border)', transition: 'background 0.3s' }} />
        ))}
      </div>

      <h2 style={S.question}>{currentField.label}</h2>
      {(currentField.isMulti || currentField.isSimpleMulti) && <p style={S.hint}>Select all that apply</p>}

      {currentField.isSimpleMulti ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
          {currentField.options?.map(option => {
            const selected = isSelected(option)
            return (
              <button key={option} onClick={() => handleSelect(option)}
                style={{ ...S.chip, ...(selected ? S.chipSelected : {}) }}>
                {selected && <span style={{ marginRight: 4 }}>✓</span>}{option}
              </button>
            )
          })}
        </div>
      ) : currentField.isMulti ? (
        <div style={{ marginBottom: 32 }}>
          {(() => {
            const options = currentField.options || []
            // Build city list from options
            const cities = [...new Set(options.map(o => o.includes(' - ') ? o.split(' - ')[0] : o))]

            // Step A: Pick a city
            if (!selectedCity) {
              return (
                <>
                  <p style={S.hint}>Pick a city — you can choose multiple areas within it.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cities.map(city => (
                      <button key={city} onClick={() => {
                        setSelectedCity(city)
                        setMandatoryData({ locations: [] }) // clear if changing city
                      }} style={S.option}>
                        <span>{city}</span>
                        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>→</span>
                      </button>
                    ))}
                    <button onClick={() => {
                      setSelectedCity('Others')
                      setMandatoryData({ locations: ['Others'] })
                    }} style={S.option}>
                      <span>Others</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 13 }}>→</span>
                    </button>
                  </div>
                </>
              )
            }

            // Step A.5: Others selected — no area needed
            if (selectedCity === 'Others') {
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <button onClick={() => { setSelectedCity(null); setMandatoryData({ locations: [] }) }}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', cursor: 'pointer' }}>
                      ← Back
                    </button>
                  </div>
                  <div style={{ background: 'var(--primary-light)', border: '1.5px solid var(--primary)', borderRadius: 12, padding: '16px 18px' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>✓ Others selected</p>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>You can proceed — your city isn't listed above.</p>
                  </div>
                </>
              )
            }

            // Step B: Pick areas within selected city
            const areas = options.filter(o => o.startsWith(selectedCity + ' - '))
            const selectedCount = mandatoryData.locations.length

            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <button onClick={() => { setSelectedCity(null); setMandatoryData({ locations: [] }) }}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', cursor: 'pointer' }}>
                    ← {selectedCity}
                  </button>
                  {selectedCount > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{selectedCount} selected</span>
                  )}
                </div>
                <p style={S.hint}>Pick all the areas you'd consider.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {areas.map(option => {
                    const selected = mandatoryData.locations.includes(option)
                    const area = option.split(' - ')[1]
                    return (
                      <button key={option} onClick={() => handleSelect(option)}
                        style={{ ...S.chip, ...(selected ? S.chipSelected : {}) }}>
                        {selected && <span style={{ marginRight: 4 }}>✓</span>}{area}
                      </button>
                    )
                  })}
                  {(() => {
                    const othersKey = `${selectedCity} - Others`
                    const selected = mandatoryData.locations.includes(othersKey)
                    return (
                      <button onClick={() => handleSelect(othersKey)}
                        style={{ ...S.chip, ...(selected ? S.chipSelected : {}) }}>
                        {selected && <span style={{ marginRight: 4 }}>✓</span>}Others
                      </button>
                    )
                  })()}
                </div>
              </>
            )
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
