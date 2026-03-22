import { create } from 'zustand'

const useSurvey = create((set, get) => ({
  // State
  userId: null,
  surveyId: null,
  currentStep: 'start', // start, mandatory, lifestyle, dealbreakers, deepdive, preview, submitted

  // Survey Data
  mandatoryData: {
    budget_ranges: [],
    locations: [],
    move_in_timelines: [],
    occupancy_types: [],
  },

  lifestyleTags: {
    social_battery: [],
    habits: [],
    work_study: []
  },

  dealbreakers: {
    pets: null,
    smoking: null,
    dietary: null,
    gender: null
  },

  deepDiveResponses: {
    'My ideal Sunday in the apartment looks like...': '',
    'The one house rule I won\'t compromise on is...': '',
    'In a roommate, I value [X] more than anything else.': '',
    'My \'toxic\' roommate trait is...': ''
  },

  allQuestions: null,
  surveyStatus: null,

  // Actions
  setUserId: (userId) => set({ userId }),
  setSurveyId: (surveyId) => set({ surveyId }),
  setCurrentStep: (step) => set({ currentStep: step }),

  setMandatoryData: (data) => set((state) => ({
    mandatoryData: { ...state.mandatoryData, ...data }
  })),

  setLifestyleTags: (tags) => set({
    lifestyleTags: tags
  }),

  toggleLifestyleTag: (category, tagKey) => set((state) => {
    const tags = state.lifestyleTags[category] || []
    const isIncluded = tags.includes(tagKey)
    return {
      lifestyleTags: {
        ...state.lifestyleTags,
        [category]: isIncluded
          ? tags.filter(t => t !== tagKey)
          : [...tags, tagKey]
      }
    }
  }),

  setDealbreakers: (data) => set((state) => ({
    dealbreakers: { ...state.dealbreakers, ...data }
  })),

  setDeepDiveResponse: (prompt, response) => set((state) => ({
    deepDiveResponses: {
      ...state.deepDiveResponses,
      [prompt]: response
    }
  })),

  setAllQuestions: (questions) => set({ allQuestions: questions }),
  setSurveyStatus: (status) => set({ surveyStatus: status }),

  // Reset survey
  resetSurvey: () => set({
    currentStep: 'start',
    mandatoryData: {
      budget_ranges: [],
      locations: [],
      move_in_timelines: [],
      occupancy_types: [],
    },
    lifestyleTags: {
      social_battery: [],
      habits: [],
      work_study: []
    },
    dealbreakers: {
      pets: null,
      smoking: null,
      dietary: null,
      gender: null
    },
    deepDiveResponses: {
      'My ideal Sunday in the apartment looks like...': '',
      'The one house rule I won\'t compromise on is...': '',
      'In a roommate, I value [X] more than anything else.': '',
      'My \'toxic\' roommate trait is...': ''
    }
  }),

  // Load from localStorage (drafts)
  loadFromLocalStorage: (userId) => {
    const saved = localStorage.getItem(`survey_${userId}`)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        set(data)
      } catch (e) {
        console.error('Error loading survey from localStorage:', e)
      }
    }
  },

  // Save to localStorage (drafts)
  saveToLocalStorage: (userId) => {
    const state = get()
    const data = {
      mandatoryData: state.mandatoryData,
      lifestyleTags: state.lifestyleTags,
      dealbreakers: state.dealbreakers,
      deepDiveResponses: state.deepDiveResponses,
      currentStep: state.currentStep
    }
    localStorage.setItem(`survey_${userId}`, JSON.stringify(data))
  },

  // Calculate completion percentage
  getCompletionPercentage: () => {
    const state = get()
    let completed = 0
    const total = 5

    // Check mandatory
    if ((state.mandatoryData.budget_ranges?.length > 0) &&
        state.mandatoryData.locations.length > 0 &&
        state.mandatoryData.move_in_timelines?.length > 0 &&
        state.mandatoryData.occupancy_types?.length > 0) {
      completed += 1
    }

    // Check lifestyle
    const lifestyleCount =
      (state.lifestyleTags.social_battery?.length || 0) +
      (state.lifestyleTags.habits?.length || 0) +
      (state.lifestyleTags.work_study?.length || 0)
    if (lifestyleCount > 0) {
      completed += 1
    }

    // Check dealbreakers
    if (state.dealbreakers.pets || state.dealbreakers.smoking ||
        state.dealbreakers.dietary || state.dealbreakers.gender) {
      completed += 1
    }

    // Check deep dive
    const deepDiveCount = Object.values(state.deepDiveResponses).filter(v => v.trim()).length
    if (deepDiveCount > 0) {
      completed += 1
    }

    return Math.round((completed / total) * 100)
  }
}))

export default useSurvey
