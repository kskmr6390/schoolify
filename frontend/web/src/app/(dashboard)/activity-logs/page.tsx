'use client'

import { useState, useMemo } from 'react'
import {
  Activity, Search, Filter, Download, Trash2, Calendar,
  User, Plus, Pencil, Eye, LogIn, LogOut, Upload, FileDown,
  ThumbsUp, ThumbsDown, X, Clock, ChevronDown, ChevronRight,
  GraduationCap, UserCog, BookOpen, ClipboardCheck, CreditCard,
  Megaphone, Settings, Shield, BarChart3, Users,
} from 'lucide-react'
import { useLogStore, ActivityLog, LogAction } from '../../../store/logStore'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'

// ── Demo seed logs (shown when no real logs exist) ────────────────────────────
function seedTime(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60000).toISOString()
}

const DEMO_LOGS: ActivityLog[] = [
  { id: 'd01', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'create', module: 'students', target: 'Student: Riya Sharma (Class 8-A)', detail: 'New student admitted — Riya Sharma enrolled in Class 8-A with roll no. 42', createdAt: seedTime(5) },
  { id: 'd02', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'update', module: 'students', target: 'Student: Arjun Mehta', detail: 'Updated contact info — parent phone changed from +91 9800012345 to +91 9900012345', metadata: { field: 'parent_phone', old: '+91 9800012345', new: '+91 9900012345' }, createdAt: seedTime(22) },
  { id: 'd03', tenantId: '__demo__', userId: 'u_teacher1', userName: 'Priya Sharma', userEmail: 'priya@school.in', userRole: 'teacher', action: 'create', module: 'attendance', target: 'Class 8-A — 2026-03-23', detail: 'Marked attendance for Class 8-A: 36 Present, 2 Absent, 0 Late', metadata: { present: 36, absent: 2, late: 0, date: '2026-03-23' }, createdAt: seedTime(45) },
  { id: 'd04', tenantId: '__demo__', userId: 'u_teacher2', userName: 'Ramesh Kumar', userEmail: 'ramesh@school.in', userRole: 'teacher', action: 'create', module: 'assignments', target: 'Assignment: Physics Chapter 7 — Class 10-B', detail: 'New assignment posted — Due date: 2026-03-30, Max marks: 20', metadata: { due: '2026-03-30', marks: 20 }, createdAt: seedTime(90) },
  { id: 'd05', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'create', module: 'teachers', target: 'Teacher: Kavita Nair', detail: 'New teacher account created — Kavita Nair (Hindi), Employee ID: TCH2034', createdAt: seedTime(120) },
  { id: 'd06', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'login', module: 'auth', target: 'Dashboard', detail: 'Admin logged in from 192.168.1.10', metadata: { ip: '192.168.1.10', browser: 'Chrome 121' }, createdAt: seedTime(130) },
  { id: 'd07', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'update', module: 'fees', target: 'Invoice #INV-2024-0089 — Rohan Verma', detail: 'Fee invoice updated — Status changed from Pending to Paid, Amount: ₹18,500', metadata: { invoice: 'INV-2024-0089', old_status: 'pending', new_status: 'paid', amount: 18500 }, createdAt: seedTime(180) },
  { id: 'd08', tenantId: '__demo__', userId: 'u_teacher1', userName: 'Priya Sharma', userEmail: 'priya@school.in', userRole: 'teacher', action: 'create', module: 'exams', target: 'Exam: Mid-Term Mathematics — Class 9', detail: 'Exam results published — Class 9 Mid-Term Math. Avg score: 72%, Pass rate: 88%', metadata: { avg: 72, pass_rate: 88, total_students: 42 }, createdAt: seedTime(240) },
  { id: 'd09', tenantId: '__demo__', userId: 'u_admin2', userName: 'Kavita Nair', userEmail: 'kavita@school.in', userRole: 'teacher', action: 'update', module: 'classes', target: 'Class 10-A', detail: 'Class timetable updated — Period 3 (Tuesday) changed from Free to Hindi', metadata: { day: 'Tuesday', period: 3, old: 'Free', new: 'Hindi' }, createdAt: seedTime(300) },
  { id: 'd10', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'create', module: 'roles', target: 'Role: Lab Coordinator', detail: 'New custom role created — Lab Coordinator with read access to 8 modules', createdAt: seedTime(360) },
  { id: 'd11', tenantId: '__demo__', userId: 'u_staff1', userName: 'Anjali Verma', userEmail: 'anjali@school.in', userRole: 'staff', action: 'login', module: 'auth', target: 'Dashboard', detail: 'Staff logged in from 192.168.1.22', createdAt: seedTime(420) },
  { id: 'd12', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'delete', module: 'students', target: 'Student: Amit Patel (Class 7-B)', detail: 'Student record deleted — Transfer case, destination: DPS Noida', metadata: { reason: 'transfer', destination: 'DPS Noida' }, createdAt: seedTime(500) },
  { id: 'd13', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'create', module: 'holidays', target: 'Holiday: Holi (2026-03-25)', detail: 'School holiday added — Holi on March 25, 2026 (National)', createdAt: seedTime(600) },
  { id: 'd14', tenantId: '__demo__', userId: 'u_teacher2', userName: 'Ramesh Kumar', userEmail: 'ramesh@school.in', userRole: 'teacher', action: 'update', module: 'exams', target: 'Result: Sneha Gupta — Physics Mid-Term', detail: 'Exam marks updated — Old: 42/80, New: 56/80 (re-evaluation approved)', metadata: { student: 'Sneha Gupta', old_marks: 42, new_marks: 56, max: 80 }, createdAt: seedTime(700) },
  { id: 'd15', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'export', module: 'reports', target: 'Annual Report — 2025-26', detail: 'Annual analytics report exported to PDF (124 pages)', createdAt: seedTime(800) },
  { id: 'd16', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'update', module: 'settings', target: 'School Profile', detail: 'School settings updated — Academic year start date changed to 2026-04-01', metadata: { field: 'academic_year_start', old: '2026-03-15', new: '2026-04-01' }, createdAt: seedTime(1440) },
  { id: 'd17', tenantId: '__demo__', userId: 'u_admin', userName: 'Suresh Singh', userEmail: 'suresh@school.in', userRole: 'admin', action: 'create', module: 'feed', target: 'Announcement: Annual Sports Day', detail: 'School announcement posted — Annual Sports Day scheduled for April 5, visible to everyone', createdAt: seedTime(2880) },
]

