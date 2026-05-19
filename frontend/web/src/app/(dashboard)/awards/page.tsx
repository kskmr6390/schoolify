'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Trophy, Star, Medal, Sparkles, Plus, Trash2, Search,
  GraduationCap, X, Loader2, BookOpen, Palette, Users,
  Award as AwardIcon, Pencil, Zap,
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
  Academic:        { pill: 'bg-blue-100 text-blue-700' },
  Sports:          { pill: 'bg-green-100 text-green-700' },
  Behavior:        { pill: 'bg-purple-100 text-purple-700' },
  Attendance:      { pill: 'bg-teal-100 text-teal-700' },
  'Art & Culture': { pill: 'bg-pink-100 text-pink-700' },
  Leadership:      { pill: 'bg-orange-100 text-orange-700' },
  Other:           { pill: 'bg-gray-100 text-gray-600' },
}

// ── Default award templates ────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  { title: 'Student of the Month',  icon: 'trophy',   category: 'Academic',      description: 'Outstanding academic performance this month' },
  { title: 'Teacher of the Month',  icon: 'star',     category: 'Leadership',    description: 'Exceptional dedication and teaching excellence' },
  { title: 'Best Athlete',          icon: 'medal',    category: 'Sports',        description: 'Exceptional athletic performance and sportsmanship' },
  { title: 'Most Improved',         icon: 'sparkles', category: 'Academic',      description: 'Remarkable improvement and progress' },
  { title: 'Perfect Attendance',    icon: 'award',    category: 'Attendance',    description: '100% attendance this term — never missed a day' },
  { title: 'Academic Excellence',   icon: 'book',     category: 'Academic',      description: 'Highest academic achievement in the class' },
  { title: 'Best Team Player',      icon: 'medal',    category: 'Sports',        description: 'Outstanding teamwork and collaboration' },
  { title: 'Art & Culture Star',    icon: 'sparkles', category: 'Art & Culture', description: 'Exceptional creative and cultural achievement' },
  { title: 'Leadership Award',      icon: 'trophy',   category: 'Leadership',    description: 'Inspiring leadership and positive influence' },
  { title: 'Good Conduct Award',    icon: 'award',    category: 'Behavior',      description: 'Exemplary behavior, respect and conduct' },
  { title: 'Staff Excellence',      icon: 'star',     category: 'Leadership',    description: 'Outstanding professional contribution to the school' },
  { title: 'Innovation Award',      icon: 'sparkles', category: 'Other',         description: 'Creative thinking and innovative problem-solving' },
]

type AwardTemplate = typeof DEFAULT_TEMPLATES[0]

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

/** Returns true if recipient_class stores a staff role (teacher/admin) vs a student grade */
function isStaffRecipient(recipientClass?: string | null) {
  return ['teacher', 'admin', 'super_admin'].includes(recipientClass?.toLowerCase() ?? '')
}

