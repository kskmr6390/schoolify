'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Trophy, Star, Medal, Sparkles, Plus, Trash2, Search,
  GraduationCap, X, Loader2, BookOpen, Palette, Users,
  Award as AwardIcon, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'

// ── Config ────────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ElementType> = {
  trophy: Trophy, star: Star, medal: Medal,
  sparkles: Sparkles, award: AwardIcon, book: BookOpen,
}

const ICON_OPTIONS = [
  { key: 'trophy',   label: 'Trophy',   color: 'text-amber-500',  bg: 'bg-amber-50' },
  { key: 'star',     label: 'Star',     color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { key: 'medal',    label: 'Medal',    color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { key: 'sparkles', label: 'Sparkles', color: 'text-violet-500', bg: 'bg-violet-50' },
  { key: 'award',    label: 'Award',    color: 'text-rose-500',   bg: 'bg-rose-50' },
  { key: 'book',     label: 'Academic', color: 'text-emerald-500',bg: 'bg-emerald-50' },
]

const CATEGORIES = ['Academic', 'Sports', 'Behavior', 'Attendance', 'Art & Culture', 'Leadership', 'Other']

const CAT_COLORS: Record<string, { pill: string }> = {
  Academic:      { pill: 'bg-blue-100 text-blue-700' },
  Sports:        { pill: 'bg-green-100 text-green-700' },
  Behavior:      { pill: 'bg-purple-100 text-purple-700' },
  Attendance:    { pill: 'bg-teal-100 text-teal-700' },
  'Art & Culture': { pill: 'bg-pink-100 text-pink-700' },
  Leadership:    { pill: 'bg-orange-100 text-orange-700' },
  Other:         { pill: 'bg-gray-100 text-gray-600' },
}

function iconColor(icon: string) {
  return ICON_OPTIONS.find(o => o.key === icon) ?? ICON_OPTIONS[0]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateAwardModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [title, setTitle]       = useState('')
  const [desc, setDesc]         = useState('')
  const [icon, setIcon]         = useState('trophy')
  const [category, setCategory] = useState('Academic')
  const [shareToFeed, setShareToFeed] = useState(true)
  const [recipientId, setRecipientId] = useState('')
  const [search, setSearch]     = useState('')

  const { data: studentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => api.get('/api/v1/users/students-list') as any,
  })
  const students: any[] = (studentsData as any)?.data ?? []
  const filtered = students.filter(s =>
    `${s.name} ${s.student_code ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )
  const selected = students.find(s => s.id === recipientId)

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/notifications/awards', {
      title,
      description: desc || undefined,
      icon,
      category,
      recipient_id: recipientId,
      recipient_name: selected?.name ?? '',
      recipient_class: selected?.grade ?? undefined,
      awarded_by_name: `${user?.first_name} ${user?.last_name}`.trim(),
      shared_to_feed: shareToFeed,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awards'] })
      if (shareToFeed) {
        // Also post to feed
        api.post('/api/v1/feed', {
          title: `Award: ${title}`,
          content: `${selected?.name} has been awarded "${title}"${desc ? ` — ${desc}` : ''}. Awarded by ${user?.first_name} ${user?.last_name}.`,
          post_type: 'award',
          visibility: 'all',
        }).catch(() => {/* silently ok if feed not available */})
        qc.invalidateQueries({ queryKey: ['feed'] })
      }
      onClose()
    },
  })

  const cfg = iconColor(icon)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Give an Award</h2>
              <p className="text-amber-100 text-xs">Recognise outstanding achievement</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition">
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Recipient picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Recipient</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={selected ? selected.name : search}
                onChange={e => { setSearch(e.target.value); setRecipientId('') }}
                placeholder="Search student by name..."
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            {!recipientId && search && filtered.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto shadow-lg">
                {filtered.slice(0, 8).map(s => (
                  <button key={s.id} onClick={() => { setRecipientId(s.id); setSearch('') }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-amber-50 transition text-left border-b border-gray-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">
                      {s.name[0]}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{s.name}</span>
                      {s.grade && <span className="text-gray-400 text-xs ml-1.5">Grade {s.grade}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
                <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700">
                  {selected.name[0]}
                </div>
                <span className="text-sm font-medium text-amber-900">{selected.name}</span>
                {selected.grade && <span className="text-xs text-amber-600">· Grade {selected.grade}</span>}
                <button onClick={() => setRecipientId('')} className="ml-auto text-amber-400 hover:text-amber-600">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Award Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Student of the Month, Best Athlete..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Description (optional)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Why is this student receiving this award?"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Icon & Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map(o => {
                  const Ic = ICONS[o.key] ?? Trophy
                  return (
                    <button key={o.key} onClick={() => setIcon(o.key)}
                      className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition border-2',
                        icon === o.key ? `${o.bg} border-current ${o.color}` : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      )}>
                      <Ic size={16} />
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Share to feed toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
            <div onClick={() => setShareToFeed(v => !v)}
              className={cn('w-10 h-5 rounded-full transition-colors relative flex-shrink-0', shareToFeed ? 'bg-amber-500' : 'bg-gray-300')}>
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', shareToFeed ? 'left-5' : 'left-0.5')} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Share to School Feed</p>
              <p className="text-xs text-gray-400">Announce this award to the whole school</p>
            </div>
          </label>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!title.trim() || !recipientId || create.isPending}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:from-amber-600 hover:to-orange-600 transition flex items-center justify-center gap-2"
          >
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
            Give Award
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Award Card ─────────────────────────────────────────────────────────────────
function AwardCard({ award, canDelete, onDelete }: {
  award: any; canDelete: boolean; onDelete: () => void
}) {
  const cfg = iconColor(award.icon)
  const Icon = ICONS[award.icon] ?? Trophy
  const catColor = CAT_COLORS[award.category ?? ''] ?? CAT_COLORS.Other

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition group relative overflow-hidden">
      {/* Decorative background glow */}
      <div className={cn('absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10', cfg.bg)} />

      <div className="flex items-start gap-4 relative">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm', cfg.bg)}>
          <Icon size={26} className={cfg.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-base leading-snug">{award.title}</h3>
            {canDelete && (
              <button onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {award.description && (
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{award.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {award.category && (
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', catColor.pill)}>
                {award.category}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <GraduationCap size={12} className="text-gray-400" />
              <span className="font-medium text-gray-700">{award.recipient_name}</span>
              {award.recipient_class && <span>· Grade {award.recipient_class}</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">By {award.awarded_by_name}</span>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400">{timeAgo(award.created_at)}</span>
            {award.shared_to_feed && (
              <span className="ml-auto text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Sparkles size={10} /> Shared
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── My Awards (student / parent view) ─────────────────────────────────────────
function MyAwardsView({ recipientId }: { recipientId?: string }) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const { data } = useQuery({
    queryKey: ['awards', 'my', recipientId],
    queryFn: () => {
      const params = recipientId ? `?recipient_id=${recipientId}` : ''
      return api.get(`/api/v1/notifications/awards${params}`) as any
    },
  })
  const awards: any[] = (data as any)?.data ?? []

  const visible = awards.filter(a => {
    const matchSearch = `${a.title} ${a.recipient_name} ${a.category ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || a.category === catFilter
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Awards', value: awards.length, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Categories', value: new Set(awards.map(a => a.category)).size, icon: Palette, color: 'text-violet-500', bg: 'bg-violet-50' },
          { label: 'This Month', value: awards.filter(a => new Date(a.created_at) > new Date(Date.now() - 30*86400000)).length, icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', s.bg)}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search awards..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Trophy size={28} className="text-amber-300" />
          </div>
          <p className="text-gray-600 font-semibold">No awards yet</p>
          <p className="text-gray-400 text-sm mt-1">Keep up the great work!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map(a => (
            <AwardCard key={a.id} award={a} canDelete={false} onDelete={() => {}} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Admin / Teacher Awards Management ────────────────────────────────────────
function ManageAwardsView() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const { user } = useAuthStore()
  const canDelete = user?.role === 'admin' || user?.role === 'super_admin'

  const { data, isLoading } = useQuery({
    queryKey: ['awards'],
    queryFn: () => api.get('/api/v1/notifications/awards') as any,
  })
  const awards: any[] = (data as any)?.data ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/notifications/awards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['awards'] }),
  })

  const visible = awards.filter(a => {
    const matchSearch = `${a.title} ${a.recipient_name} ${a.awarded_by_name} ${a.category ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || a.category === catFilter
    return matchSearch && matchCat
  })

  // Stats
  const stats = [
    { label: 'Total Given',  value: awards.length,                                             icon: Trophy,   color: 'text-amber-500',   bg: 'bg-amber-50' },
    { label: 'This Month',   value: awards.filter(a => new Date(a.created_at) > new Date(Date.now() - 30*86400000)).length, icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Recipients',   value: new Set(awards.map(a => a.recipient_id)).size,             icon: Users,    color: 'text-indigo-500',   bg: 'bg-indigo-50' },
    { label: 'Categories',   value: new Set(awards.map(a => a.category)).size,                 icon: Palette,  color: 'text-violet-500',   bg: 'bg-violet-50' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', s.bg)}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student, title, category..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-amber-400">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition shadow-sm">
          <Plus size={15} /> Give Award
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-200" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-200 rounded-full w-2/3" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Trophy size={28} className="text-amber-300" />
          </div>
          <p className="text-gray-600 font-semibold">No awards given yet</p>
          <p className="text-gray-400 text-sm mt-1">Recognise outstanding students and staff</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition">
            <Plus size={14} /> Give First Award
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map(a => (
            <AwardCard key={a.id} award={a} canDelete={canDelete}
              onDelete={() => deleteMutation.mutate(a.id)} />
          ))}
        </div>
      )}

      {showModal && <CreateAwardModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AwardsPage() {
  const { user } = useAuthStore()
  const role = user?.role ?? 'student'
  const isStaff = ['admin', 'super_admin', 'teacher'].includes(role)

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <Trophy size={22} />
            <h1 className="text-xl font-bold">Awards & Recognition</h1>
          </div>
          <p className="text-amber-100 text-sm">
            {isStaff
              ? 'Celebrate and recognise outstanding students and staff members'
              : 'Your achievements and recognitions from school'}
          </p>
        </div>
        <Trophy size={100} className="absolute right-4 -bottom-4 text-white/10" />
        <Star size={30} className="absolute right-28 top-4 text-white/10" />
      </div>

      {isStaff ? <ManageAwardsView /> : <MyAwardsView />}
    </div>
  )
}
