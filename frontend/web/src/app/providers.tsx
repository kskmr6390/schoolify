'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, refreshUser } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) {
        await refreshUser()
      }
      setInitialized(true)
    }
    init()
  }, [])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: 1,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthInitializer>
          {children}
        </AuthInitializer>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
