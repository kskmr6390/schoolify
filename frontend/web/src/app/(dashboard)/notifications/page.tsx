'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import api from '../../../lib/api'
import { formatDate } from '../../../lib/utils'

export default function NotificationsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/v1/notifications') as any,
  })

  const markAll = useMutation({
    mutationFn: () => api.post('/api/v1/notifications/mark-all-read', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const items: any[] = (data as any)?.data?.items || []

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Stay updated with school activities</p>
        </div>
        {items.some((n: any) => !n.is_read) && (
          <button onClick={() => markAll.mutate()}
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No notifications yet</p>
          </div>
        ) : items.map((n: any) => (
          <div key={n.id} className={`p-4 flex gap-3 ${!n.is_read ? 'bg-indigo-50/50' : ''}`}>
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.is_read ? 'bg-indigo-600' : 'bg-gray-300'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{n.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
