'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ChevronLeft, ChevronRight, X, CalendarDays, Flag, Star, BookOpen, Building2 } from 'lucide-react'
import api from '../../../lib/api'

type HolidayType = 'national' | 'religious' | 'school' | 'state'

interface Holiday {
  id: string
  name: string
  date: string
  type: HolidayType
  description?: string
}

const TYPE_META: Record<HolidayType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  national:  { label: 'National',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: Flag },
  religious: { label: 'Religious', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: Star },
  school:    { label: 'School',    color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: BookOpen },
  state:     { label: 'State',     color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Building2 },
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Indian national + major religious holidays 2025
const DEFAULT_HOLIDAYS: Omit<Holiday, 'id'>[] = [
  { name: "New Year's Day",           date: '2025-01-01', type: 'national' },
  { name: 'Makar Sankranti',          date: '2025-01-14', type: 'religious' },
  { name: 'Republic Day',             date: '2025-01-26', type: 'national' },
  { name: 'Maha Shivratri',           date: '2025-02-26', type: 'religious' },
  { name: 'Holi',                     date: '2025-03-14', type: 'religious' },
  { name: 'Good Friday',              date: '2025-04-18', type: 'religious' },
  { name: 'Ram Navami',               date: '2025-04-06', type: 'religious' },
  { name: "Dr. B.R. Ambedkar Jayanti",date: '2025-04-14', type: 'national' },
  { name: 'Labour Day',               date: '2025-05-01', type: 'national' },
  { name: 'Eid ul-Fitr',             date: '2025-03-31', type: 'religious' },
  { name: 'Eid ul-Adha',             date: '2025-06-07', type: 'religious' },
  { name: 'Independence Day',         date: '2025-08-15', type: 'national' },
  { name: 'Janmashtami',              date: '2025-08-16', type: 'religious' },
  { name: 'Raksha Bandhan',           date: '2025-08-09', type: 'religious' },
  { name: 'Ganesh Chaturthi',         date: '2025-08-27', type: 'religious' },
  { name: 'Gandhi Jayanti',           date: '2025-10-02', type: 'national' },
  { name: 'Dussehra',                 date: '2025-10-02', type: 'religious' },
  { name: 'Navratri Begins',          date: '2025-09-22', type: 'religious' },
  { name: 'Diwali',                   date: '2025-10-20', type: 'religious' },
  { name: 'Diwali (Laxmi Puja)',      date: '2025-10-20', type: 'religious' },
  { name: 'Guru Nanak Jayanti',       date: '2025-11-05', type: 'religious' },
  { name: 'Christmas Day',            date: '2025-12-25', type: 'religious' },
  { name: 'Summer Vacation Begins',   date: '2025-05-15', type: 'school' },
  { name: 'Summer Vacation Ends',     date: '2025-06-15', type: 'school' },
  { name: 'Winter Break Begins',      date: '2025-12-22', type: 'school' },
  { name: 'Winter Break Ends',        date: '2026-01-04', type: 'school' },
  { name: 'Annual Day',               date: '2025-02-15', type: 'school' },
  { name: 'Sports Day',               date: '2025-03-08', type: 'school' },
  { name: 'Teachers Day',             date: '2025-09-05', type: 'school' },
  { name: "Children's Day",          date: '2025-11-14', type: 'national' },
]

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Add Holiday Modal ────────────────────────────────────────────────────────
function AddHolidayModal({ onClose, onAdd }: { onClose: () => void; onAdd: (h: Holiday) => void }) {
  const [form, setForm] = useState({ name: '', date: '', type: 'national' as HolidayType, description: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.date) return
    onAdd({ id: genId(), ...form })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add Holiday</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Holiday Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Republic Day"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_META) as HolidayType[]).map(t => {
                const meta = TYPE_META[t]
                const Icon = meta.icon
                return (
                  <button key={t} type="button"
                    onClick={() => setForm(p => ({ ...p, type: t }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.type === t ? `${meta.bg} ${meta.border} ${meta.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={14} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Add Holiday
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HolidaysPage() {
  const qc = useQueryClient()
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [showAdd, setShowAdd] = useState(false)
  const [filterType, setFilterType] = useState<HolidayType | 'all'>('all')

  // Load from tenant settings
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings')
      return (res as any)?.data ?? {}
    },
  })

  const savedHolidays: Holiday[] = useMemo(() => {
    const raw = (settingsData as any)?.holidays_calendar
    if (raw) {
      try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { /* */ }
    }
    return DEFAULT_HOLIDAYS.map(h => ({ ...h, id: genId() }))
  }, [settingsData])

  const saveMutation = useMutation({
    mutationFn: async (holidays: Holiday[]) => {
      await api.patch('/api/v1/settings', { holidays_calendar: JSON.stringify(holidays) })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })

  const addHoliday = (h: Holiday) => {
    const updated = [...savedHolidays, h].sort((a, b) => a.date.localeCompare(b.date))
    saveMutation.mutate(updated)
  }

  const removeHoliday = (id: string) => {
    const updated = savedHolidays.filter(h => h.id !== id)
    saveMutation.mutate(updated)
  }

  // Calendar setup
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay = new Date(year, month, 1).getDay()
  const todayStr = new Date().toISOString().split('T')[0]

  const holidaysByDate = useMemo(() => {
    const map: Record<string, Holiday[]> = {}
    savedHolidays.forEach(h => {
      if (!map[h.date]) map[h.date] = []
      map[h.date].push(h)
    })
    return map
  }, [savedHolidays])

  const monthHolidays = useMemo(() =>
    savedHolidays
      .filter(h => {
        const d = new Date(h.date + 'T00:00:00')
        return d.getFullYear() === year && d.getMonth() === month
      })
      .sort((a, b) => a.date.localeCompare(b.date)),
    [savedHolidays, year, month]
  )

  const upcomingHolidays = useMemo(() =>
    savedHolidays
      .filter(h => h.date >= todayStr)
      .filter(h => filterType === 'all' || h.type === filterType)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 15),
    [savedHolidays, todayStr, filterType]
  )

  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  // yearly stats
  const yearHolidays = savedHolidays.filter(h => h.date.startsWith(String(year)))

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Manage school holidays and observances</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} />
          Add Holiday
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Holidays', value: yearHolidays.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ...(['national','religious','school','state'] as HolidayType[]).map(t => ({
            label: TYPE_META[t].label,
            value: yearHolidays.filter(h => h.type === t).length,
            color: TYPE_META[t].color,
            bg: TYPE_META[t].bg,
          }))
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400">in {year}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">{MONTHS[month]} {year}</h3>
            <div className="flex gap-1">
              <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Type legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {(Object.entries(TYPE_META) as [HolidayType, typeof TYPE_META[HolidayType]][]).map(([t, meta]) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-2.5 h-2.5 rounded-full ${meta.bg.replace('bg-','bg-').replace('-50','-400')}`} />
                {meta.label}
              </div>
            ))}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const holidays = holidaysByDate[dateStr] ?? []
              const isToday = dateStr === todayStr
              const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6

              return (
                <div key={dateStr} className={`min-h-[56px] p-1 rounded-lg border transition-colors ${
                  isToday ? 'border-indigo-300 bg-indigo-50' : holidays.length > 0 ? 'border-transparent' : 'border-transparent'
                } ${isWeekend && holidays.length === 0 ? 'bg-gray-50' : ''}`}>
                  <span className={`text-xs font-medium block mb-0.5 ${
                    isToday ? 'text-indigo-700' : isWeekend ? 'text-gray-400' : 'text-gray-700'
                  }`}>{day}</span>
                  {holidays.map((h, i) => (
                    <div key={i} title={h.name}
                      className={`text-[9px] font-medium px-1 py-0.5 rounded mb-0.5 truncate ${TYPE_META[h.type].bg} ${TYPE_META[h.type].color}`}>
                      {h.name}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* This month holidays list */}
          {monthHolidays.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {SHORT_MONTHS[month]} Holidays
              </h4>
              <div className="space-y-2">
                {monthHolidays.map(h => {
                  const meta = TYPE_META[h.type]
                  const Icon = meta.icon
                  return (
                    <div key={h.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${meta.bg} border ${meta.border}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/60`}>
                        <Icon size={14} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${meta.color}`}>{h.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <button onClick={() => removeHoliday(h.id)}
                        className="p-1.5 rounded-lg hover:bg-white/60 transition-colors flex-shrink-0">
                        <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming holidays sidebar */}
        <div className="space-y-4">
          {/* Filter */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by Type</h4>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                All
              </button>
              {(Object.keys(TYPE_META) as HolidayType[]).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterType === t ? `${TYPE_META[t].bg} ${TYPE_META[t].color} ring-1 ring-current` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming list */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Upcoming Holidays
            </h4>
            {upcomingHolidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
                <CalendarDays size={28} className="text-gray-200" />
                No upcoming holidays
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {upcomingHolidays.map(h => {
                  const meta = TYPE_META[h.type]
                  const Icon = meta.icon
                  const d = new Date(h.date + 'T00:00:00')
                  const daysAway = Math.ceil((d.getTime() - new Date().setHours(0,0,0,0)) / 86400000)

                  return (
                    <div key={h.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                        <Icon size={15} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{h.name}</p>
                        <p className="text-xs text-gray-500">
                          {d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs font-medium text-indigo-600 mt-0.5">
                          {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `in ${daysAway} days`}
                        </p>
                      </div>
                      <button onClick={() => removeHoliday(h.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-all">
                        <Trash2 size={12} className="text-gray-300 hover:text-red-500" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Month quick jump */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Jump to Month</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {SHORT_MONTHS.map((m, i) => {
                const count = savedHolidays.filter(h => {
                  const d = new Date(h.date + 'T00:00:00')
                  return d.getFullYear() === year && d.getMonth() === i
                }).length
                return (
                  <button key={m} onClick={() => setMonth(i)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                      month === i ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {m}
                    {count > 0 && (
                      <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                        month === i ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                      }`}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showAdd && <AddHolidayModal onClose={() => setShowAdd(false)} onAdd={addHoliday} />}
    </div>
  )
}
