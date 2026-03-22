'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import api from '../../../lib/api'
import { formatDate } from '../../../lib/utils'

export default function ResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: () => api.get('/api/v1/results?per_page=50') as any,
  })

  const results: any[] = (data as any)?.data?.items || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
        <p className="text-gray-500 text-sm mt-1">Your academic performance</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Exam</th>
              <th className="text-left px-4 py-3">Marks</th>
              <th className="text-left px-4 py-3">Grade</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="text-center text-gray-400 py-8">Loading...</td></tr>
            ) : results.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12">
                <BarChart3 size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No results published yet</p>
              </td></tr>
            ) : results.map((r: any) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.exam_id}</td>
                <td className="px-4 py-3 text-gray-700">{r.marks_obtained} / {r.max_marks}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{r.grade || '-'}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
