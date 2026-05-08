import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface User {
  id: string
  phone: string
  name: string
  email?: string
  dateOfBirth?: string
  sex?: string
  city?: string
  photo?: string
  role: 'CLIENT' | 'BUSINESS' | 'ADMIN'
  businessStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  walletBalance?: number  // in agorot
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'dura-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
