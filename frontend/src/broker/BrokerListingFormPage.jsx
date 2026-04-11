import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { brokerListingsAPI } from '../api'

const PROPERTY_TYPES = ['pg', 'flat', 'room_in_flat']
const FURNISHINGS = ['fully_furnished', 'semi_furnished', 'unfurnished']
const GENDER_PREFS = ['male', 'female', 'neutral']

const AMENITY_OPTIONS = [
  'WiFi', 'AC', 'Geyser', 'Washing Machine', 'Parking', 'Power Backup',
  'Security', 'CCTV', 'Gym', 'Swimming Pool', 'Lift', 'Cook/Tiffin',
]

export default function BrokerListingFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    title: '', description: '', property_type: 'pg', furnishing: '',
    city: '', locality: '', full_address: '',
    monthly_rent: '', deposit: '', maintenance: '',
    total_beds: '', available_beds: '', gender_preference: '',
    amenities: [], rules: '', photos: '',
    available_from: '',
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    brokerListingsAPI.get(id)
      .then(data => {
        const l = data.listing || data
        setForm({
          title: l.title || '',
          description: l.description || '',
          property_type: l.property_type || 'pg',
          furnishing: l.furnishing || '',
          city: l.city || '',
          locality: l.locality || '',
          full_address: l.full_address || '',
          monthly_rent: l.monthly_rent || '',
          deposit: l.deposit || '',
          maintenance: l.maintenance || '',
          total_beds: l.total_beds || '',
          available_beds: l.available_beds || '',
          gender_preference: l.gender_preference || '',
          amenities: l.amenities || [],
          rules: (l.rules || []).join('\n'),
          photos: (l.photos || []).join('\n'),
          available_from: l.available_from || '',
        })
      })
      .catch(() => navigate('/broker/dashboard'))
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggleAmenity = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
  }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        monthly_rent: form.monthly_rent ? parseInt(form.monthly_rent) : undefined,
        deposit: form.deposit ? parseInt(form.deposit) : undefined,
        maintenance: form.maintenance ? parseInt(form.maintenance) : undefined,
        total_beds: form.total_beds ? parseInt(form.total_beds) : undefined,
        available_beds: form.available_beds ? parseInt(form.available_beds) : undefined,
        rules: form.rules ? form.rules.split('\n').map(r => r.trim()).filter(Boolean) : [],
        photos: form.photos ? form.photos.split('\n').map(p => p.trim()).filter(Boolean) : [],
        furnishing: form.furnishing || undefined,
        gender_preference: form.gender_preference || undefined,
        available_from: form.available_from || undefined,
      }

      if (isEdit) {
        await brokerListingsAPI.update(id, payload)
      } else {
        await brokerListingsAPI.create(payload)
      }
      navigate('/broker/dashboard')
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5', paddingBottom: 40 }}>
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/broker/dashboard')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>
          {isEdit ? 'Edit Listing' : 'New Listing'}
        </h2>
      </div>

      <form onSubmit={save} style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        <Section title="Basic Info">
          <Field label="Title *">
            <input required value={form.title} onChange={set('title')} style={inputStyle} placeholder="Spacious PG in Banjara Hills" />
          </Field>
          <Row>
            <Field label="Property Type *">
              <select value={form.property_type} onChange={set('property_type')} style={inputStyle}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="Furnishing">
              <select value={form.furnishing} onChange={set('furnishing')} style={inputStyle}>
                <option value="">— Select —</option>
                {FURNISHINGS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
          </Row>
          <Field label="Description">
            <textarea
              value={form.description} onChange={set('description')} rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Describe the property, nearby landmarks, rules…"
            />
          </Field>
        </Section>

        <Section title="Location">
          <Row>
            <Field label="City *">
              <input required value={form.city} onChange={set('city')} style={inputStyle} placeholder="Hyderabad" />
            </Field>
            <Field label="Locality *">
              <input required value={form.locality} onChange={set('locality')} style={inputStyle} placeholder="Banjara Hills" />
            </Field>
          </Row>
          <Field label="Full Address (only shown to confirmed tenants)">
            <input value={form.full_address} onChange={set('full_address')} style={inputStyle} placeholder="Street, Building, Landmark" />
          </Field>
        </Section>

        <Section title="Pricing & Rooms">
          <Row>
            <Field label="Monthly Rent (₹) *">
              <input required type="number" value={form.monthly_rent} onChange={set('monthly_rent')} style={inputStyle} placeholder="15000" />
            </Field>
            <Field label="Deposit (₹)">
              <input type="number" value={form.deposit} onChange={set('deposit')} style={inputStyle} placeholder="30000" />
            </Field>
          </Row>
          <Row>
            <Field label="Maintenance (₹/mo)">
              <input type="number" value={form.maintenance} onChange={set('maintenance')} style={inputStyle} placeholder="500" />
            </Field>
            <Field label="Total Beds">
              <input type="number" value={form.total_beds} onChange={set('total_beds')} style={inputStyle} placeholder="4" />
            </Field>
            <Field label="Available Beds">
              <input type="number" value={form.available_beds} onChange={set('available_beds')} style={inputStyle} placeholder="2" />
            </Field>
          </Row>
          <Row>
            <Field label="Gender Preference">
              <select value={form.gender_preference} onChange={set('gender_preference')} style={inputStyle}>
                <option value="">Any</option>
                {GENDER_PREFS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Available From">
              <input type="date" value={form.available_from} onChange={set('available_from')} style={inputStyle} />
            </Field>
          </Row>
        </Section>

        <Section title="Amenities">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AMENITY_OPTIONS.map(a => (
              <button
                key={a} type="button" onClick={() => toggleAmenity(a)}
                style={{
                  background: form.amenities.includes(a) ? '#6c47ff' : '#2a2a2a',
                  color: form.amenities.includes(a) ? '#fff' : '#aaa',
                  border: 'none', borderRadius: 6, padding: '6px 12px',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </Section>

        <Section title="House Rules">
          <Field label="One rule per line">
            <textarea
              value={form.rules} onChange={set('rules')} rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder={`No smoking\nNo pets\nNo overnight guests`}
            />
          </Field>
        </Section>

        <Section title="Photos">
          <Field label="One image URL per line (upload to Imgur, Google Drive, etc.)">
            <textarea
              value={form.photos} onChange={set('photos')} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="https://i.imgur.com/abc123.jpg"
            />
          </Field>
        </Section>

        {error && <p style={{ color: '#f44', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" disabled={saving} style={{ ...ctaBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Listing (as Draft)'}
          </button>
          <button type="button" onClick={() => navigate('/broker/dashboard')} style={outlineBtn}>
            Cancel
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
          After saving, go to the dashboard and click "Submit for review" to send the listing to admin.
        </p>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#fff', borderBottom: '1px solid #2a2a2a', paddingBottom: 8 }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <label style={{ display: 'block', color: '#aaa', fontSize: 12, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function Row({ children }) {
  return <div style={{ display: 'flex', gap: 12 }}>{children}</div>
}

const inputStyle = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  borderRadius: 8, padding: '10px 12px', color: '#e5e5e5', fontSize: 14,
  boxSizing: 'border-box', outline: 'none',
}
const ctaBtn = {
  background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
  color: '#fff', border: 'none', borderRadius: 10,
  padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const outlineBtn = {
  background: 'none', border: '1px solid #2a2a2a', borderRadius: 10,
  color: '#888', padding: '12px 20px', fontSize: 14, cursor: 'pointer',
}
