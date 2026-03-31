'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircle, X, Send, Phone, Video, PhoneOff, VideoOff,
  Mic, MicOff, Plus, Users, Search, ArrowLeft, Minus,
  Maximize2, Minimize2, Check, Edit2,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useChatWidgetStore } from '../../store/chatWidgetStore'
import { cn } from '../../lib/utils'
import api from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatUser {
  id: string; name: string
  role: string; email: string; online: boolean
}
interface Message {
  id: string; senderId: string; senderName: string
  text: string; createdAt: string; type: 'text' | 'system'
}
interface Conversation {
  id: string; type: 'direct' | 'group'
  name: string; participants: string[]
  updatedAt: string; lastMessage?: Message | null
}
type CallState = {
  active: boolean; type: 'audio' | 'video'; peer: ChatUser | null
  localStream: MediaStream | null; remoteStream: MediaStream | null
  muted: boolean; camOff: boolean; status: 'calling' | 'connected' | 'ended'
}

// ── Dimensions ────────────────────────────────────────────────────────────────
const BTN  = 56
const W_SM = 360; const H_SM = 520
const W_LG = 780; const H_LG = 580
const PAD  = 20

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeId() { return Math.random().toString(36).slice(2, 10) }
function initials(n: string) { return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }

const AV_COLORS = [
  'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',   'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700',
  'bg-teal-100 text-teal-700',     'bg-pink-100 text-pink-700',
]
function avColor(n: string) {
  let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AV_COLORS[h % AV_COLORS.length]
}
function fmtTime(iso: string) {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function mapMsg(m: any): Message {
  return { id: m.id, senderId: m.sender_id, senderName: m.sender_name, text: m.text, createdAt: m.created_at, type: m.type ?? 'text' }
}
function mapConvo(c: any): Conversation {
  return {
    id: c.id, type: c.type, name: c.name ?? '',
    participants: c.participants ?? [],
    updatedAt: c.updated_at ?? c.created_at,
    lastMessage: c.last_message ? mapMsg(c.last_message) : null,
  }
}

// ── Reusable Avatar ───────────────────────────────────────────────────────────
function Av({ name, sz = 8, online }: { name: string; sz?: number; online?: boolean }) {
  const px = sz * 4
  return (
    <div className="relative flex-shrink-0">
      <div style={{ width: px, height: px, fontSize: px * 0.38 }}
        className={cn('rounded-full flex items-center justify-center font-bold', avColor(name))}>
        {initials(name)}
      </div>
      {online !== undefined && (
        <span className={cn('absolute bottom-0 right-0 rounded-full border-2 border-white',
          sz >= 8 ? 'w-2.5 h-2.5' : 'w-2 h-2', online ? 'bg-emerald-500' : 'bg-gray-300')} />
      )}
    </div>
  )
}

// ── New conversation panel ────────────────────────────────────────────────────
function NewConvoPanel({ myId, myName, onClose, onCreate }: {
  myId: string; myName: string; onClose: () => void; onCreate: (c: Conversation) => void
}) {
  const [q,        setQ]        = useState('')
  const [sel,      setSel]      = useState<ChatUser[]>([])
  const [grpName,  setGrpName]  = useState('')
  const [users,    setUsers]    = useState<ChatUser[]>([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.get('/api/v1/users/chat-users')
      .then((res: any) => {
        const data = res?.data ?? res
        setUsers((data ?? []).map((u: any) => ({ id: u.id, name: u.name, role: u.role, email: u.email, online: false })))
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  const list = users.filter(u => u.name.toLowerCase().includes(q.toLowerCase()))
  const toggle = (u: ChatUser) =>
    setSel(s => s.find(x => x.id === u.id) ? s.filter(x => x.id !== u.id) : [...s, u])

  const go = async () => {
    if (!sel.length || creating) return
    setCreating(true)
    try {
      const isGroup = sel.length > 1
      const res: any = await api.post('/api/v1/notifications/chat/conversations', {
        type: isGroup ? 'group' : 'direct',
        participant_ids: sel.map(u => u.id),
        name: isGroup ? (grpName.trim() || sel.map(u => u.name.split(' ')[0]).join(', ')) : null,
      })
      const d = res?.data ?? res
      onCreate({
        id: d.id, type: d.type,
        name: d.name ?? (isGroup
          ? (grpName.trim() || sel.map(u => u.name.split(' ')[0]).join(', '))
          : sel[0].name),
        participants: d.participants ?? [],
        updatedAt: d.updated_at ?? new Date().toISOString(),
        lastMessage: null,
      })
      onClose()
    } catch { setCreating(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={15} className="text-gray-500" />
        </button>
        <p className="font-semibold text-sm text-gray-900 flex-1">New Conversation</p>
        <span className="text-xs text-gray-400">Select people to chat</span>
      </div>

      <div className="px-4 pt-3 space-y-2.5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by name or role..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {sel.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sel.map(u => (
              <span key={u.id} className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
                {u.name.split(' ')[0]}
                <button onClick={() => toggle(u)} className="hover:text-indigo-900 ml-0.5"><X size={9} /></button>
              </span>
            ))}
          </div>
        )}
        {sel.length > 1 && (
          <input value={grpName} onChange={e => setGrpName(e.target.value)}
            placeholder="Group name (optional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto mt-2 px-2">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-6">Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No users found</p>
        ) : list.map(u => {
          const on = !!sel.find(x => x.id === u.id)
          return (
            <button key={u.id} onClick={() => toggle(u)}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors mb-0.5',
                on ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50')}>
              <Av name={u.name} sz={9} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 capitalize">{u.role}</p>
              </div>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                on ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300')}>
                {on && <Check size={11} className="text-white" />}
              </div>
            </button>
          )
        })}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button onClick={go} disabled={!sel.length || creating}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
          {creating ? 'Starting...' : sel.length > 1
            ? `Create Group Chat (${sel.length} people)`
            : sel.length === 1
              ? `Start Chat with ${sel[0].name.split(' ')[0]}`
              : 'Select at least one person'}
        </button>
      </div>
    </div>
  )
}

// ── Call overlay ──────────────────────────────────────────────────────────────
function CallOverlay({ call, onMute, onCam, onHangup }: {
  call: CallState; onMute: () => void; onCam: () => void; onHangup: () => void
}) {
  const localRef  = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (localRef.current  && call.localStream)  localRef.current.srcObject  = call.localStream
    if (remoteRef.current && call.remoteStream) remoteRef.current.srcObject = call.remoteStream
  }, [call.localStream, call.remoteStream])

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl">
        {call.type === 'video' ? (
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-3 right-3 w-28 rounded-xl overflow-hidden border border-white/20">
              <video ref={localRef} autoPlay playsInline muted className="w-full" />
            </div>
            {call.status === 'calling' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <Av name={call.peer?.name ?? ''} sz={14} />
                <p className="text-white font-semibold mt-3 text-lg">{call.peer?.name}</p>
                <p className="text-gray-400 text-sm mt-1 animate-pulse">Calling...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-gray-800 to-gray-900">
            <Av name={call.peer?.name ?? ''} sz={14} />
            <p className="text-white font-semibold mt-4 text-xl">{call.peer?.name}</p>
            <p className={cn('text-sm mt-2', call.status === 'calling' ? 'text-gray-400 animate-pulse' : 'text-emerald-400')}>
              {call.status === 'calling' ? 'Calling...' : 'Connected'}
            </p>
          </div>
        )}
        <div className="flex items-center justify-center gap-4 p-5 bg-gray-900">
          <button onClick={onMute}
            className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-colors',
              call.muted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600')}>
            {call.muted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
          </button>
          {call.type === 'video' && (
            <button onClick={onCam}
              className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                call.camOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600')}>
              {call.camOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-white" />}
            </button>
          )}
          <button onClick={onHangup}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
            <PhoneOff size={22} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMine, big }: { msg: Message; isMine: boolean; big: boolean }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-0.5 rounded-full">{msg.text}</span>
      </div>
    )
  }
  return (
    <div className={cn('flex gap-2 mb-2', isMine && 'flex-row-reverse')}>
      {!isMine && <Av name={msg.senderName} sz={big ? 8 : 6} />}
      <div className={cn('max-w-[75%]', isMine && 'items-end flex flex-col')}>
        {!isMine && <p className="text-[10px] text-gray-400 px-1 mb-0.5">{msg.senderName}</p>}
        <div className={cn('px-3 py-2 rounded-2xl leading-relaxed',
          big ? 'text-sm' : 'text-xs',
          isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm')}>
          {msg.text}
        </div>
        <p className={cn('text-[9px] text-gray-400 px-1 mt-0.5', isMine && 'text-right')}>
          {fmtTime(msg.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const { user }                  = useAuthStore()
  const { isOpen, close, toggle } = useChatWidgetStore()

  const role = user?.role ?? ''
  if (!user || role === 'student' || role === 'parent') return null

  const me = {
    id:    user.id,
    name:  `${user.first_name} ${user.last_name}`.trim(),
    role,
    email: user.email,
  }

  const [big, setBig] = useState(false)

  const curW = isOpen ? (big ? W_LG : W_SM) : BTN
  const curH = isOpen ? (big ? H_LG : H_SM) : BTN

  const [pos, setPos] = useState({ x: 9999, y: 9999 })
  const posRef = useRef(pos)
  posRef.current = pos

  useEffect(() => {
    setPos({ x: window.innerWidth - BTN - PAD, y: window.innerHeight - BTN - PAD })
  }, [])
  useEffect(() => {
    setPos(p => ({
      x: Math.min(p.x, window.innerWidth  - curW - PAD),
      y: Math.min(p.y, window.innerHeight - curH - PAD),
    }))
  }, [curW, curH])

  const dragRef = useRef<{ ox: number; oy: number } | null>(null)
  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { ox: e.clientX - posRef.current.x, oy: e.clientY - posRef.current.y }
  }, [])
  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const x = Math.max(PAD, Math.min(window.innerWidth  - curW - PAD, e.clientX - dragRef.current.ox))
    const y = Math.max(PAD, Math.min(window.innerHeight - curH - PAD, e.clientY - dragRef.current.oy))
    setPos({ x, y })
  }, [curW, curH])
  const onUp = useCallback(() => { dragRef.current = null }, [])

  // ── Chat state ───────────────────────────────────────────────────────────
  const [convos,      setConvos]      = useState<Conversation[]>([])
  const [messages,    setMessages]    = useState<Message[]>([])
  const [activeId,    setActiveId]    = useState<string | null>(null)
  const [view,        setView]        = useState<'list' | 'chat' | 'new'>('list')
  const [draft,       setDraft]       = useState('')
  const [search,      setSearch]      = useState('')
  const [sending,     setSending]     = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const messagesEnd    = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMsgTimeRef = useRef<string | null>(null)

  const [call, setCall] = useState<CallState>({
    active: false, type: 'audio', peer: null,
    localStream: null, remoteStream: null,
    muted: false, camOff: false, status: 'calling',
  })

  const active = convos.find(c => c.id === activeId) ?? null

  // ── Load conversations ───────────────────────────────────────────────────
  const loadConvos = useCallback(async () => {
    try {
      const res: any = await api.get('/api/v1/notifications/chat/conversations')
      const data: any[] = res?.data ?? res ?? []
      setConvos(data.map(mapConvo))
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadConvos() }, [loadConvos])

  // ── Load messages when active convo changes ──────────────────────────────
  useEffect(() => {
    if (!activeId) return
    setLoadingMsgs(true)
    setMessages([])
    lastMsgTimeRef.current = null
    api.get(`/api/v1/notifications/chat/conversations/${activeId}/messages`)
      .then((res: any) => {
        const msgs = (res?.data ?? res ?? []).map(mapMsg)
        setMessages(msgs)
        if (msgs.length > 0) lastMsgTimeRef.current = msgs[msgs.length - 1].createdAt
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [activeId])

  // ── Poll for new messages every 3 seconds ───────────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!activeId) return

    pollRef.current = setInterval(async () => {
      try {
        const since = lastMsgTimeRef.current
        const url = since
          ? `/api/v1/notifications/chat/conversations/${activeId}/messages?since=${encodeURIComponent(since)}`
          : `/api/v1/notifications/chat/conversations/${activeId}/messages`
        const res: any = await api.get(url)
        const data: any[] = res?.data ?? res ?? []
        if (data.length > 0) {
          const newMsgs = data.map(mapMsg)
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id))
            const fresh = newMsgs.filter(m => !ids.has(m.id))
            if (fresh.length === 0) return prev
            lastMsgTimeRef.current = fresh[fresh.length - 1].createdAt
            return [...prev, ...fresh]
          })
          loadConvos()
        }
      } catch { /* silent */ }
    }, 3000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeId, loadConvos])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ── Send message ─────────────────────────────────────────────────────────
  const send = async () => {
    if (!draft.trim() || !activeId || sending) return
    setSending(true)
    const text = draft.trim()
    setDraft('')

    const optimistic: Message = {
      id: makeId(), senderId: me.id, senderName: me.name,
      text, createdAt: new Date().toISOString(), type: 'text',
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res: any = await api.post(
        `/api/v1/notifications/chat/conversations/${activeId}/messages`,
        { text, sender_name: me.name }
      )
      const saved = res?.data ?? res
      setMessages(prev => prev.map(m => m.id === optimistic.id ? mapMsg(saved) : m))
      lastMsgTimeRef.current = saved.created_at
      loadConvos()
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setDraft(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const openConvo = (id: string) => {
    setActiveId(id)
    if (!big) setView('chat')
  }

  const addConvo = (c: Conversation) => {
    setConvos(cs => cs.find(x => x.id === c.id) ? cs : [c, ...cs])
    setActiveId(c.id)
    setView(big ? 'list' : 'chat')
  }

  const startCall = async (type: 'audio' | 'video', peer: ChatUser) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
      setCall({ active: true, type, peer, localStream: stream, remoteStream: null, muted: false, camOff: false, status: 'calling' })
      setTimeout(() => setCall(c => ({ ...c, status: 'connected' })), 2000)
    } catch { alert('Please allow microphone/camera access.') }
  }

  const hangup = () => {
    call.localStream?.getTracks().forEach(t => t.stop())
    setCall(c => ({ ...c, active: false, localStream: null, status: 'ended' }))
  }

  const filteredConvos = convos
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const totalUnread = convos.filter(c => c.lastMessage && c.lastMessage.senderId !== me.id).length

  // Fake peer for call buttons (we don't have online status without presence)
  const peerForCall: ChatUser | null = active?.type === 'direct'
    ? { id: '', name: active.name, role: 'teacher', email: '', online: false }
    : null

  // ── Shared: conversation list item ───────────────────────────────────────
  const ConvoItem = ({ c, compact }: { c: Conversation; compact: boolean }) => {
    const last = c.lastMessage
    const isAct = c.id === activeId
    return (
      <button key={c.id} onClick={() => openConvo(c.id)}
        className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-gray-50',
          isAct ? (compact ? 'bg-indigo-50' : 'bg-indigo-50 border-l-2 border-l-indigo-500') : 'hover:bg-gray-50')}>
        {c.type === 'group'
          ? <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><Users size={14} className="text-gray-500" /></div>
          : <Av name={c.name} sz={8} />}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline">
            <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
            {last && <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">{fmtTime(last.createdAt)}</span>}
          </div>
          {last && <p className="text-xs text-gray-500 truncate">{last.senderId === me.id ? 'You: ' : ''}{last.text}</p>}
        </div>
      </button>
    )
  }

  // ── Shared: message input bar ────────────────────────────────────────────
  const InputBar = ({ compact }: { compact: boolean }) => (
    <div className={cn('border-t border-gray-100 bg-white', compact ? 'px-3 py-2.5' : 'px-4 py-3')}>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
        <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
          placeholder={`Message ${active?.name ?? ''}...`}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
        />
        <button onClick={send} disabled={!draft.trim() || sending}
          className={cn('rounded-xl flex items-center justify-center transition-colors',
            compact ? 'w-7 h-7' : 'w-8 h-8',
            draft.trim() && !sending ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-200')}>
          <Send size={compact ? 13 : 14} className={draft.trim() && !sending ? 'text-white' : 'text-gray-400'} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: curW, height: curH, zIndex: 9998,
        transition: dragRef.current ? 'none' : 'width 0.22s ease, height 0.22s ease',
      }}>
        {/* ── Collapsed bubble ────────────────────────────────────────────── */}
        {!isOpen ? (
          <div
            className="w-full h-full rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-2xl flex items-center justify-center cursor-pointer select-none transition-colors"
            onPointerDown={startDrag} onPointerMove={onMove} onPointerUp={() => { onUp() }} onClick={toggle}
            title="Open chat"
          >
            <MessageCircle size={26} className="text-white" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                {totalUnread}
              </span>
            )}
          </div>

        ) : (
          /* ── Expanded panel ─────────────────────────────────────────────── */
          <div className="w-full h-full bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">

            {/* Drag-handle header */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 bg-indigo-600 rounded-t-2xl cursor-grab active:cursor-grabbing select-none flex-shrink-0"
              onPointerDown={startDrag} onPointerMove={onMove} onPointerUp={onUp}
            >
              {!big && view === 'chat' && (
                <button onPointerDown={e => e.stopPropagation()} onClick={() => setView('list')}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                  <ArrowLeft size={15} className="text-white" />
                </button>
              )}

              {(!big && view === 'chat' && active) ? (
                <>
                  {active.type === 'group'
                    ? <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><Users size={12} className="text-white" /></div>
                    : <div style={{ width: 26, height: 26, fontSize: 9 }} className={cn('rounded-full flex items-center justify-center font-bold', avColor(active.name))}>{initials(active.name)}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{active.name}</p>
                    <p className="text-indigo-200 text-[10px]">{active.type === 'group' ? `${active.participants.length} members` : ''}</p>
                  </div>
                  {active.type === 'direct' && peerForCall && (
                    <div className="flex gap-1" onPointerDown={e => e.stopPropagation()}>
                      <button onClick={() => startCall('audio', peerForCall)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"><Phone size={13} className="text-white" /></button>
                      <button onClick={() => startCall('video', peerForCall)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"><Video size={13} className="text-white" /></button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <MessageCircle size={15} className="text-white" />
                  <p className="flex-1 text-white font-semibold text-sm">
                    {view === 'new' ? 'New Conversation' : 'Messages'}
                  </p>
                </>
              )}

              <div className="flex items-center gap-0.5 ml-auto" onPointerDown={e => e.stopPropagation()}>
                {view !== 'new' && (
                  <button onClick={() => { setBig(b => !b); if (!big) setView('list') }}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    title={big ? 'Compact view' : 'Expand view'}>
                    {big ? <Minimize2 size={14} className="text-white" /> : <Maximize2 size={14} className="text-white" />}
                  </button>
                )}
                {view === 'list' && (
                  <button onClick={() => setView('new')}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="New conversation">
                    <Edit2 size={14} className="text-white" />
                  </button>
                )}
                <button onClick={close} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Close">
                  <Minus size={14} className="text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            {big ? (
              /* ── TWO-COLUMN EXPANDED LAYOUT ── */
              <div className="flex flex-1 overflow-hidden">
                {/* Left: conversation list */}
                <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col">
                  {view === 'new' ? (
                    <NewConvoPanel myId={me.id} myName={me.name} onClose={() => setView('list')} onCreate={addConvo} />
                  ) : (
                    <>
                      <div className="px-3 pt-2.5 pb-2 border-b border-gray-100">
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {filteredConvos.map(c => <ConvoItem key={c.id} c={c} compact={false} />)}
                        <button onClick={() => setView('new')}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-gray-100 text-xs font-medium">
                          <Plus size={13} /> New conversation
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Right: active chat */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {active && view !== 'new' ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
                        {active.type === 'group'
                          ? <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><Users size={14} className="text-gray-500" /></div>
                          : <Av name={active.name} sz={8} />}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{active.name}</p>
                          {active.type === 'group' && <p className="text-xs text-gray-400">{active.participants.length} members</p>}
                        </div>
                        {active.type === 'direct' && peerForCall && (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => startCall('audio', peerForCall)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"><Phone size={15} className="text-gray-600" /></button>
                            <button onClick={() => startCall('video', peerForCall)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"><Video size={15} className="text-gray-600" /></button>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/40">
                        {loadingMsgs
                          ? <div className="flex items-center justify-center h-full"><p className="text-xs text-gray-400">Loading...</p></div>
                          : messages.length === 0
                            ? <div className="flex flex-col items-center justify-center h-full text-center"><p className="text-sm text-gray-400">No messages yet. Say hello!</p></div>
                            : messages.map(msg => <Bubble key={msg.id} msg={msg} isMine={msg.senderId === me.id} big={big} />)
                        }
                        <div ref={messagesEnd} />
                      </div>
                      <InputBar compact={false} />
                    </>
                  ) : view !== 'new' && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
                        <MessageCircle size={26} className="text-indigo-600" />
                      </div>
                      <p className="font-semibold text-gray-800 mb-1">Select a conversation</p>
                      <p className="text-xs text-gray-400 mb-4">Choose from the list or start a new one</p>
                      <button onClick={() => setView('new')}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                        <Plus size={14} /> New conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>

            ) : (
              /* ── COMPACT SINGLE-PANEL LAYOUT ── */
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {view === 'new' && (
                  <div className="absolute inset-0 bg-white z-10 flex flex-col">
                    <NewConvoPanel myId={me.id} myName={me.name} onClose={() => setView('list')} onCreate={addConvo} />
                  </div>
                )}

                {view === 'list' && (
                  <>
                    <div className="px-3 pt-2.5 pb-2 border-b border-gray-100">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                          className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {filteredConvos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                          <MessageCircle size={28} className="text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">No conversations</p>
                          <button onClick={() => setView('new')} className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium">Start one</button>
                        </div>
                      ) : filteredConvos.map(c => <ConvoItem key={c.id} c={c} compact={true} />)}
                      <button onClick={() => setView('new')}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-gray-100 text-xs font-medium">
                        <Plus size={13} /> New conversation
                      </button>
                    </div>
                  </>
                )}

                {view === 'chat' && active && (
                  <>
                    <div className="flex-1 overflow-y-auto p-3 bg-gray-50/40">
                      {loadingMsgs
                        ? <div className="flex items-center justify-center h-full"><p className="text-xs text-gray-400">Loading...</p></div>
                        : messages.length === 0
                          ? <div className="flex flex-col items-center justify-center h-full text-center"><p className="text-sm text-gray-400">No messages yet</p></div>
                          : messages.map(msg => <Bubble key={msg.id} msg={msg} isMine={msg.senderId === me.id} big={false} />)
                      }
                      <div ref={messagesEnd} />
                    </div>
                    <InputBar compact={true} />
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {call.active && (
        <CallOverlay call={call}
          onMute={() => { call.localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled }); setCall(c => ({ ...c, muted: !c.muted })) }}
          onCam={() => { call.localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled }); setCall(c => ({ ...c, camOff: !c.camOff })) }}
          onHangup={hangup}
        />
      )}
    </>
  )
}
