'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import api from '../../../lib/api'

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
// Map backend audit log → ActivityLog shape
function mapAuditLog(r: any, tenantId: string): ActivityLog {
  const action = (r.action ?? '').toLowerCase().replace('create', 'create').replace('update', 'update').replace('delete', 'delete').replace('login', 'login').replace('logout', 'logout') as LogAction
  return {
    id:        r.id,
    tenantId,
    userId:    r.user_id ?? '',
    userName:  r.user_name ?? r.user_email ?? r.user_id?.slice(0, 8) ?? 'System',
    userEmail: r.user_email ?? '',
    userRole:  r.user_role ?? 'admin',
    action:    (ACTION_META[action as LogAction] ? action : 'update') as LogAction,
    module:    r.resource ?? 'system',
    target:    r.resource_id ? `${r.resource} #${r.resource_id}` : r.resource,
    detail:    r.extra_data?.detail ?? (r.success ? undefined : 'Action failed'),
    metadata:  r.extra_data ?? (r.ip_address ? { ip: r.ip_address } : undefined),
    createdAt: r.created_at,
  }
}

export default function ActivityLogsPage() {
  const { tenant, user } = useAuthStore()
  const { getByTenant, clear } = useLogStore()

  const tenantId = tenant?.tenant_id ?? ''
  const localLogs = getByTenant(tenantId)

  // Fetch backend audit logs
  const { data: auditData } = useQuery({
    queryKey: ['audit-logs', tenantId],
    queryFn: async () => {
      const res = await api.get('/api/v1/auth/audit-logs?limit=200') as any
      return (res?.data?.items ?? res?.items ?? []) as any[]
    },
    enabled: !!tenantId && (user?.role === 'admin' || user?.role === 'super_admin'),
    staleTime: 30000,
  })

  const backendLogs: ActivityLog[] = (auditData ?? []).map((r: any) => mapAuditLog(r, tenantId))

  // Merge: local logs first (most recent actions), then backend logs (deduplicated by id)
  const localIds = new Set(localLogs.map(l => l.id))
  const merged = [...localLogs, ...backendLogs.filter(l => !localIds.has(l.id))]
  const allLogs = merged

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
          <span>{filtered.length.toLocaleString()} events</span>
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
