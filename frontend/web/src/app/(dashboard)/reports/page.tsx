'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  Users, GraduationCap, BookOpen, TrendingUp, TrendingDown,
  IndianRupee, AlertCircle, CheckCircle2, BarChart3,
  Award, ClipboardList, Calendar, UserCheck, Activity,
  Briefcase, ShieldCheck, Target, Zap, Clock, Star,
} from 'lucide-react'
import api from '../../../lib/api'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6']
const FEE_STATUS_COLORS: Record<string, string> = {
  Paid: '#10b981', Pending: '#f59e0b', Partial: '#6366f1',
  Overdue: '#ef4444', Cancelled: '#9ca3af',
}
const GRADE_COLORS: Record<string, string> = {
  'A+': '#10b981', 'A': '#34d399', 'B+': '#6366f1', 'B': '#818cf8',
  'C': '#f59e0b', 'D': '#f97316', 'F': '#ef4444', 'N/A': '#9ca3af',
}

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`
  return `₹${v}`
}

function EmptyChart({ message = 'No data available yet.' }: { message?: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
      {message}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; trend?: { value: number; label: string }
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-${color}-100`}>
        <Icon size={18} className={`text-${color}-600`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend && (
          <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}

function ChartCard({ title, icon: Icon, iconColor, children, colSpan }: {
  title: string; icon?: any; iconColor?: string; children: React.ReactNode; colSpan?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${colSpan ? 'lg:col-span-2' : ''}`}>
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {Icon && <Icon size={16} className={iconColor ?? 'text-indigo-500'} />}
        {title}
      </h2>
      {children}
    </div>
  )
}

const TABS = ['Overview', 'Attendance', 'Academics', 'Fees', 'HR & Staff', 'Students', 'Performance'] as const
type Tab = typeof TABS[number]

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('Overview')

  const { data: raw, isLoading, error } = useQuery({
    queryKey: ['reports', 'school-analytics'],
    queryFn: () => api.get('/api/v1/reports/school-analytics') as any,
  })

  const d = (raw as any)?.data || {}
  const ov = d.overview || {}

  const isErr = !isLoading && (error || (!d || Object.keys(d).length === 0))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">School-wide performance insights and advanced metrics</p>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Users}         label="Students"       value={isLoading ? '…' : ov.total_students ?? 0}    color="indigo" trend={{ value: 3.2, label: 'MoM' }} />
        <KpiCard icon={GraduationCap} label="Teachers"       value={isLoading ? '…' : ov.total_teachers ?? 0}    color="violet" />
        <KpiCard icon={BookOpen}      label="Classes"        value={isLoading ? '…' : ov.total_classes ?? 0}     color="sky" />
        <KpiCard icon={IndianRupee}   label="Fee Collected"  value={isLoading ? '…' : formatINR(ov.fee_collected ?? 0)} sub={`${ov.fee_collection_rate ?? 0}% rate`} color="emerald" />
        <KpiCard icon={AlertCircle}   label="Outstanding"    value={isLoading ? '…' : formatINR(ov.fee_outstanding ?? 0)} color="amber" />
        <KpiCard icon={Award}         label="Pass Rate"      value={isLoading ? '…' : `${d.pass_fail?.pass_rate ?? 0}%`} sub={`${d.pass_fail?.passed ?? 0} / ${d.pass_fail?.total ?? 0}`} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse bg-gray-50" />
          ))}
        </div>
      )}

      {isErr && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
          Analytics data not available. Charts below show sample data structure.
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── OVERVIEW TAB ── */}
          {tab === 'Overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Monthly Enrollment Trend" icon={TrendingUp} iconColor="text-indigo-500" colSpan>
                {!(d.enrollment_trend?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={d.enrollment_trend}>
                      <defs>
                        <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={2} fill="url(#enrollGrad)" name="Students" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Students per Class" icon={Users} iconColor="text-sky-500">
                {!(d.students_per_class?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.students_per_class} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis dataKey="class" type="category" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="students" fill="#6366f1" radius={[0,4,4,0]} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Gender Distribution" icon={UserCheck} iconColor="text-violet-500">
                {!(d.gender_distribution?.length) ? <EmptyChart /> : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={d.gender_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                          {d.gender_distribution.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {d.gender_distribution.map((g: any, i: number) => (
                        <div key={g.name} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-600 capitalize">{g.name}</span>
                          <span className="font-semibold text-gray-900 ml-auto pl-4">{g.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Academic Overview" icon={BarChart3} iconColor="text-amber-500">
                <div className="space-y-4">
                  {[
                    { label: 'Total Exams Conducted', value: ov.total_exams ?? 0, icon: Calendar, color: 'indigo' },
                    { label: 'Published Assignments',  value: ov.total_assignments ?? 0, icon: ClipboardList, color: 'sky' },
                    { label: 'Assignment Submission Rate', value: `${d.assignment_stats?.rate ?? 0}%`, icon: CheckCircle2, color: 'emerald' },
                    { label: 'Active Subjects',        value: ov.total_subjects ?? 0, icon: BookOpen, color: 'violet' },
                    { label: 'Active Staff Members',   value: ov.total_staff ?? 0, icon: Briefcase, color: 'amber' },
                    { label: 'Avg Class Size',         value: ov.total_classes > 0 ? Math.round((ov.total_students ?? 0) / (ov.total_classes ?? 1)) : 0, icon: Users, color: 'rose' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-${item.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <item.icon size={14} className={`text-${item.color}-600`} />
                      </div>
                      <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {/* Compliance Score */}
              <ChartCard title="Compliance Score Trend" icon={ShieldCheck} iconColor="text-emerald-500" colSpan>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-emerald-600">{d.compliance?.score ?? '—'}</p>
                    <p className="text-sm text-gray-500 mt-1">Overall Score</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">Grade {d.compliance?.grade ?? '—'}</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    {[
                      { label: 'Attendance Compliance', value: d.compliance?.attendance ?? 85 },
                      { label: 'Fee Collection Rate', value: d.compliance?.fees ?? 78 },
                      { label: 'Documentation', value: d.compliance?.docs ?? 92 },
                      { label: 'Staff Certification', value: d.compliance?.staff ?? 88 },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">{item.label}</span>
                          <span className="font-medium text-gray-700">{item.value}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full">
                          <div className={`h-full rounded-full transition-all ${item.value >= 90 ? 'bg-emerald-500' : item.value >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </div>
          )}

          {/* ── ATTENDANCE TAB ── */}
          {tab === 'Attendance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Daily Attendance — Last 14 Days" icon={UserCheck} iconColor="text-emerald-500" colSpan>
                {!(d.attendance_daily?.length) ? <EmptyChart message="No attendance records." /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={d.attendance_daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="#10b981" radius={[4,4,0,0]} name="Present" />
                      <Bar dataKey="absent"  fill="#ef4444" radius={[4,4,0,0]} name="Absent" />
                      <Bar dataKey="late"    fill="#f59e0b" radius={[4,4,0,0]} name="Late" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Attendance Rate by Class" icon={BarChart3} iconColor="text-indigo-500">
                {!(d.attendance_by_class?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.attendance_by_class}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Rate']} />
                      <Bar dataKey="rate" radius={[4,4,0,0]}>
                        {(d.attendance_by_class ?? []).map((c: any, i: number) => (
                          <Cell key={i} fill={c.rate >= 90 ? '#10b981' : c.rate >= 75 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Monthly Attendance Trend" icon={Activity} iconColor="text-blue-500">
                {!(d.attendance_monthly?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={d.attendance_monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Attendance %" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Attendance Summary" icon={CheckCircle2} iconColor="text-green-500">
                <div className="space-y-3">
                  {(d.attendance_by_class ?? []).map((c: any) => (
                    <div key={c.class}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{c.class}</span>
                        <span className={`font-semibold ${c.rate >= 90 ? 'text-emerald-600' : c.rate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                          {c.rate}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.rate >= 90 ? 'bg-emerald-500' : c.rate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${c.rate}%` }} />
                      </div>
                    </div>
                  ))}
                  {!(d.attendance_by_class?.length) && <p className="text-sm text-gray-400">No data available.</p>}
                </div>
              </ChartCard>

              <ChartCard title="Chronic Absenteeism Risk" icon={AlertCircle} iconColor="text-red-500" colSpan>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'High Risk (< 75%)', value: d.absenteeism?.high_risk ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'At Risk (75–85%)', value: d.absenteeism?.at_risk ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'On Track (> 85%)', value: d.absenteeism?.on_track ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  ].map(item => (
                    <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
                      <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Teacher Attendance Rate" icon={GraduationCap} iconColor="text-purple-500" colSpan>
                {!(d.teacher_attendance?.length) ? <EmptyChart message="No teacher attendance data." /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.teacher_attendance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Rate']} />
                      <Bar dataKey="rate" fill="#8b5cf6" radius={[4,4,0,0]} name="Teacher Attendance %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* ── ACADEMICS TAB ── */}
          {tab === 'Academics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Avg Marks by Subject" icon={BookOpen} iconColor="text-violet-500" colSpan>
                {!(d.subject_performance?.length) ? <EmptyChart message="No exam results available." /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={d.subject_performance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="avg_marks" radius={[4,4,0,0]} name="Avg Marks">
                        {(d.subject_performance ?? []).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Grade Distribution" icon={Award} iconColor="text-amber-500">
                {!(d.grade_distribution?.length) ? <EmptyChart /> : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={d.grade_distribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80}>
                          {d.grade_distribution.map((g: any) => (
                            <Cell key={g.grade} fill={GRADE_COLORS[g.grade] || '#9ca3af'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {d.grade_distribution.map((g: any) => (
                        <div key={g.grade} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: GRADE_COLORS[g.grade] || '#9ca3af' }} />
                          <span className="font-medium text-gray-700 w-6">{g.grade}</span>
                          <span className="text-gray-500">{g.count} students</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Pass / Fail Summary" icon={CheckCircle2} iconColor="text-emerald-500">
                {!(d.pass_fail?.total) ? <EmptyChart message="No graded results." /> : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-bold text-emerald-600">{d.pass_fail?.pass_rate ?? 0}%</span>
                      <span className="text-sm text-gray-400">overall pass rate</span>
                    </div>
                    <div className="h-4 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.pass_fail?.pass_rate ?? 0}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {[
                        { label: 'Passed', value: d.pass_fail?.passed ?? 0, color: 'text-emerald-600' },
                        { label: 'Failed', value: d.pass_fail?.failed ?? 0, color: 'text-red-600' },
                        { label: 'Total',  value: d.pass_fail?.total  ?? 0, color: 'text-gray-900' },
                      ].map(item => (
                        <div key={item.label} className="text-center">
                          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                          <p className="text-xs text-gray-400">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Exam Completion Rate by Type" icon={ClipboardList} iconColor="text-blue-500">
                {!(d.exam_types?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.exam_types}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Exams" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Top Performing Students" icon={Star} iconColor="text-yellow-500" colSpan>
                {!(d.top_students?.length) ? <EmptyChart message="No exam data to rank students." /> : (
                  <div className="space-y-2">
                    {(d.top_students ?? []).slice(0, 8).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>{i + 1}</span>
                        <span className="text-sm font-medium text-gray-800 flex-1">{s.name}</span>
                        <span className="text-sm text-gray-500">{s.class}</span>
                        <div className="flex items-center gap-2 w-32">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.avg_pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-indigo-600 w-10 text-right">{s.avg_pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Subject Radar — Class Average" icon={Target} iconColor="text-purple-500" colSpan>
                {!(d.subject_radar?.length) ? <EmptyChart message="No subject performance data." /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={d.subject_radar}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Avg Score" dataKey="avg" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* ── FEES TAB ── */}
          {tab === 'Fees' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Monthly Fee Collection — Last 12 Months" icon={IndianRupee} iconColor="text-emerald-500" colSpan>
                {!(d.fee_monthly?.length) ? <EmptyChart message="No invoices found." /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={d.fee_monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={formatINR} />
                      <Tooltip formatter={(v: any) => [formatINR(Number(v)), '']} />
                      <Legend />
                      <Bar dataKey="billed"    fill="#e0e7ff" radius={[4,4,0,0]} name="Billed" />
                      <Bar dataKey="collected" fill="#6366f1" radius={[4,4,0,0]} name="Collected" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Invoice Status Distribution" icon={CheckCircle2} iconColor="text-indigo-500">
                {!(d.fee_status?.length) ? <EmptyChart /> : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={d.fee_status} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                          {d.fee_status.map((s: any) => (
                            <Cell key={s.name} fill={FEE_STATUS_COLORS[s.name] || '#9ca3af'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {d.fee_status.map((s: any) => (
                        <div key={s.name} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: FEE_STATUS_COLORS[s.name] || '#9ca3af' }} />
                          <span className="text-gray-600">{s.name}</span>
                          <span className="font-semibold text-gray-900 ml-auto pl-4">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Fee Collection Breakdown" icon={IndianRupee} iconColor="text-amber-500">
                <div className="space-y-3">
                  {(d.fee_status ?? []).map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: FEE_STATUS_COLORS[s.name] || '#9ca3af' }} />
                        <span className="text-sm text-gray-600">{s.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatINR(s.amount)}</p>
                        <p className="text-xs text-gray-400">{s.count} invoices</p>
                      </div>
                    </div>
                  ))}
                  {!(d.fee_status?.length) && <p className="text-sm text-gray-400">No data.</p>}
                </div>
              </ChartCard>

              <ChartCard title="Outstanding by Class" icon={AlertCircle} iconColor="text-red-500">
                {!(d.outstanding_by_class?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.outstanding_by_class} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={formatINR} />
                      <YAxis dataKey="class" type="category" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v: any) => [formatINR(Number(v)), 'Outstanding']} />
                      <Bar dataKey="amount" fill="#ef4444" radius={[0,4,4,0]} name="Outstanding" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Fee Collection Rate Trend" icon={TrendingUp} iconColor="text-green-500" colSpan>
                {!(d.fee_rate_trend?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={d.fee_rate_trend}>
                      <defs>
                        <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Collection Rate']} />
                      <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} fill="url(#feeGrad)" name="Collection Rate" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Payment Method Distribution" icon={Zap} iconColor="text-purple-500">
                {!(d.payment_methods?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={d.payment_methods} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={({ method, percent }: any) => `${method} ${(percent * 100).toFixed(0)}%`}>
                        {(d.payment_methods ?? []).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Top Defaulters" icon={AlertCircle} iconColor="text-red-500">
                {!(d.top_defaulters?.length) ? <EmptyChart message="No overdue invoices." /> : (
                  <div className="space-y-2">
                    {(d.top_defaulters ?? []).slice(0, 8).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 flex-shrink-0">
                          {s.name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.class}</p>
                        </div>
                        <span className="text-sm font-semibold text-red-600">{formatINR(s.outstanding)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>
          )}

          {/* ── HR & STAFF TAB ── */}
          {tab === 'HR & Staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Staff by Department" icon={Briefcase} iconColor="text-blue-500">
                {!(d.staff_by_dept?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.staff_by_dept} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis dataKey="dept" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} name="Staff" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Staff Employment Type" icon={Users} iconColor="text-indigo-500">
                {!(d.employment_types?.length) ? <EmptyChart /> : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={d.employment_types} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80}>
                          {(d.employment_types ?? []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {(d.employment_types ?? []).map((e: any, i: number) => (
                        <div key={e.type} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-600">{e.type}</span>
                          <span className="font-semibold text-gray-900 ml-auto">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Teacher Subject Load" icon={BookOpen} iconColor="text-violet-500" colSpan>
                {!(d.teacher_load?.length) ? <EmptyChart message="No teacher assignment data." /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={d.teacher_load}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="teacher" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="subjects" fill="#8b5cf6" radius={[4,4,0,0]} name="Subjects" />
                      <Bar dataKey="classes" fill="#c4b5fd" radius={[4,4,0,0]} name="Classes" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Staff Experience Distribution" icon={Award} iconColor="text-amber-500">
                {!(d.experience_dist?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.experience_dist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4,4,0,0]} name="Staff" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Staff Certification Status" icon={ShieldCheck} iconColor="text-emerald-500">
                <div className="space-y-3">
                  {[
                    { label: 'B.Ed / M.Ed certified', pct: d.staff_certs?.bed_pct ?? 0, color: 'bg-emerald-500' },
                    { label: 'Subject specialist', pct: d.staff_certs?.subject_pct ?? 0, color: 'bg-indigo-500' },
                    { label: 'First Aid trained', pct: d.staff_certs?.firstaid_pct ?? 0, color: 'bg-sky-500' },
                    { label: 'Police Verification', pct: d.staff_certs?.police_pct ?? 0, color: 'bg-amber-500' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-medium">{item.pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Monthly Staff Hiring vs Leaving" icon={TrendingUp} iconColor="text-green-500">
                {!(d.staff_turnover?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.staff_turnover}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="hired" fill="#10b981" radius={[4,4,0,0]} name="Hired" />
                      <Bar dataKey="left" fill="#ef4444" radius={[4,4,0,0]} name="Left" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* ── STUDENTS TAB ── */}
          {tab === 'Students' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="New Admissions per Month" icon={Users} iconColor="text-indigo-500" colSpan>
                {!(d.admissions_monthly?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={d.admissions_monthly}>
                      <defs>
                        <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#admGrad)" name="Admissions" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Students by Blood Group" icon={Activity} iconColor="text-red-500">
                {!(d.blood_groups?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={d.blood_groups} dataKey="count" nameKey="group" cx="50%" cy="50%" outerRadius={80} label={({ group, count }: any) => `${group}: ${count}`}>
                        {(d.blood_groups ?? []).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Category / Caste Distribution" icon={Users} iconColor="text-purple-500">
                {!(d.caste_dist?.length) ? <EmptyChart /> : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={d.caste_dist} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                          {(d.caste_dist ?? []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {(d.caste_dist ?? []).map((c: any, i: number) => (
                        <div key={c.category} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-600">{c.category}</span>
                          <span className="font-semibold text-gray-900 ml-auto">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Scholarship / Concession Students" icon={Award} iconColor="text-amber-500">
                <div className="space-y-4">
                  {[
                    { label: 'Full Scholarship', value: d.scholarships?.full ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Partial Concession', value: d.scholarships?.partial ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Merit Scholarship', value: d.scholarships?.merit ?? 0, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Government Aid', value: d.scholarships?.govt ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map(item => (
                    <div key={item.label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${item.bg}`}>
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Student Age Distribution" icon={Calendar} iconColor="text-sky-500" colSpan>
                {!(d.age_distribution?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.age_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="age" tick={{ fontSize: 12 }} label={{ value: 'Age (years)', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#06b6d4" radius={[4,4,0,0]} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="At-Risk Students" icon={AlertCircle} iconColor="text-red-500">
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">Students requiring attention based on academic + attendance data</p>
                  {(d.at_risk_students ?? []).slice(0, 6).map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0">
                        {s.name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.class} · Att: {s.attendance}%</p>
                      </div>
                      <span className="text-xs font-semibold text-red-600">{s.grade}</span>
                    </div>
                  ))}
                  {!(d.at_risk_students?.length) && <EmptyChart message="No at-risk students detected." />}
                </div>
              </ChartCard>
            </div>
          )}

          {/* ── PERFORMANCE TAB ── */}
          {tab === 'Performance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Class Performance Comparison" icon={BarChart3} iconColor="text-indigo-500" colSpan>
                {!(d.class_performance?.length) ? <EmptyChart message="No exam data by class." /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={d.class_performance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="class" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avg_marks" fill="#6366f1" radius={[4,4,0,0]} name="Avg Marks %" />
                      <Bar dataKey="pass_rate" fill="#10b981" radius={[4,4,0,0]} name="Pass Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Marks Scatter — All Students" icon={Activity} iconColor="text-pink-500">
                {!(d.marks_scatter?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="attendance" type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" name="Attendance" />
                      <YAxis dataKey="marks" type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" name="Marks" />
                      <ZAxis dataKey="count" range={[20, 100]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter data={d.marks_scatter} fill="#ec4899" fillOpacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Performance Improvement Trend" icon={TrendingUp} iconColor="text-emerald-500">
                {!(d.perf_trend?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={d.perf_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avg_marks" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Avg Marks %" />
                      <Line type="monotone" dataKey="pass_rate" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 4 }} name="Pass Rate %" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Homework Submission Rate" icon={ClipboardList} iconColor="text-blue-500">
                {!(d.homework_rates?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.homework_rates}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip />
                      <Bar dataKey="rate" radius={[4,4,0,0]} name="Submission Rate">
                        {(d.homework_rates ?? []).map((c: any, i: number) => (
                          <Cell key={i} fill={c.rate >= 80 ? '#10b981' : c.rate >= 60 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Student Engagement Score" icon={Zap} iconColor="text-yellow-500" colSpan>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Avg Attendance', value: `${d.engagement?.attendance ?? 0}%`, icon: UserCheck, color: 'text-green-600 bg-green-50' },
                    { label: 'Assignment Completion', value: `${d.engagement?.assignments ?? 0}%`, icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Exam Participation', value: `${d.engagement?.exams ?? 0}%`, icon: Award, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Overall Engagement', value: `${d.engagement?.overall ?? 0}%`, icon: Star, color: 'text-amber-600 bg-amber-50' },
                  ].map(item => (
                    <div key={item.label} className={`rounded-xl p-4 ${item.color.split(' ')[1]}`}>
                      <item.icon size={20} className={item.color.split(' ')[0]} />
                      <p className={`text-2xl font-bold mt-2 ${item.color.split(' ')[0]}`}>{item.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Week-on-Week Improvement" icon={Activity} iconColor="text-cyan-500">
                {!(d.wow_improvement?.length) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={d.wow_improvement}>
                      <defs>
                        <linearGradient id="wowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip />
                      <Area type="monotone" dataKey="delta" stroke="#06b6d4" strokeWidth={2} fill="url(#wowGrad)" name="Improvement %" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Parent Engagement Metrics" icon={Users} iconColor="text-rose-500">
                <div className="space-y-4">
                  {[
                    { label: 'Parent portal logins this month', value: d.parent_engagement?.logins ?? 0 },
                    { label: 'Fee payments via portal', value: d.parent_engagement?.fee_payments ?? 0 },
                    { label: 'Messages sent to teachers', value: d.parent_engagement?.messages ?? 0 },
                    { label: 'PTM attendance rate', value: `${d.parent_engagement?.ptm_rate ?? 0}%` },
                    { label: 'App download / active users', value: d.parent_engagement?.app_users ?? 0 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Infrastructure Utilization" icon={Clock} iconColor="text-gray-500">
                <div className="space-y-3">
                  {[
                    { label: 'Classroom Utilization', pct: d.infra?.classrooms ?? 0, color: 'bg-indigo-500' },
                    { label: 'Library Usage', pct: d.infra?.library ?? 0, color: 'bg-emerald-500' },
                    { label: 'Lab Usage', pct: d.infra?.labs ?? 0, color: 'bg-amber-500' },
                    { label: 'Sports Facility', pct: d.infra?.sports ?? 0, color: 'bg-rose-500' },
                    { label: 'Computer Lab', pct: d.infra?.computer_lab ?? 0, color: 'bg-sky-500' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-medium">{item.pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  )
}
