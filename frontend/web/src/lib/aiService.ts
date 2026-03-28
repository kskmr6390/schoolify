/**
 * aiService.ts — Query routing + RAG pipeline for Schoolify AI
 *
 * Flow:
 *   queryAI(prompt, tenantData?)
 *     ├── if provider === 'local' && RAG enabled
 *     │     → buildRAGContext(query, ragChunks) → inject into prompt → localInfer()
 *     └── else
 *           → injectTenantContext(prompt, tenantData) → callProviderAPI()
 */

import { useAIStore, type RAGChunk } from '../store/aiStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIMessage { role: 'user' | 'assistant' | 'system'; content: string }

export interface AIResponse {
  text:       string
  provider:   string
  model:      string
  ragUsed:    boolean
  chunks:     RAGChunk[]
  tokensUsed: number | null
  latencyMs:  number
}

// ─── Tokeniser (rough estimate) ──────────────────────────────────────────────

function countTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3)
}

// ─── Simple TF-IDF Vector ────────────────────────────────────────────────────

function tokenise(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
}

function buildVector(tokens: string[], vocab: string[]): number[] {
  const tf: Record<string, number> = {}
  tokens.forEach(t => { tf[t] = (tf[t] ?? 0) + 1 })
  return vocab.map(w => (tf[w] ?? 0) / tokens.length)
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2 }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

// ─── RAG Indexer ─────────────────────────────────────────────────────────────

/**
 * Index tenant data into RAG chunks.
 * Call this after a training job completes or on-demand.
 */
export function indexTenantData(
  tenantData: Record<string, unknown[]>,
  chunkSize = 512,
  overlap = 50,
): RAGChunk[] {
  const chunks: RAGChunk[] = []
  const vocab = new Set<string>()

  // Convert each data source to text chunks
  for (const [source, records] of Object.entries(tenantData)) {
    if (!Array.isArray(records)) continue

    for (const record of records) {
      // Serialise record to readable text
      const text = Object.entries(record as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
        .join('. ')

      // Split into overlapping chunks
      const words = text.split(/\s+/)
      for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const slice = words.slice(i, i + chunkSize).join(' ')
        if (slice.length < 20) continue

        const tokens = tokenise(slice)
        tokens.forEach(t => vocab.add(t))

        chunks.push({
          id:     crypto.randomUUID(),
          source,
          text:   slice,
          tokens: tokens.length,
          vector: [],  // filled in second pass
        })
      }
    }
  }

  // Build TF-IDF vectors
  const vocabArr = [...vocab]
  chunks.forEach(c => {
    c.vector = buildVector(tokenise(c.text), vocabArr)
  })

  // Save to store
  useAIStore.getState().indexData(chunks)
  return chunks
}

// ─── RAG Retrieval ───────────────────────────────────────────────────────────

export function retrieveChunks(
  query: string,
  chunks: RAGChunk[],
  topK = 5,
  threshold = 0.65,
): RAGChunk[] {
  if (chunks.length === 0) return []

  // Build vocab from all chunks
  const vocab = new Set<string>()
  chunks.forEach(c => tokenise(c.text).forEach(t => vocab.add(t)))
  const vocabArr = [...vocab]

  const queryVec = buildVector(tokenise(query), vocabArr)

  const scored = chunks
    .map(c => ({
      chunk: c,
      score: cosine(queryVec, c.vector.length ? c.vector : buildVector(tokenise(c.text), vocabArr)),
    }))
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored.map(x => x.chunk)
}

// ─── Provider API Callers ─────────────────────────────────────────────────────

async function callOpenAI(
  messages: AIMessage[], model: string, apiKey: string
): Promise<{ text: string; tokens: number }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.3 }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    text:   data.choices[0].message.content,
    tokens: data.usage?.total_tokens ?? countTokens(messages.map(m => m.content).join(' ')),
  }
}

async function callAnthropic(
  messages: AIMessage[], model: string, apiKey: string
): Promise<{ text: string; tokens: number }> {
  const sysMsg = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model, max_tokens: 2048,
      system: sysMsg?.content,
      messages: userMessages,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    text:   data.content[0].text,
    tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
  }
}

async function callGoogle(
  messages: AIMessage[], model: string, apiKey: string
): Promise<{ text: string; tokens: number }> {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048, temperature: 0.3 } }),
  })
  if (!res.ok) throw new Error(`Google error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    text:   data.candidates[0].content.parts[0].text,
    tokens: data.usageMetadata?.totalTokenCount ?? null,
  }
}

async function callMistral(
  messages: AIMessage[], model: string, apiKey: string
): Promise<{ text: string; tokens: number }> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.3 }),
  })
  if (!res.ok) throw new Error(`Mistral error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return { text: data.choices[0].message.content, tokens: data.usage?.total_tokens ?? null }
}

async function callGroq(
  messages: AIMessage[], model: string, apiKey: string
): Promise<{ text: string; tokens: number }> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.3 }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return { text: data.choices[0].message.content, tokens: data.usage?.total_tokens ?? null }
}

