'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search, Send, Phone, Video, PhoneOff, VideoOff, Mic, MicOff,
  Plus, X, Users, MessageCircle, MoreVertical, Paperclip,
  Image as ImageIcon, Smile, ArrowLeft, UserCircle2, Circle,
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatUser {
  id:     string
  name:   string
  role:   'admin' | 'super_admin' | 'teacher' | 'staff'
  email:  string
  online: boolean
  avatar?: string
}

interface Message {
  id:        string
  senderId:  string
  senderName:string
  text:      string
  createdAt: string
  type:      'text' | 'system'
}

interface Conversation {
  id:          string
  type:        'direct' | 'group'
  name:        string
  participants: ChatUser[]
  messages:    Message[]
  updatedAt:   string
}

type CallState = {
  active:    boolean
  type:      'audio' | 'video'
  peer:      ChatUser | null
  localStream:  MediaStream | null
  remoteStream: MediaStream | null
  muted:     boolean
  camOff:    boolean
  status:    'calling' | 'connected' | 'ended'
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_USERS: ChatUser[] = [
  { id: 'u1', name: 'Priya Sharma',  role: 'teacher', email: 'priya@school.in',  online: true },
  { id: 'u2', name: 'Ramesh Kumar',  role: 'teacher', email: 'ramesh@school.in', online: true },
  { id: 'u3', name: 'Anjali Verma',  role: 'staff',   email: 'anjali@school.in', online: false },
  { id: 'u4', name: 'Suresh Singh',  role: 'admin',   email: 'suresh@school.in', online: true },
  { id: 'u5', name: 'Meena Joshi',   role: 'teacher', email: 'meena@school.in',  online: false },
  { id: 'u6', name: 'Deepak Rao',    role: 'staff',   email: 'deepak@school.in', online: true },
  { id: 'u7', name: 'Kavita Nair',   role: 'teacher', email: 'kavita@school.in', online: true },
  { id: 'u8', name: 'Vikram Patil',  role: 'staff',   email: 'vikram@school.in', online: false },
]

function makeId() { return Math.random().toString(36).slice(2, 10) }

function formatMsgTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-600', 'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600', 'bg-rose-100 text-rose-600',
  'bg-violet-100 text-violet-600', 'bg-cyan-100 text-cyan-600',
  'bg-teal-100 text-teal-600', 'bg-pink-100 text-pink-600',
]
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md', online }: { name: string; size?: 'sm' | 'md' | 'lg'; online?: boolean }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'
  return (
    <div className="relative flex-shrink-0">
      <div className={cn("rounded-full flex items-center justify-center font-semibold", sz, avatarColor(name))}>
        {initials(name)}
      </div>
      {online !== undefined && (
        <span className={cn(
          "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white",
          online ? "bg-emerald-500" : "bg-gray-300"
        )} />
      )}
    </div>
  )
}

