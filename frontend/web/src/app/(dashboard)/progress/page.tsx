'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import api from '../../../lib/api'
import { formatPercent } from '../../../lib/utils'

export default function ProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api.get('/api/v1/dashboard/summary') as any,
  })

  const stats = (data as any)?.data || {}

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Child's Progress</h1>
        <p className="text-gray-500 text-sm mt-1">Academic performance and attendance overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Attendance Rate', value: stats.avg_attendance_rate != null ? formatPercent(stats.avg_attendance_rate) : '-', color: 'emerald' },
          { label: 'Total Students', value: stats.total_students ?? '-', color: 'indigo' },
          { label: 'Outstanding Fees', value: stats.fee_overdue_count ?? '-', color: 'amber' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <TrendingUp size={20} className={`text-${stat.color}-600 mb-3`} />
            <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Recent Performance</h2>
        <p className="text-sm text-gray-500">Detailed progress reports will appear here once exam results are published.</p>
      </div>
    </div>
  )
}
