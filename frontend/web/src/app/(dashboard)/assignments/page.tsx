'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, Plus } from 'lucide-react'
import api from '../../../lib/api'
import { formatDate } from '../../../lib/utils'

export default function AssignmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.get('/api/v1/assignments?per_page=50') as any,
  })

  const assignments: any[] = (data as any)?.data?.items || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">{assignments.length} assignments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          <Plus size={16} /> New Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)
        ) : assignments.length === 0 ? (
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No assignments yet</p>
          </div>
        ) : assignments.map((a: any) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex-1 pr-2">{a.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {a.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{a.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Due: {formatDate(a.due_date)}</span>
              <span>Max: {a.max_points} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
