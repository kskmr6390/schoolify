'use client'

import { useQuery } from '@tanstack/react-query'
import {
  ClipboardCheck, Trophy, Bell, CreditCard, BookOpen,
  CalendarDays, ArrowRight, GraduationCap,
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'

export function StudentDashboard() {
  const { user } = useAuthStore()

  // Get student profile
  const { data: studentRaw } = useQuery({
    queryKey: ['student-me'],
    queryFn: () => api.get('/api/v1/students/me') as any,
    select: (d: any) => d?.data ?? d,
  })
  const student = studentRaw as any

  // Attendance summary
  const { data: attRaw } = useQuery({
    queryKey: ['attendance-summary-me', student?.id],
    queryFn: () => api.get(`/api/v1/attendance/student/${student.id}/summary`) as any,
    select: (d: any) => d?.data ?? d,
    enabled: !!student?.id,
  })
  const att = attRaw as any

  // My awards
  const { data: awardsRaw } = useQuery({
    queryKey: ['awards', 'my', user?.id],
    queryFn: () => api.get('/api/v1/notifications/awards') as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
  })
  const awards: any[] = awardsRaw ?? []

  // Recent notifications
  const { data: notifsRaw } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get('/api/v1/notifications?limit=5') as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
  })
  const notifs: any[] = notifsRaw ?? []

  // Fee invoices
  const { data: feesRaw } = useQuery({
    queryKey: ['my-fees'],
    queryFn: () => api.get('/api/v1/fees/invoices?limit=3') as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
  })
  const fees: any[] = feesRaw ?? []
  const pendingFees = fees.filter((f: any) => f.status === 'pending' || f.status === 'overdue')

  const attPct = att?.percentage ?? null
  const attColor = attPct === null ? 'text-gray-400' : attPct >= 90 ? 'text-green-600' : attPct >= 75 ? 'text-amber-600' : 'text-red-600'
  const attBg = attPct === null ? 'bg-gray-50' : attPct >= 90 ? 'bg-green-50' : attPct >= 75 ? 'bg-amber-50' : 'bg-red-50'

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${attBg} ${attColor}`}>
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className={`text-xl font-bold ${attColor}`}>
              {attPct !== null ? `${attPct}%` : '—'}
            </p>
            <p className="text-xs text-gray-500">Attendance</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600">
            <Trophy size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{awards.length}</p>
            <p className="text-xs text-gray-500">Awards</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${pendingFees.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            <CreditCard size={20} />
          </div>
          <div>
            <p className={`text-xl font-bold ${pendingFees.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {pendingFees.length > 0 ? `${pendingFees.length} due` : 'Clear'}
            </p>
            <p className="text-xs text-gray-500">Fee Status</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">
              {student ? `Grade ${student.class_id ? '—' : '—'}` : '—'}
            </p>
            <p className="text-xs text-gray-500">{student?.student_code ?? 'Student'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Detail */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Attendance</h3>
            <Link href="/attendance" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View <ArrowRight size={12} />
            </Link>
          </div>
          {!att ? (
            <p className="text-sm text-gray-400 text-center py-6">No attendance records yet</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Rate</span>
                <span className={`text-sm font-bold ${attColor}`}>{att.percentage}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${attPct >= 90 ? 'bg-green-500' : attPct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${att.percentage}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: 'Present', value: att.present, color: 'text-green-600' },
                  { label: 'Absent',  value: att.absent,  color: 'text-red-600' },
                  { label: 'Late',    value: att.late,    color: 'text-amber-600' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value ?? 0}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'My Timetable', href: '/timetable', icon: CalendarDays, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
              { label: 'Assignments', href: '/assignments', icon: BookOpen, color: 'bg-amber-50 text-amber-600 border-amber-100' },
              { label: 'My Fees', href: '/fees', icon: CreditCard, color: 'bg-rose-50 text-rose-600 border-rose-100' },
              { label: 'My Awards', href: '/awards', icon: Trophy, color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
              { label: 'School Feed', href: '/feed', icon: Bell, color: 'bg-violet-50 text-violet-600 border-violet-100' },
              { label: 'Notifications', href: '/notifications', icon: Bell, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
            ].map(q => (
              <Link
                key={q.href}
                href={q.href}
                className={`flex items-center gap-2.5 p-3 rounded-xl border ${q.color} hover:opacity-80 transition-opacity`}
              >
                <q.icon size={16} />
                <span className="text-xs font-medium">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      {notifs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Notifications</h3>
            <Link href="/notifications" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {notifs.slice(0, 4).map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-indigo-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-400 truncate">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awards */}
      {awards.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Awards</h3>
            <Link href="/awards" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {awards.slice(0, 4).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Trophy size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900 truncate">{a.title}</p>
                  <p className="text-xs text-amber-600">{a.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
