import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Attach JWT token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authAPI = {
  googleLogin: async (idToken) => {
    const response = await api.post('/api/auth/google', { id_token: idToken })
    return response.data.data
  },
  getMe: async () => {
    const response = await api.get('/api/auth/me')
    return response.data.data
  }
}

export const surveyAPI = {
  // Get all survey questions
  getQuestions: async () => {
    const response = await api.get('/api/survey/questions')
    return response.data.data.questions
  },

  // Create a new user and start survey
  createUser: async () => {
    const response = await api.post('/api/users/', {})
    return response.data.data
  },

  // Save user's name
  saveName: async (userId, name) => {
    const response = await api.patch(`/api/users/${userId}/name`, { name })
    return response.data.data
  },

  // Save basic info (name, age, gender, phone)
  saveBasicInfo: async (userId, { name, date_of_birth, gender, phone }) => {
    const response = await api.patch(`/api/users/${userId}/basic-info`, { name, date_of_birth, gender, phone })
    return response.data.data
  },

  // Start a new survey
  startSurvey: async (userId) => {
    const response = await api.post(`/api/survey/start`, null, {
      params: { user_id: userId }
    })
    return response.data.data
  },

  // Save mandatory data
  saveMandatory: async (surveyId, data) => {
    const response = await api.post(`/api/survey/${surveyId}/mandatory`, data)
    return response.data.data
  },

  // Save lifestyle tags
  saveLifestyle: async (surveyId, tags) => {
    const response = await api.post(`/api/survey/${surveyId}/lifestyle`, tags)
    return response.data.data
  },

  // Save dealbreakers
  saveDealbreakers: async (surveyId, data) => {
    const response = await api.post(`/api/survey/${surveyId}/dealbreakers`, data)
    return response.data.data
  },

  // Save deep dive responses
  saveDeepDive: async (surveyId, responses) => {
    const response = await api.post(`/api/survey/${surveyId}/deep-dive`, {
      responses
    })
    return response.data.data
  },

  // Get survey preview
  getPreview: async (surveyId) => {
    const response = await api.get(`/api/survey/${surveyId}/preview`)
    return response.data.data
  },

  // Get survey status
  getStatus: async (surveyId) => {
    const response = await api.get(`/api/survey/${surveyId}/status`)
    return response.data.data
  },

  // Submit survey
  submitSurvey: async (surveyId) => {
    const response = await api.post(`/api/survey/${surveyId}/submit`)
    return response.data.data
  },

  // Get user profile
  getUserProfile: async (userId) => {
    const response = await api.get(`/api/users/${userId}/profile`)
    return response.data.data
  }
}

export const groupsAPI = {
  createGroup: async (userId, name) => {
    const response = await api.post('/api/groups', null, { params: { user_id: userId, name } })
    return response.data.data
  },
  joinGroup: async (userId, inviteCode) => {
    const response = await api.post('/api/groups/join', null, { params: { user_id: userId, invite_code: inviteCode } })
    return response.data.data
  },
  getMyGroups: async (userId) => {
    const response = await api.get('/api/groups/my', { params: { user_id: userId } })
    return response.data.data
  },
  inviteToGroup: async (groupId, inviterId, inviteeId) => {
    const response = await api.post(`/api/groups/${groupId}/invite`, null, {
      params: { inviter_id: inviterId, invitee_id: inviteeId }
    })
    return response.data.data
  },
  respondToInvitation: async (invId, userId, action) => {
    const response = await api.post(`/api/groups/invitations/${invId}/respond`, null, {
      params: { user_id: userId, action }
    })
    return response.data.data
  },
  getNotifications: async (userId) => {
    const response = await api.get(`/api/groups/notifications/${userId}`)
    return response.data.data
  },
  getGroup: async (groupId) => {
    const response = await api.get(`/api/groups/${groupId}`)
    return response.data.data
  },
  addWishlistItem: async (groupId, userId, item) => {
    const response = await api.post(`/api/groups/${groupId}/wishlist`, null, {
      params: { user_id: userId, ...item }
    })
    return response.data.data
  },
  getWishlist: async (groupId) => {
    const response = await api.get(`/api/groups/${groupId}/wishlist`)
    return response.data.data
  },
  castVote: async (groupId, itemId, userId, vote) => {
    const response = await api.post(`/api/groups/${groupId}/wishlist/${itemId}/vote`, null, {
      params: { user_id: userId, vote }
    })
    return response.data.data
  },
  deleteWishlistItem: async (groupId, itemId, userId) => {
    const response = await api.delete(`/api/groups/${groupId}/wishlist/${itemId}`, {
      params: { user_id: userId }
    })
    return response.data.data
  }
}

