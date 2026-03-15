import React, { useState } from 'react'

const COLORS = ['#E8481C', '#7C3AED', '#0D9488', '#D97706', '#2563EB', '#DC2626', '#059669', '#9333EA']
const colorFor = (id) => COLORS[(id?.charCodeAt(0) || 0) % COLORS.length]

export default function Avatar({ userId, name, picture, size = 40 }) {
  const [imgError, setImgError] = useState(false)
  const initials = name
    ? name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : userId ? userId.slice(0, 2).toUpperCase() : '?'

  if (picture && !imgError) {
    return (
      <img
        src={picture}
        alt={name || 'avatar'}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border-2)' }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colorFor(userId),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 800, color: 'white',
      flexShrink: 0, letterSpacing: -0.5
    }}>
      {initials}
    </div>
  )
}
