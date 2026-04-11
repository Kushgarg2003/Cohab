import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { brokerAuthAPI, brokerListingsAPI } from '../api'

const STATUS_COLORS = {
  draft: '#555',
  pending_review: '#f59e0b',
  live: '#22c55e',
  paused: '#888',
  archived: '#444',
}

export default function BrokerDashboardPage() {
  const navigate = useNavigate()
  const [broker, setBroker] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('broker_token')
    if (!token) { navigate('/broker/login'); return }

    Promise.all([brokerAuthAPI.getMe(), brokerListingsAPI.list()])
      .then(([me, data]) => {
        setBroker(me)
        setListings(data.listings || [])
      })
      .catch(() => { navigate('/broker/login') })
      .finally(() => setLoading(false))
  }, [navigate])

  const handleSubmit = async (id) => {
    setActionLoading(id + '_submit')
    try {
      await brokerListingsAPI.submit(id)
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'pending_review' } : l))
    } catch (e) {
      alert(e.response?.data?.detail || 'Error')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePause = async (id) => {
    setActionLoading(id + '_pause')
    try {
      await brokerListingsAPI.pause(id)
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'paused' } : l))
    } catch (e) {
      alert(e.response?.data?.detail || 'Error')
    } finally {
      setActionLoading(null)
    }
  }

  const logout = () => {
    localStorage.removeItem('broker_token')
    navigate('/broker/login')
  }

  if (loading) return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888' }}>Loading…</p>
    </div>
  )

  const isPending = broker?.status === 'pending'
  const isSuspended = broker?.status === 'suspended'

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>Colocsy Owner Portal</span>
          <span style={{ marginLeft: 10, fontSize: 12, color: STATUS_COLORS[broker?.status] || '#888' }}>
            ● {broker?.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/broker/inquiries')} style={outlineBtn}>Inquiries</button>
          <button onClick={logout} style={{ ...outlineBtn, color: '#888' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        {isPending && (
          <div style={{ background: '#1a2a1a', border: '1px solid #f59e0b', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#f59e0b', fontSize: 14 }}>
              ⏳ Your account is pending approval. Once approved, you can create and publish listings.
            </p>
          </div>
        )}
        {isSuspended && (
          <div style={{ background: '#2a1a1a', border: '1px solid #f44', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#f44', fontSize: 14 }}>
              Your account has been suspended. Contact support for more information.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>My Listings</h1>
          {!isPending && !isSuspended && (
            <button onClick={() => navigate('/broker/listings/new')} style={ctaBtn}>+ New Listing</button>
          )}
        </div>

        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 32 }}>🏠</p>
            <p style={{ color: '#888' }}>No listings yet. Create your first one!</p>
            {!isPending && !isSuspended && (
              <button onClick={() => navigate('/broker/listings/new')} style={ctaBtn}>
                Create listing →
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listings.map(l => (
              <div key={l.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>{l.title}</span>
                    <p style={{ margin: '2px 0 0', color: '#888', fontSize: 13 }}>{l.locality}, {l.city} · ₹{l.monthly_rent?.toLocaleString('en-IN')}/mo</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: STATUS_COLORS[l.status] || '#888', background: '#111', borderRadius: 6, padding: '3px 8px' }}>
                      ● {l.status.replace('_', ' ')}
                    </span>
                    {l.inquiry_count > 0 && (
                      <span style={{ fontSize: 12, color: '#6c47ff', background: '#1a1a2a', borderRadius: 6, padding: '3px 8px' }}>
                        {l.inquiry_count} inquir{l.inquiry_count === 1 ? 'y' : 'ies'}
                      </span>
                    )}
                  </div>
                </div>
                {l.admin_note && (
                  <p style={{ margin: '6px 0', fontSize: 12, color: '#f59e0b', background: '#1a1a00', borderRadius: 6, padding: '6px 10px' }}>
                    Admin note: {l.admin_note}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => navigate(`/broker/listings/${l.id}/edit`)} style={smallBtn}>Edit</button>
                  {(l.status === 'draft' || l.status === 'paused') && (
                    <button
                      onClick={() => handleSubmit(l.id)}
                      disabled={actionLoading === l.id + '_submit'}
                      style={{ ...smallBtn, background: '#6c47ff', color: '#fff' }}
                    >
                      {actionLoading === l.id + '_submit' ? '…' : 'Submit for review'}
                    </button>
                  )}
                  {l.status === 'live' && (
                    <button
                      onClick={() => handlePause(l.id)}
                      disabled={actionLoading === l.id + '_pause'}
                      style={smallBtn}
                    >
                      {actionLoading === l.id + '_pause' ? '…' : 'Pause'}
                    </button>
                  )}
                </div>
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
  color: '#fff', border: 'none', borderRadius: 8,
  padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const outlineBtn = {
  background: 'none', border: '1px solid #2a2a2a', borderRadius: 8,
  color: '#e5e5e5', padding: '8px 14px', fontSize: 13, cursor: 'pointer',
}
const smallBtn = {
  background: '#2a2a2a', border: 'none', borderRadius: 6,
  color: '#aaa', padding: '6px 12px', fontSize: 12, cursor: 'pointer',
}
