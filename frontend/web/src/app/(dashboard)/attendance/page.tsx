'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, Grid3X3, ChevronLeft, ChevronRight, Check, X, Clock, BookOpen,
  Users, GraduationCap, UserCog, Download, Search,
} from 'lucide-react'
import api from '../../../lib/api'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
type TabType = 'students' | 'teachers' | 'staff'
type ViewType = 'grid' | 'calendar'

const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; dot: string; label: string }> = {
  present: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Present' },
  absent:  { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500',   label: 'Absent' },
  late:    { bg: 'bg-yellow-100',text: 'text-yellow-700',dot: 'bg-yellow-500',label: 'Late' },
  excused: { bg: 'bg-purple-100',text: 'text-purple-700',dot: 'bg-purple-500',label: 'Excused' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function today() { return new Date().toISOString().split('T')[0] }

// ─── Calendar Cell Component ──────────────────────────────────────────────────
function CalendarCell({ date, summary, isToday, onClick }: {
  date: Date
  summary?: { present: number; absent: number; late: number; total: number }
  isToday: boolean
  onClick: () => void
}) {
  const rate = summary && summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : null
  const color = rate === null ? '' : rate >= 90 ? 'bg-green-500' : rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <button
      onClick={onClick}
      className={`aspect-square p-1.5 rounded-lg text-left hover:bg-gray-50 transition-colors border ${
        isToday ? 'border-indigo-300 bg-indigo-50' : 'border-transparent'
      }`}
    >
      <span className={`text-xs font-medium ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>
        {date.getDate()}
      </span>
      {rate !== null && (
        <div className="mt-1 flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
          <span className="text-[10px] text-gray-500">{rate}%</span>
        </div>
      )}
    </button>
  )
}

// ─── Student Attendance Grid ──────────────────────────────────────────────────
function StudentsGrid() {
  const qc = useQueryClient()
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<Record<string, AttendanceStatus>>({})
  const [search, setSearch] = useState('')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/api/v1/classes')
      return (res as any)?.data?.items ?? []
    },
  })

  const { data: students, isLoading } = useQuery({
    queryKey: ['class-students', selectedClass],
    queryFn: async () => {
      const res = await api.get(`/api/v1/classes/${selectedClass}/students`)
      return (res as any)?.data ?? []
    },
    enabled: !!selectedClass,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        class_id: selectedClass,
        date,
        entries: Object.entries(entries).map(([student_id, status]) => ({ student_id, status })),
      }
      await api.post('/api/v1/attendance', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
    },
  })

  const markAll = (status: AttendanceStatus) => {
    const all: Record<string, AttendanceStatus> = {}
    ;(students ?? []).forEach((s: any) => { all[s.id] = status })
    setEntries(all)
  }

  const filtered = useMemo(() =>
    (students ?? []).filter((s: any) =>
      `${s.first_name} ${s.last_name} ${s.student_code}`.toLowerCase().includes(search.toLowerCase())
    ), [students, search])

  const total = students?.length ?? 0
  const marked = Object.keys(entries).length
  const presentCount = Object.values(entries).filter(s => s === 'present').length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => { setSelectedClass(e.target.value); setEntries({}) }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select class...</option>
            {(classes ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
          />
        </div>
        {selectedClass && total > 0 && (
          <div className="flex gap-2">
            {(['present','absent','late','excused'] as AttendanceStatus[]).map(s => (
              <button key={s} onClick={() => markAll(s)}
                className={`${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize`}
              >
                All {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress */}
      {selectedClass && total > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-4 text-xs text-gray-500">
              <span>{marked}/{total} marked</span>
              <span className="text-green-600">{presentCount} present</span>
              <span className="text-red-600">{Object.values(entries).filter(s=>s==='absent').length} absent</span>
              <span className="text-yellow-600">{Object.values(entries).filter(s=>s==='late').length} late</span>
            </div>
            <span className="text-sm font-medium text-indigo-600">
              {total > 0 ? Math.round((presentCount / total) * 100) : 0}% present
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(marked / total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Table */}
      {!selectedClass ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
          <Users size={32} className="text-gray-200" />
          Select a class to start marking attendance
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 flex items-center justify-center h-48 text-gray-400 text-sm">
          Loading students...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Roll No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((student: any, idx: number) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {student.first_name} {student.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{student.student_code}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(['present','absent','late','excused'] as AttendanceStatus[]).map(s => {
                        const active = (entries[student.id] ?? 'present') === s
                        return (
                          <button key={s}
                            onClick={() => setEntries(prev => ({ ...prev, [student.id]: s }))}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                              active ? `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} ring-1 ring-current` : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {s === 'present' ? <Check size={10} className="inline mr-0.5" /> : s === 'absent' ? <X size={10} className="inline mr-0.5" /> : s === 'late' ? <Clock size={10} className="inline mr-0.5" /> : <BookOpen size={10} className="inline mr-0.5" />}
                            {s}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-3 flex justify-between items-center">
            <span className="text-xs text-gray-400">{filtered.length} students</span>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || marked === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Staff/Teacher Attendance Grid ───────────────────────────────────────────
function PersonnelGrid({ type }: { type: 'teachers' | 'staff' }) {
  const qc = useQueryClient()
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<Record<string, AttendanceStatus>>({})
  const [search, setSearch] = useState('')

  const endpoint = type === 'teachers' ? '/api/v1/teachers' : '/api/v1/staff'

  const { data: personnel, isLoading } = useQuery({
    queryKey: [type, 'list'],
    queryFn: async () => {
      const res = await api.get(endpoint)
      return (res as any)?.data?.items ?? []
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type,
        date,
        entries: Object.entries(entries).map(([person_id, status]) => ({ person_id, status })),
      }
      await api.post(`/api/v1/attendance/${type}`, payload)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', type] }),
  })

  const markAll = (status: AttendanceStatus) => {
    const all: Record<string, AttendanceStatus> = {}
    ;(personnel ?? []).forEach((p: any) => { all[p.id] = status })
    setEntries(all)
  }

  const filtered = useMemo(() =>
    (personnel ?? []).filter((p: any) =>
      `${p.first_name} ${p.last_name} ${p.employee_id ?? p.staff_code ?? ''}`.toLowerCase().includes(search.toLowerCase())
    ), [personnel, search])

  const total = personnel?.length ?? 0
  const marked = Object.keys(entries).length
  const presentCount = Object.values(entries).filter(s => s === 'present').length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder={`Search ${type}...`} value={search} onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
          />
        </div>
        {total > 0 && (
          <div className="flex gap-2">
            {(['present','absent','late','excused'] as AttendanceStatus[]).map(s => (
              <button key={s} onClick={() => markAll(s)}
                className={`${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} px-3 py-2 rounded-lg text-xs font-medium capitalize`}
              >All {s}</button>
            ))}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-4 text-xs text-gray-500">
              <span>{marked}/{total} marked</span>
              <span className="text-green-600">{presentCount} present</span>
              <span className="text-red-600">{Object.values(entries).filter(s=>s==='absent').length} absent</span>
            </div>
            <span className="text-sm font-medium text-indigo-600">
              {total > 0 ? Math.round((presentCount / total) * 100) : 0}% present
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(marked / total) * 100}%` }} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 flex items-center justify-center h-48 text-gray-400 text-sm">
          Loading {type}...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {type === 'teachers' ? 'Subject' : 'Department'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((person: any, idx: number) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
                        {person.first_name?.[0]}{person.last_name?.[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {person.first_name} {person.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                    {person.employee_id ?? person.staff_code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {person.subject ?? person.department ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(['present','absent','late','excused'] as AttendanceStatus[]).map(s => {
                        const active = (entries[person.id] ?? 'present') === s
                        return (
                          <button key={s}
                            onClick={() => setEntries(prev => ({ ...prev, [person.id]: s }))}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                              active ? `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} ring-1 ring-current` : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {s}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-3 flex justify-between items-center">
            <span className="text-xs text-gray-400">{filtered.length} {type}</span>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || marked === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ tab }: { tab: TabType }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState('')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/api/v1/classes')
      return (res as any)?.data?.items ?? []
    },
    enabled: tab === 'students',
  })

  const startOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay = startOfMonth.getDay()

  // fetch monthly summary
  const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`

  const { data: monthlySummary } = useQuery({
    queryKey: ['attendance-monthly', tab, year, month, selectedClass],
    queryFn: async () => {
      const params: Record<string, string> = { from_date: fromDate, to_date: toDate }
      if (tab === 'students' && selectedClass) params.class_id = selectedClass
      const res = await api.get(`/api/v1/attendance/summary`, { params })
      return (res as any)?.data ?? {}
    },
  })

  const todayStr = today()

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // build calendar grid cells
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  // selected date detail
  const { data: dayDetail } = useQuery({
    queryKey: ['attendance-day', tab, selectedDate, selectedClass],
    queryFn: async () => {
      const params: Record<string, string> = { date: selectedDate! }
      if (tab === 'students' && selectedClass) params.class_id = selectedClass
      const endpoint = tab === 'students' ? '/api/v1/attendance' : `/api/v1/attendance/${tab}`
      const res = await api.get(endpoint, { params })
      return (res as any)?.data ?? []
    },
    enabled: !!selectedDate,
  })

  return (
    <div className="space-y-4">
      {tab === 'students' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          >
            <option value="">All Classes</option>
            {(classes ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{MONTHS[month]} {year}</h3>
            <div className="flex gap-2">
              <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            {[
              { color: 'bg-green-500', label: '≥90% present' },
              { color: 'bg-yellow-500', label: '75–89%' },
              { color: 'bg-red-500', label: '<75%' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, idx) => {
              if (!date) return <div key={idx} />
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
              const summary = (monthlySummary as any)?.[dateStr]
              return (
                <CalendarCell
                  key={dateStr}
                  date={date}
                  summary={summary}
                  isToday={dateStr === todayStr}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                />
              )
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
              <CalendarDays size={32} className="text-gray-200" />
              <p>Click a day to view details</p>
            </div>
          ) : (
            <>
              <h4 className="font-semibold text-gray-900 mb-4">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h4>
              {!dayDetail || (Array.isArray(dayDetail) && dayDetail.length === 0) ? (
                <p className="text-sm text-gray-400">No records for this day</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(['present','absent','late','excused'] as AttendanceStatus[]).map(status => {
                    const group = (Array.isArray(dayDetail) ? dayDetail : []).filter((r: any) => r.status === status)
                    if (!group.length) return null
                    return (
                      <div key={status}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${STATUS_STYLES[status].dot}`} />
                          <span className={`text-xs font-semibold ${STATUS_STYLES[status].text} capitalize`}>
                            {status} ({group.length})
                          </span>
                        </div>
                        {group.map((r: any) => (
                          <p key={r.student_id ?? r.person_id} className="text-xs text-gray-500 pl-4">
                            {r.name ?? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()}
                          </p>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Monthly Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['present','absent','late','excused'] as AttendanceStatus[]).map(status => {
          const count = Object.values((monthlySummary as any) ?? {}).reduce((acc: number, day: any) => {
            return acc + (day?.[status] ?? 0)
          }, 0)
          return (
            <div key={status} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${STATUS_STYLES[status].dot}`} />
                <span className="text-xs font-medium text-gray-500 capitalize">{status}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400">entries this month</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: 'students', label: 'Students', icon: Users },
  { key: 'teachers', label: 'Teachers', icon: GraduationCap },
  { key: 'staff',    label: 'Staff',    icon: UserCog },
]

export default function AttendancePage() {
  const [tab, setTab] = useState<TabType>('students')
  const [view, setView] = useState<ViewType>('grid')

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage daily attendance</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Download size={15} />
          Export
        </button>
      </div>

      {/* Tab + View switcher */}
      <div className="flex items-center justify-between">
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
          <button
            onClick={() => setView('grid')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Grid3X3 size={15} />
            Mark Attendance
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'calendar' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CalendarDays size={15} />
            Calendar View
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'grid' ? (
        tab === 'students' ? <StudentsGrid /> : <PersonnelGrid type={tab} />
      ) : (
        <CalendarView tab={tab} />
      )}
    </div>
  )
}
