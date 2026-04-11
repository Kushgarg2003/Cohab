import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listingsAPI } from '../api'

export default function MyInquiriesPage() {
  const navigate = useNavigate()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listingsAPI.myInquiries()
      .then(data => setInquiries(data.inquiries || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5', paddingBottom: 80 }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#fff' }}>My Inquiries</h1>
        <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>Your conversations with property owners</p>

        {inquiries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 32 }}>💬</p>
            <p style={{ color: '#888' }}>No inquiries yet.</p>
            <button onClick={() => navigate('/listings')} style={ctaBtn}>
              Browse listings →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inquiries.map(inq => (
              <div
                key={inq.id}
                onClick={() => navigate(`/inquiries/${inq.id}`)}
                style={{
                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                  borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#6c47ff'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>
                    {inq.listing_title || 'Listing'}
                  </span>
                  <span style={{
                    fontSize: 11, background: inq.status === 'closed' ? '#2a2a2a' : '#1a2a3a',
                    color: inq.status === 'closed' ? '#666' : '#6c47ff',
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    {inq.status}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', color: '#888', fontSize: 13 }}>
                  {inq.listing_locality}, {inq.listing_city}
                </p>
                {inq.last_message && (
                  <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>
                    <span style={{ color: inq.last_message.sender_role === 'broker' ? '#a855f7' : '#888' }}>
                      {inq.last_message.sender_role === 'broker' ? 'Owner' : 'You'}:
                    </span>{' '}
                    {inq.last_message.content.length > 80
                      ? inq.last_message.content.slice(0, 80) + '…'
                      : inq.last_message.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const ctaBtn = {
  background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
  color: '#fff', border: 'none', borderRadius: 10,
  padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  marginTop: 12,
}