// ── Template Quick-Pick Row ────────────────────────────────────────────────────
function TemplateRow({ onSelect }: { onSelect: (t: AwardTemplate) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Zap size={13} className="text-amber-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Templates</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {DEFAULT_TEMPLATES.map(t => {
          const cfg = iconColor(t.icon)
          const Icon = ICONS[t.icon] ?? Trophy
          return (
            <button
              key={t.title}
              onClick={() => onSelect(t)}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-100
                         hover:border-amber-300 hover:bg-amber-50 transition text-sm"
            >
              <Icon size={13} className={cfg.color} />
              <span className="font-medium text-gray-700 whitespace-nowrap">{t.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateAwardModal({ initialTemplate, onClose }: { initialTemplate?: AwardTemplate; onClose: () => void }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [title, setTitle]       = useState(initialTemplate?.title ?? '')
  const [desc, setDesc]         = useState(initialTemplate?.description ?? '')
  const [icon, setIcon]         = useState(initialTemplate?.icon ?? 'trophy')
  const [category, setCategory] = useState(initialTemplate?.category ?? 'Academic')
  const [shareToFeed, setShareToFeed] = useState(true)
  const [recipientId, setRecipientId] = useState('')
  const [search, setSearch]     = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'student' | 'staff'>('all')

  const { data: recipientsData, isLoading: loadingRecipients } = useQuery({
    queryKey: ['award-recipients'],
    queryFn: () => api.get('/api/v1/users/award-recipients') as any,
  })

  const students: any[] = (recipientsData as any)?.data?.students ?? []
  const staff: any[]    = (recipientsData as any)?.data?.staff ?? []
  const all = [
    ...students.map((s: any) => ({ ...s, _type: 'student' })),
    ...staff.map((s: any)    => ({ ...s, _type: 'staff' })),
  ]

  const typeFiltered =
    typeFilter === 'student' ? all.filter(s => s._type === 'student') :
    typeFilter === 'staff'   ? all.filter(s => s._type === 'staff') :
    all

  const filtered = search
    ? typeFiltered.filter(s =>
        `${s.name} ${s.student_code ?? ''} ${s.role ?? ''} ${s.grade ?? ''} ${s.class_name ?? ''}`
          .toLowerCase().includes(search.toLowerCase())
      )
    : typeFiltered

  const selected = all.find(s => s.id === recipientId || (s.user_id && s.user_id === recipientId))

  function applyTemplate(t: AwardTemplate) {
    setTitle(t.title)
    setDesc(t.description)
    setIcon(t.icon)
    setCategory(t.category)
  }

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/notifications/awards', {
      title,
      description: desc || undefined,
      icon,
      category,
      recipient_id: selected?.user_id ?? selected?.id ?? recipientId,
      recipient_name: selected?.name ?? '',
      recipient_class: selected?._type === 'staff'
        ? (selected?.role ?? undefined)
        : (selected?.grade ?? undefined),
      awarded_by_name: `${user?.first_name} ${user?.last_name}`.trim(),
      shared_to_feed: shareToFeed,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awards'] })
      if (shareToFeed) {
        api.post('/api/v1/feed', {
          title: `Award: ${title}`,
          content: `${selected?.name} has been awarded "${title}"${desc ? ` — ${desc}` : ''}. Awarded by ${user?.first_name} ${user?.last_name}.`,
          post_type: 'award',
          visibility: 'all',
        }).catch(() => {})
        qc.invalidateQueries({ queryKey: ['feed'] })
      }
      onClose()
    },
  })

  const placeholders: Record<string, string> = {
    all:     'Type a name to search everyone...',
    student: 'Search students by name or code...',
    staff:   'Search teachers & staff by name...',
  }

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

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick templates row */}
          <TemplateRow onSelect={applyTemplate} />

          <div className="border-t border-gray-100" />

          {/* Recipient picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Recipient</label>

            {/* Type filter tabs */}
            <div className="flex gap-1 mb-2 p-1 bg-gray-100 rounded-xl">
              {([
                { key: 'all',     label: `All (${students.length + staff.length})` },
                { key: 'student', label: `Students (${students.length})` },
                { key: 'staff',   label: `Staff (${staff.length})` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setTypeFilter(tab.key)}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-semibold rounded-lg transition',
                    typeFilter === tab.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={selected ? selected.name : search}
                onChange={e => { setSearch(e.target.value); setRecipientId('') }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                placeholder={placeholders[typeFilter]}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {!recipientId && inputFocused && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto shadow-lg">
                {loadingRecipients ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-400">
                    <Loader2 size={13} className="animate-spin" /> Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-gray-400">
                    {search
                      ? `No results for "${search}"`
                      : `No ${typeFilter === 'student' ? 'students' : typeFilter === 'staff' ? 'staff' : 'people'} found`}
                  </div>
                ) : filtered.slice(0, 25).map(s => (
                  <button key={s.id} onClick={() => { setRecipientId(s.id); setSearch('') }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-amber-50 transition text-left border-b border-gray-50 last:border-0">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      s._type === 'staff' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {(s.name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        {s._type === 'student' && s.student_code && (
                          <span className="text-gray-300 text-xs">#{s.student_code}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {s._type === 'student' && s.grade && `Grade ${s.grade}${s.class_name ? ` · ${s.class_name}` : ''}`}
                        {s._type === 'staff' && s.role && <span className="capitalize">{s.role}</span>}
                      </div>
                    </div>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0',
                      s._type === 'staff' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                    )}>
                      {s._type === 'staff' ? 'Staff' : 'Student'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className={cn('mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border',
                selected._type === 'staff' ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'
              )}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  selected._type === 'staff' ? 'bg-indigo-200 text-indigo-700' : 'bg-amber-200 text-amber-700'
                )}>
                  {(selected.name ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn('text-sm font-medium', selected._type === 'staff' ? 'text-indigo-900' : 'text-amber-900')}>
                    {selected.name}
                  </span>
                  {selected._type === 'student' && selected.grade && (
                    <span className="text-xs text-amber-600 ml-1.5">
                      · Grade {selected.grade}{selected.class_name ? ` (${selected.class_name})` : ''}
                    </span>
                  )}
                  {selected._type === 'staff' && selected.role && (
                    <span className="text-xs text-indigo-600 capitalize ml-1.5">· {selected.role}</span>
                  )}
                </div>
                <button onClick={() => { setRecipientId(''); setSearch('') }} className="text-gray-400 hover:text-gray-600">
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
              placeholder="Why are they receiving this award?"
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

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditAwardModal({ award, onClose }: { award: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle]       = useState(award.title ?? '')
  const [desc, setDesc]         = useState(award.description ?? '')
  const [icon, setIcon]         = useState(award.icon ?? 'trophy')
  const [category, setCategory] = useState(award.category ?? 'Academic')
  const [shareToFeed, setShareToFeed] = useState(award.shared_to_feed ?? true)

  const recipientIsStaff = isStaffRecipient(award.recipient_class)

  const update = useMutation({
    mutationFn: () => api.patch(`/api/v1/notifications/awards/${award.id}`, {
      title: title.trim() || undefined,
      description: desc.trim(),
      icon,
      category,
      shared_to_feed: shareToFeed,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awards'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Pencil size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Edit Award</h2>
              <p className="text-indigo-100 text-xs">Update award details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition">
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Recipient — read-only */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Recipient</label>
            <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border',
              recipientIsStaff ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'
            )}>
              {recipientIsStaff
                ? <Users size={14} className="text-indigo-400 flex-shrink-0" />
                : <GraduationCap size={14} className="text-amber-400 flex-shrink-0" />}
              <span className="text-sm font-medium text-gray-700">{award.recipient_name}</span>
              {award.recipient_class && (
                <span className={cn('text-xs capitalize', recipientIsStaff ? 'text-indigo-500' : 'text-amber-500')}>
                  · {recipientIsStaff ? award.recipient_class : `Grade ${award.recipient_class}`}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Award Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Description (optional)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Icon & Category */}
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Share toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
            <div onClick={() => setShareToFeed((v: boolean) => !v)}
              className={cn('w-10 h-5 rounded-full transition-colors relative flex-shrink-0', shareToFeed ? 'bg-indigo-500' : 'bg-gray-300')}>
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
            onClick={() => update.mutate()}
            disabled={!title.trim() || update.isPending}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:from-indigo-600 hover:to-violet-600 transition flex items-center justify-center gap-2"
          >
            {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Award Card ─────────────────────────────────────────────────────────────────
function AwardCard({ award, canDelete, canEdit, onDelete, onEdit }: {
  award: any; canDelete: boolean; canEdit: boolean; onDelete: () => void; onEdit: () => void
}) {
  const cfg = iconColor(award.icon)
  const Icon = ICONS[award.icon] ?? Trophy
  const catColor = CAT_COLORS[award.category ?? ''] ?? CAT_COLORS.Other
  const recipientIsStaff = isStaffRecipient(award.recipient_class)
  const RecipientIcon = recipientIsStaff ? Users : GraduationCap

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition group relative overflow-hidden">
      <div className={cn('absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10', cfg.bg)} />

      <div className="flex items-start gap-4 relative">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm', cfg.bg)}>
          <Icon size={26} className={cfg.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-base leading-snug">{award.title}</h3>
            {(canEdit || canDelete) && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0 transition">
                {canEdit && (
                  <button onClick={onEdit}
                    className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition">
                    <Pencil size={13} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={onDelete}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
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
              <RecipientIcon size={12} className={recipientIsStaff ? 'text-indigo-400' : 'text-amber-400'} />
              <span className="font-medium text-gray-700">{award.recipient_name}</span>
              {award.recipient_class && (
                <span className="text-gray-400 capitalize">
                  · {recipientIsStaff ? award.recipient_class : `Grade ${award.recipient_class}`}
                </span>
              )}
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
          { label: 'This Month', value: awards.filter(a => new Date(a.created_at) > new Date(Date.now() - 30 * 86400000)).length, icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-50' },
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
            <AwardCard key={a.id} award={a} canDelete={false} canEdit={false} onDelete={() => {}} onEdit={() => {}} />
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
  const [initialTemplate, setInitialTemplate] = useState<AwardTemplate | undefined>(undefined)
  const [editingAward, setEditingAward] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const { user } = useAuthStore()
  const canDelete = user?.role === 'admin' || user?.role === 'super_admin'
  const canEdit = ['admin', 'super_admin', 'teacher'].includes(user?.role ?? '')

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

  const stats = [
    { label: 'Total Given',  value: awards.length,                                                                                               icon: Trophy,  color: 'text-amber-500',  bg: 'bg-amber-50' },
    { label: 'This Month',   value: awards.filter(a => new Date(a.created_at) > new Date(Date.now() - 30 * 86400000)).length,                    icon: Star,    color: 'text-emerald-500',bg: 'bg-emerald-50' },
    { label: 'Recipients',   value: new Set(awards.map(a => a.recipient_id)).size,                                                               icon: Users,   color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Categories',   value: new Set(awards.filter(a => a.category).map(a => a.category)).size,                                          icon: Palette, color: 'text-violet-500', bg: 'bg-violet-50' },
  ]

  function openWithTemplate(t: AwardTemplate) {
    setInitialTemplate(t)
    setShowModal(true)
  }

  function openBlank() {
    setInitialTemplate(undefined)
    setShowModal(true)
  }

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

      {/* Default Award Templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-amber-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Award Templates</h3>
          <span className="text-xs text-gray-400">— click any to give quickly</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {DEFAULT_TEMPLATES.map(t => {
            const cfg = iconColor(t.icon)
            const Icon = ICONS[t.icon] ?? Trophy
            const catColor = CAT_COLORS[t.category] ?? CAT_COLORS.Other
            return (
              <button
                key={t.title}
                onClick={() => openWithTemplate(t)}
                className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-gray-200
                           hover:border-amber-300 hover:shadow-md transition text-left group"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                  <Icon size={14} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 leading-snug truncate">{t.title}</p>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium mt-0.5 inline-block', catColor.pill)}>
                    {t.category}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, title, category..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-amber-400">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={openBlank}
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
          <p className="text-gray-400 text-sm mt-1">Pick a template above or give a custom award</p>
          <button onClick={openBlank}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition">
            <Plus size={14} /> Give First Award
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map(a => (
            <AwardCard key={a.id} award={a} canDelete={canDelete} canEdit={canEdit}
              onDelete={() => deleteMutation.mutate(a.id)}
              onEdit={() => setEditingAward(a)} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateAwardModal
          initialTemplate={initialTemplate}
          onClose={() => { setShowModal(false); setInitialTemplate(undefined) }}
        />
      )}
      {editingAward && <EditAwardModal award={editingAward} onClose={() => setEditingAward(null)} />}
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
              ? 'Celebrate and recognise outstanding students, teachers and staff'
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
