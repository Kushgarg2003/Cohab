import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSurvey from '../hooks/useSurvey'
import { surveyAPI } from '../api'

function BasicInfoScreen({ onNext }) {
  const [name, setName] = React.useState(localStorage.getItem('userName') || '')
  const [age, setAge] = React.useState(localStorage.getItem('userAge') || '')
  const [gender, setGender] = React.useState(localStorage.getItem('userGender') || '')
  const [phone, setPhone] = React.useState(localStorage.getItem('userPhone') || '')
  const [saving, setSaving] = React.useState(false)

  const isValid = name.trim() && age && parseInt(age) >= 18 && parseInt(age) <= 60 && gender && /^\d{10}$/.test(phone)

  const handleNext = async () => {
    if (!isValid) return
    setSaving(true)
    const userId = localStorage.getItem('userId')
    try {
      await surveyAPI.saveBasicInfo(userId, { name: name.trim(), age: parseInt(age), gender, phone })
      localStorage.setItem('userName', name.trim())
      localStorage.setItem('userAge', age)
      localStorage.setItem('userGender', gender)
      localStorage.setItem('userPhone', phone)
      onNext()
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

        {/* Age + Phone side by side */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Age</label>
            <input style={inputStyle} type="number" placeholder="e.g. 24" min={18} max={60} value={age}
              onChange={e => setAge(e.target.value)}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Phone number</label>
            <input style={inputStyle} type="tel" placeholder="10-digit number" maxLength={10} value={phone}
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

      <button onClick={handleNext} disabled={!isValid || saving}
        style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 16, marginTop: 28, opacity: !isValid || saving ? 0.4 : 1 }}>
        {saving ? 'Saving…' : 'Continue →'}
      </button>
    </div>
  )
}
import SurveyCard from '../components/SurveyCard'
import LifestyleSwiperCard from '../components/LifestyleSwiperCard'
import DealbreakersSection from '../components/DealbreakersSection'
import SurveyPreview from '../components/SurveyPreview'

const STEPS = ['name', 'mandatory', 'lifestyle', 'dealbreakers', 'preview']
const STEP_LABELS = ['Name', 'Basics', 'Lifestyle', 'Dealbreakers', 'Review']

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

        const questions = await surveyAPI.getQuestions()
        survey.setAllQuestions(questions)

        // Pre-fill from backend if survey already has data
        const profile = await surveyAPI.getUserProfile(userId).catch(() => null)
        if (profile?.survey) {
          const s = profile.survey
          if (s.budget_range || s.locations?.length) {
            survey.setMandatoryData({
              budget_range: s.budget_range || null,
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

        const hasBasicInfo = !!(localStorage.getItem('userName') && localStorage.getItem('userAge') && localStorage.getItem('userGender') && localStorage.getItem('userPhone'))
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
    try { await surveyAPI.saveMandatory(survey.surveyId, survey.mandatoryData); survey.setCurrentStep('lifestyle') }
    catch { setError('Failed to save. Please try again.') }
  }
  const handleLifestyleNext = async () => {
    try { await surveyAPI.saveLifestyle(survey.surveyId, survey.lifestyleTags); survey.setCurrentStep('dealbreakers') }
    catch { setError('Failed to save. Please try again.') }
  }
  const handleDealbreakerNext = async () => {
    try { await surveyAPI.saveDealbreakers(survey.surveyId, survey.dealbreakers); survey.setCurrentStep('preview') }
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
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>
          Coloc<span style={{ color: 'var(--primary)' }}>sy</span>
        </span>
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
        {survey.currentStep === 'lifestyle' && (
          <LifestyleSwiperCard lifestyleTagsData={survey.allQuestions?.lifestyle_tags || {}} onNext={handleLifestyleNext} onBack={() => survey.setCurrentStep('mandatory')} />
        )}
        {survey.currentStep === 'dealbreakers' && (
          <DealbreakersSection onNext={handleDealbreakerNext} onBack={() => survey.setCurrentStep('lifestyle')} />
        )}
        {survey.currentStep === 'preview' && (
          <SurveyPreview onSubmit={handleSubmit} onBack={() => survey.setCurrentStep('dealbreakers')} />
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
