'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  trend?: { value: number; label: string }
  colorClass?: string
  loading?: boolean
}

export function StatCard({ label, value, icon: Icon, trend, colorClass = 'bg-indigo-50 text-indigo-600', loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-1.5 text-xs font-medium",
              trend.value >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {trend.value >= 0
                ? <TrendingUp size={12} />
                : <TrendingDown size={12} />
              }
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colorClass)}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}
