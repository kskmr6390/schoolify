import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  role: 'admin' | 'teacher' | 'student' | 'parent'
  first_name: string
  last_name: string
}

interface AuthState {
  user: User | null
  tenantSlug: string | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (email: string, password: string, tenantSlug: string) => Promise<void>
  logout: () => Promise<void>
  loadSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenantSlug: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password, tenantSlug) => {
    const { data } = await api.post('/api/v1/auth/login', {
      email, password, tenant_slug: tenantSlug,
    })
    const { access_token, refresh_token, user } = data.data
    await SecureStore.setItemAsync('access_token', access_token)
    await SecureStore.setItemAsync('refresh_token', refresh_token)
    await SecureStore.setItemAsync('tenant_slug', tenantSlug)
    set({ user, tenantSlug, isAuthenticated: true })
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refresh_token')
    try {
      await api.post('/api/v1/auth/logout', { refresh_token: refreshToken })
    } catch { /* fire-and-forget */ }
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    await SecureStore.deleteItemAsync('tenant_slug')
    set({ user: null, tenantSlug: null, isAuthenticated: false })
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token')
      const tenantSlug = await SecureStore.getItemAsync('tenant_slug')
      if (token && tenantSlug) {
        const { data } = await api.get('/api/v1/auth/me')
        set({ user: data.data, tenantSlug, isAuthenticated: true })
      }
    } catch {
      set({ isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },
}))
