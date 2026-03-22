'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Building2, UserCog,
  ClipboardCheck, Clock, TrendingUp, CheckCircle2, BarChart3,
  Briefcase, Shield, Star, Target, Wrench, Package, FileText,
  ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, Legend,
} from 'recharts'
import api from '../../../../lib/api'
import { cn } from '../../../../lib/utils'

// ── Mock generator ────────────────────────────────────────────────────────────
const STAFF_POOL = [
  { first: 'Anjali',  last: 'Verma',   designation: 'Librarian',      dept: 'Library',        duties: ['Manage book inventory','Issue/return management','Digital catalogue','Reading programs'] },
  { first: 'Deepak',  last: 'Rao',     designation: 'Lab Assistant',   dept: 'Laboratory',     duties: ['Prepare lab equipment','Safety protocols','Inventory management','Student supervision'] },
  { first: 'Suresh',  last: 'Singh',   designation: 'IT Support',      dept: 'IT',             duties: ['Network maintenance','Device support','Software updates','Data backup'] },
  { first: 'Meena',   last: 'Joshi',   designation: 'Accountant',      dept: 'Finance',        duties: ['Fee collection','Payroll processing','Financial reports','Audit support'] },
  { first: 'Vikram',  last: 'Patil',   designation: 'Security Guard',  dept: 'Security',       duties: ['Gate management','Visitor log','CCTV monitoring','Emergency response'] },
  { first: 'Kavita',  last: 'Nair',    designation: 'Office Clerk',    dept: 'Administration', duties: ['Records management','Correspondence','Admissions support','Document filing'] },
  { first: 'Ramesh',  last: 'Kumar',   designation: 'Driver',          dept: 'Transport',      duties: ['Safe transport','Route management','Vehicle maintenance','Emergency pickups'] },
  { first: 'Priya',   last: 'Sharma',  designation: 'Counsellor',      dept: 'Administration', duties: ['Student counselling','Career guidance','Parent meetings','Behaviour reports'] },
]

function mockStaff(id: string) {
  const h = id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0)
  const p = STAFF_POOL[h % STAFF_POOL.length]
  return {
    id,
    first_name: p.first, last_name: p.last,
    email: `${p.first.toLowerCase()}.${p.last.toLowerCase()}@school.in`,
    phone: `+91 ${9700000000 + (h % 99999)}`,
    designation: p.designation, department: p.dept,
    duties: p.duties,
    status: 'active',
    joining_date: `${2020 + (h % 4)}-04-01`,
    address: 'Block B, Rohini, New Delhi – 110085',
    employee_id: `STF${3000 + (h % 999)}`,
    blood_group: ['A+', 'B+', 'O+', 'AB+'][h % 4],
    gender: h % 3 === 0 ? 'Male' : 'Female',
    dob: `${1983 + (h % 18)}-${String((h % 12) + 1).padStart(2, '0')}-10`,
    shift: ['Morning (7 AM – 3 PM)', 'General (9 AM – 5 PM)', 'Evening (1 PM – 9 PM)'][h % 3],
    metrics: {
      attendance_pct: 90 + (h % 9),
      tasks_completed: 85 + (h % 30),
      tasks_total: 120,
      punctuality_score: 87 + (h % 11),
      leaves_taken: 4 + (h % 8),
      complaints: h % 3,
      commendations: 1 + (h % 4),
    },
  }
}

const MONTHLY = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function mockMonthly(seed: number) {
  return MONTHLY.map((month, i) => ({
    month,
    attendance: Math.min(100, 87 + (seed * (i + 1)) % 13),
    tasks: Math.min(100, 80 + (seed * (i + 1)) % 18),
    punctuality: Math.min(100, 85 + (seed * (i + 1)) % 14),
  }))
}

const AVATAR_GRADS = [
  'from-amber-500 to-orange-600', 'from-teal-500 to-emerald-600',
  'from-rose-500 to-pink-600',    'from-slate-500 to-gray-600',
  'from-cyan-500 to-blue-600',    'from-violet-500 to-purple-600',
]
function aGrad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}

const DUTY_ICONS: React.ElementType[] = [Briefcase, Wrench, FileText, Package, Shield, ClipboardCheck, Target, Star]

