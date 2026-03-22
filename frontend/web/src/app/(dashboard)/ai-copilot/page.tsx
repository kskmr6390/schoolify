'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bot, Loader2, Send, User } from 'lucide-react'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'
import { useSearchParams } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { source_type: string; source_id: string }[]
}

const EXAMPLE_QUERIES = [
  "Which students have attendance below 75%?",
  "How is Grade 10-A performing in Mathematics?",
  "What is this month's fee collection rate?",
  "Who are the top 5 students this semester?",
  "Which subjects need attention in Grade 9?",
]

export default function AICopilotPage() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(searchParams.get('q') || '')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      api.post('/api/v1/copilot/chat', {
        message,
        conversation_id: conversationId,
      }) as any,
    onSuccess: (data: any) => {
      const { conversation_id, response, sources } = data.data
      if (!conversationId) setConversationId(conversation_id)

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-assistant',
          role: 'assistant',
          content: response,
          sources,
        },
      ])
    },
  })

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return
    const userMessage = input.trim()
    setInput('')

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
      },
    ])

    chatMutation.mutate(userMessage)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Copilot</h1>
          <p className="text-xs text-gray-500">Powered by Claude • Ask anything about your school data</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Bot size={28} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">How can I help you today?</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              Ask me about student performance, attendance patterns, fee collection, or any school data.
            </p>
            {/* Example queries */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-full text-gray-600 transition-colors border border-gray-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                msg.role === 'user'
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-400">
                      Sources: {msg.sources.map(s => s.source_type).join(', ')}
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
              <Bot size={14} className="text-white" />
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

      {/* Input */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your school data... (Enter to send)"
            rows={1}
            className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white shadow-sm"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || chatMutation.isPending}
          className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {chatMutation.isPending
            ? <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />
          }
        </button>
      </div>
    </div>
  )
}
