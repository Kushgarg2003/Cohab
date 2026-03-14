import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

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

export default api
