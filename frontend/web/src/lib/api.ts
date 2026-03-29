/**
 * Axios API client with auth token injection, tenant resolution,
 * automatic token refresh, and error normalization.
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000'
    }
    if (hostname === 'host.docker.internal') {
      return 'http://host.docker.internal:8000'
    }
    // On any deployed host, use relative URLs so Next.js rewrites proxy to backend
    return ''
  }
  return 'http://localhost:8000'
}

const BASE_URL = getApiBaseUrl()

// Token storage keys
const ACCESS_TOKEN_KEY = 'schoolify_access_token'
const REFRESH_TOKEN_KEY = 'schoolify_refresh_token'
const TENANT_SLUG_KEY = 'schoolify_tenant_slug'

// Helpers
export const getAccessToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export const getTenantSlug = (): string => {
  if (typeof window === 'undefined') return ''
  // From subdomain: {slug}.schoolify.com
  const hostname = window.location.hostname
  const parts = hostname.split('.')
  if (parts.length >= 3 && !['www', 'app', 'api'].includes(parts[0])) {
    return parts[0]
  }
  // Fallback to localStorage (for local dev)
  return localStorage.getItem(TENANT_SLUG_KEY) || 'demo'
}

export const setTenantSlug = (slug: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TENANT_SLUG_KEY, slug)
  }
}

// Track if we're already refreshing to prevent concurrent refresh calls
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Request interceptor: inject auth and tenant headers
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const tenantSlug = getTenantSlug()
  if (tenantSlug) {
    config.headers['X-Tenant-Slug'] = tenantSlug
  }
  return config
})

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response.data, // Unwrap .data by default
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests until refresh completes
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
        if (!refreshToken) throw new Error('No refresh token')

        const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        })

        const { access_token, refresh_token } = response.data.data
        setTokens(access_token, refresh_token)
        onRefreshed(access_token)

        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        clearTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Normalize error
    const errorData = (error.response?.data as any)
    const message = errorData?.errors?.[0]?.message || errorData?.detail || error.message
    return Promise.reject(new Error(message))
  }
)

export default api
