'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BookOpen, Users, ClipboardCheck, Bell, CalendarDays,
  GraduationCap, Trophy, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export function TeacherDashboard() {
  const { user } = useAuthStore()

  const { data: classesRaw } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/api/v1/classes') as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
  })
  const allClasses: any[] = classesRaw ?? []
  const myClasses = allClasses.filter((c: any) => c.class_teacher_id === user?.id)

  const { data: studentsRaw } = useQuery({
    queryKey: ['students-quick'],
    queryFn: () => api.get('/api/v1/users/students-list') as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
  })
  const students: any[] = studentsRaw ?? []

  const myClassIds = new Set(myClasses.map((c: any) => c.id))
  const myStudents = students.filter((s: any) => s.class_id && myClassIds.has(s.class_id))

  const { data: attRaw } = useQuery({
    queryKey: ['attendance-summary-today'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0]
      return api.get(`/api/v1/attendance/summary?from_date=${today}&to_date=${today}`) as any
    },
    select: (d: any) => d?.data ?? (typeof d === 'object' && !Array.isArray(d) ? d : {}),
  })
  const todaySummary = Object.values(attRaw ?? {})[0] as any

  const { data: notificationsRaw } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get('/api/v1/notifications?limit=5') as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
  })
  const notifications: any[] = notificationsRaw ?? []

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="My Classes"
          value={myClasses.length || allClasses.length}
          icon={BookOpen}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="My Students"
          value={myStudents.length || students.length}
          icon={Users}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Today Present"
          value={todaySummary?.present ?? '—'}
          icon={ClipboardCheck}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Today Absent"
          value={todaySummary?.absent ?? '—'}
          icon={ClipboardCheck}
          color="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Classes */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Classes</h3>
            <Link href="/classes" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {(myClasses.length > 0 ? myClasses : allClasses).slice(0, 5).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No classes assigned yet</p>
          ) : (
            <div className="space-y-2">
              {(myClasses.length > 0 ? myClasses : allClasses).slice(0, 5).map((c: any) => (
                <Link
                  key={c.id}
                  href={`/classes`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                    {c.grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">Grade {c.grade} · Section {c.section}</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Mark Attendance', href: '/attendance', icon: ClipboardCheck, color: 'bg-green-50 text-green-600 border-green-100' },
              { label: 'View Students', href: '/students', icon: Users, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
              { label: 'Assignments', href: '/assignments', icon: BookOpen, color: 'bg-amber-50 text-amber-600 border-amber-100' },
              { label: 'Give Award', href: '/awards', icon: Trophy, color: 'bg-rose-50 text-rose-600 border-rose-100' },
              { label: 'School Feed', href: '/feed', icon: Bell, color: 'bg-violet-50 text-violet-600 border-violet-100' },
              { label: 'Exams', href: '/exams', icon: GraduationCap, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
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
      {notifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Notifications</h3>
            <Link href="/notifications" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-indigo-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-400 truncate">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
