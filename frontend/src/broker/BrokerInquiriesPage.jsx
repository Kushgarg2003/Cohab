import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { brokerInquiriesAPI } from '../api'

export default function BrokerInquiriesPage() {
  const navigate = useNavigate()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('broker_token')
    if (!token) { navigate('/broker/login'); return }

    brokerInquiriesAPI.list()
      .then(data => setInquiries(data.inquiries || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5' }}>
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/broker/dashboard')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>Inquiries</h2>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
        {loading ? (
          <p style={{ color: '#888', textAlign: 'center' }}>Loading…</p>
        ) : inquiries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 32 }}>💬</p>
            <p style={{ color: '#888' }}>No inquiries yet. Inquiries will appear here when users contact you about your listings.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inquiries.map(inq => (
              <div
                key={inq.id}
                onClick={() => navigate(`/broker/inquiries/${inq.id}`)}
                style={{
                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                  borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#6c47ff'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>
                    {inq.listing_title}
                  </span>
                  <span style={{
                    fontSize: 11, background: inq.status === 'closed' ? '#2a2a2a' : '#1a2a3a',
                    color: inq.status === 'closed' ? '#666' : '#6c47ff',
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    {inq.status}
                  </span>
                </div>
                {inq.last_message && (
                  <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>
                    <span style={{ color: inq.last_message.sender_role === 'user' ? '#a855f7' : '#888' }}>
                      {inq.last_message.sender_role === 'user' ? 'User' : 'You'}:
                    </span>{' '}
                    {inq.last_message.content.length > 80
                      ? inq.last_message.content.slice(0, 80) + '…'
                      : inq.last_message.content}
                  </p>
                )}
                {!inq.last_message && (
                  <p style={{ margin: 0, fontSize: 13, color: '#666' }}>No messages yet</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