export const matchingAPI = {
  getMatches: async (userId, { limit = 10, minScore = 0 } = {}) => {
    const response = await api.get(`/api/matches/${userId}`, {
      params: { limit, min_score: minScore }
    })
    return response.data.data
  },

  getPairwiseScore: async (userId, otherUserId) => {
    const response = await api.get(`/api/matches/${userId}/${otherUserId}`)
    return response.data.data
  }
}

export const swipesAPI = {
  getQueue: async (userId) => {
    const response = await api.get(`/api/swipes/${userId}/queue`)
    return response.data.data
  },
  swipe: async (userId, targetId, action) => {
    const response = await api.post(`/api/swipes/${userId}`, { target_id: targetId, action })
    return response.data.data
  },
  getMatches: async (userId) => {
    const response = await api.get(`/api/swipes/${userId}/matches`)
    return response.data.data
  },
  unmatch: async (userId, matchId) => {
    const response = await api.delete(`/api/swipes/${userId}/matches/${matchId}`)
    return response.data.data
  },
  getLikedMe: async (userId) => {
    const response = await api.get(`/api/swipes/${userId}/liked-me`)
    return response.data.data
  },
}

export const kitAPI = {
  getBundles: async () => {
    const response = await api.get('/api/kit/bundles')
    return response.data.data
  },
  getKit: async (groupId, userId) => {
    const response = await api.get(`/api/kit/${groupId}`, { params: { user_id: userId } })
    return response.data.data
  },
  addItem: async (groupId, userId, item) => {
    const response = await api.post(`/api/kit/${groupId}`, { user_id: userId, ...item })
    return response.data.data
  },
  updateItem: async (groupId, itemId, userId, updates) => {
    const response = await api.patch(`/api/kit/${groupId}/${itemId}`, { user_id: userId, ...updates })
    return response.data.data
  },
  deleteItem: async (groupId, itemId, userId) => {
    const response = await api.delete(`/api/kit/${groupId}/${itemId}`, { params: { user_id: userId } })
    return response.data.data
  },
  getDebts: async (groupId, userId) => {
    const response = await api.get(`/api/kit/${groupId}/debts/summary`, { params: { user_id: userId } })
    return response.data.data
  },
  settleDebt: async (groupId, debtId, userId) => {
    const response = await api.post(`/api/kit/${groupId}/debts/${debtId}/settle`, { user_id: userId })
    return response.data.data
  }
}

export const chatAPI = {
  getMessages: async (groupId, userId, beforeId = null) => {
    const params = { user_id: userId, limit: 50 }
    if (beforeId) params.before_id = beforeId
    const response = await api.get(`/api/chat/${groupId}/messages`, { params })
    return response.data.data
  },
  sendMessage: async (groupId, userId, content) => {
    const response = await api.post(`/api/chat/${groupId}/messages`, { user_id: userId, content })
    return response.data.data
  }
}

