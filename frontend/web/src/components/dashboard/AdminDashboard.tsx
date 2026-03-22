'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, Bot, CreditCard, GraduationCap, ShieldCheck, Users } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { StatCard } from '../ui/StatCard'
import api from '../../lib/api'
import { formatCurrency, formatPercent } from '../../lib/utils'
import Link from 'next/link'

const ATTENDANCE_PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6']

const MOCK_ENROLLMENT_DATA = [
  { month: 'Sep', students: 420 },
  { month: 'Oct', students: 435 },
  { month: 'Nov', students: 442 },
  { month: 'Dec', students: 440 },
  { month: 'Jan', students: 458 },
  { month: 'Feb', students: 472 },
]

const MOCK_FEE_DATA = [
  { month: 'Sep', collected: 485000, outstanding: 65000 },
  { month: 'Oct', collected: 510000, outstanding: 42000 },
  { month: 'Nov', collected: 498000, outstanding: 55000 },
  { month: 'Dec', collected: 520000, outstanding: 38000 },
  { month: 'Jan', collected: 545000, outstanding: 28000 },
  { month: 'Feb', collected: 530000, outstanding: 35000 },
]

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/api/v1/analytics/dashboard/admin') as any,
    staleTime: 5 * 60 * 1000,
  })

  const { data: complianceData } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => api.get('/api/v1/analytics/compliance/dashboard') as any,
    staleTime: 10 * 60 * 1000,
  })
  const compScore: number = (complianceData as any)?.data?.overall_score || 0
  const compGrade: string = (complianceData as any)?.data?.grade || '-'

  const s = stats?.data || {}

  const attendancePieData = [
    { name: 'Present', value: 68 },
    { name: 'Absent', value: 12 },
    { name: 'Late', value: 8 },
    { name: 'Excused', value: 4 },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={s.total_students || 472}
          icon={Users}
          trend={{ value: 3.2, label: 'vs last month' }}
          colorClass="bg-indigo-50 text-indigo-600"
          loading={isLoading}
        />
        <StatCard
          label="Active Teachers"
          value={s.total_teachers || 38}
          icon={GraduationCap}
          colorClass="bg-emerald-50 text-emerald-600"
          loading={isLoading}
        />
        <StatCard
          label="Fee Collection"
          value={formatCurrency(s.fee_collection_this_month || 530000)}
          icon={CreditCard}
          trend={{ value: 2.8, label: 'vs last month' }}
          colorClass="bg-amber-50 text-amber-600"
          loading={isLoading}
        />
        <StatCard
          label="Attendance Rate"
          value={formatPercent(s.attendance_rate_today || 87.4)}
          icon={BarChart3}
          trend={{ value: -1.2, label: 'vs yesterday' }}
          colorClass="bg-rose-50 text-rose-600"
          loading={isLoading}
        />
      </div>

      {/* Compliance Score Banner */}
      <Link href="/compliance" className="block">
        <div className={`rounded-xl border p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow ${
          compScore >= 80 ? 'bg-emerald-50 border-emerald-200' : compScore >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              compScore >= 80 ? 'bg-emerald-100' : compScore >= 60 ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <ShieldCheck size={18} className={compScore >= 80 ? 'text-emerald-600' : compScore >= 60 ? 'text-amber-600' : 'text-red-600'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Compliance Score</p>
              <p className="text-xs text-gray-500">Certifications, board requirements & regulatory updates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={`text-2xl font-bold ${compScore >= 80 ? 'text-emerald-600' : compScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {compScore > 0 ? `${compScore}` : '—'}
              </p>
              <p className="text-xs text-gray-500">Grade {compGrade}</p>
            </div>
            <span className="text-xs text-indigo-600 font-medium whitespace-nowrap">View Details →</span>
          </div>
        </div>
      </Link>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-900">Enrollment Trend</h3>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={MOCK_ENROLLMENT_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="students"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={{ r: 4, fill: '#4F46E5' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-5">Today's Attendance</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={attendancePieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
              >
                {attendancePieData.map((_, index) => (
                  <Cell key={index} fill={ATTENDANCE_PIE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {attendancePieData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ATTENDANCE_PIE_COLORS[i] }} />
                {item.name}: {item.value}%
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fee Collection Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-900">Fee Collection Overview</h3>
          <Link href="/fees" className="text-xs text-indigo-600 hover:underline">View all</Link>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={MOCK_FEE_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="collected" name="Collected" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outstanding" name="Outstanding" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Copilot quick access */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-semibold">AI Copilot</h3>
            <p className="text-indigo-200 text-sm">Ask questions about your school data</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            "Students with low attendance?",
            "Fee collection this week?",
            "Top performers in Grade 10?",
          ].map((q) => (
            <Link
              key={q}
              href={`/ai-copilot?q=${encodeURIComponent(q)}`}
              className="text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 transition-colors"
            >
              {q}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
