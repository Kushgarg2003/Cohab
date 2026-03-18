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
  }
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
  }
}

export default api