// ── Action meta ───────────────────────────────────────────────────────────────
const ACTION_META: Record<LogAction, {
  label: string; color: string; bg: string; border: string
  icon: React.ElementType; dot: string
}> = {
  create:  { label: 'Created',    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: Plus,       dot: 'bg-emerald-500' },
  update:  { label: 'Updated',    color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: Pencil,     dot: 'bg-blue-500' },
  delete:  { label: 'Deleted',    color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200',    icon: Trash2,     dot: 'bg-rose-500' },
  view:    { label: 'Viewed',     color: 'text-gray-600',    bg: 'bg-gray-50',     border: 'border-gray-200',    icon: Eye,        dot: 'bg-gray-400' },
  login:   { label: 'Login',      color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  icon: LogIn,      dot: 'bg-indigo-500' },
  logout:  { label: 'Logout',     color: 'text-slate-700',   bg: 'bg-slate-50',    border: 'border-slate-200',   icon: LogOut,     dot: 'bg-slate-400' },
  export:  { label: 'Exported',   color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200',  icon: FileDown,   dot: 'bg-violet-500' },
  import:  { label: 'Imported',   color: 'text-cyan-700',    bg: 'bg-cyan-50',     border: 'border-cyan-200',    icon: Upload,     dot: 'bg-cyan-500' },
  approve: { label: 'Approved',   color: 'text-teal-700',    bg: 'bg-teal-50',     border: 'border-teal-200',    icon: ThumbsUp,   dot: 'bg-teal-500' },
  reject:  { label: 'Rejected',   color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  icon: ThumbsDown, dot: 'bg-orange-500' },
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  students:    Users,
  teachers:    GraduationCap,
  staff:       UserCog,
  attendance:  ClipboardCheck,
  fees:        CreditCard,
  exams:       BarChart3,
  assignments: BookOpen,
  classes:     BookOpen,
  feed:        Megaphone,
  settings:    Settings,
  roles:       Shield,
  auth:        LogIn,
  reports:     BarChart3,
  holidays:    Calendar,
}

const ALL_ACTIONS: LogAction[] = ['create','update','delete','view','login','logout','export','import','approve','reject']
const PAGE_SIZE = 20

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const AV_GRADS = [
  'from-indigo-400 to-violet-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',     'from-purple-400 to-indigo-500',
]
function avGrad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AV_GRADS[h % AV_GRADS.length]
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Timeline entry ────────────────────────────────────────────────────────────
function TimelineEntry({ log, isLast }: { log: ActivityLog; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const meta   = ACTION_META[log.action]
  const Icon   = meta.icon
  const ModIcon = MODULE_ICONS[log.module] ?? Activity

  return (
    <div className="flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br text-white text-xs font-bold shadow-sm', avGrad(log.userName))}>
          {initials(log.userName)}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-100 mt-1" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1 mb-4', isLast ? '' : '')}>
        <div
          className={cn(
            'bg-white rounded-2xl border overflow-hidden shadow-sm transition hover:shadow-md cursor-pointer',
            expanded ? 'border-gray-300' : 'border-gray-100'
          )}
          onClick={() => setExpanded(e => !e)}
        >
          {/* Main row */}
          <div className="flex items-start gap-3 p-4">
            {/* Action badge */}
            <span className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border mt-0.5 flex-shrink-0', meta.bg, meta.border, meta.color)}>
              <Icon size={10} /> {meta.label}
            </span>

            {/* Module chip */}
            <span className="flex items-center gap-1 text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full border border-gray-100 mt-0.5 flex-shrink-0">
              <ModIcon size={10} /> {log.module}
            </span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-snug">
                <span className="font-semibold text-gray-900">{log.userName}</span>
                {log.detail ? ` — ${log.detail}` : ''}
              </p>
              {log.target && (
                <p className="text-xs text-indigo-600 mt-0.5 font-medium">{log.target}</p>
              )}
            </div>

            {/* Time + expand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-gray-400">{relTime(log.createdAt)}</p>
                <p className="text-[10px] text-gray-300">{fmtTime(log.createdAt)}</p>
              </div>
              <ChevronDown size={14} className={cn('text-gray-300 transition-transform', expanded && 'rotate-180')} />
            </div>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'User',      value: log.userName, sub: log.userEmail },
                  { label: 'Role',      value: log.userRole, sub: '' },
                  { label: 'Module',    value: log.module,   sub: '' },
                  { label: 'Timestamp', value: fmtDate(log.createdAt), sub: fmtTime(log.createdAt) },
                ].map(f => (
                  <div key={f.label} className="bg-white rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">{f.label}</p>
                    <p className="text-xs font-semibold text-gray-800 capitalize">{f.value}</p>
                    {f.sub && <p className="text-[10px] text-gray-400">{f.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Metadata diff view */}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-3">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Change Details</p>
                  <div className="space-y-1.5">
                    {log.metadata.old !== undefined && log.metadata.new !== undefined ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg font-mono border border-rose-100">
                          — {String(log.metadata.old)}
                        </span>
                        <ChevronRight size={12} className="text-gray-300" />
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg font-mono border border-emerald-100">
                          + {String(log.metadata.new)}
                        </span>
                      </div>
                    ) : (
                      Object.entries(log.metadata).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 capitalize min-w-[80px]">{k.replace(/_/g, ' ')}:</span>
                          <span className="font-semibold text-gray-700">{String(v)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Date group header ─────────────────────────────────────────────────────────
function DateHeader({ date }: { date: string }) {
  const d = new Date(date)
  const today     = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  const label = d.toDateString() === today.toDateString()     ? 'Today'
    : d.toDateString() === yesterday.toDateString()           ? 'Yesterday'
    : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 bg-gray-50 rounded-full py-1 border border-gray-200">
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ActivityLogsPage() {
  const { tenant, user } = useAuthStore()
  const { getByTenant, clear } = useLogStore()

  const tenantId = tenant?.tenant_id ?? ''
  const realLogs = getByTenant(tenantId)
  // Show demo logs if no real logs exist
  const allLogs  = realLogs.length > 0 ? realLogs : DEMO_LOGS

  const [search,       setSearch]       = useState('')
  const [filterAction, setFilterAction] = useState<LogAction | ''>('')
  const [filterModule, setFilterModule] = useState('')
  const [filterUser,   setFilterUser]   = useState('')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [page,         setPage]         = useState(1)
  const [showFilters,  setShowFilters]  = useState(false)

  const modules = useMemo(() => Array.from(new Set(allLogs.map(l => l.module))).sort(), [allLogs])
  const users   = useMemo(() => Array.from(new Set(allLogs.map(l => l.userName))).sort(), [allLogs])

  const filtered = useMemo(() =>
    allLogs.filter(l => {
      if (filterAction && l.action !== filterAction) return false
      if (filterModule && l.module !== filterModule) return false
      if (filterUser   && l.userName !== filterUser) return false
      if (dateFrom && l.createdAt < dateFrom) return false
      if (dateTo   && l.createdAt > dateTo + 'T23:59:59') return false
      if (search) {
        const q = search.toLowerCase()
        return (
          l.userName.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q) ||
          (l.detail ?? '').toLowerCase().includes(q) ||
          (l.target ?? '').toLowerCase().includes(q)
        )
      }
      return true
    }),
    [allLogs, filterAction, filterModule, filterUser, dateFrom, dateTo, search]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Group by date for timeline
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLog[]>()
    paged.forEach(l => {
      const key = l.createdAt.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [paged])

  const exportCSV = () => {
    const headers = ['Timestamp','User','Email','Role','Action','Module','Target','Detail']
    const rows = filtered.map(l => [l.createdAt, l.userName, l.userEmail, l.userRole, l.action, l.module, l.target ?? '', l.detail ?? ''])
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `activity-logs-${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // Stats
  const todayStr  = new Date().toISOString().slice(0, 10)
  const todayCount = allLogs.filter(l => l.createdAt.startsWith(todayStr)).length
  const editCount  = allLogs.filter(l => ['create','update','delete'].includes(l.action)).length

  const activeFilters = [filterAction, filterModule, filterUser, dateFrom, dateTo].filter(Boolean).length

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={20} />
                <h1 className="text-xl font-bold">Activity Logs</h1>
              </div>
              <p className="text-slate-300 text-sm">Complete audit trail of all user actions across the dashboard</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-xl text-sm font-medium transition">
                <Download size={14} /> Export
              </button>
              {user?.role === 'super_admin' && (
                <button onClick={() => { if (confirm('Clear all logs?')) clear(tenantId) }}
                  className="flex items-center gap-2 bg-rose-500/80 hover:bg-rose-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
        <Activity size={80} className="absolute right-6 bottom-2 text-white/5" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events',  value: allLogs.length,  color: 'text-gray-900',    icon: Activity,   bg: 'bg-white' },
          { label: 'Today',         value: todayCount,       color: 'text-indigo-600',  icon: Calendar,   bg: 'bg-indigo-50' },
          { label: 'Edits/Creates', value: editCount,        color: 'text-amber-600',   icon: Pencil,     bg: 'bg-amber-50' },
          { label: 'Unique Users',  value: users.length,     color: 'text-emerald-600', icon: User,       bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl border border-gray-200 p-5', s.bg)}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.color} />
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className={cn('text-2xl font-black', s.color)}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by user, module, description, or target..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={cn('flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              showFilters || activeFilters > 0
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50 bg-white')}>
            <Filter size={14} /> Filters
            {activeFilters > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <select value={filterAction} onChange={e => { setFilterAction(e.target.value as LogAction | ''); setPage(1) }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All Actions</option>
              {ALL_ACTIONS.map(a => <option key={a} value={a}>{ACTION_META[a].label}</option>)}
            </select>
            <select value={filterModule} onChange={e => { setFilterModule(e.target.value); setPage(1) }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All Modules</option>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1) }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All Users</option>
              {users.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filtered.length.toLocaleString()} events{realLogs.length === 0 ? ' (demo data)' : ''}</span>
          {filtered.length > PAGE_SIZE && <span>Page {page} of {totalPages}</span>}
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <Activity size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">No activity found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting filters or search</p>
        </div>
      ) : (
        <div>
          {grouped.map(([date, entries]) => (
            <div key={date}>
              <DateHeader date={date} />
              {entries.map((log, i) => (
                <TimelineEntry key={log.id} log={log} isLast={i === entries.length - 1 && grouped[grouped.length - 1][0] === date} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 bg-white">
            Previous
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const pg = page <= 4 ? i + 1 : page + i - 3
            if (pg < 1 || pg > totalPages) return null
            return (
              <button key={pg} onClick={() => setPage(pg)}
                className={cn('w-9 h-9 rounded-xl text-sm font-medium transition-colors',
                  pg === page ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 border border-gray-200 bg-white'
                )}>{pg}</button>
            )
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 bg-white">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
