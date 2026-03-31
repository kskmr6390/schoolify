'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, Bot, CreditCard, GraduationCap, ShieldCheck, Users, Zap } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { StatCard } from '../ui/StatCard'
import api from '../../lib/api'
import { formatCurrency, formatPercent } from '../../lib/utils'
import Link from 'next/link'

const ATTENDANCE_PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6']
const GRADE_COLORS = ['#4F46E5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']
const LLM_COLORS: Record<string, string> = {
  local: '#4F46E5', claude: '#ef4444', google: '#f59e0b', openai: '#10b981',
}

export function AdminDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['school-analytics'],
    queryFn: () => api.get('/api/v1/reports/school-analytics') as any,
    staleTime: 5 * 60 * 1000,
  })

  const { data: complianceData } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => api.get('/api/v1/compliance/dashboard') as any,
    staleTime: 10 * 60 * 1000,
  })

  const { data: llmData } = useQuery({
    queryKey: ['llm-analytics'],
    queryFn: () => api.get('/api/v1/llm-analytics/usage?days=30') as any,
    staleTime: 5 * 60 * 1000,
  })

  const compScore: number = (complianceData as any)?.data?.overall_score || 0
  const compGrade: string = (complianceData as any)?.data?.grade || '-'
  const llm = (llmData as any)?.data || {}
  const llmSummary = llm.summary || {}
  const llmProviders = llm.provider_breakdown || []
  const llmTrend = (llm.daily_trend || []).slice(-14)  // last 14 days

  const d = (analytics as any)?.data || {}
  const overview = d.overview || {}
  const enrollmentTrend = d.enrollment_trend || []
  const attendanceDaily = d.attendance_daily || []
  const feeMonthly = d.fee_monthly || []
  const gradeDistribution = d.grade_distribution || []
  const passFail = d.pass_fail || {}
  const subjectPerformance = d.subject_performance || []
  const assignmentStats = d.assignment_stats || {}

  // Build attendance pie from latest day's data or overall
  const latestAttDay = attendanceDaily[attendanceDaily.length - 1]
  const attendancePieData = latestAttDay
    ? [
        { name: 'Present', value: latestAttDay.present },
        { name: 'Absent', value: latestAttDay.absent },
      ]
    : []

  // Fee chart: map billed → outstanding
  const feeChartData = feeMonthly.map((r: any) => ({
    month: r.month,
    collected: r.collected,
    outstanding: Math.max(r.billed - r.collected, 0),
  }))

  const attendanceRate = latestAttDay ? latestAttDay.rate : (overview.avg_attendance_rate || 0)

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={overview.total_students || 0}
          icon={Users}
          colorClass="bg-indigo-50 text-indigo-600"
          loading={isLoading}
        />
        <StatCard
          label="Active Teachers"
          value={overview.total_teachers || 0}
          icon={GraduationCap}
          colorClass="bg-emerald-50 text-emerald-600"
          loading={isLoading}
        />
        <StatCard
          label="Fee Collected"
          value={formatCurrency(overview.fee_collected || 0)}
          icon={CreditCard}
          colorClass="bg-amber-50 text-amber-600"
          loading={isLoading}
        />
        <StatCard
          label="Attendance Rate"
          value={formatPercent(attendanceRate)}
          icon={BarChart3}
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
            <LineChart data={enrollmentTrend}>
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
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Today's Attendance</h3>
          {latestAttDay && (
            <p className="text-xs text-gray-400 mb-3">{latestAttDay.date} · {latestAttDay.rate}% rate</p>
          )}
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
                {item.name}: {item.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Daily Trend */}
      {attendanceDaily.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-900">Daily Attendance (Last 7 Days)</h3>
            <Link href="/attendance" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Fee Collection Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-900">Fee Collection Overview</h3>
          <Link href="/fees" className="text-xs text-indigo-600 hover:underline">View all</Link>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={feeChartData}>
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

      {/* Academics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        {gradeDistribution.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-900">Grade Distribution</h3>
              {passFail.pass_rate !== undefined && (
                <span className="text-xs font-medium text-emerald-600">
                  Pass Rate: {passFail.pass_rate}%
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="grade" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                  {gradeDistribution.map((_: any, index: number) => (
                    <Cell key={index} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subject Performance */}
        {subjectPerformance.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-900">Avg Marks by Subject</h3>
              {assignmentStats.rate !== undefined && (
                <span className="text-xs text-gray-400">
                  Assignment rate: {assignmentStats.rate}%
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="subject" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip />
                <Bar dataKey="avg_marks" name="Avg Marks" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* LLM Usage Card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Zap size={16} className="text-indigo-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">AI Copilot Usage — Last 30 Days</h3>
          </div>
          <Link href="/reports?tab=AI+%26+LLM" className="text-xs text-indigo-600 hover:underline">Full report →</Link>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Queries', value: llmSummary.total_queries ?? 0 },
            { label: 'Local (Free)', value: `${llmSummary.local_pct ?? 0}%`, sub: `${llmSummary.local_queries ?? 0} queries` },
            { label: 'Cloud Cost', value: `$${(llmSummary.actual_cost_usd ?? 0).toFixed(2)}`, sub: 'actual spend' },
            { label: 'Saved vs Claude', value: `$${(llmSummary.savings_usd ?? 0).toFixed(2)}`, sub: `${llmSummary.savings_pct ?? 0}% saved`, highlight: true },
          ].map(k => (
            <div key={k.label} className={`rounded-lg p-3 ${k.highlight ? 'bg-emerald-50' : 'bg-gray-50'}`}>
              <p className={`text-lg font-bold ${k.highlight ? 'text-emerald-700' : 'text-gray-900'}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              {k.sub && <p className="text-xs text-gray-400">{k.sub}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Provider distribution */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Provider Mix</p>
            <div className="space-y-2">
              {llmProviders.map((p: any) => (
                <div key={p.provider}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600 capitalize">{p.label || p.provider}</span>
                    <span className="font-medium text-gray-900">{p.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${p.pct}%`,
                      backgroundColor: LLM_COLORS[p.provider] || '#9ca3af'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily query trend */}
          <div className="lg:col-span-2">
            <p className="text-xs font-medium text-gray-500 mb-2">Daily Query Volume (14 days)</p>
            {llmTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={llmTrend} barCategoryGap="20%">
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                  <Tooltip />
                  {Object.keys(LLM_COLORS).filter(p => llmTrend.some((d: any) => d[p] > 0)).map(p => (
                    <Bar key={p} dataKey={p} stackId="a" fill={LLM_COLORS[p]} name={p} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-300 text-xs">No LLM usage data</div>
            )}
          </div>
        </div>
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
