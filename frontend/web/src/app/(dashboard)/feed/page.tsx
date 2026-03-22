'use client'

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  Heart, Megaphone, Calendar, Users, Globe2, BookOpen,
  GraduationCap, UserCheck, Send, Trash2, X, Loader2,
  Image as ImageIcon, Video, Paperclip, Play, Smile,
  Pin, MessageSquare, Share2, ChevronDown, Sparkles,
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'

// ── Post type config ──────────────────────────────────────────────────────────
const TYPE_CFG = {
  general: {
    label: 'General', icon: Globe2,
    gradient: 'from-slate-500 to-slate-600',
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    accent: 'border-l-slate-400',
    glow: 'bg-slate-50',
  },
  announcement: {
    label: 'Announcement', icon: Megaphone,
    gradient: 'from-indigo-500 to-violet-600',
    pill: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    accent: 'border-l-indigo-500',
    glow: 'bg-indigo-50/30',
  },
  meeting: {
    label: 'Meeting', icon: UserCheck,
    gradient: 'from-emerald-500 to-teal-600',
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    accent: 'border-l-emerald-500',
    glow: 'bg-emerald-50/30',
  },
  event: {
    label: 'Event', icon: Calendar,
    gradient: 'from-amber-400 to-orange-500',
    pill: 'bg-amber-100 text-amber-700 border-amber-200',
    accent: 'border-l-amber-500',
    glow: 'bg-amber-50/30',
  },
} as const

type PostType = keyof typeof TYPE_CFG

const VIS_CFG: Record<string, { label: string; icon: React.ElementType }> = {
  all:            { label: 'Everyone',       icon: Globe2 },
  class_specific: { label: 'Class',         icon: BookOpen },
  teachers:       { label: 'Teachers',      icon: GraduationCap },
  students:       { label: 'Students',      icon: Users },
  parents:        { label: 'Parents',       icon: UserCheck },
}

const REACTIONS = ['❤️', '👏', '🎉', '💡', '😊', '👍']

const AVATAR_GRADIENTS = [
  'from-indigo-400 to-violet-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-purple-400 to-indigo-500',
  'from-teal-400 to-emerald-500',
  'from-fuchsia-400 to-purple-500',
]
function avatarGradient(name: string = '') {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function Initials({ name, size = 10 }: { name: string; size?: number }) {
  const init = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div
      style={{ width: size * 4, height: size * 4, fontSize: size * 1.5 }}
      className={cn('rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br flex-shrink-0', avatarGradient(name))}
    >
      {init}
    </div>
  )
}

// ── Media preview ─────────────────────────────────────────────────────────────
function MediaPreview({ urls }: { urls: string[] }) {
  if (!urls?.length) return null
  const images = urls.filter(u => !u.match(/\.(mp4|webm|mov)$/i))
  const videos = urls.filter(u => u.match(/\.(mp4|webm|mov)$/i))
  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className={cn('grid gap-2 rounded-xl overflow-hidden', images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2')}>
          {images.map((url, i) => (
            <img key={i} src={url} alt="" className={cn('object-cover w-full cursor-pointer hover:opacity-95 transition', images.length === 1 ? 'max-h-72 rounded-xl' : 'h-40 rounded-xl')} />
          ))}
        </div>
      )}
      {videos.map((url, i) => (
        <video key={i} src={url} controls className="w-full rounded-xl max-h-64" />
      ))}
    </div>
  )
}

