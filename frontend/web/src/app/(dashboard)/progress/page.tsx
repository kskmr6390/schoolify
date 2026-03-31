'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, ClipboardCheck, CreditCard, Trophy, Star,
  GraduationCap, Calendar, BookOpen, AlertCircle, CheckCircle,
  Clock, ChevronRight, Sparkles, Award, Users,
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const AVATAR_GRADS = [
  'from-indigo-500 to-violet-600', 'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600', 'from-rose-500 to-pink-600',
]
function grad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}

const STATUS_DOT: Record<string, string> = {
  present: 'bg-green-500', absent: 'bg-red-500',
  late: 'bg-yellow-500', excused: 'bg-purple-500',
}

const AWARD_ICONS: Record<string, React.ElementType> = {
  trophy: Trophy, star: Star, award: Award, sparkles: Sparkles,
}

// ── Child Card ────────────────────────────────────────────────────────────────
function ChildCard({ child, selected, onClick }: {
  child: any; selected: boolean; onClick: () => void
}) {
  const name = `${child.first_name} ${child.last_name}`.trim()
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
        selected
          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
      )}
    >
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br flex-shrink-0', grad(name))}>
        {child.first_name?.[0]}{child.last_name?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500 mt-0.5 capitalize">
          {child.relationship} · {child.grade ? `Grade ${child.grade}` : 'Student'}
        </p>
      </div>
      <ChevronRight size={16} className={selected ? 'text-indigo-500' : 'text-gray-300'} />
    </button>
  )
}

