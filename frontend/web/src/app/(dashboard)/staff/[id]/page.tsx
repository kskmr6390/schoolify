'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Mail, Phone, Calendar, Building2, UserCog,
  BarChart3, Briefcase, Star, Target,
} from 'lucide-react'
import api from '../../../../lib/api'
import { cn } from '../../../../lib/utils'

const AVATAR_GRADS = [
  'from-amber-500 to-orange-600', 'from-teal-500 to-emerald-600',
  'from-rose-500 to-pink-600',    'from-slate-500 to-gray-600',
  'from-cyan-500 to-blue-600',    'from-violet-500 to-purple-600',
]
function aGrad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}

const TABS = ['Overview', 'Responsibilities', 'Performance'] as const
type Tab = typeof TABS[number]

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('Overview')

  const { data: userData, isLoading } = useQuery({
    queryKey: ['staff-member', id],
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

  const s = {
    first_name:        u.first_name ?? '—',
    last_name:         u.last_name  ?? '',
    email:             u.email      ?? '—',
    phone:             u.phone      ?? sp.phone ?? '—',
    status:            u.status     ?? 'active',
    employee_id:       sp.employee_id       ?? '—',
    department:        sp.department        ?? '—',
    designation:       sp.designation       ?? '—',
    joining_date:      sp.date_of_joining   ?? u.created_at ?? null,
    address:           sp.address           ?? '—',
    qualifications:    (sp.qualifications    ?? []) as string[],
    subject_expertise: (sp.subject_expertise ?? []) as string[],
  }

  const name = `${s.first_name} ${s.last_name}`.trim() || '—'

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-gray-400">
        <UserCog size={40} className="mx-auto mb-3 text-gray-200" />
        <p>Loading staff profile...</p>
      </div>
    )
  }

  if (!u.id) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-gray-400">
        <UserCog size={40} className="mx-auto mb-3 text-gray-200" />
        <p className="font-semibold text-gray-600">Staff member not found</p>
        <Link href="/staff" className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
          <ArrowLeft size={14} /> Back to Staff
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <Link href="/staff" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={15} /> Back to Staff
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className={cn('h-28 bg-gradient-to-br', aGrad(name))} />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-5 -mt-12 mb-4">
            <div className={cn('w-24 h-24 rounded-2xl border-4 border-white flex items-center justify-center text-3xl font-black text-white bg-gradient-to-br shadow-lg', aGrad(name))}>
              {s.first_name[0]}{s.last_name[0]}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold',
                  s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
                  {s.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {s.designation} · {s.department} Dept · ID: {s.employee_id}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            {[
              { icon: Mail,      val: s.email },
              { icon: Phone,     val: s.phone },
              { icon: Building2, val: s.department },
              { icon: Calendar,  val: s.joining_date ? `Joined ${new Date(s.joining_date).getFullYear()}` : 'Joining date N/A' },
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
          { label: 'Department',  value: s.department,  color: 'text-amber-600',   icon: Building2 },
          { label: 'Designation', value: s.designation, color: 'text-indigo-600',  icon: Target },
          { label: 'Employee ID', value: s.employee_id, color: 'text-emerald-600', icon: Briefcase },
          { label: 'Status',      value: s.status,      color: 'text-violet-600',  icon: Star },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition">
            <item.icon size={18} className={cn('mb-2', item.color)} />
            <p className={cn('text-2xl font-bold truncate', item.color)}>{item.value}</p>
            <p className="text-sm text-gray-600 mt-0.5">{item.label}</p>
          </div>
        ))}
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
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserCog size={16} className="text-amber-500" /> Personal Details
            </h3>
            <dl className="space-y-3">
              {[
                ['Employee ID',  s.employee_id],
                ['Department',   s.department],
                ['Designation',  s.designation],
                ['Joined',       s.joining_date ? new Date(s.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
                ['Email',        s.email],
                ['Phone',        s.phone],
                ['Address',      s.address],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm gap-4">
                  <dt className="text-gray-400 flex-shrink-0">{k}</dt>
                  <dd className="font-medium text-gray-800 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target size={16} className="text-indigo-500" /> Qualifications
            </h3>
            {s.qualifications.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-6">
                {s.qualifications.map((q: string) => (
                  <span key={q} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium border border-amber-100">{q}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-6">No qualifications recorded</p>
            )}

            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase size={16} className="text-emerald-500" /> Subject Expertise
            </h3>
            {s.subject_expertise.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {s.subject_expertise.map((sub: string) => (
                  <span key={sub} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100">{sub}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No subject expertise recorded</p>
            )}
          </div>
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

      {/* ── Performance ── */}
      {tab === 'Performance' && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BarChart3 size={40} className="mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Performance analytics not available</p>
          <p className="text-sm mt-1">Analytics integration coming soon</p>
        </div>
      )}
    </div>
  )
}
