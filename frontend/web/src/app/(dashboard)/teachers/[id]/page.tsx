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

// ── Mock data generator ───────────────────────────────────────────────────────
function generateMockTeacher(id: string) {
  const names = [
    { first: 'Priya', last: 'Sharma',    subject: 'Mathematics',  qual: 'M.Sc Mathematics, B.Ed',   exp: 8  },
    { first: 'Ramesh', last: 'Kumar',    subject: 'Physics',       qual: 'M.Sc Physics, B.Ed',       exp: 12 },
    { first: 'Anjali', last: 'Verma',    subject: 'Chemistry',     qual: 'M.Sc Chemistry, B.Ed',     exp: 5  },
    { first: 'Suresh', last: 'Singh',    subject: 'English',       qual: 'M.A English, B.Ed',        exp: 15 },
    { first: 'Meena',  last: 'Joshi',    subject: 'Biology',       qual: 'M.Sc Biology, B.Ed',       exp: 7  },
    { first: 'Deepak', last: 'Rao',      subject: 'Social Science',qual: 'M.A History, B.Ed',        exp: 10 },
    { first: 'Kavita', last: 'Nair',     subject: 'Hindi',         qual: 'M.A Hindi, B.Ed',          exp: 6  },
    { first: 'Vikram', last: 'Patil',    subject: 'Computer Science',qual:'MCA, B.Ed',               exp: 4  },
  ]
  const hash = id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0)
  const n = names[hash % names.length]
  return {
    id,
    first_name: n.first, last_name: n.last,
    email: `${n.first.toLowerCase()}.${n.last.toLowerCase()}@school.in`,
    phone: `+91 ${9800000000 + (hash % 99999)}`,
    subject: n.subject, qualification: n.qual, experience: n.exp,
    status: 'active',
    joining_date: `${2024 - n.exp}-06-01`,
    address: 'Sector 12, Dwarka, New Delhi – 110075',
    employee_id: `TCH${2000 + (hash % 999)}`,
    blood_group: ['A+', 'B+', 'O+', 'AB+'][hash % 4],
    gender: hash % 3 === 0 ? 'Male' : 'Female',
    dob: `${1985 + (hash % 15)}-${String((hash % 12) + 1).padStart(2, '0')}-15`,
    specializations: [n.subject, 'Remedial Teaching', 'Academic Counselling'].slice(0, 2 + hash % 2),
    assigned_classes: [
      { class_name: '8-A', subject: n.subject, periods_per_week: 6, students: 38 },
      { class_name: '9-B', subject: n.subject, periods_per_week: 5, students: 42 },
      { class_name: '10-A', subject: n.subject, periods_per_week: 6, students: 40 },
    ].slice(0, 2 + hash % 2),
    class_teacher_of: hash % 2 === 0 ? '8-A' : null,
    responsibilities: [
      { title: `${n.subject} Department Head`, icon: 'shield', since: '2022' },
      { title: 'Academic Council Member', icon: 'users', since: '2023' },
      { title: 'Exam Coordinator', icon: 'clipboard', since: '2021' },
      ...(hash % 2 === 0 ? [{ title: 'Science Club In-charge', icon: 'flask', since: '2022' }] : []),
    ].slice(0, 2 + hash % 3),
    metrics: {
      attendance_pct: 92 + (hash % 7),
      classes_taken: 178 + (hash % 20),
      classes_scheduled: 195,
      assignments_created: 20 + (hash % 15),
      assignments_graded: 18 + (hash % 12),
      avg_student_marks: 68 + (hash % 20),
      student_pass_rate: 85 + (hash % 12),
      punctuality_score: 88 + (hash % 10),
      parent_feedback: (4.0 + (hash % 10) / 10).toFixed(1),
    },
  }
}

const MONTHLY = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']

function mockMonthly(seed: number) {
  return MONTHLY.slice(0, 9).map((month, i) => ({
    month,
    attendance: Math.min(100, 88 + (seed * i) % 12),
    classes: Math.min(100, 85 + (seed * i) % 14),
    student_avg: 60 + (seed * i) % 25,
  }))
}

