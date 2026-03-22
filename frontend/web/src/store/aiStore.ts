import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Provider & Model Definitions ────────────────────────────────────────────

export const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    color: '#10a37f',
    bg: '#f0fdf9',
    border: '#bbf7d0',
    models: [
      { id: 'gpt-4o',              label: 'GPT-4o',           ctx: '128k' },
      { id: 'gpt-4o-mini',         label: 'GPT-4o Mini',      ctx: '128k' },
      { id: 'gpt-4-turbo',         label: 'GPT-4 Turbo',      ctx: '128k' },
      { id: 'gpt-3.5-turbo',       label: 'GPT-3.5 Turbo',    ctx: '16k'  },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    color: '#d4623a',
    bg: '#fff7f5',
    border: '#fed7c6',
    models: [
      { id: 'claude-opus-4-6',     label: 'Claude Opus 4.6',    ctx: '200k' },
      { id: 'claude-sonnet-4-6',   label: 'Claude Sonnet 4.6',  ctx: '200k' },
      { id: 'claude-haiku-4-5',    label: 'Claude Haiku 4.5',   ctx: '200k' },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    color: '#4285f4',
    bg: '#f0f7ff',
    border: '#bfdbfe',
    models: [
      { id: 'gemini-2.0-flash',    label: 'Gemini 2.0 Flash',   ctx: '1M'   },
      { id: 'gemini-1.5-pro',      label: 'Gemini 1.5 Pro',     ctx: '2M'   },
      { id: 'gemini-1.5-flash',    label: 'Gemini 1.5 Flash',   ctx: '1M'   },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    color: '#ff7000',
    bg: '#fff7f0',
    border: '#fed7aa',
    models: [
      { id: 'mistral-large-latest',   label: 'Mistral Large',   ctx: '128k' },
      { id: 'mistral-medium-latest',  label: 'Mistral Medium',  ctx: '32k'  },
      { id: 'mistral-small-latest',   label: 'Mistral Small',   ctx: '32k'  },
      { id: 'mixtral-8x7b-instruct',  label: 'Mixtral 8x7B',   ctx: '32k'  },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    color: '#f55036',
    bg: '#fff5f5',
    border: '#fecaca',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',  ctx: '128k' },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',   ctx: '128k' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',   ctx: '32k'  },
      { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',     ctx: '8k'   },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    color: '#39594d',
    bg: '#f0fdf6',
    border: '#bbf7d0',
    models: [
      { id: 'command-r-plus',  label: 'Command R+',   ctx: '128k' },
      { id: 'command-r',       label: 'Command R',    ctx: '128k' },
      { id: 'command',         label: 'Command',      ctx: '4k'   },
    ],
  },
  {
    id: 'local',
    name: 'Local LLM',
    color: '#6366f1',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    models: [],
  },
] as const

export type ProviderId = typeof AI_PROVIDERS[number]['id']

export const LOCAL_ARCHITECTURES = [
  { id: 'tinyllama-1.1b', name: 'TinyLlama 1.1B',  size: '~700 MB',  ram: '4 GB',  speed: 'Fast'   },
  { id: 'phi-2',          name: 'Phi-2 (2.7B)',     size: '~1.6 GB',  ram: '6 GB',  speed: 'Fast'   },
  { id: 'phi-3-mini',     name: 'Phi-3 Mini (3.8B)',size: '~2.3 GB',  ram: '8 GB',  speed: 'Medium' },
  { id: 'llama-3.2-3b',   name: 'Llama 3.2 (3B)',   size: '~2.0 GB',  ram: '8 GB',  speed: 'Medium' },
  { id: 'mistral-7b',     name: 'Mistral 7B',       size: '~4.1 GB',  ram: '16 GB', speed: 'Slow'   },
]

export const DATA_SOURCES = [
  { id: 'students',       label: 'Student Records',   desc: 'Names, grades, personal info, contact' },
  { id: 'academics',      label: 'Academic Data',     desc: 'Subjects, classes, exam results, marks' },
  { id: 'attendance',     label: 'Attendance Logs',   desc: 'Daily attendance, absentee patterns' },
  { id: 'fees',           label: 'Fee Records',       desc: 'Payment history, pending dues, receipts' },
  { id: 'staff',          label: 'Staff Data',        desc: 'Teachers, assignments, departments' },
  { id: 'announcements',  label: 'Announcements',     desc: 'School notices, events, circulars' },
  { id: 'timetable',      label: 'Timetable',         desc: 'Class schedules, room assignments' },
  { id: 'library',        label: 'Library Catalog',   desc: 'Books, borrowed records, inventory' },
]

export const AI_MODULES = [
  'Dashboard Insights', 'Student Q&A', 'Report Generation',
  'Fee Assistance', 'Attendance Analysis', 'Exam Insights', 'Staff Analytics',
]

// ─── Training Job ─────────────────────────────────────────────────────────────

export interface TrainingJob {
  id:         string
  startedAt:  string
  finishedAt: string | null
  status:     'running' | 'completed' | 'failed'
  progress:   number
  dataPoints: number
  duration:   string | null
  notes:      string
}

// ─── RAG Chunk (for in-memory vector store) ───────────────────────────────────

export interface RAGChunk {
  id:       string
  source:   string
  text:     string
  tokens:   number
  vector:   number[]   // TF-IDF weights (simplified)
}

// ─── AI Config State ──────────────────────────────────────────────────────────

export interface AIConfig {
  // Provider
  provider:    ProviderId
  apiKeys:     Record<string, string>
  models:      Record<string, string>   // provider → selected model id

  // Local LLM
  localArch:   string
  localStatus: 'idle' | 'training' | 'ready' | 'failed'
  localProgress: number
  localTrainedAt: string | null
  localLogs:   string[]

  // Training params
  trainSources:  string[]
  trainEpochs:   number
  trainLR:       number
  trainBatch:    number
  trainMaxLen:   number
  trainModelSize: 'tiny' | 'small' | 'medium'

  // Schedule
  scheduleFreq:  'manual' | 'daily' | 'weekly' | 'monthly'
  scheduleTime:  string
  scheduleDow:   number   // 0=Sun … 6=Sat
  nextRunAt:     string | null

  // RAG
  ragEnabled:    boolean
  ragChunkSize:  number
  ragOverlap:    number
  ragTopK:       number
  ragThreshold:  number
  ragEmbedding:  string

  // Assistant
  assistantEnabled: boolean
  assistantModules:  string[]
  assistantLang:     string

  // History
  trainingJobs: TrainingJob[]

  // Vector store (serialised)
  ragChunks: RAGChunk[]
}

interface AIStore extends AIConfig {
  setProvider:    (p: ProviderId) => void
  setApiKey:      (provider: string, key: string) => void
  setModel:       (provider: string, model: string) => void
  setLocalArch:   (arch: string) => void
  setTrainParam:  <K extends keyof AIConfig>(key: K, val: AIConfig[K]) => void
  toggleSource:   (src: string) => void
  toggleModule:   (mod: string) => void
  startTraining:  (tenantId: string) => void
  updateProgress: (prog: number, logs: string[]) => void
  finishTraining: (success: boolean) => void
  indexData:      (chunks: RAGChunk[]) => void
  clearIndex:     () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      // defaults
      provider:    'openai',
      apiKeys:     {},
      models:      {
        openai: 'gpt-4o-mini', anthropic: 'claude-sonnet-4-6',
        google: 'gemini-1.5-flash', mistral: 'mistral-small-latest',
        groq: 'llama-3.3-70b-versatile', cohere: 'command-r',
      },
      localArch:      'phi-3-mini',
      localStatus:    'idle',
      localProgress:  0,
      localTrainedAt: null,
      localLogs:      [],
      trainSources:   ['students', 'academics', 'attendance', 'fees'],
      trainEpochs:    8,
      trainLR:        0.0001,
      trainBatch:     16,
      trainMaxLen:    512,
      trainModelSize: 'small',
      scheduleFreq:   'manual',
      scheduleTime:   '02:00',
      scheduleDow:    1,
      nextRunAt:      null,
      ragEnabled:     true,
      ragChunkSize:   512,
      ragOverlap:     50,
      ragTopK:        5,
      ragThreshold:   0.65,
      ragEmbedding:   'local',
      assistantEnabled: true,
      assistantModules: [...AI_MODULES],
      assistantLang:  'English',
      trainingJobs:   [],
      ragChunks:      [],

      setProvider:   (p) => set({ provider: p }),
      setApiKey:     (provider, key) => set(s => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
      setModel:      (provider, model) => set(s => ({ models: { ...s.models, [provider]: model } })),
      setLocalArch:  (arch) => set({ localArch: arch }),
      setTrainParam: (key, val) => set({ [key]: val } as any),

      toggleSource: (src) => set(s => ({
        trainSources: s.trainSources.includes(src)
          ? s.trainSources.filter(x => x !== src)
          : [...s.trainSources, src],
      })),

      toggleModule: (mod) => set(s => ({
        assistantModules: s.assistantModules.includes(mod)
          ? s.assistantModules.filter(x => x !== mod)
          : [...s.assistantModules, mod],
      })),

      startTraining: (tenantId) => {
        const job: TrainingJob = {
          id:         crypto.randomUUID(),
          startedAt:  new Date().toISOString(),
          finishedAt: null,
          status:     'running',
          progress:   0,
          dataPoints: Math.floor(Math.random() * 8000) + 2000,
          duration:   null,
          notes:      `Tenant: ${tenantId} | Model: ${get().localArch}`,
        }
        set(s => ({
          localStatus: 'training',
          localProgress: 0,
          localLogs: [`[${new Date().toLocaleTimeString()}] Training started for ${get().localArch}...`],
          trainingJobs: [job, ...s.trainingJobs].slice(0, 20),
        }))
      },

      updateProgress: (prog, logs) => set(s => ({
        localProgress: prog,
        localLogs: [...logs, ...s.localLogs].slice(0, 200),
        trainingJobs: s.trainingJobs.map((j, i) =>
          i === 0 ? { ...j, progress: prog } : j
        ),
      })),

      finishTraining: (success) => set(s => {
        const now = new Date().toISOString()
        const startedAt = s.trainingJobs[0]?.startedAt
        const durationSec = startedAt
          ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
          : null
        return {
          localStatus:    success ? 'ready' : 'failed',
          localProgress:  success ? 100 : s.localProgress,
          localTrainedAt: success ? now : s.localTrainedAt,
          localLogs: [
            `[${new Date().toLocaleTimeString()}] Training ${success ? 'completed successfully' : 'failed'}.`,
            ...s.localLogs,
          ].slice(0, 200),
          trainingJobs: s.trainingJobs.map((j, i) =>
            i === 0
              ? { ...j, status: success ? 'completed' : 'failed', finishedAt: now,
                  progress: success ? 100 : j.progress,
                  duration: durationSec ? `${durationSec}s` : null }
              : j
          ),
        }
      }),

      indexData:  (chunks) => set({ ragChunks: chunks }),
      clearIndex: () => set({ ragChunks: [], localStatus: 'idle', localProgress: 0, localTrainedAt: null, localLogs: [] }),
    }),
    { name: 'schoolify-ai-config' }
  )
)