async function callCohere(
  messages: AIMessage[], model: string, apiKey: string
): Promise<{ text: string; tokens: number }> {
  const chatHistory = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
    message: m.content,
  }))
  const lastMsg = messages[messages.length - 1].content
  const res = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, message: lastMsg, chat_history: chatHistory }),
  })
  if (!res.ok) throw new Error(`Cohere error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return { text: data.text, tokens: data.meta?.tokens?.input_tokens ?? null }
}

// Maps aiStore localArch IDs → Ollama model names
const ARCH_TO_OLLAMA: Record<string, string> = {
  'tinyllama-1.1b': 'tinyllama',
  'phi-2':          'phi',
  'phi-3-mini':     'phi3',
  'llama-3.2-3b':   'llama3.2:3b',
  'mistral-7b':     'mistral',
}

/** Local LLM — calls Ollama running in Docker (port 11434 exposed to host) */
async function callLocalLLM(
  messages: AIMessage[], arch: string
): Promise<{ text: string; tokens: number }> {
  const model = ARCH_TO_OLLAMA[arch] ?? arch
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Ollama error (${res.status}): ${body || 'model may not be pulled yet — run: docker exec schoolify-ollama ollama pull ' + model}`)
  }
  const data = await res.json()
  return { text: data.message?.content ?? data.response ?? '', tokens: data.eval_count ?? null }
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(ragChunks: RAGChunk[]): string {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const contextBlock = ragChunks.length > 0
    ? `\n\n## Relevant School Data\n${ragChunks.map((c, i) =>
        `[${i + 1}] (${c.source}): ${c.text}`
      ).join('\n\n')}`
    : ''

  return `You are Schoolify AI, an intelligent assistant for school administrators, teachers, and staff.
Today is ${today}.
Answer questions clearly and concisely. Use the provided school data to give accurate, data-driven answers.
When referring to specific records, cite the source data. Keep responses professional and helpful.${contextBlock}`
}

// ─── Main queryAI ─────────────────────────────────────────────────────────────

export async function queryAI(
  conversation: AIMessage[],
  options?: { systemOverride?: string }
): Promise<AIResponse> {
  const store = useAIStore.getState()
  const t0 = Date.now()

  const { provider, apiKeys, models, ragEnabled, ragChunks, ragTopK, ragThreshold, localArch } = store

  // ── RAG retrieval ──
  let usedChunks: RAGChunk[] = []
  if (ragEnabled && ragChunks.length > 0) {
    const lastUser = [...conversation].reverse().find(m => m.role === 'user')
    if (lastUser) {
      usedChunks = retrieveChunks(lastUser.content, ragChunks, ragTopK, ragThreshold)
    }
  }

  // ── Build messages ──
  const sysPrompt = options?.systemOverride ?? buildSystemPrompt(usedChunks)
  const messages: AIMessage[] = [
    { role: 'system', content: sysPrompt },
    ...conversation,
  ]

  const apiKey  = apiKeys[provider] ?? ''
  const modelId = models[provider as string] ?? ''

  let result: { text: string; tokens: number }

  switch (provider) {
    case 'openai':    result = await callOpenAI(messages, modelId, apiKey);    break
    case 'anthropic': result = await callAnthropic(messages, modelId, apiKey); break
    case 'google':    result = await callGoogle(messages, modelId, apiKey);    break
    case 'mistral':   result = await callMistral(messages, modelId, apiKey);   break
    case 'groq':      result = await callGroq(messages, modelId, apiKey);      break
    case 'cohere':    result = await callCohere(messages, modelId, apiKey);    break
    case 'local':     result = await callLocalLLM(messages, localArch);        break
    default:          throw new Error(`Unknown provider: ${provider}`)
  }

  return {
    text:      result.text,
    provider,
    model:     provider === 'local' ? localArch : modelId,
    ragUsed:   usedChunks.length > 0,
    chunks:    usedChunks,
    tokensUsed: result.tokens,
    latencyMs: Date.now() - t0,
  }
}

// ─── Test Connection ──────────────────────────────────────────────────────────

export async function testConnection(
  provider: string, apiKey: string, model: string
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t0 = Date.now()
  try {
    const testMessages: AIMessage[] = [{ role: 'user', content: 'Reply with one word: OK' }]
    switch (provider) {
      case 'openai':    await callOpenAI(testMessages, model, apiKey);    break
      case 'anthropic': await callAnthropic(testMessages, model, apiKey); break
      case 'google':    await callGoogle(testMessages, model, apiKey);    break
      case 'mistral':   await callMistral(testMessages, model, apiKey);   break
      case 'groq':      await callGroq(testMessages, model, apiKey);      break
      case 'cohere':    await callCohere(testMessages, model, apiKey);    break
      case 'local':     await callLocalLLM(testMessages, model);          break
    }
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, error: e.message }
  }
}
