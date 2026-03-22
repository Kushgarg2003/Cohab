import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSurvey from '../hooks/useSurvey'
import { surveyAPI } from '../api'

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1',  flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+971',flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+966',flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974',flag: '🇶🇦', name: 'Qatar' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
]

function BasicInfoScreen({ onNext }) {
  const [name, setName] = React.useState(localStorage.getItem('userName') || '')
  const [dob, setDob] = React.useState(localStorage.getItem('userDOB') || '')
  const [gender, setGender] = React.useState(localStorage.getItem('userGender') || '')
  const [countryCode, setCountryCode] = React.useState(localStorage.getItem('userCountryCode') || '+91')
  const [phone, setPhone] = React.useState(localStorage.getItem('userPhoneRaw') || '')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState(null)

  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0]
  const minDate = new Date(today.getFullYear() - 60, today.getMonth(), today.getDate()).toISOString().split('T')[0]

  const phoneValid = phone.length >= 7 && phone.length <= 15
  const isValid = name.trim() && gender && phoneValid  // DOB optional

  const handleNext = async () => {
    if (!isValid) return
    setSaving(true)
    setSaveError(null)
    const userId = localStorage.getItem('userId')
    const fullPhone = countryCode + phone
    try {
      await surveyAPI.saveBasicInfo(userId, { name: name.trim(), date_of_birth: dob || null, gender, phone: fullPhone })
      localStorage.setItem('userName', name.trim())
      localStorage.setItem('userDOB', dob)
      localStorage.setItem('userGender', gender)
      localStorage.setItem('userCountryCode', countryCode)
      localStorage.setItem('userPhoneRaw', phone)
      localStorage.setItem('userPhone', fullPhone)
      onNext()
    } catch (err) {
      setSaveError(err?.response?.data?.detail || 'Failed to save. Please check your details and try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '13px 16px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: 15, fontWeight: 500, outline: 'none', boxSizing: 'border-box', color: 'var(--text)', fontFamily: 'inherit', transition: 'border-color 0.15s', background: 'var(--white)' }
  const labelStyle = { fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, display: 'block' }

  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '36px 28px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-md)', animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6, letterSpacing: -0.5 }}>Tell us about yourself</h2>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 28, fontWeight: 500 }}>This helps your matches know who they're connecting with.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Full name</label>
          <input style={inputStyle} placeholder="e.g. Priya Sharma" value={name}
            onChange={e => setName(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        {/* DOB */}
        <div>
          <label style={labelStyle}>Date of birth</label>
          <input style={inputStyle} type="date" min={minDate} max={maxDate} value={dob}
            onChange={e => setDob(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        {/* Phone with country code */}
        <div>
          <label style={labelStyle}>Phone number</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
              style={{ padding: '13px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--text)', background: 'var(--white)', cursor: 'pointer', outline: 'none', flexShrink: 0 }}
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <input style={{ ...inputStyle, flex: 1 }} type="tel" placeholder="Phone number" maxLength={15} value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['male', 'female', 'other'].map(g => (
              <button key={g} onClick={() => setGender(g)}
                style={{ flex: 1, padding: '11px 0', border: `2px solid ${gender === g ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, background: gender === g ? 'var(--primary-light)' : 'var(--white)', fontSize: 14, fontWeight: gender === g ? 700 : 500, color: gender === g ? 'var(--primary)' : 'var(--text)', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                {g === 'male' ? '♂ Male' : g === 'female' ? '♀ Female' : '⚧ Other'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {saveError && (
        <p style={{ color: 'var(--red)', fontSize: 13, fontWeight: 500, marginTop: 16, textAlign: 'center' }}>{saveError}</p>
      )}
      <button onClick={handleNext} disabled={!isValid || saving}
        style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 16, marginTop: 12, opacity: !isValid || saving ? 0.4 : 1 }}>
        {saving ? 'Saving…' : 'Continue →'}
      </button>
    </div>
  )
}
import SurveyCard from '../components/SurveyCard'
import LifestyleSwiperCard from '../components/LifestyleSwiperCard'
import DealbreakersSection from '../components/DealbreakersSection'
import SurveyPreview from '../components/SurveyPreview'

const STEPS = ['name', 'mandatory', 'dealbreakers', 'lifestyle', 'preview']
const STEP_LABELS = ['Name', 'Basics', 'Dealbreakers', 'Lifestyle', 'Review']

export default function Dashboard() {
  const navigate = useNavigate()
  const survey = useSurvey()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        let userId = localStorage.getItem('userId') || survey.userId
        // If not authenticated at all, redirect to landing
        if (!userId && !localStorage.getItem('token')) {
          navigate('/')
          return
        }
        if (!userId) {
          const userData = await surveyAPI.createUser()
          userId = userData.user_id
          localStorage.setItem('userId', userId)
        }
        survey.setUserId(userId)

        let surveyData
        try {
          surveyData = await surveyAPI.startSurvey(userId)
        } catch {
          localStorage.removeItem('userId')
          const userData = await surveyAPI.createUser()
          userId = userData.user_id
          localStorage.setItem('userId', userId)
          survey.setUserId(userId)
          surveyData = await surveyAPI.startSurvey(userId)
        }
        survey.setSurveyId(surveyData.survey_id)

        // Fetch questions (cached) and profile in parallel
        const cachedQuestions = localStorage.getItem('surveyQuestions_v3')
        const [questions, profile] = await Promise.all([
          cachedQuestions ? Promise.resolve(JSON.parse(cachedQuestions)) : surveyAPI.getQuestions().then(q => { localStorage.setItem('surveyQuestions_v3', JSON.stringify(q)); return q }),
          surveyAPI.getUserProfile(userId).catch(() => null)
        ])
        survey.setAllQuestions(questions)
        // Restore basic info from backend if not in localStorage (new device / cleared storage)
        if (profile?.name && !localStorage.getItem('userName')) {
          localStorage.setItem('userName', profile.name)
          if (profile.gender) localStorage.setItem('userGender', profile.gender)
          if (profile.date_of_birth) localStorage.setItem('userDOB', profile.date_of_birth)
          if (profile.phone) {
            localStorage.setItem('userPhone', profile.phone)
            // Parse country code prefix (e.g. "+91" from "+919876543210")
            const match = profile.phone.match(/^(\+\d{1,4})(\d+)$/)
            if (match) {
              localStorage.setItem('userCountryCode', match[1])
              localStorage.setItem('userPhoneRaw', match[2])
            }
          }
        }

        if (profile?.survey) {
          const s = profile.survey
          if (s.budget_ranges?.length || s.budget_range || s.locations?.length) {
            survey.setMandatoryData({
              budget_ranges: s.budget_ranges?.length ? s.budget_ranges : (s.budget_range ? [s.budget_range] : []),
              locations: s.locations || [],
              move_in_timeline: s.move_in_timeline || null,
              occupancy_type: s.occupancy_type || null,
            })
          }
          if (s.social_battery?.length || s.habits?.length || s.work_study?.length) {
            survey.setLifestyleTags({
              social_battery: s.social_battery || [],
              habits: s.habits || [],
              work_study: s.work_study || [],
            })
          }
          if (s.pets || s.smoking || s.dietary || s.gender) {
            survey.setDealbreakers({ pets: s.pets, smoking: s.smoking, dietary: s.dietary, gender: s.gender })
          }
          if (s.deep_dive_responses && Object.keys(s.deep_dive_responses).length) {
            Object.entries(s.deep_dive_responses).forEach(([prompt, response]) => {
              survey.setDeepDiveResponse(prompt, response)
            })
          }
        } else {
          survey.loadFromLocalStorage(userId)
        }

        const hasBasicInfo = !!(localStorage.getItem('userName') && localStorage.getItem('userDOB') && localStorage.getItem('userGender') && localStorage.getItem('userPhone'))
        survey.setCurrentStep(hasBasicInfo ? 'mandatory' : 'name')
        setLoading(false)
      } catch (err) {
        setError(err.message || 'Failed to initialize survey')
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (survey.userId && survey.currentStep !== 'start' && survey.currentStep !== 'submitted') {
      survey.saveToLocalStorage(survey.userId)
    }
  }, [survey.mandatoryData, survey.lifestyleTags, survey.dealbreakers, survey.deepDiveResponses])

  const handleMandatoryNext = async () => {
    try { await surveyAPI.saveMandatory(survey.surveyId, survey.mandatoryData); survey.setCurrentStep('dealbreakers') }
    catch { setError('Failed to save. Please try again.') }
  }
  const handleDealbreakerNext = async () => {
    try { await surveyAPI.saveDealbreakers(survey.surveyId, survey.dealbreakers); survey.setCurrentStep('lifestyle') }
    catch { setError('Failed to save. Please try again.') }
  }
  const handleLifestyleNext = async () => {
    try { await surveyAPI.saveLifestyle(survey.surveyId, survey.lifestyleTags); survey.setCurrentStep('preview') }
    catch { setError('Failed to save. Please try again.') }
  }
  const handleSubmit = async () => {
    try { await surveyAPI.submitSurvey(survey.surveyId); setSubmitted(true); survey.setCurrentStep('submitted') }
    catch { setError('Failed to submit. Please try again.') }
  }

  const stepIndex = STEPS.indexOf(survey.currentStep)

  if (loading) return (
    <div style={S.centered}>
      <div style={S.spinner} />
      <p style={{ color: 'var(--text-2)', marginTop: 16, fontWeight: 500 }}>Setting things up…</p>
    </div>
  )

  if (error) return (
    <div style={S.centered}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 32, maxWidth: 400, textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
        <p style={{ color: 'var(--red)', marginBottom: 20, fontWeight: 500 }}>{error}</p>
        <button onClick={() => window.location.reload()} style={S.btnPrimary}>Try again</button>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={S.centered}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '48px 40px', maxWidth: 440, textAlign: 'center', boxShadow: 'var(--shadow-md)', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 12, letterSpacing: -0.5 }}>Profile complete!</h1>
        <p style={{ color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 32 }}>
          Your profile is live. Let's find people who match your vibe.
        </p>
        <button onClick={() => navigate('/matches')} style={{ ...S.btnPrimary, width: '100%', padding: '14px 24px', fontSize: 16 }}>
          See my matches →
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 100px' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--white)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/matches')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>
            Coloc<span style={{ color: 'var(--primary)' }}>sy</span>
          </span>
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              width: i < stepIndex ? 24 : 8, height: 8, borderRadius: 4,
              background: i <= stepIndex ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
          {stepIndex + 1} / {STEPS.length}
        </span>
      </div>

      {/* Step label */}
      {stepIndex >= 0 && (
        <div style={{ textAlign: 'center', padding: '28px 24px 0' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Step {stepIndex + 1} — {STEP_LABELS[stepIndex]}
          </span>
        </div>
      )}

      {/* Content */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px 0' }}>
        {survey.currentStep === 'name' && (
          <BasicInfoScreen onNext={() => survey.setCurrentStep('mandatory')} />
        )}
        {survey.currentStep === 'mandatory' && (
          <SurveyCard questions={survey.allQuestions?.mandatory || {}} onNext={handleMandatoryNext} onBack={() => navigate('/')} />
        )}
        {survey.currentStep === 'dealbreakers' && (
          <DealbreakersSection onNext={handleDealbreakerNext} onBack={() => survey.setCurrentStep('mandatory')} />
        )}
        {survey.currentStep === 'lifestyle' && (
          <LifestyleSwiperCard lifestyleTagsData={survey.allQuestions?.lifestyle_tags || {}} onNext={handleLifestyleNext} onBack={() => survey.setCurrentStep('dealbreakers')} />
        )}
        {survey.currentStep === 'preview' && (
          <SurveyPreview onSubmit={handleSubmit} onBack={() => survey.setCurrentStep('lifestyle')} />
        )}
      </div>

      {/* Bottom progress bar */}
      {stepIndex >= 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(12,12,16,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', padding: '10px 24px 14px', zIndex: 20 }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>{STEP_LABELS[stepIndex]}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                {Math.round((stepIndex / (STEPS.length - 1)) * 100)}% complete
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(stepIndex / (STEPS.length - 1)) * 100}%`,
                background: 'var(--primary)',
                borderRadius: 2,
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 },
  spinner: { width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  btnPrimary: { background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
}
