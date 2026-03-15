import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import MatchesPage from './pages/MatchesPage'
import { CreateGroupPage, JoinGroupPage, GroupDashboardPage, WishlistPage } from './pages/GroupPage'
import ChatPage from './pages/ChatPage'

const GOOGLE_CLIENT_ID = '863061899819-p74tbi4qpfi5f4bghlhd946dp96mpnph.apps.googleusercontent.com'

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/survey" element={<Dashboard />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/group/new" element={<CreateGroupPage />} />
          <Route path="/group/join" element={<JoinGroupPage />} />
          <Route path="/group/:groupId" element={<GroupDashboardPage />} />
          <Route path="/group/:groupId/wishlist" element={<WishlistPage />} />
          <Route path="/group/:groupId/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

export default App
