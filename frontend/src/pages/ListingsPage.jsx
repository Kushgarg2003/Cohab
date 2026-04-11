import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listingsAPI } from '../api'

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'pg', label: 'PG' },
  { value: 'flat', label: 'Flat' },
  { value: 'room_in_flat', label: 'Room in Flat' },
]

const GENDER_PREFS = [
  { value: '', label: 'Any' },
  { value: 'male', label: 'Males Only' },
  { value: 'female', label: 'Females Only' },
  { value: 'neutral', label: 'Mixed' },
]

function ListingCard({ listing, onClick }) {
  return (
    <div
      onClick={() => onClick(listing.id)}
      style={{
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 14,
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#6c47ff'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
    >
      {listing.photos?.length > 0 && (
        <img
          src={listing.photos[0]}
          alt={listing.title}
          style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }}
          onError={e => { e.target.style.display = 'none' }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff', flex: 1, marginRight: 12 }}>
          {listing.title}
        </h3>
        <span style={{
          background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
          color: '#fff', borderRadius: 8, padding: '4px 10px',
          fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          ₹{listing.monthly_rent?.toLocaleString('en-IN')}/mo
        </span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#888' }}>
        {listing.locality}, {listing.city}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {listing.property_type && (
          <Tag>{listing.property_type.replace('_', ' ').toUpperCase()}</Tag>
        )}
        {listing.furnishing && (
          <Tag>{listing.furnishing.replace('_', ' ')}</Tag>
        )}
        {listing.gender_preference && listing.gender_preference !== 'neutral' && (
          <Tag>{listing.gender_preference === 'male' ? '♂ Males' : '♀ Females'}</Tag>
        )}
        {listing.available_beds != null && (
          <Tag>{listing.available_beds} bed{listing.available_beds !== 1 ? 's' : ''} available</Tag>
        )}
      </div>
    </div>
  )
}

function Tag({ children }) {
  return (
    <span style={{
      background: '#2a2a2a', color: '#aaa',
      borderRadius: 6, padding: '3px 8px', fontSize: 12,
    }}>
      {children}
    </span>
  )
}

export default function ListingsPage() {
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    city: '', min_rent: '', max_rent: '', property_type: '', gender_preference: ''
  })
  const [applied, setApplied] = useState({})

  const load = useCallback(async (f = {}) => {
    setLoading(true)
    try {
      const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''))
      const data = await listingsAPI.browse(clean)
      setListings(data.listings || [])
      setTotal(data.total || 0)
    } catch {
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const applyFilters = () => {
    setApplied(filters)
    load(filters)
  }

  const clearFilters = () => {
    const empty = { city: '', min_rent: '', max_rent: '', property_type: '', gender_preference: '' }
    setFilters(empty)
    setApplied({})
    load({})
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5', paddingBottom: 80 }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#fff' }}>
          Find a Place to Stay
        </h1>
        <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>
          Verified PGs and flats — no broker fees for you.
        </p>

        {/* Filters */}
        <div style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a',
          borderRadius: 14, padding: 16, marginBottom: 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input
              placeholder="City (e.g. Hyderabad)"
              value={filters.city}
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              style={inputStyle}
            />
            <select
              value={filters.property_type}
              onChange={e => setFilters(f => ({ ...f, property_type: e.target.value }))}
              style={inputStyle}
            >
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="number"
              placeholder="Min rent (₹)"
              value={filters.min_rent}
              onChange={e => setFilters(f => ({ ...f, min_rent: e.target.value }))}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="Max rent (₹)"
              value={filters.max_rent}
              onChange={e => setFilters(f => ({ ...f, max_rent: e.target.value }))}
              style={inputStyle}
            />
            <select
              value={filters.gender_preference}
              onChange={e => setFilters(f => ({ ...f, gender_preference: e.target.value }))}
              style={inputStyle}
            >
              {GENDER_PREFS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={applyFilters} style={btnStyle}>Search</button>
            <button onClick={clearFilters} style={{ ...btnStyle, background: '#2a2a2a', color: '#aaa' }}>
              Clear
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <p style={{ color: '#888', textAlign: 'center' }}>Loading listings…</p>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 32 }}>🏠</p>
            <p style={{ color: '#888' }}>No listings found. Try different filters.</p>
          </div>
        ) : (
          <>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>{total} listing{total !== 1 ? 's' : ''} found</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {listings.map(l => (
                <ListingCard key={l.id} listing={l} onClick={id => navigate(`/listings/${id}`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
  padding: '10px 12px', color: '#e5e5e5', fontSize: 14, width: '100%',
  boxSizing: 'border-box', outline: 'none',
}

const btnStyle = {
  background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
  color: '#fff', border: 'none', borderRadius: 8,
  padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