// ── Call Modal ────────────────────────────────────────────────────────────────
function CallModal({
  call,
  onToggleMute,
  onToggleCam,
  onHangup,
}: {
  call: CallState
  onToggleMute: () => void
  onToggleCam:  () => void
  onHangup:     () => void
}) {
  const localVideoRef  = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localVideoRef.current && call.localStream)
      localVideoRef.current.srcObject = call.localStream
  }, [call.localStream])

  useEffect(() => {
    if (remoteVideoRef.current && call.remoteStream)
      remoteVideoRef.current.srcObject = call.remoteStream
  }, [call.remoteStream])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl">
        {/* Video area */}
        {call.type === 'video' ? (
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            {/* Remote */}
            <video
              ref={remoteVideoRef}
              autoPlay playsInline
              className="w-full h-full object-cover"
            />
            {/* Local PiP */}
            <div className="absolute bottom-4 right-4 w-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay playsInline muted
                className="w-full"
              />
            </div>
            {/* Status overlay when calling */}
            {call.status === 'calling' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <Avatar name={call.peer?.name ?? ''} size="lg" />
                <p className="text-white font-semibold mt-3 text-lg">{call.peer?.name}</p>
                <p className="text-gray-400 text-sm mt-1 animate-pulse">Calling...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-gray-800 to-gray-900">
            <Avatar name={call.peer?.name ?? ''} size="lg" />
            <p className="text-white font-semibold mt-4 text-xl">{call.peer?.name}</p>
            <p className={cn("text-sm mt-2", call.status === 'calling' ? "text-gray-400 animate-pulse" : "text-emerald-400")}>
              {call.status === 'calling' ? 'Calling...' : call.status === 'connected' ? 'Connected' : 'Call ended'}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-5 bg-gray-900">
          <button
            onClick={onToggleMute}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              call.muted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
            )}
          >
            {call.muted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
          </button>

          {call.type === 'video' && (
            <button
              onClick={onToggleCam}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                call.camOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
              )}
            >
              {call.camOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-white" />}
            </button>
          )}

          <button
            onClick={onHangup}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <PhoneOff size={22} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Conversation Modal ─────────────────────────────────────────────────────
function NewConvoModal({
  currentUserId,
  onClose,
  onCreate,
}: {
  currentUserId: string
  onClose: () => void
  onCreate: (convo: Conversation) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ChatUser[]>([])
  const [groupName, setGroupName] = useState('')

  const filtered = MOCK_USERS.filter(u =>
    u.id !== currentUserId &&
    u.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (u: ChatUser) => {
    setSelected(s => s.find(x => x.id === u.id) ? s.filter(x => x.id !== u.id) : [...s, u])
  }

  const create = () => {
    if (selected.length === 0) return
    const isGroup = selected.length > 1
    const convo: Conversation = {
      id: makeId(),
      type: isGroup ? 'group' : 'direct',
      name: isGroup ? (groupName.trim() || selected.map(u => u.name.split(' ')[0]).join(', '))
                    : selected[0].name,
      participants: selected,
      messages: [],
      updatedAt: new Date().toISOString(),
    }
    onCreate(convo)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">New Conversation</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(u => (
                <span key={u.id} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                  {u.name.split(' ')[0]}
                  <button onClick={() => toggle(u)}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}

          {selected.length > 1 && (
            <input
              value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.map(u => {
              const sel = !!selected.find(x => x.id === u.id)
              return (
                <button key={u.id} onClick={() => toggle(u)}
                  className={cn("w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors",
                    sel ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50"
                  )}>
                  <Avatar name={u.name} size="sm" online={u.online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{u.role}</p>
                  </div>
                  {sel && <Check size={14} className="text-indigo-600 flex-shrink-0" />}
                </button>
              )
            })}
          </div>

          <button onClick={create} disabled={selected.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-2 rounded-xl text-sm font-medium transition-colors">
            {selected.length > 1 ? 'Create Group' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Inline Check icon
function Check({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.text}</span>
      </div>
    )
  }
  return (
    <div className={cn("flex gap-2 mb-3", isMine && "flex-row-reverse")}>
      {!isMine && (
        <div className="flex-shrink-0 mt-auto">
          <Avatar name={msg.senderName} size="sm" />
        </div>
      )}
      <div className={cn("max-w-[70%] space-y-0.5", isMine && "items-end flex flex-col")}>
        {!isMine && <p className="text-[10px] text-gray-400 px-1">{msg.senderName}</p>}
        <div className={cn(
          "px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
          isMine
            ? "bg-indigo-600 text-white rounded-br-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
        )}>
          {msg.text}
        </div>
        <p className={cn("text-[10px] text-gray-400 px-1", isMine && "text-right")}>
          {formatMsgTime(msg.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ── Main Chat ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuthStore()

  const currentUser: ChatUser = {
    id:    user?.id ?? 'me',
    name:  `${user?.first_name ?? 'You'} ${user?.last_name ?? ''}`.trim(),
    role:  (user?.role as ChatUser['role']) ?? 'admin',
    email: user?.email ?? '',
    online: true,
  }

  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'c1', type: 'direct', name: 'Priya Sharma',
      participants: [MOCK_USERS[0]],
      messages: [
        { id: 'm1', senderId: 'u1', senderName: 'Priya Sharma', text: 'Good morning! Can you share the timetable for next week?', createdAt: new Date(Date.now() - 3600000).toISOString(), type: 'text' },
        { id: 'm2', senderId: currentUser.id, senderName: currentUser.name, text: 'Sure, I will send it by afternoon.', createdAt: new Date(Date.now() - 3500000).toISOString(), type: 'text' },
      ],
      updatedAt: new Date(Date.now() - 3500000).toISOString(),
    },
    {
      id: 'c2', type: 'group', name: 'Staff Announcements',
      participants: [MOCK_USERS[0], MOCK_USERS[1], MOCK_USERS[2]],
      messages: [
        { id: 'm3', senderId: 'u2', senderName: 'Ramesh Kumar', text: 'Parent-teacher meeting is scheduled for Saturday 10am.', createdAt: new Date(Date.now() - 86400000).toISOString(), type: 'text' },
      ],
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ])

  const [activeId,       setActiveId]       = useState<string | null>('c1')
  const [message,        setMessage]        = useState('')
  const [searchConvo,    setSearchConvo]    = useState('')
  const [showNew,        setShowNew]        = useState(false)
  const [mobileView,     setMobileView]     = useState<'list' | 'chat'>('list')
  const [call, setCall] = useState<CallState>({
    active: false, type: 'audio', peer: null,
    localStream: null, remoteStream: null,
    muted: false, camOff: false, status: 'calling',
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  const activeConvo = conversations.find(c => c.id === activeId) ?? null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConvo?.messages.length])

  const sendMessage = () => {
    if (!message.trim() || !activeId) return
    const msg: Message = {
      id: makeId(), senderId: currentUser.id, senderName: currentUser.name,
      text: message.trim(), createdAt: new Date().toISOString(), type: 'text',
    }
    setConversations(cs => cs.map(c =>
      c.id === activeId
        ? { ...c, messages: [...c.messages, msg], updatedAt: msg.createdAt }
        : c
    ))
    setMessage('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const openConvo = (id: string) => {
    setActiveId(id); setMobileView('chat')
  }

  const addConvo = (c: Conversation) => {
    setConversations(cs => [c, ...cs])
    setActiveId(c.id)
    setMobileView('chat')
  }

  const startCall = async (type: 'audio' | 'video', peer: ChatUser) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true, video: type === 'video',
      })
      setCall({ active: true, type, peer, localStream: stream, remoteStream: null, muted: false, camOff: false, status: 'calling' })
      // Simulate connection after 2s
      setTimeout(() => setCall(c => ({ ...c, status: 'connected' })), 2000)
    } catch {
      alert('Could not access microphone/camera. Please allow permissions.')
    }
  }

  const hangup = () => {
    call.localStream?.getTracks().forEach(t => t.stop())
    setCall(c => ({ ...c, active: false, localStream: null, remoteStream: null, status: 'ended' }))
  }

  const toggleMute = () => {
    call.localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setCall(c => ({ ...c, muted: !c.muted }))
  }

  const toggleCam = () => {
    call.localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setCall(c => ({ ...c, camOff: !c.camOff }))
  }

  const filteredConvos = conversations.filter(c =>
    c.name.toLowerCase().includes(searchConvo.toLowerCase())
  ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const peer = activeConvo?.type === 'direct' ? activeConvo.participants[0] : null

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      {/* ── Sidebar / Conversation List ─────────────────────────────────── */}
      <aside className={cn(
        "w-full sm:w-80 border-r border-gray-200 flex flex-col flex-shrink-0",
        mobileView === 'chat' ? "hidden sm:flex" : "flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Messages</h2>
            <button
              onClick={() => setShowNew(true)}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors"
            >
              <Plus size={15} className="text-white" />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchConvo}
              onChange={e => setSearchConvo(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <MessageCircle size={32} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
              <button onClick={() => setShowNew(true)}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Start a new chat
              </button>
            </div>
          ) : (
            filteredConvos.map(c => {
              const last = c.messages[c.messages.length - 1]
              const isActive = c.id === activeId
              return (
                <button key={c.id} onClick={() => openConvo(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50",
                    isActive && "bg-indigo-50 border-indigo-100"
                  )}
                >
                  {c.type === 'group' ? (
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-gray-500" />
                    </div>
                  ) : (
                    <Avatar name={c.name} online={c.participants[0]?.online} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className={cn("text-sm font-semibold truncate", isActive ? "text-indigo-700" : "text-gray-900")}>
                        {c.name}
                      </p>
                      {last && <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{formatMsgTime(last.createdAt)}</span>}
                    </div>
                    {last && (
                      <p className="text-xs text-gray-500 truncate">
                        {last.senderId === currentUser.id ? 'You: ' : ''}{last.text}
                      </p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Chat Panel ──────────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        mobileView === 'list' ? "hidden sm:flex" : "flex"
      )}>
        {activeConvo ? (
          <>
            {/* Topbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
              <button
                onClick={() => setMobileView('list')}
                className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft size={16} className="text-gray-600" />
              </button>
              {activeConvo.type === 'group' ? (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                  <Users size={16} className="text-gray-500" />
                </div>
              ) : (
                <Avatar name={activeConvo.name} online={peer?.online} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{activeConvo.name}</p>
                {activeConvo.type === 'direct' ? (
                  <p className={cn("text-xs", peer?.online ? "text-emerald-500" : "text-gray-400")}>
                    {peer?.online ? 'Online' : 'Offline'}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">{activeConvo.participants.length} members</p>
                )}
              </div>

              {/* Call buttons — only for direct and non-student roles */}
              {activeConvo.type === 'direct' && peer && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startCall('audio', peer)}
                    className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Voice call"
                  >
                    <Phone size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => startCall('video', peer)}
                    className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Video call"
                  >
                    <Video size={16} className="text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              {activeConvo.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle size={32} className="text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
                </div>
              ) : (
                activeConvo.messages.map(msg => (
                  <Bubble key={msg.id} msg={msg} isMine={msg.senderId === currentUser.id} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
                <input
                  ref={inputRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeConvo.name}...`}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                    message.trim()
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-gray-200"
                  )}
                >
                  <Send size={14} className={message.trim() ? "text-white" : "text-gray-400"} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">Press Enter to send</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Messages</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
              Chat with teachers, staff, and admins. Audio and video calls supported for internal staff.
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={16} /> New Conversation
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNew && (
        <NewConvoModal
          currentUserId={currentUser.id}
          onClose={() => setShowNew(false)}
          onCreate={addConvo}
        />
      )}
      {call.active && (
        <CallModal
          call={call}
          onToggleMute={toggleMute}
          onToggleCam={toggleCam}
          onHangup={hangup}
        />
      )}
    </div>
  )
}
