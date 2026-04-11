import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listingsAPI } from '../api'

export default function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [showInquire, setShowInquire] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listingsAPI.get(id)
      .then(setListing)
      .catch(() => navigate('/listings'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const sendInquiry = async () => {
    if (!message.trim()) return
    setSending(true)
    setError('')
    try {
      const data = await listingsAPI.inquire(id, message)
      setSent(true)
      setTimeout(() => navigate(`/inquiries/${data.inquiry_id}`), 1200)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888' }}>Loading…</p>
    </div>
  )

  if (!listing) return null

  const photos = listing.photos || []

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5', paddingBottom: 100 }}>
      {/* Back */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '16px 16px 0' }}>
        <button
          onClick={() => navigate('/listings')}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 16 }}
        >
          ← Back to listings
        </button>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto', padding: '0 16px' }}>
          <img
            src={photos[photoIdx]}
            alt=""
            style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 14 }}
            onError={e => { e.target.style.display = 'none' }}
          />
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto' }}>
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  alt=""
                  onClick={() => setPhotoIdx(i)}
                  style={{
                    width: 64, height: 48, objectFit: 'cover', borderRadius: 6,
                    cursor: 'pointer', border: i === photoIdx ? '2px solid #6c47ff' : '2px solid transparent',
                    flexShrink: 0,
                  }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
        {/* Title + rent */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', flex: 1, marginRight: 16 }}>
            {listing.title}
          </h1>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7' }}>
              ₹{listing.monthly_rent?.toLocaleString('en-IN')}
              <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>/mo</span>
            </div>
            {listing.deposit && (
              <div style={{ fontSize: 12, color: '#888' }}>
                Deposit: ₹{listing.deposit?.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </div>

        <p style={{ margin: '0 0 16px', color: '#888', fontSize: 14 }}>
          📍 {listing.locality}, {listing.city}
        </p>

        {/* Chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {listing.property_type && <Chip>{listing.property_type.replace('_', ' ').toUpperCase()}</Chip>}
          {listing.furnishing && <Chip>{listing.furnishing.replace(/_/g, ' ')}</Chip>}
          {listing.gender_preference && listing.gender_preference !== 'neutral' && (
            <Chip>{listing.gender_preference === 'male' ? '♂ Males only' : '♀ Females only'}</Chip>
          )}
          {listing.total_beds && <Chip>{listing.total_beds} total beds</Chip>}
          {listing.available_beds != null && <Chip style={{ background: '#1a3a1a', color: '#4caf50' }}>{listing.available_beds} available</Chip>}
          {listing.maintenance && <Chip>Maintenance: ₹{listing.maintenance}/mo</Chip>}
          {listing.available_from && <Chip>Available from {listing.available_from}</Chip>}
        </div>

        {/* Description */}
        {listing.description && (
          <Section title="About this place">
            <p style={{ margin: 0, color: '#bbb', fontSize: 14, lineHeight: 1.6 }}>{listing.description}</p>
          </Section>
        )}

        {/* Amenities */}
        {listing.amenities?.length > 0 && (
          <Section title="Amenities">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {listing.amenities.map((a, i) => <Chip key={i}>✓ {a}</Chip>)}
            </div>
          </Section>
        )}

        {/* Rules */}
        {listing.rules?.length > 0 && (
          <Section title="House Rules">
            <ul style={{ margin: 0, paddingLeft: 18, color: '#bbb', fontSize: 14, lineHeight: 1.8 }}>
              {listing.rules.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        )}

        {/* Contact note */}
        <div style={{
          background: '#1a1a2a', border: '1px solid #3a3a5a',
          borderRadius: 12, padding: 14, marginTop: 20, marginBottom: 20,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#9090cc' }}>
            🔒 Contact details are shared through the platform. Use "Enquire Now" to connect with the owner.
          </p>
        </div>

        {/* Enquire button */}
        {!showInquire ? (
          <button onClick={() => setShowInquire(true)} style={ctaBtn}>
            Enquire Now →
          </button>
        ) : sent ? (
          <div style={{ background: '#1a2a1a', border: '1px solid #4caf50', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#4caf50', fontWeight: 600 }}>Message sent! Opening chat…</p>
          </div>
        ) : (
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 16 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: '#fff' }}>Send a message to the owner</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hi, I'm interested in this listing. Could you share more details?"
              rows={4}
              style={{
                width: '100%', background: '#111', border: '1px solid #2a2a2a',
                borderRadius: 8, padding: 12, color: '#e5e5e5', fontSize: 14,
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
            {error && <p style={{ color: '#f44', fontSize: 13, margin: '6px 0 0' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={sendInquiry} disabled={sending || !message.trim()} style={{ ...ctaBtn, opacity: sending || !message.trim() ? 0.6 : 1 }}>
                {sending ? 'Sending…' : 'Send Message'}
              </button>
              <button onClick={() => setShowInquire(false)} style={{ background: '#2a2a2a', color: '#aaa', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: '#fff' }}>{title}</h3>
      {children}
    </div>
  )
}

function Chip({ children, style = {} }) {
  return (
    <span style={{
      background: '#2a2a2a', color: '#aaa',
      borderRadius: 6, padding: '4px 10px', fontSize: 13,
      ...style,
    }}>
      {children}
    </span>
  )
}

const ctaBtn = {
  background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
  color: '#fff', border: 'none', borderRadius: 10,
  padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  width: '100%',
}
