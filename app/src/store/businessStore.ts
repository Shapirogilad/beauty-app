import { create } from 'zustand'
import { BusinessSummary, ServiceCategory, CATEGORY_TO_HEBREW } from '../types/business'
import { fetchBusinesses } from '../services/businessService'

interface BusinessState {
  nearby: BusinessSummary[]
  topRated: BusinessSummary[]
  isLoadingNearby: boolean
  isLoadingTopRated: boolean
  selectedCategory: ServiceCategory | null
  setCategory: (cat: ServiceCategory | null) => void
  loadNearby: (lat: number, lng: number) => Promise<void>
  loadTopRated: () => Promise<void>
}

export const useBusinessStore = create<BusinessState>()((set, get) => ({
  nearby: [],
  topRated: [],
  isLoadingNearby: false,
  isLoadingTopRated: false,
  selectedCategory: null,

  setCategory: (cat) => set({ selectedCategory: cat }),

  loadNearby: async (lat, lng) => {
    set({ isLoadingNearby: true })
    try {
      const cat = get().selectedCategory
      const result = await fetchBusinesses({
        lat,
        lng,
        sort: 'distance',
        category: cat ? CATEGORY_TO_HEBREW[cat] : undefined,
        pageSize: 10,
      })
      set({ nearby: result.data })
    } finally {
      set({ isLoadingNearby: false })
    }
  },

  loadTopRated: async () => {
    set({ isLoadingTopRated: true })
    try {
      const cat = get().selectedCategory
      const result = await fetchBusinesses({
        sort: 'rating',
        category: cat ? CATEGORY_TO_HEBREW[cat] : undefined,
        pageSize: 10,
      })
      set({ topRated: result.data })
    } finally {
      set({ isLoadingTopRated: false })
    }
  },
}))
