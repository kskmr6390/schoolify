'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot, ChevronDown, Cpu, History, Loader2, MessageSquare,
  Plus, Send, Trash2, TrendingUp, User, X, Zap,
} from 'lucide-react'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAIStore, AI_PROVIDERS } from '../../../store/aiStore'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { source_type: string; source_id: string }[]
}

interface Conversation {
  id: string
  title: string
  created_at: string
}

const EXAMPLE_QUERIES = [
  "Which students have attendance below 75%?",
  "How is Grade 10-A performing in Mathematics?",
  "What is this month's fee collection rate?",
  "Who are the top 5 students this semester?",
  "Which subjects need attention in Grade 9?",
]

export default function AICopilotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { provider, setProvider, apiKeys, models, setModel, localArch, localStatus } = useAIStore()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(searchParams.get('q') || '')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showModelDrop, setShowModelDrop] = useState(false)
  const [showProviderDrop, setShowProviderDrop] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const modelDropRef = useRef<HTMLDivElement>(null)

  const currentProviderDef = AI_PROVIDERS.find(p => p.id === provider)!
  const currentModel = models[provider] ?? currentProviderDef.models[0]?.id ?? ''
  const currentModelLabel = currentProviderDef.models.find((m: any) => m.id === currentModel)?.label
    ?? (provider === 'local' ? localArch : currentModel)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close dropdowns on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (modelDropRef.current && !modelDropRef.current.contains(e.target as Node)) {
        setShowModelDrop(false)
        setShowProviderDrop(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // ── Conversation list ──────────────────────────────────────────────────────
  const { data: conversationsData } = useQuery({
    queryKey: ['copilot-conversations'],
    queryFn: () => api.get('/api/v1/copilot/conversations') as any,
    refetchOnWindowFocus: false,
  })
  const conversations: Conversation[] = (conversationsData as any)?.data ?? []

  // ── Metrics ────────────────────────────────────────────────────────────────
  const { data: metricsData } = useQuery({
    queryKey: ['copilot-metrics'],
    queryFn: () => api.get('/api/v1/copilot/metrics?days=30') as any,
    enabled: showMetrics,
    refetchInterval: showMetrics ? 30000 : false,
  })
  const metrics = (metricsData as any)?.data

  // ── Chat mutation ──────────────────────────────────────────────────────────
  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      api.post('/api/v1/copilot/chat', {
        message,
        conversation_id: conversationId,
        provider,
        model: provider === 'local' ? undefined : currentModel,
        // api_key is NOT sent here — it's saved to the server once via
        // Settings → AI & LLM → Save, and retrieved from Redis on each request
      }) as any,
    onSuccess: (data: any) => {
      const { conversation_id, response, sources } = data.data
      if (!conversationId) {
        setConversationId(conversation_id)
        queryClient.invalidateQueries({ queryKey: ['copilot-conversations'] })
      }
      setMessages(prev => [
        ...prev,
        { id: `${Date.now()}-assistant`, role: 'assistant', content: response, sources },
      ])
    },
    onError: (err: any) => {
      setMessages(prev => [
        ...prev,
        { id: `${Date.now()}-err`, role: 'assistant', content: `Error: ${err.message}` },
      ])
    },
  })

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: `${Date.now()}-user`, role: 'user', content: msg }])
    chatMutation.mutate(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const loadConversation = async (conv: Conversation) => {
    setConversationId(conv.id)
    setMessages([])
    try {
      const res = await api.get(`/api/v1/copilot/conversations/${conv.id}/messages`) as any
      const msgs: Message[] = (res.data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
      }))
      setMessages(msgs)
    } catch { /* silent */ }
  }

  const newChat = () => {
    setConversationId(null)
    setMessages([])
    setInput('')
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await api.delete(`/api/v1/copilot/conversations/${id}`)
    if (conversationId === id) newChat()
    queryClient.invalidateQueries({ queryKey: ['copilot-conversations'] })
  }

  const providerReady = provider !== 'local' || localStatus === 'ready'

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

      {/* ── History Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 border-r border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <History size={13} />
            History
          </div>
          <button
            onClick={newChat}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-indigo-600 transition-colors"
            title="New chat"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-8 px-4">No conversations yet</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs rounded-lg mx-1.5 group flex items-start justify-between gap-1 transition-colors',
                  conversationId === conv.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  <MessageSquare size={11} className="flex-shrink-0 mt-0.5 opacity-60" />
                  <span className="truncate leading-snug">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:text-red-500 transition"
                >
                  <Trash2 size={10} />
                </button>
              </button>
            ))
          )}
        </div>

        {/* Install local LLM shortcut */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={() => router.push('/ai-copilot/install')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors font-medium"
          >
            <Cpu size={13} />
            Install Local LLM
          </button>
        </div>
      </aside>

      {/* ── Main Chat Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar: provider + model selectors + metrics toggle */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2 flex-1" ref={modelDropRef}>

            {/* Provider selector */}
            <div className="relative">
              <button
                onClick={() => { setShowProviderDrop(v => !v); setShowModelDrop(false) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentProviderDef.color }} />
                {currentProviderDef.name}
                <ChevronDown size={11} className={cn('transition-transform', showProviderDrop && 'rotate-180')} />
              </button>
              {showProviderDrop && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
                  {AI_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setProvider(p.id as any); setShowProviderDrop(false) }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors',
                        provider === p.id && 'bg-indigo-50 text-indigo-700 font-medium'
                      )}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name}
                      {provider === p.id && <span className="ml-auto text-indigo-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model selector — hidden for local */}
            {provider !== 'local' && currentProviderDef.models.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowModelDrop(v => !v); setShowProviderDrop(false) }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors max-w-[160px]"
                >
                  <span className="truncate">{currentModelLabel}</span>
                  <ChevronDown size={11} className={cn('flex-shrink-0 transition-transform', showModelDrop && 'rotate-180')} />
                </button>
                {showModelDrop && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
                    {(currentProviderDef.models as unknown as any[]).map((m: any) => (
                      <button
                        key={m.id}
                        onClick={() => { setModel(provider, m.id); setShowModelDrop(false) }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors',
                          currentModel === m.id && 'bg-indigo-50 text-indigo-700 font-medium'
                        )}
                      >
                        <span>{m.label}</span>
                        <span className="text-gray-400 text-[10px]">{m.ctx}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Local arch badge */}
            {provider === 'local' && (
              <span className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-medium">
                <Cpu size={11} className="inline mr-1" />{localArch}
              </span>
            )}

            {/* No API key warning */}
            {provider !== 'local' && !apiKeys[provider] && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                No API key — set one in Settings → AI
              </span>
            )}
          </div>

          {/* Metrics toggle */}
          <button
            onClick={() => setShowMetrics(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
              showMetrics
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <TrendingUp size={12} />
            Metrics
          </button>

          {/* New chat (mobile) */}
          <button
            onClick={newChat}
            className="md:hidden p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* ── Metrics Panel ───────────────────────────────────────────────── */}
        {showMetrics && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            {!metrics ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 size={13} className="animate-spin" />Loading metrics…
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Pass rate */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">{metrics.passed} Pass</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs font-semibold text-red-700">{metrics.failed} Fail</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-800">{metrics.pass_rate}%</span> pass rate
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <Zap size={11} className="inline mr-1 text-yellow-500" />
                    <span className="font-semibold text-gray-700">{metrics.avg_latency_ms}ms</span> avg
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{metrics.total_tokens.toLocaleString()}</span> tokens
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">${metrics.total_cost_usd}</span> cost
                  </div>
                </div>

                {/* By provider */}
                {Object.keys(metrics.by_provider).length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(metrics.by_provider as Record<string, any>).map(([prov, stat]) => {
                      const provDef = AI_PROVIDERS.find(p => p.id === prov)
                      return (
                        <div key={prov} className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border bg-white" style={{ borderColor: provDef?.border ?? '#e5e7eb' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: provDef?.color ?? '#6b7280' }} />
                          <span className="font-medium" style={{ color: provDef?.color ?? '#374151' }}>{provDef?.name ?? prov}</span>
                          <span className="text-gray-400">{stat.total} calls</span>
                          {stat.fail > 0 && <span className="text-red-500">{stat.fail} fail</span>}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Recent errors */}
                {metrics.recent_errors.length > 0 && (
                  <div className="text-[11px] text-red-600 bg-red-50 rounded-lg px-2 py-1 border border-red-100">
                    <span className="font-semibold">Last error:</span> {metrics.recent_errors[0].error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Messages ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                {provider === 'local'
                  ? <Cpu size={28} className="text-indigo-600" />
                  : <Bot size={28} className="text-indigo-600" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">How can I help you today?</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-6">
                Ask me about student performance, attendance, fee collection, or any school data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {EXAMPLE_QUERIES.map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-full text-gray-600 transition-colors border border-gray-200">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {provider === 'local' ? <Cpu size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-400">
                        Sources: {[...new Set(msg.sources.map(s => s.source_type))].join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={14} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))
          )}

          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                {provider === 'local' ? <Cpu size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ───────────────────────────────────────────────────────── */}
        <div className="flex gap-3 items-end px-4 pb-4 pt-2 border-t border-gray-100 flex-shrink-0">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                provider === 'local' && !providerReady
                  ? 'Train a local model in Settings first…'
                  : `Ask about your school data… (Enter to send)`
              }
              disabled={provider === 'local' && !providerReady}
              rows={1}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending || (provider === 'local' && !providerReady)}
            className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {chatMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