const RADAR_DATA = (t: ReturnType<typeof generateMockTeacher>) => [
  { metric: 'Attendance',    value: t.metrics.attendance_pct },
  { metric: 'Coverage',      value: Math.round(t.metrics.classes_taken / t.metrics.classes_scheduled * 100) },
  { metric: 'Grading',       value: Math.round(t.metrics.assignments_graded / t.metrics.assignments_created * 100) },
  { metric: 'Pass Rate',     value: t.metrics.student_pass_rate },
  { metric: 'Punctuality',   value: t.metrics.punctuality_score },
  { metric: 'Feedback',      value: Math.round(parseFloat(t.metrics.parent_feedback as string) / 5 * 100) },
]

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

  const { data: apiData } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => api.get(`/api/v1/auth/users/${id}`) as any,
    retry: false,
  })

  const apiTeacher = (apiData as any)?.data
  const t = apiTeacher
    ? { ...generateMockTeacher(id), ...apiTeacher, metrics: generateMockTeacher(id).metrics, assigned_classes: generateMockTeacher(id).assigned_classes, responsibilities: generateMockTeacher(id).responsibilities, class_teacher_of: generateMockTeacher(id).class_teacher_of }
    : generateMockTeacher(id)

  const name = `${t.first_name} ${t.last_name}`
  const seed = name.charCodeAt(0) + name.charCodeAt(1)
  const monthly = mockMonthly(seed)
  const radarData = RADAR_DATA(t)

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
                {t.subject} · {t.experience} yrs experience · ID: {t.employee_id}
              </p>
            </div>
          </div>

          {/* Quick info row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            {[
              { icon: Mail,     val: t.email },
              { icon: Phone,    val: t.phone },
              { icon: Calendar, val: `Joined ${new Date(t.joining_date).getFullYear()}` },
              { icon: MapPin,   val: t.address?.split(',')[1]?.trim() || 'New Delhi' },
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
          { label: 'Attendance',      value: `${t.metrics.attendance_pct}%`,   color: 'text-emerald-600', icon: ClipboardCheck },
          { label: 'Classes Taken',   value: `${t.metrics.classes_taken}/${t.metrics.classes_scheduled}`, color: 'text-indigo-600', icon: BookOpen },
          { label: 'Student Pass %',  value: `${t.metrics.student_pass_rate}%`, color: 'text-violet-600', icon: Award },
          { label: 'Parent Rating',   value: `⭐ ${t.metrics.parent_feedback}`, color: 'text-amber-600',   icon: Star },
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
                ['Employee ID',    t.employee_id],
                ['Date of Birth',  t.dob],
                ['Gender',         t.gender],
                ['Blood Group',    t.blood_group],
                ['Qualification',  t.qualification],
                ['Experience',     `${t.experience} years`],
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
            <div className="flex flex-wrap gap-2 mb-6">
              {t.specializations.map((s: string) => (
                <span key={s} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium border border-indigo-100">
                  {s}
                </span>
              ))}
            </div>

            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Target size={16} className="text-emerald-500" /> Quick Stats
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'Assignments Created', val: t.metrics.assignments_created, total: 30, color: 'bg-indigo-500' },
                { label: 'Assignments Graded',  val: t.metrics.assignments_graded,  total: t.metrics.assignments_created, color: 'bg-emerald-500' },
                { label: 'Punctuality Score',   val: t.metrics.punctuality_score,   total: 100, color: 'bg-amber-500' },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{r.label}</span>
                    <span className="font-semibold text-gray-700">{r.val}/{r.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', r.color)} style={{ width: `${Math.round(r.val / r.total * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class teacher card */}
          {t.class_teacher_of && (
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Star size={20} className="text-white" fill="currentColor" />
                </div>
                <div>
                  <p className="font-bold text-lg">Class Teacher</p>
                  <p className="text-indigo-200 text-sm">Primary responsibility for student welfare</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 bg-white/10 rounded-xl p-4">
                {[
                  { label: 'Class', value: t.class_teacher_of },
                  { label: 'Students', value: t.assigned_classes.find((c: any) => c.class_name === t.class_teacher_of)?.students || 38 },
                  { label: 'Since', value: '2022' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-indigo-200 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Classes ── */}
      {tab === 'Classes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
            {[
              { label: 'Classes Assigned', value: t.assigned_classes.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Total Students',   value: t.assigned_classes.reduce((s: number, c: any) => s + c.students, 0), color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Periods / Week',   value: t.assigned_classes.reduce((s: number, c: any) => s + c.periods_per_week, 0), color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-2xl p-5 border border-gray-100', s.bg)}>
                <p className={cn('text-3xl font-black', s.color)}>{s.value}</p>
                <p className="text-sm text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {t.assigned_classes.map((cls: any) => (
            <div key={cls.class_name} className={cn(
              'bg-white rounded-2xl border-2 overflow-hidden shadow-sm',
              cls.class_name === t.class_teacher_of ? 'border-indigo-300' : 'border-gray-200'
            )}>
              <div className={cn(
                'flex items-center justify-between px-5 py-3',
                cls.class_name === t.class_teacher_of
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                  : 'bg-gray-50 border-b border-gray-100'
              )}>
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className={cls.class_name === t.class_teacher_of ? 'text-white' : 'text-indigo-500'} />
                  <span className="font-bold text-base">Class {cls.class_name}</span>
                  {cls.class_name === t.class_teacher_of && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                      Class Teacher
                    </span>
                  )}
                </div>
                <ChevronRight size={16} />
              </div>
              <div className="px-5 py-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Subject</p>
                  <p className="font-semibold text-gray-800">{cls.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Students</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1">
                    <Users size={13} className="text-gray-400" /> {cls.students}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Periods/Week</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1">
                    <Clock size={13} className="text-gray-400" /> {cls.periods_per_week}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Performance ── */}
      {tab === 'Performance' && (
        <div className="space-y-6">
          {/* Radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" /> Performance Radar
              </h3>
              <p className="text-xs text-gray-400 mb-4">Overall performance across 6 dimensions</p>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" /> Monthly Attendance
              </h3>
              <p className="text-xs text-gray-400 mb-4">This academic year</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="att" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="attendance" stroke="#6366f1" fill="url(#att)" strokeWidth={2} name="Attendance %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Student performance chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <BarChart3 size={16} className="text-violet-500" /> Student Results vs Class Coverage
            </h3>
            <p className="text-xs text-gray-400 mb-4">Monthly average marks of students vs classes taken</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="student_avg" fill="#8b5cf6" name="Avg Student Marks" radius={[4, 4, 0, 0]} />
                <Bar dataKey="classes"     fill="#6366f1" name="Class Coverage %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Avg Student Marks',   value: `${t.metrics.avg_student_marks}%`,   icon: BarChart3,    color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200' },
              { label: 'Punctuality Score',   value: `${t.metrics.punctuality_score}%`,   icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
              { label: 'Grading Completion',  value: `${Math.round(t.metrics.assignments_graded / t.metrics.assignments_created * 100)}%`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-2xl border p-5', s.bg, s.border)}>
                <s.icon size={20} className={cn('mb-2', s.color)} />
                <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                <p className="text-sm text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Responsibilities ── */}
      {tab === 'Responsibilities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {t.responsibilities.map((r: any, i: number) => {
            const Icon = RESP_ICONS[r.icon] ?? Briefcase
            const colors = [
              { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
              { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
              { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
              { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
            ]
            const c = colors[i % colors.length]
            return (
              <div key={r.title} className={cn('rounded-2xl border p-5 flex items-start gap-4', c.bg, c.border)}>
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', c.badge.split(' ')[0].replace('text', 'bg').replace('-700', '-100'))}>
                  <Icon size={20} className={c.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{r.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Since {r.since}</p>
                  <span className={cn('mt-2 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full', c.badge)}>
                    Active
                  </span>
                </div>
              </div>
            )
          })}
          {t.responsibilities.length === 0 && (
            <div className="md:col-span-2 text-center py-12 text-gray-400">
              <Briefcase size={32} className="mx-auto mb-2" />
              <p>No responsibilities assigned yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
