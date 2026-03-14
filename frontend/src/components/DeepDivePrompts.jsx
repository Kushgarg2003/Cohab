import React from 'react'
import useSurvey from '../hooks/useSurvey'

export default function DeepDivePrompts({ prompts, onNext, onBack }) {
  const { deepDiveResponses, setDeepDiveResponse } = useSurvey()

  const characterLimits = {
    'My ideal Sunday in the apartment looks like...': 150,
    'The one house rule I won\'t compromise on is...': 100,
    'In a roommate, I value [X] more than anything else.': 100,
    'My \'toxic\' roommate trait is...': 120
  }

  const handleChange = (prompt, value) => {
    const limit = characterLimits[prompt]
    if (value.length <= limit) {
      setDeepDiveResponse(prompt, value)
    }
  }

  const filledCount = Object.values(deepDiveResponses).filter(r => r.trim()).length

  return (
    <div className="deepdive-container">
      <h2>Tell Us More About You 💭</h2>
      <p className="subtitle">These are optional, but help with better matches!</p>

      <div className="prompts-list">
        {prompts && prompts.map((prompt, idx) => {
          const value = deepDiveResponses[prompt] || ''
          const limit = characterLimits[prompt]

          return (
            <div key={idx} className="prompt-field">
              <label>{prompt}</label>
              <textarea
                value={value}
                onChange={(e) => handleChange(prompt, e.target.value)}
                placeholder={`Share your thoughts... (${limit} characters max)`}
                maxLength={limit}
                rows="3"
              />
              <div className="char-count">
                {value.length} / {limit}
              </div>
            </div>
          )
        })}
      </div>

      <div className="info-box">
        <p>✓ You've filled {filledCount} out of {prompts?.length || 0} prompts</p>
      </div>

      <div className="button-group">
        <button onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button onClick={onNext} className="btn-primary">
          Review Profile →
        </button>
      </div>

      <style jsx>{`
        .deepdive-container {
          background: white;
          border-radius: 12px;
          padding: 40px 30px;
          max-width: 600px;
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

        .prompts-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 20px;
        }

        .prompt-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        textarea {
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          transition: border-color 0.2s ease;
        }

        textarea:focus {
          outline: none;
          border-color: #ff6b6b;
        }

        .char-count {
          font-size: 12px;
          color: #999;
          text-align: right;
        }

        .info-box {
          background: #f5f5f5;
          border-left: 4px solid #ff6b6b;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #666;
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
