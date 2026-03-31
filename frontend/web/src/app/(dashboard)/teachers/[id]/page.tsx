'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, GraduationCap, Mail, Phone, MapPin, Calendar, BookOpen,
  Users, ClipboardCheck, Award, Star, TrendingUp, TrendingDown,
  Clock, CheckCircle2, BarChart3, Target, Briefcase, Shield,
  BookMarked, FlaskConical, Trophy, ChevronRight,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
} from 'recharts'
import api from '../../../../lib/api'
import { cn } from '../../../../lib/utils'


// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_GRADS = [
  'from-indigo-500 to-violet-600', 'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',     'from-purple-500 to-indigo-600',
]
function grad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}

function Stat({ label, value, sub, color = 'text-gray-900', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ElementType
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition">
      {Icon && <div className="mb-3"><Icon size={18} className="text-gray-400" /></div>}
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const RESP_ICONS: Record<string, React.ElementType> = {
  shield: Shield, users: Users, clipboard: ClipboardCheck,
  flask: FlaskConical, book: BookMarked, trophy: Trophy,
}

const TABS = ['Overview', 'Classes', 'Performance', 'Responsibilities'] as const
type Tab = typeof TABS[number]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('Overview')

  const { data: userData, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => api.get(`/api/v1/auth/users/${id}`) as any,
    retry: false,
  })

  const { data: staffData } = useQuery({
    queryKey: ['staff-profile', id],
    queryFn: () => api.get(`/api/v1/users/staff-profiles/${id}`) as any,
    retry: false,
  })

  const u = (userData as any)?.data ?? {}
  const sp = (staffData as any)?.data ?? {}

  const t = {
    id,
    first_name:      u.first_name ?? '—',
    last_name:       u.last_name  ?? '',
    email:           u.email      ?? '—',
    phone:           u.phone      ?? sp.phone ?? '—',
    status:          u.status     ?? 'active',
    employee_id:     sp.employee_id ?? '—',
    department:      sp.department  ?? '—',
    designation:     sp.designation ?? '—',
    joining_date:    sp.date_of_joining ?? u.created_at ?? null,
    qualifications:  (sp.qualifications ?? []) as string[],
    subject_expertise: (sp.subject_expertise ?? []) as string[],
    address:         sp.address ?? '—',
  }

  const name = `${t.first_name} ${t.last_name}`.trim() || '—'

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-gray-400">
        <GraduationCap size={40} className="mx-auto mb-3 text-gray-200" />
        <p>Loading teacher profile...</p>
      </div>
    )
  }

  if (!u.id) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-gray-400">
        <GraduationCap size={40} className="mx-auto mb-3 text-gray-200" />
        <p className="font-semibold text-gray-600">Teacher not found</p>
        <Link href="/teachers" className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
          <ArrowLeft size={14} /> Back to Teachers
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Back */}
      <Link href="/teachers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={15} /> Back to Teachers
      </Link>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className={cn('h-28 bg-gradient-to-br', grad(name))} />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-5 -mt-12 mb-4">
            <div className={cn(
              'w-24 h-24 rounded-2xl border-4 border-white flex items-center justify-center text-3xl font-black text-white bg-gradient-to-br shadow-lg',
              grad(name),
            )}>
              {t.first_name[0]}{t.last_name[0]}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <span className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                  t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                )}>
                  {t.status}
                </span>
                {t.class_teacher_of && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 flex items-center gap-1">
                    <Star size={9} fill="currentColor" /> Class Teacher · {t.class_teacher_of}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {t.subject_expertise.join(', ') || t.designation} · ID: {t.employee_id}
              </p>
            </div>
          </div>

          {/* Quick info row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            {[
              { icon: Mail,     val: t.email },
              { icon: Phone,    val: t.phone },
              { icon: Calendar, val: t.joining_date ? `Joined ${new Date(t.joining_date).getFullYear()}` : 'Joining date N/A' },
              { icon: MapPin,   val: t.address !== '—' ? (t.address.split(',')[1]?.trim() || t.address) : 'Address N/A' },
            ].map(({ icon: Icon, val }) => (
              <div key={val} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon size={14} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Department',      value: t.department,  color: 'text-indigo-600',  icon: Briefcase },
          { label: 'Designation',     value: t.designation, color: 'text-violet-600',  icon: Target },
          { label: 'Employee ID',     value: t.employee_id, color: 'text-emerald-600', icon: ClipboardCheck },
          { label: 'Status',          value: t.status,      color: 'text-amber-600',   icon: Star },
        ].map(s => <Stat key={s.label} {...s} />)}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap size={16} className="text-indigo-500" /> Personal Details
            </h3>
            <dl className="space-y-3">
              {[
                ['Employee ID',   t.employee_id],
                ['Department',    t.department],
                ['Designation',   t.designation],
                ['Joined',        t.joining_date ? new Date(t.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
                ['Email',         t.email],
                ['Phone',         t.phone],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <dt className="text-gray-400">{k}</dt>
                  <dd className="font-medium text-gray-800 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Specializations */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookMarked size={16} className="text-violet-500" /> Specializations
            </h3>
            {t.qualifications.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-6">
                {t.qualifications.map((q: string) => (
                  <span key={q} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium border border-indigo-100">
                    {q}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-6">No qualifications recorded</p>
            )}

            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Target size={16} className="text-emerald-500" /> Subject Expertise
            </h3>
            {t.subject_expertise.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {t.subject_expertise.map((s: string) => (
                  <span key={s} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No subject expertise recorded</p>
            )}
          </div>

        </div>
      )}

      {/* ── Classes ── */}
      {tab === 'Classes' && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BookOpen size={40} className="mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Class assignment data not available</p>
          <p className="text-sm mt-1">Timetable integration coming soon</p>
        </div>
      )}

      {/* ── Performance ── */}
      {tab === 'Performance' && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BarChart3 size={40} className="mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Performance analytics not available</p>
          <p className="text-sm mt-1">Analytics integration coming soon</p>
        </div>
      )}

      {/* ── Responsibilities ── */}
      {tab === 'Responsibilities' && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Briefcase size={40} className="mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">No responsibilities recorded</p>
          <p className="text-sm mt-1">Responsibilities can be added via admin settings</p>
        </div>
      )}
    </div>
  )
}