const TABS = ['Overview', 'Responsibilities', 'Performance'] as const
type Tab = typeof TABS[number]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('Overview')

  const { data: apiData } = useQuery({
    queryKey: ['staff-member', id],
    queryFn: () => api.get(`/api/v1/auth/users/${id}`) as any,
    retry: false,
  })

  const api_s = (apiData as any)?.data
  const s = api_s ? { ...mockStaff(id), ...api_s, metrics: mockStaff(id).metrics, duties: mockStaff(id).duties } : mockStaff(id)
  const name = `${s.first_name} ${s.last_name}`
  const seed = name.charCodeAt(0) + name.charCodeAt(1)
  const monthly = mockMonthly(seed)

  const radarData = [
    { metric: 'Attendance',  value: s.metrics.attendance_pct },
    { metric: 'Task Rate',   value: Math.round(s.metrics.tasks_completed / s.metrics.tasks_total * 100) },
    { metric: 'Punctuality', value: s.metrics.punctuality_score },
    { metric: 'Discipline',  value: Math.max(0, 100 - s.metrics.complaints * 15) },
    { metric: 'Recognition', value: Math.min(100, s.metrics.commendations * 20) },
  ]

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
              { icon: Mail,     val: s.email },
              { icon: Phone,    val: s.phone },
              { icon: Building2,val: s.department },
              { icon: Calendar, val: `Joined ${new Date(s.joining_date).getFullYear()}` },
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
          { label: 'Attendance',      value: `${s.metrics.attendance_pct}%`,   color: 'text-emerald-600', icon: ClipboardCheck },
          { label: 'Tasks Done',      value: `${s.metrics.tasks_completed}/${s.metrics.tasks_total}`, color: 'text-indigo-600', icon: CheckCircle2 },
          { label: 'Punctuality',     value: `${s.metrics.punctuality_score}%`, color: 'text-violet-600', icon: Clock },
          { label: 'Commendations',   value: s.metrics.commendations,          color: 'text-amber-600',   icon: Star },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition">
            <s.icon size={18} className={cn('mb-2', s.color)} />
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-sm text-gray-600 mt-0.5">{s.label}</p>
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
                ['Date of Birth',s.dob],
                ['Gender',       s.gender],
                ['Blood Group',  s.blood_group],
                ['Shift',        s.shift],
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
              <BarChart3 size={16} className="text-indigo-500" /> Year Summary
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Attendance Rate',  val: s.metrics.attendance_pct, total: 100, color: 'bg-emerald-500' },
                { label: 'Tasks Completed',  val: s.metrics.tasks_completed, total: s.metrics.tasks_total, color: 'bg-indigo-500' },
                { label: 'Punctuality',      val: s.metrics.punctuality_score, total: 100, color: 'bg-violet-500' },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{r.label}</span>
                    <span className="font-semibold text-gray-700">{r.val}/{r.total}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', r.color)} style={{ width: `${Math.round(r.val / r.total * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
              {[
                { label: 'Leaves Taken',  value: s.metrics.leaves_taken,  color: 'text-amber-600',  bg: 'bg-amber-50' },
                { label: 'Complaints',    value: s.metrics.complaints,     color: 'text-rose-600',   bg: 'bg-rose-50' },
                { label: 'Commendations', value: s.metrics.commendations,  color: 'text-emerald-600',bg: 'bg-emerald-50' },
                { label: 'Discipline',    value: s.metrics.complaints === 0 ? 'Clean' : 'Review', color: s.metrics.complaints === 0 ? 'text-emerald-600' : 'text-amber-600', bg: s.metrics.complaints === 0 ? 'bg-emerald-50' : 'bg-amber-50' },
              ].map(c => (
                <div key={c.label} className={cn('rounded-xl p-3 text-center', c.bg)}>
                  <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Responsibilities ── */}
      {tab === 'Responsibilities' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {s.duties.map((duty: string, i: number) => {
              const Icon = DUTY_ICONS[i % DUTY_ICONS.length]
              const palettes = [
                { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
                { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
                { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
                { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
              ]
              const p = palettes[i % palettes.length]
              return (
                <div key={duty} className={cn('rounded-2xl border p-5 flex items-start gap-4', p.bg, p.border)}>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/60')}>
                    <Icon size={18} className={p.icon} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{duty}</p>
                    <span className={cn('mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full', p.badge)}>
                      Active
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Performance ── */}
      {tab === 'Performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <BarChart3 size={16} className="text-amber-500" /> Performance Overview
              </h3>
              <p className="text-xs text-gray-400 mb-4">5-dimension evaluation</p>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Radar name="Score" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly attendance */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" /> Monthly Attendance
              </h3>
              <p className="text-xs text-gray-400 mb-4">This academic year</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="satt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="attendance" stroke="#f59e0b" fill="url(#satt)" strokeWidth={2} name="Attendance %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks + Punctuality bar chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <BarChart3 size={16} className="text-violet-500" /> Task Completion & Punctuality
            </h3>
            <p className="text-xs text-gray-400 mb-4">Month-by-month breakdown</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="tasks"       fill="#8b5cf6" name="Task Rate %"    radius={[4, 4, 0, 0]} />
                <Bar dataKey="punctuality" fill="#f59e0b" name="Punctuality %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
