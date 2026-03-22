import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/matches', label: 'Discover', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#E8481C' : '#4A4A60'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )},
  { path: '/profile', label: 'Profile', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#E8481C' : '#4A4A60'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )},
  { path: '/groups', label: 'Groups', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#E8481C' : '#4A4A60'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(18,18,24,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid #262632',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const active = location.pathname.startsWith(tab.path) ||
          (tab.path === '/groups' && location.pathname.startsWith('/group'))
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, padding: '10px 0 8px',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'opacity 0.15s'
            }}
          >
            {tab.icon(active)}
            <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#E8481C' : '#4A4A60', letterSpacing: 0.3 }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
