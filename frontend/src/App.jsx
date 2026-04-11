import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import MatchesPage from './pages/MatchesPage'
import { CreateGroupPage, JoinGroupPage, GroupDashboardPage, WishlistPage } from './pages/GroupPage'
import ChatPage from './pages/ChatPage'
import KitPage from './pages/KitPage'
import AdminPage from './pages/AdminPage'
import CommunicationPage from './pages/CommunicationPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import MyGroupsPage from './pages/MyGroupsPage'
import ListingsPage from './pages/ListingsPage'
import ListingDetailPage from './pages/ListingDetailPage'
import MyInquiriesPage from './pages/MyInquiriesPage'
import InquiryChatPage from './pages/InquiryChatPage'
import BrokerLoginPage from './broker/BrokerLoginPage'
import BrokerRegisterPage from './broker/BrokerRegisterPage'
import BrokerDashboardPage from './broker/BrokerDashboardPage'
import BrokerListingFormPage from './broker/BrokerListingFormPage'
import BrokerInquiriesPage from './broker/BrokerInquiriesPage'
import BrokerChatPage from './broker/BrokerChatPage'

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
          <Route path="/group/:groupId/kit" element={<KitPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/communication" element={<AdminPage initialTab="communication" />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/groups" element={<MyGroupsPage />} />
          {/* Stays / Listings */}
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/my-inquiries" element={<MyInquiriesPage />} />
          <Route path="/inquiries/:id" element={<InquiryChatPage />} />
          {/* Broker portal */}
          <Route path="/broker/login" element={<BrokerLoginPage />} />
          <Route path="/broker/register" element={<BrokerRegisterPage />} />
          <Route path="/broker/dashboard" element={<BrokerDashboardPage />} />
          <Route path="/broker/listings/new" element={<BrokerListingFormPage />} />
          <Route path="/broker/listings/:id/edit" element={<BrokerListingFormPage />} />
          <Route path="/broker/inquiries" element={<BrokerInquiriesPage />} />
          <Route path="/broker/inquiries/:id" element={<BrokerChatPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

export default App
