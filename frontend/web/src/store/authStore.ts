/**
 * Zustand auth store - manages user session, tenant, and auth state.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api, { clearTokens, setTenantSlug, setTokens } from '../lib/api'

export interface User {
  id: string
  email: string
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'super_admin'
  first_name: string
  last_name: string
  avatar_url: string | null
  tenant_id: string
  status: string
}

export interface Tenant {
  tenant_id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string, tenantSlug: string) => Promise<void>
  loginWithGoogle: (idToken: string, tenantSlug: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  loadTenant: (slug: string) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password, tenantSlug) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/api/v1/auth/login', {
            email,
            password,
            tenant_slug: tenantSlug,
          }) as any

          const { access_token, refresh_token, user } = response.data
          setTokens(access_token, refresh_token)
          setTenantSlug(tenantSlug)

          // Load tenant branding
          await get().loadTenant(tenantSlug)

          set({ user, isAuthenticated: true, isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      loginWithGoogle: async (idToken, tenantSlug) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/api/v1/auth/google', {
            id_token: idToken,
            tenant_slug: tenantSlug,
          }) as any

          const { access_token, refresh_token, user } = response.data
          setTokens(access_token, refresh_token)
          setTenantSlug(tenantSlug)
          await get().loadTenant(tenantSlug)

          set({ user, isAuthenticated: true, isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      logout: () => {
        clearTokens()
        set({ user: null, tenant: null, isAuthenticated: false })
      },

      refreshUser: async () => {
        try {
          const response = await api.get('/api/v1/auth/me') as any
          set({ user: response.data, isAuthenticated: true })
        } catch {
          get().logout()
        }
      },

      loadTenant: async (slug) => {
        try {
          const response = await api.get(`/api/v1/tenants/by-slug/${slug}`) as any
          set({ tenant: { ...response.data, slug } })
        } catch {
          // Non-fatal: continue without branding
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'schoolify-auth',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
