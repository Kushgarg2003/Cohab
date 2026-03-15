import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSurvey from '../hooks/useSurvey'
import { surveyAPI } from '../api'

function NameScreen({ onNext }) {
  const [name, setName] = React.useState(localStorage.getItem('userName') || '')
  const [saving, setSaving] = React.useState(false)

  const handleNext = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    const userId = localStorage.getItem('userId')
    try {
      await surveyAPI.saveName(userId, trimmed)
      localStorage.setItem('userName', trimmed)
      onNext()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '40px 28px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-md)', animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: -0.5 }}>What's your name?</h2>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 28, fontWeight: 500 }}>This is how your matches will see you.</p>
      <input
        autoFocus
        style={{ width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: 18, fontWeight: 600, outline: 'none', boxSizing: 'border-box', marginBottom: 20, color: 'var(--text)', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
        placeholder="e.g. Priya"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleNext()}
        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <button onClick={handleNext} disabled={!name.trim() || saving}
        style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 16, opacity: !name.trim() || saving ? 0.5 : 1 }}>
        {saving ? 'Saving…' : 'Continue →'}
      </button>
    </div>
  )
}
import SurveyCard from '../components/SurveyCard'
import LifestyleSwiperCard from '../components/LifestyleSwiperCard'
import DealbreakersSection from '../components/DealbreakersSection'
import DeepDivePrompts from '../components/DeepDivePrompts'
import SurveyPreview from '../components/SurveyPreview'

const STEPS = ['name', 'mandatory', 'lifestyle', 'dealbreakers', 'deepdive', 'preview']
const STEP_LABELS = ['Name', 'Basics', 'Lifestyle', 'Dealbreakers', 'Deep dive', 'Review']

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

        const hasName = !!localStorage.getItem('userName')
        survey.setCurrentStep(hasName ? 'mandatory' : 'name')
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
    try { await surveyAPI.saveDealbreakers(survey.surveyId, survey.dealbreakers); survey.setCurrentStep('deepdive') }
    catch { setError('Failed to save. Please try again.') }
  }
  const handleDeepDiveNext = async () => {
    try { await surveyAPI.saveDeepDive(survey.surveyId, survey.deepDiveResponses); survey.setCurrentStep('preview') }
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--white)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>
          Co<span style={{ color: 'var(--primary)' }}>hab</span>
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
          <NameScreen onNext={() => survey.setCurrentStep('mandatory')} />
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
        {survey.currentStep === 'deepdive' && (
          <DeepDivePrompts prompts={survey.allQuestions?.deep_dive_prompts || []} onNext={handleDeepDiveNext} onBack={() => survey.setCurrentStep('dealbreakers')} />
        )}
        {survey.currentStep === 'preview' && (
          <SurveyPreview onSubmit={handleSubmit} onBack={() => survey.setCurrentStep('deepdive')} />
        )}
      </div>
    </div>
  )
}

const S = {
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 },
  spinner: { width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  btnPrimary: { background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
}
