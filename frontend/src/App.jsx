import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import MatchesPage from './pages/MatchesPage'
import { CreateGroupPage, JoinGroupPage, GroupDashboardPage, WishlistPage } from './pages/GroupPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/survey" element={<Dashboard />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/group/new" element={<CreateGroupPage />} />
        <Route path="/group/join" element={<JoinGroupPage />} />
        <Route path="/group/:groupId" element={<GroupDashboardPage />} />
        <Route path="/group/:groupId/wishlist" element={<WishlistPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
