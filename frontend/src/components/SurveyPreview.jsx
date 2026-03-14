import React from 'react'
import useSurvey from '../hooks/useSurvey'

export default function SurveyPreview({ onSubmit, onBack }) {
  const survey = useSurvey()

  const formatValue = (value) => {
    if (!value) return 'Not specified'
    if (Array.isArray(value)) return value.join(', ')
    return value.toString().replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const PreviewSection = ({ title, data }) => (
    <div className="preview-section">
      <h3>{title}</h3>
      <div className="preview-items">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="preview-item">
            <span className="label">{key.replace(/_/g, ' ').toUpperCase()}</span>
            <span className="value">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="preview-container">
      <h2>Review Your Profile ✓</h2>
      <p className="subtitle">Everything looks good? Submit to find matches!</p>

      <div className="preview-content">
        <PreviewSection
          title="Must-Haves"
          data={{
            Budget: survey.mandatoryData.budget_range,
            Locations: survey.mandatoryData.locations,
            'Move-in': survey.mandatoryData.move_in_timeline,
            'Room Type': survey.mandatoryData.occupancy_type
          }}
        />

        {(survey.lifestyleTags.social_battery.length > 0 ||
          survey.lifestyleTags.habits.length > 0 ||
          survey.lifestyleTags.work_study.length > 0) && (
          <PreviewSection
            title="Your Vibe"
            data={{
              'Social Battery': survey.lifestyleTags.social_battery,
              Habits: survey.lifestyleTags.habits,
              'Work/Study': survey.lifestyleTags.work_study
            }}
          />
        )}

        {(survey.dealbreakers.pets ||
          survey.dealbreakers.smoking ||
          survey.dealbreakers.dietary ||
          survey.dealbreakers.gender) && (
          <PreviewSection
            title="Dealbreakers"
            data={{
              Pets: survey.dealbreakers.pets,
              Smoking: survey.dealbreakers.smoking,
              Dietary: survey.dealbreakers.dietary,
              Gender: survey.dealbreakers.gender
            }}
          />
        )}

        {Object.values(survey.deepDiveResponses).some(v => v.trim()) && (
          <div className="preview-section">
            <h3>About You</h3>
            <div className="deepdive-preview">
              {Object.entries(survey.deepDiveResponses).map(([prompt, response]) =>
                response.trim() ? (
                  <div key={prompt} className="deepdive-item">
                    <p className="prompt">{prompt}</p>
                    <p className="response">{response}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>

      <div className="completion-summary">
        <p>✅ Profile {survey.getCompletionPercentage()}% complete</p>
      </div>

      <div className="button-group">
        <button onClick={onBack} className="btn-secondary">
          ← Edit
        </button>
        <button onClick={onSubmit} className="btn-primary">
          Submit & Find Matches 🚀
        </button>
      </div>

      <style jsx>{`
        .preview-container {
          background: white;
          border-radius: 12px;
          padding: 40px 30px;
          max-width: 700px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        h2 {
          font-size: 24px;
          color: #333;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .subtitle {
          color: #666;
          font-size: 14px;
          margin-bottom: 30px;
        }

        .preview-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 30px;
        }

        .preview-section {
          border: 2px solid #f0f0f0;
          border-radius: 8px;
          padding: 20px;
          background: #fafafa;
        }

        .preview-section h3 {
          font-size: 16px;
          color: #333;
          font-weight: 600;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e0e0e0;
        }

        .preview-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .preview-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .label {
          font-weight: 600;
          color: #666;
          font-size: 13px;
        }

        .value {
          color: #ff6b6b;
          font-weight: 600;
          max-width: 50%;
          text-align: right;
        }

        .deepdive-preview {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .deepdive-item {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid #ff6b6b;
        }

        .prompt {
          font-weight: 600;
          color: #666;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .response {
          color: #333;
          font-size: 14px;
          line-height: 1.5;
        }

        .completion-summary {
          text-align: center;
          padding: 16px;
          background: #f0f9ff;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
          margin-bottom: 30px;
          font-size: 14px;
          color: #1565c0;
          font-weight: 600;
        }

        .button-group {
          display: flex;
          gap: 12px;
          justify-content: space-between;
        }

        button {
          flex: 1;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #ff6b6b;
          color: white;
        }

        .btn-primary:hover {
          background: #ff5252;
        }

        .btn-secondary {
          background: white;
          color: #333;
          border: 2px solid #e0e0e0;
        }

        .btn-secondary:hover {
          border-color: #333;
        }
      `}</style>
    </div>
  )
}
