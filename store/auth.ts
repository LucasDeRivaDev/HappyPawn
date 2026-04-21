import { create } from 'zustand'
import type { User, Provider } from '@/types'

interface AuthState {
  user: User | null
  provider: Provider | null
  loading: boolean
  setUser: (user: User | null) => void
  setProvider: (provider: Provider | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  provider: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProvider: (provider) => set({ provider }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, provider: null, loading: false }),
}))