// ── Create post box ───────────────────────────────────────────────────────────
function CreatePostBox({ classes }: { classes: any[] }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [expanded,    setExpanded]    = useState(false)
  const [content,     setContent]     = useState('')
  const [title,       setTitle]       = useState('')
  const [postType,    setPostType]    = useState<PostType>('general')
  const [visibility,  setVisibility]  = useState('all')
  const [classId,     setClassId]     = useState('')
  const [attachments, setAttachments] = useState<{ url: string; type: string; name: string }[]>([])
  const [uploading,   setUploading]   = useState(false)

  const canPost = user?.role && ['admin', 'super_admin', 'teacher'].includes(user.role)
  if (!canPost) return null

  const cfg = TYPE_CFG[postType]

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      try {
        const fd = new FormData(); fd.append('file', file)
        const res = await (api as any).post('/api/v1/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) as any
        const url = res?.data?.url || res?.url
        if (url) setAttachments(p => [...p, { url, type: file.type, name: file.name }])
      } catch {
        setAttachments(p => [...p, { url: URL.createObjectURL(file), type: file.type, name: file.name }])
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/feed', {
      title: title || undefined, content, post_type: postType, visibility,
      tagged_class_ids: (visibility === 'class_specific' && classId) ? [classId] : undefined,
      attachment_urls: attachments.length ? attachments.map(a => a.url) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      setContent(''); setTitle(''); setExpanded(false)
      setPostType('general'); setVisibility('all'); setClassId(''); setAttachments([])
    },
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
      {!expanded ? (
        <button onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition">
          <Initials name={`${user?.first_name} ${user?.last_name}`} size={9} />
          <span className="flex-1 text-left px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 text-sm transition">
            Share something with the school...
          </span>
          <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
            <Sparkles size={13} /> Post
          </span>
        </button>
      ) : (
        <div>
          {/* Coloured top band */}
          <div className={cn('h-1.5 w-full bg-gradient-to-r', cfg.gradient)} />

          <div className="p-4 space-y-3">
            {/* Author + type row */}
            <div className="flex items-center gap-3">
              <Initials name={`${user?.first_name} ${user?.last_name}`} size={10} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{user?.first_name} {user?.last_name}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {(Object.keys(TYPE_CFG) as PostType[]).map(t => {
                    const c = TYPE_CFG[t]
                    return (
                      <button key={t} onClick={() => setPostType(t)}
                        className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                          postType === t ? cn(c.pill, 'shadow-sm scale-105') : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        )}>
                        <c.icon size={10} /> {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a title (optional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" />

            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
              placeholder="What would you like to share with the school?"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none leading-relaxed" />

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group">
                    {att.type.startsWith('image/') ? (
                      <img src={att.url} alt="" className="h-20 w-20 object-cover rounded-xl border border-gray-200" />
                    ) : (
                      <div className="h-20 w-20 bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-1">
                        <Play size={20} className="text-gray-500" />
                        <span className="text-[10px] text-gray-500 text-center px-1 truncate w-full">{att.name}</span>
                      </div>
                    )}
                    <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex">
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-3">
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition disabled:opacity-50">
                <ImageIcon size={13} /> Photo
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50">
                <Video size={13} /> Video
              </button>

              {/* Visibility */}
              <div className="flex items-center gap-1.5 ml-auto">
                <Globe2 size={13} className="text-gray-400" />
                <select value={visibility} onChange={e => setVisibility(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                  {Object.entries(VIS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </select>
                {visibility === 'class_specific' && (
                  <select value={classId} onChange={e => setClassId(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                    <option value="">Select class...</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              {uploading && <Loader2 size={14} className="animate-spin text-indigo-500" />}
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setExpanded(false); setAttachments([]) }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => create.mutate()} disabled={!content.trim() || create.isPending || uploading}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 bg-gradient-to-r',
                  cfg.gradient,
                )}>
                {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onDelete }: { post: any; onDelete: (id: string) => void }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [liked,      setLiked]      = useState(post.liked_by_me)
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0)
  const [showReact,  setShowReact]  = useState(false)
  const [myReaction, setMyReaction] = useState<string | null>(null)

  const type = (post.post_type || 'general') as PostType
  const cfg  = TYPE_CFG[type] ?? TYPE_CFG.general
  const TypeIcon = cfg.icon
  const visCfg = VIS_CFG[post.visibility] || VIS_CFG.all
  const VisIcon = visCfg.icon

  const toggleLike = useMutation({
    mutationFn: () => api.post(`/api/v1/feed/${post.id}/like`, {}),
    onMutate: () => {
      setLiked((p: boolean) => !p)
      setLikesCount((n: number) => liked ? n - 1 : n + 1)
    },
    onSuccess: (data: any) => {
      setLiked(data?.data?.liked ?? liked)
      setLikesCount(data?.data?.likes_count ?? likesCount)
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const deletePost = useMutation({
    mutationFn: () => api.delete(`/api/v1/feed/${post.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed'] }); onDelete(post.id) },
  })

  const canDelete = (user?.role && ['admin', 'super_admin'].includes(user.role)) ||
    post.author_id === (user as any)?.id

  return (
    <div className={cn(
      'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden border-l-4 transition hover:shadow-md',
      cfg.accent,
    )}>
      {/* Gradient header band for announcements/events */}
      {(type === 'announcement' || type === 'event') && (
        <div className={cn('px-5 py-3 bg-gradient-to-r text-white flex items-center gap-2', cfg.gradient)}>
          <TypeIcon size={15} />
          <span className="text-sm font-semibold">{cfg.label}</span>
          <span className="ml-auto text-xs opacity-75 flex items-center gap-1">
            <VisIcon size={11} /> {visCfg.label}
          </span>
        </div>
      )}

      <div className={cn('p-5', cfg.glow)}>
        {/* Author row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Initials name={post.author_name} size={10} />
            <div>
              <p className="text-sm font-bold text-gray-900">{post.author_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400 capitalize">{post.author_role}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Show type/vis pills only for meeting/general */}
            {type !== 'announcement' && type !== 'event' && (
              <>
                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cfg.pill)}>
                  <TypeIcon size={10} /> {cfg.label}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">
                  <VisIcon size={10} /> {visCfg.label}
                </span>
              </>
            )}
            {canDelete && (
              <button onClick={() => deletePost.mutate()}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {post.title && (
          <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">{post.title}</h3>
        )}
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {/* Media */}
        {post.attachment_urls?.length > 0 && <MediaPreview urls={post.attachment_urls} />}

        {/* Footer */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-100">
          {/* Like */}
          <button onClick={() => toggleLike.mutate()}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition',
              liked ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'text-gray-400 hover:bg-gray-50 hover:text-red-400'
            )}>
            <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
            <span>{likesCount}</span>
          </button>

          {/* Emoji reactions */}
          <div className="relative">
            <button onClick={() => setShowReact(r => !r)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50 hover:text-amber-500 transition font-medium">
              {myReaction ?? <Smile size={15} />}
            </button>
            {showReact && (
              <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white rounded-2xl shadow-xl border border-gray-100 px-2 py-1.5 z-10">
                {REACTIONS.map(r => (
                  <button key={r} onClick={() => { setMyReaction(r); setShowReact(false) }}
                    className="text-lg hover:scale-125 transition-transform">
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comment placeholder */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50 hover:text-indigo-500 transition font-medium">
            <MessageSquare size={15} />
            <span className="text-xs">Comment</span>
          </button>

          {/* Attachments count */}
          {post.attachment_urls?.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-1">
              <Paperclip size={11} /> {post.attachment_urls.length}
            </span>
          )}

          <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50 hover:text-teal-500 transition">
            <Share2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category strip ────────────────────────────────────────────────────────────
const FILTERS = [
  { v: '',             l: 'All',           grad: 'from-indigo-500 to-violet-600', icon: Sparkles },
  { v: 'announcement', l: 'Announcements', grad: 'from-indigo-500 to-violet-600', icon: Megaphone },
  { v: 'meeting',      l: 'Meetings',      grad: 'from-emerald-500 to-teal-600',  icon: UserCheck },
  { v: 'event',        l: 'Events',        grad: 'from-amber-400 to-orange-500',  icon: Calendar },
  { v: 'general',      l: 'General',       grad: 'from-slate-500 to-slate-600',   icon: Globe2 },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [typeFilter, setTypeFilter] = useState('')

  const { data: classData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/api/v1/classes') as any,
  })
  const classes: any[] = (classData as any)?.data || []

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed', typeFilter],
    queryFn: ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: String(pageParam), per_page: '10' })
      if (typeFilter) params.set('post_type', typeFilter)
      return api.get(`/api/v1/feed?${params}`) as any
    },
    getNextPageParam: (last: any) => {
      const p = last?.data || last
      return p.page * p.per_page < p.total ? p.page + 1 : undefined
    },
    initialPageParam: 1,
  })

  const posts = (data?.pages || []).flatMap((p: any) => p?.data?.items || p?.items || [])
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const visible = posts.filter((p: any) => !deleted.has(p.id))

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone size={20} />
            <h1 className="text-xl font-bold">School Feed</h1>
          </div>
          <p className="text-indigo-200 text-sm">Announcements, events &amp; updates from your school</p>
        </div>
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
        <Megaphone size={80} className="absolute right-6 bottom-2 text-white/10" />
      </div>

      {/* Filter strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => {
          const active = typeFilter === f.v
          return (
            <button key={f.v} onClick={() => setTypeFilter(f.v)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0',
                active
                  ? cn('text-white shadow-md bg-gradient-to-r', f.grad)
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm',
              )}>
              <f.icon size={14} className={active ? 'text-white/80' : 'text-gray-400'} />
              {f.l}
            </button>
          )
        })}
      </div>

      {/* Create post */}
      <CreatePostBox classes={classes} />

      {/* Posts */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-200 rounded-full w-1/3" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/4" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3.5 bg-gray-100 rounded-full" />
                <div className="h-3.5 bg-gray-100 rounded-full w-5/6" />
                <div className="h-3.5 bg-gray-100 rounded-full w-4/6" />
              </div>
            </div>
          ))
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
              <Megaphone size={36} className="text-indigo-400" />
            </div>
            <p className="text-gray-800 font-bold text-lg">No posts yet</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to share an announcement!</p>
          </div>
        ) : (
          visible.map((post: any) => (
            <PostCard key={post.id} post={post} onDelete={id => setDeleted(p => new Set([...p, id]))} />
          ))
        )}

        {hasNextPage && (
          <div className="text-center">
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-sm disabled:opacity-50">
              {isFetchingNextPage ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
              Load more posts
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