// Broker portal — uses broker_token stored separately from user token
const brokerApi = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })
brokerApi.interceptors.request.use(config => {
  const token = localStorage.getItem('broker_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const brokerAuthAPI = {
  register: async (payload) => {
    const res = await brokerApi.post('/api/broker/auth/register', payload)
    return res.data.data
  },
  login: async (email, password) => {
    const res = await brokerApi.post('/api/broker/auth/login', { email, password })
    return res.data.data
  },
  getMe: async () => {
    const res = await brokerApi.get('/api/broker/auth/me')
    return res.data.data
  },
}

export const brokerListingsAPI = {
  list: async () => {
    const res = await brokerApi.get('/api/broker/listings')
    return res.data.data
  },
  get: async (id) => {
    const res = await brokerApi.get(`/api/broker/listings/${id}`)
    return res.data.data
  },
  create: async (payload) => {
    const res = await brokerApi.post('/api/broker/listings', payload)
    return res.data.data
  },
  update: async (id, payload) => {
    const res = await brokerApi.patch(`/api/broker/listings/${id}`, payload)
    return res.data.data
  },
  submit: async (id) => {
    const res = await brokerApi.post(`/api/broker/listings/${id}/submit`)
    return res.data.data
  },
  pause: async (id) => {
    const res = await brokerApi.post(`/api/broker/listings/${id}/pause`)
    return res.data.data
  },
  delete: async (id) => {
    const res = await brokerApi.delete(`/api/broker/listings/${id}`)
    return res.data.data
  },
}

export const brokerInquiriesAPI = {
  list: async () => {
    const res = await brokerApi.get('/api/broker/inquiries')
    return res.data.data
  },
  getMessages: async (inquiryId) => {
    const res = await brokerApi.get(`/api/broker/inquiries/${inquiryId}/messages`)
    return res.data.data
  },
  sendMessage: async (inquiryId, content) => {
    const res = await brokerApi.post(`/api/broker/inquiries/${inquiryId}/messages`, { content })
    return res.data.data
  },
  close: async (inquiryId) => {
    const res = await brokerApi.patch(`/api/broker/inquiries/${inquiryId}`)
    return res.data.data
  },
}

export const listingsAPI = {
  browse: async (filters = {}) => {
    const res = await api.get('/api/listings', { params: filters })
    return res.data.data
  },
  get: async (id) => {
    const res = await api.get(`/api/listings/${id}`)
    return res.data.data
  },
  inquire: async (listingId, message) => {
    const res = await api.post(`/api/listings/${listingId}/inquire`, { message })
    return res.data.data
  },
  myInquiries: async () => {
    const res = await api.get('/api/listings/my-inquiries')
    return res.data.data
  },
}

export const inquiriesAPI = {
  getMessages: async (inquiryId) => {
    const res = await api.get(`/api/inquiries/${inquiryId}/messages`)
    return res.data.data
  },
  sendMessage: async (inquiryId, content) => {
    const res = await api.post(`/api/inquiries/${inquiryId}/messages`, { content })
    return res.data.data
  },
}

export const adminAPI = {
  getUsers: async (secret) => {
    const response = await api.get('/api/admin/users', { headers: { 'x-admin-secret': secret } })
    return response.data.data
  },
  deleteUser: async (userId, secret) => {
    const response = await api.delete(`/api/admin/users/${userId}`, { headers: { 'x-admin-secret': secret } })
    return response.data
  },
  flushMatchScores: async (secret) => {
    const response = await api.delete('/api/admin/match-scores', { headers: { 'x-admin-secret': secret } })
    return response.data
  },
  toggleVerify: async (userId, secret) => {
    const response = await api.patch(`/api/admin/users/${userId}/verify`, {}, { headers: { 'x-admin-secret': secret } })
    return response.data.data
  },
  editUser: async (userId, secret, payload) => {
    const response = await api.patch(`/api/admin/users/${userId}`, payload, { headers: { 'x-admin-secret': secret } })
    return response.data
  },
  emailCampaignPreview: async (secret) => {
    const response = await api.get('/api/admin/email/campaign-preview', { headers: { 'x-admin-secret': secret } })
    return response.data.data
  },
  runEmailCampaign: async (secret, type, extra = {}) => {
    const response = await api.post('/api/admin/email/campaign', { type, ...extra }, { headers: { 'x-admin-secret': secret } })
    return response.data
  },
  getStats: async (secret) => {
    const response = await api.get('/api/admin/stats', { headers: { 'x-admin-secret': secret } })
    return response.data.data
  },
  getBrokers: async (secret, status = null) => {
    const params = status ? { status } : {}
    const response = await api.get('/api/admin/brokers', { headers: { 'x-admin-secret': secret }, params })
    return response.data.data
  },
  approveBroker: async (brokerId, secret) => {
    const response = await api.patch(`/api/admin/brokers/${brokerId}/approve`, {}, { headers: { 'x-admin-secret': secret } })
    return response.data
  },
  suspendBroker: async (brokerId, note, secret) => {
    const response = await api.patch(`/api/admin/brokers/${brokerId}/suspend`, { note }, { headers: { 'x-admin-secret': secret } })
    return response.data
  },
  getPendingListings: async (secret) => {
    const response = await api.get('/api/admin/listings/pending', { headers: { 'x-admin-secret': secret } })
    return response.data.data
  },
  approveListing: async (listingId, secret) => {
    const response = await api.patch(`/api/admin/listings/${listingId}/approve`, {}, { headers: { 'x-admin-secret': secret } })
    return response.data
  },
  rejectListing: async (listingId, note, secret) => {
    const response = await api.patch(`/api/admin/listings/${listingId}/reject`, { note }, { headers: { 'x-admin-secret': secret } })
    return response.data
  },
}

export default api
