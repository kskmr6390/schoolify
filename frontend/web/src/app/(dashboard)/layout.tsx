'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Bot, Menu, Search } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Sidebar } from '../../components/layout/Sidebar'
import ChatWidget from '../../components/chat/ChatWidget'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated])

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/api/v1/notifications/unread-count') as any,
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={20} className="text-gray-600" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students, classes..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* AI Copilot — blinking indicator */}
            <button
              onClick={() => router.push('/ai-copilot')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                pathname?.startsWith('/ai-copilot')
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${pathname?.startsWith('/ai-copilot') ? 'bg-white' : 'bg-indigo-600'}`} />
              </span>
              <Bot size={13} />
              <span className="text-xs font-semibold tracking-wide">AI Copilot</span>
            </button>

            {/* Notifications */}
            <button
              onClick={() => router.push('/notifications')}
              className="relative p-2 rounded-lg hover:bg-gray-100"
            >
              <Bell size={20} className="text-gray-600" />
              {(unreadCount as any)?.data?.count > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {(unreadCount as any).data.count}
                </span>
              )}
            </button>

            {/* User Avatar */}
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Floating chat widget — visible on all pages */}
      <ChatWidget />
    </div>
  )
}