// ── Child Detail ──────────────────────────────────────────────────────────────
function ChildDetail({ child }: { child: any }) {
  const childId = child.id
  const name = `${child.first_name} ${child.last_name}`.trim()

  // Attendance summary
  const { data: attSummary } = useQuery({
    queryKey: ['parent-child-attendance', childId],
    queryFn: () => api.get(`/api/v1/attendance/student/${childId}/summary`) as any,
  })
  const att = (attSummary as any)?.data ?? {}

  // Recent attendance records (last 30 days)
  const today = new Date()
  const fromDate = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0]
  const toDate = today.toISOString().split('T')[0]
  const { data: attHistory } = useQuery({
    queryKey: ['parent-child-att-history', childId],
    queryFn: () => api.get(`/api/v1/attendance/student/${childId}`, {
      params: { from_date: fromDate, to_date: toDate },
    }) as any,
  })
  const recentAtt: any[] = Array.isArray((attHistory as any)?.data) ? (attHistory as any).data : []

  // Results
  const { data: resultsData } = useQuery({
    queryKey: ['parent-child-results', childId],
    queryFn: () => api.get(`/api/v1/exams/results?student_id=${childId}`) as any,
  })
  const results: any[] = (resultsData as any)?.data?.items ?? (resultsData as any)?.data ?? []

  // Fees
  const { data: feesData } = useQuery({
    queryKey: ['parent-child-fees', childId],
    queryFn: () => api.get(`/api/v1/fees/invoices?student_id=${childId}`) as any,
  })
  const invoices: any[] = (feesData as any)?.data?.items ?? (feesData as any)?.data ?? []
  const pendingFees = invoices.filter((i: any) => ['pending', 'overdue'].includes(i.status))
  const totalDue = pendingFees.reduce((sum: number, i: any) => sum + (i.total_amount ?? i.amount ?? 0), 0)

  // Awards
  const { data: awardsData } = useQuery({
    queryKey: ['parent-child-awards', childId],
    queryFn: () => api.get(`/api/v1/notifications/awards?recipient_id=${childId}`) as any,
  })
  const awards: any[] = (awardsData as any)?.data ?? []

  const attRate = att.attendance_rate ?? att.present_percentage ?? null
  const presentDays = att.present_days ?? att.present ?? 0
  const absentDays = att.absent_days ?? att.absent ?? 0
  const totalDays = att.total_days ?? att.total ?? 0

  return (
    <div className="space-y-6">
      {/* Child hero */}
      <div className={cn('rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm relative overflow-hidden', grad(name))}>
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">
            {child.first_name?.[0]}{child.last_name?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-white/70 text-sm">
              {child.grade ? `Grade ${child.grade}` : 'Student'}
              {child.student_code ? ` · ${child.student_code}` : ''}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-black">{attRate != null ? `${Math.round(attRate)}%` : '—'}</p>
            <p className="text-white/70 text-xs">Attendance</p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Present Days', value: presentDays, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Absent Days',  value: absentDays,  icon: AlertCircle, color: 'text-red-500',     bg: 'bg-red-50' },
          { label: 'Awards Won',   value: awards.length,icon: Trophy,     color: 'text-amber-500',   bg: 'bg-amber-50' },
          { label: 'Fees Due',     value: pendingFees.length > 0 ? `₹${totalDue.toLocaleString('en-IN')}` : '₹0', icon: CreditCard, color: pendingFees.length > 0 ? 'text-rose-600' : 'text-emerald-600', bg: pendingFees.length > 0 ? 'bg-rose-50' : 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-indigo-500" /> Recent Attendance
            </h3>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </div>

          {/* Mini bar */}
          {totalDays > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{presentDays} present / {totalDays} school days</span>
                <span className="font-semibold text-gray-700">{Math.round((presentDays / totalDays) * 100)}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.round((presentDays / totalDays) * 100)}%` }} />
              </div>
            </div>
          )}

          {recentAtt.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No attendance records</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {recentAtt.slice(0, 10).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT[r.status] ?? 'bg-gray-400')} />
                  <span className="text-gray-500 flex-1">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className={cn('capitalize font-medium text-xs px-2 py-0.5 rounded-full',
                    r.status === 'present' ? 'bg-green-100 text-green-700' :
                    r.status === 'absent'  ? 'bg-red-100 text-red-700' :
                    r.status === 'late'    ? 'bg-yellow-100 text-yellow-700' :
                    'bg-purple-100 text-purple-700'
                  )}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Awards */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" /> Awards & Recognition
            </h3>
            <span className="text-xs text-gray-400">{awards.length} total</span>
          </div>

          {awards.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
              <Trophy size={28} className="text-gray-200" />
              <p className="text-sm">No awards yet — keep it up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {awards.slice(0, 5).map((a: any) => {
                const Icon = AWARD_ICONS[a.icon] ?? Trophy
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-400">{a.category} · {timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <BookOpen size={16} className="text-violet-500" /> Recent Results
            </h3>
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No results published yet</p>
          ) : (
            <div className="space-y-3">
              {results.slice(0, 5).map((r: any, i: number) => {
                const pct = r.percentage ?? (r.marks_obtained && r.total_marks ? Math.round((r.marks_obtained / r.total_marks) * 100) : null)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0',
                      pct == null ? 'bg-gray-100 text-gray-500' :
                      pct >= 75 ? 'bg-emerald-100 text-emerald-700' :
                      pct >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    )}>
                      {pct != null ? `${pct}%` : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {r.exam_name ?? r.subject ?? 'Exam'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {r.marks_obtained != null ? `${r.marks_obtained}/${r.total_marks}` : r.grade ?? ''}
                      </p>
                    </div>
                    {r.grade && (
                      <span className="text-xs font-bold text-gray-700 px-2 py-0.5 bg-gray-100 rounded-full">{r.grade}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Fee Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <CreditCard size={16} className="text-indigo-500" /> Fee Status
            </h3>
          </div>

          {invoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No fee invoices</p>
          ) : (
            <div className="space-y-3">
              {invoices.slice(0, 5).map((inv: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1',
                    inv.status === 'paid' ? 'bg-emerald-500' :
                    inv.status === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {inv.title ?? inv.fee_type ?? 'Invoice'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{inv.status}</p>
                  </div>
                  <span className={cn('text-sm font-bold',
                    inv.status === 'paid' ? 'text-emerald-600' :
                    inv.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                  )}>
                    ₹{(inv.total_amount ?? inv.amount ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}

              {pendingFees.length > 0 && (
                <div className="pt-3 mt-1 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600 font-semibold">Total Due</span>
                    <span className="text-lg font-black text-red-600">₹{totalDue.toLocaleString('en-IN')}</span>
                  </div>
                  <Link href="/fees"
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition">
                    Pay Now <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { user } = useAuthStore()
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  // Parent: fetch linked children
  const { data: childrenData, isLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => api.get('/api/v1/users/parent-links/my-children') as any,
    enabled: user?.role === 'parent',
  })
  const children: any[] = (childrenData as any)?.data ?? []

  // Auto-select first child
  const activeChild = children.find(c => c.id === selectedChildId) ?? children[0] ?? null

  // Non-parent fallback (student viewing own progress)
  if (user?.role !== 'parent') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
          <p className="text-gray-500 text-sm mt-1">Your academic performance and activity overview</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'My Attendance',  icon: ClipboardCheck, href: '/attendance',   color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { label: 'My Results',     icon: BookOpen,       href: '/results',      color: 'text-violet-600',  bg: 'bg-violet-50' },
            { label: 'Fee Invoices',   icon: CreditCard,     href: '/fees',         color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'My Awards',      icon: Trophy,         href: '/awards',       color: 'text-rose-600',    bg: 'bg-rose-50' },
            { label: 'Timetable',      icon: Calendar,       href: '/timetable',    color: 'text-teal-600',    bg: 'bg-teal-50' },
            { label: 'School Feed',    icon: TrendingUp,     href: '/feed',         color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-start gap-3 hover:shadow-md transition">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.bg)}>
                <item.icon size={18} className={item.color} />
              </div>
              <span className="text-sm font-semibold text-gray-900">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Users size={20} />
            <h1 className="text-xl font-bold">Child's Progress</h1>
          </div>
          <p className="text-indigo-200 text-sm">Track attendance, results, fees and awards for your child</p>
        </div>
        <GraduationCap size={80} className="absolute right-6 bottom-0 text-white/10" />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
          <GraduationCap size={32} className="mx-auto mb-2 text-gray-200 animate-pulse" />
          <p>Loading your children...</p>
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-indigo-300" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">No children linked</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
            Ask your school admin to link your account to your child's profile.
          </p>
        </div>
      ) : (
        <>
          {/* Child selector (only show if more than 1 child) */}
          {children.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {children.map(child => (
                <ChildCard
                  key={child.id}
                  child={child}
                  selected={(selectedChildId ?? children[0]?.id) === child.id}
                  onClick={() => setSelectedChildId(child.id)}
                />
              ))}
            </div>
          )}

          {activeChild && <ChildDetail child={activeChild} />}
        </>
      )}
    </div>
  )
}
