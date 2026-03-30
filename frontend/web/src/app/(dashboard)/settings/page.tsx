'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings, Loader2, Plus, X, ChevronDown, ChevronRight, Save, List,
  School, BookOpen, UserCheck, Trophy, CreditCard, Bell, Palette,
  Shield, Clock, MapPin, Building, Hash,
  AlertCircle, CheckCircle2, Sliders, Brain, Cpu, Play, RefreshCw,
  Eye, EyeOff, Zap, Database, CheckSquare, Square, Terminal,
  RotateCcw, Calendar, FlaskConical, ChevronUp, Trash2, Download, AlertTriangle, Receipt,
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../../lib/api'
import { useAuthStore } from '../../../store/authStore'
import {
  useAIStore, AI_PROVIDERS, LOCAL_ARCHITECTURES, DATA_SOURCES, AI_MODULES,
  type ProviderId, type TrainingJob,
} from '../../../store/aiStore'
import { testConnection } from '../../../lib/aiService'

// ─── Types ───────────────────────────────────────────────────────────────────

type ModelStatusType = 'unknown' | 'checking' | 'downloaded' | 'not_downloaded' | 'downloading' | 'deleting'

type Tab =
  | 'school'
  | 'academic'
  | 'attendance'
  | 'grading'
  | 'fees'
  | 'notifications'
  | 'appearance'
  | 'security'
  | 'dropdowns'
  | 'ai'

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: Record<string, string> = {
  // School
  school_name: '',
  school_tagline: '',
  school_address: '',
  school_city: '',
  school_state: '',
  school_pin: '',
  school_phone: '',
  school_email: '',
  school_website: '',
  school_board: 'CBSE',
  school_type: 'co-ed',
  school_medium: 'English',
  school_established: '',
  school_affiliation_no: '',
  // Academic
  academic_year_start_month: '4',
  academic_year_end_month: '3',
  working_days_per_week: '6',
  periods_per_day: '8',
  period_duration_min: '45',
  school_start_time: '08:00',
  school_end_time: '14:30',
  lunch_break_duration_min: '30',
  timezone: 'Asia/Kolkata',
  date_format: 'DD/MM/YYYY',
  currency: 'INR',
  // Attendance
  attendance_threshold_percent: '75',
  late_mark_minutes: '15',
  half_day_hours: '4',
  auto_absent_after_minutes: '60',
  attendance_sms_alert: '1',
  attendance_email_alert: '0',
  // Grading
  grading_scale: '100',
  pass_mark_percent: '35',
  grade_a_plus_min: '90',
  grade_a_min: '80',
  grade_b_plus_min: '70',
  grade_b_min: '60',
  grade_c_plus_min: '50',
  grade_c_min: '40',
  grade_d_min: '35',
  gpa_enabled: '0',
  rank_in_class: '1',
  // Fees
  receipt_template: 'classic',
  late_fee_percent: '2',
  late_fee_grace_days: '10',
  partial_payment: '1',
  receipt_prefix: 'RCP',
  payment_modes: 'Cash,UPI,NEFT,Cheque',
  fee_reminder_days: '5',
  // Notifications
  notify_fee_due: '1',
  notify_attendance_low: '1',
  notify_exam_schedule: '1',
  notify_result_published: '1',
  notify_leave_approved: '1',
  notify_birthday: '1',
  sms_enabled: '0',
  email_enabled: '1',
  whatsapp_enabled: '0',
  // Appearance
  theme_color: '#4f46e5',
  theme_mode: 'light',
  sidebar_style: 'default',
  show_student_photo: '1',
  compact_view: '0',
  // Security
  session_timeout_hours: '8',
  password_min_length: '8',
  password_require_special: '1',
  password_require_number: '1',
  two_factor_auth: '0',
  login_attempts_limit: '5',
  ip_whitelist: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function v(merged: Record<string, string>, key: string): string {
  return merged[key] ?? DEFAULTS[key] ?? ''
}

function boolVal(merged: Record<string, string>, key: string): boolean {
  return v(merged, key) === '1'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100 mb-5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-indigo-600" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
    />
  )
}

function SelectInput({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Toggle({
  label, hint, value, onChange,
}: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          value ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// ─── Dropdown Category Card ───────────────────────────────────────────────────

const DROPDOWN_CATEGORIES = [
  { key: 'dropdown_blood_groups',   label: 'Blood Groups',       defaults: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  { key: 'dropdown_departments',    label: 'Departments',        defaults: ['Science', 'Mathematics', 'English', 'Social Studies', 'Arts', 'Physical Education', 'Commerce', 'Administration'] },
  { key: 'dropdown_designations',   label: 'Designations',       defaults: ['Principal', 'Vice Principal', 'HOD', 'Senior Teacher', 'Teacher', 'Assistant Teacher', 'Lab Assistant', 'Librarian', 'Accountant', 'Clerk'] },
  { key: 'dropdown_fee_types',      label: 'Fee Types',          defaults: ['Tuition', 'Admission', 'Transport', 'Laboratory', 'Sports', 'Library', 'Examination', 'Other'] },
  { key: 'dropdown_staff_roles',    label: 'Staff Roles',        defaults: ['Teacher', 'Admin', 'Support Staff', 'Security', 'Driver', 'Peon', 'Cook'] },
  { key: 'dropdown_sections',       label: 'Class Sections',     defaults: ['A', 'B', 'C', 'D', 'E', 'F'] },
  { key: 'dropdown_leave_types',    label: 'Leave Types',        defaults: ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'] },
  { key: 'dropdown_grade_scales',   label: 'Grading Scales',     defaults: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'] },
  { key: 'dropdown_subjects',       label: 'Subjects',           defaults: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Accountancy'] },
  { key: 'dropdown_house_groups',   label: 'House Groups',       defaults: ['Red House', 'Blue House', 'Green House', 'Yellow House'] },
]

function parseList(raw: string | undefined, defaults: string[]): string[] {
  if (!raw) return defaults
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : defaults } catch { return defaults }
}

function DropdownCategoryCard({
  category, currentValues, onSave,
}: {
  category: typeof DROPDOWN_CATEGORIES[0]
  currentValues: string[]
  onSave: (values: string[]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState<string[]>(currentValues)
  const [newItem, setNewItem] = useState('')
  const [dirty, setDirty] = useState(false)

  const add = () => {
    const val = newItem.trim()
    if (!val || items.includes(val)) return
    setItems(prev => [...prev, val]); setNewItem(''); setDirty(true)
  }
  const remove = (i: number) => { setItems(prev => prev.filter((_, idx) => idx !== i)); setDirty(true) }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition">
        <div className="flex items-center gap-3">
          <List size={15} className="text-indigo-500" />
          <span className="font-medium text-gray-800 text-sm">{category.label}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length} options</span>
        </div>
        {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {items.map((item, i) => (
              <span key={i} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                {item}
                <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 transition ml-0.5"><X size={11} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={`Add new ${category.label.toLowerCase().replace(/s$/, '')}...`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
            <button onClick={add} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"><Plus size={15} /></button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => { setItems(category.defaults); setDirty(true) }}
              className="text-xs text-gray-400 hover:text-gray-600 transition">Reset to defaults</button>
            <button onClick={() => { onSave(items); setDirty(false) }} disabled={!dirty}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition">
              <Save size={12} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Grade Row ────────────────────────────────────────────────────────────────

function GradeRow({ grade, color, minKey, merged, set }: {
  grade: string; color: string; minKey: string
  merged: Record<string, string>; set: (k: string, val: string) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className={`w-14 text-center text-xs font-bold py-1 rounded-full ${color}`}>{grade}</span>
      <span className="text-xs text-gray-500 flex-1">Minimum marks %</span>
      <input type="number" min={0} max={100} value={v(merged, minKey)}
        onChange={e => set(minKey, e.target.value)}
        className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  )
}

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'school',        label: 'School Profile',   icon: School },
  { id: 'academic',      label: 'Academic',         icon: BookOpen },
  { id: 'attendance',    label: 'Attendance',       icon: UserCheck },
  { id: 'grading',       label: 'Grading',          icon: Trophy },
  { id: 'fees',          label: 'Fees',             icon: CreditCard },
  { id: 'notifications', label: 'Notifications',    icon: Bell },
  { id: 'appearance',    label: 'Appearance',       icon: Palette },
  { id: 'security',      label: 'Security',         icon: Shield },
  { id: 'dropdowns',     label: 'Dropdowns',        icon: List },
  { id: 'ai',            label: 'AI & LLM',         icon: Brain },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('school')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  // ── AI store ──
  const ai = useAIStore()
  const [showKey, setShowKey]           = useState<Record<string, boolean>>({})
  const [testState, setTestState]       = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg]           = useState('')
  const [showTrainCfg, setShowTrainCfg] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showRAG, setShowRAG]           = useState(false)
  const [showLogs, setShowLogs]         = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleSaved, setScheduleSaved]   = useState(false)
  const [scheduleNextRun, setScheduleNextRun] = useState<string | null>(null)
  const trainingTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedProvider = AI_PROVIDERS.find(p => p.id === ai.provider)!
  const isLocal = ai.provider === 'local'

  // ── Per-arch download status ──
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatusType>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Ollama health + active model tracking ──
  const [ollamaHealth, setOllamaHealth] = useState<'checking' | 'running' | 'down'>('checking')
  const [activeModelArch, setActiveModelArch] = useState<string | null>(null)

  const setArchStatus = (arch: string, status: ModelStatusType) =>
    setModelStatuses((prev: Record<string, ModelStatusType>) => ({ ...prev, [arch]: status }))

  // Check all arch download statuses on mount (local mode only)
  useEffect(() => {
    if (!isLocal) return
    LOCAL_ARCHITECTURES.forEach(({ id }) => {
      setArchStatus(id, 'checking')
      api.get(`/api/v1/copilot/model/status?arch=${id}`)
        .then((res: any) => setArchStatus(id, res.data?.ready ? 'downloaded' : 'not_downloaded'))
        .catch(() => setArchStatus(id, 'unknown'))
    })
  }, [isLocal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ollama health check on mount
  useEffect(() => {
    if (!isLocal) return
    setOllamaHealth('checking')
    api.get('/api/v1/copilot/ollama/health')
      .then((res: any) => setOllamaHealth(res.data?.running ? 'running' : 'down'))
      .catch(() => setOllamaHealth('down'))
  }, [isLocal]) // eslint-disable-line react-hooks/exhaustive-deps

  const pullModel = useCallback(async (arch: string) => {
    setArchStatus(arch, 'downloading')
    try {
      await api.post('/api/v1/copilot/model/pull', { arch })
      const poll = setInterval(async () => {
        try {
          const r = await api.get(`/api/v1/copilot/model/status?arch=${arch}`) as any
          if (r.data?.ready) { clearInterval(poll); setArchStatus(arch, 'downloaded') }
        } catch { /* keep polling */ }
      }, 4000)
    } catch {
      setArchStatus(arch, 'not_downloaded')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteModel = useCallback(async (arch: string) => {
    setDeleteConfirm(null)
    setArchStatus(arch, 'deleting')
    try {
      await (api as any).delete('/api/v1/copilot/model', { data: { arch } })
      setArchStatus(arch, 'not_downloaded')
    } catch {
      setArchStatus(arch, 'downloaded')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load training history + schedule from DB on mount ──
  useEffect(() => {
    if (!isLocal) return
    // Load jobs
    api.get('/api/v1/copilot/train').then((res: any) => {
      const jobs = (res.data as any[]) ?? []
      // Track which model is currently serving (last completed job)
      const lastCompleted = jobs.find((j: any) => j.status === 'completed')
      if (lastCompleted?.model_arch) setActiveModelArch(lastCompleted.model_arch)
      // Sync into store as TrainingJob array
      ai.setTrainParam('trainingJobs', jobs.map((j: any) => ({
        id:         j.id,
        startedAt:  j.started_at,
        finishedAt: j.finished_at,
        status:     j.status === 'running' ? 'running' : j.status === 'completed' ? 'completed' : 'failed',
        progress:   j.progress,
        dataPoints: j.data_points,
        duration:   j.duration_sec ? `${j.duration_sec}s` : null,
        notes:      `${j.model_arch} · ${(j.data_sources ?? []).join(', ')}`,
      })))
    }).catch(() => {})
    // Load schedule
    api.get('/api/v1/copilot/schedule').then((res: any) => {
      const s = res.data as any
      if (s?.freq && s.freq !== 'manual') {
        ai.setTrainParam('scheduleFreq', s.freq)
        if (s.time_of_day) ai.setTrainParam('scheduleTime', s.time_of_day)
        if (s.day_of_week != null) ai.setTrainParam('scheduleDow', s.day_of_week)
        if (s.next_run_at) setScheduleNextRun(s.next_run_at)
      }
    }).catch(() => {})
  }, [isLocal]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save schedule to backend ──
  const saveSchedule = useCallback(async () => {
    setScheduleSaving(true)
    try {
      const res = await api.post('/api/v1/copilot/schedule', {
        freq:         ai.scheduleFreq,
        time_of_day:  ai.scheduleTime,
        day_of_week:  ai.scheduleFreq === 'weekly' ? ai.scheduleDow : null,
        data_sources: ai.trainSources,
        model_arch:   ai.localArch,
        config: {
          epochs:        ai.trainEpochs,
          learning_rate: ai.trainLR,
          batch_size:    ai.trainBatch,
          max_seq_len:   ai.trainMaxLen,
          model_size:    ai.trainModelSize,
          chunk_size:    ai.ragChunkSize,
          overlap:       ai.ragOverlap,
          top_k:         ai.ragTopK,
          threshold:     ai.ragThreshold,
        },
      }) as any
      if (res.data?.next_run_at) setScheduleNextRun(res.data.next_run_at)
      setScheduleSaved(true)
      setTimeout(() => setScheduleSaved(false), 3000)
    } catch { /* ignore */ }
    finally { setScheduleSaving(false) }
  }, [ai])

  // ── Real training — calls backend with full config, polls for progress ──
  const startLocalTraining = useCallback(async () => {
    const tenantId = (user as any)?.tenant_id ?? 'demo'
    ai.startTraining(tenantId)

    let jobId: string | null = null
    try {
      const res = await api.post('/api/v1/copilot/train', {
        data_sources: ai.trainSources,
        model_arch:   ai.localArch,
        config: {
          epochs:        ai.trainEpochs,
          learning_rate: ai.trainLR,
          batch_size:    ai.trainBatch,
          max_seq_len:   ai.trainMaxLen,
          model_size:    ai.trainModelSize,
          chunk_size:    ai.ragChunkSize,
          overlap:       ai.ragOverlap,
          top_k:         ai.ragTopK,
          threshold:     ai.ragThreshold,
        },
      }) as any
      jobId = res.data?.job_id ?? null
    } catch (err: any) {
      ai.updateProgress(0, [`[${new Date().toLocaleTimeString()}] Failed to start: ${err.message}`])
      ai.finishTraining(false)
      return
    }

    if (!jobId) { ai.finishTraining(false); return }

    // Poll every 2 s — real progress + logs come from DB via backend
    trainingTimer.current = setInterval(async () => {
      try {
        const status = await api.get(`/api/v1/copilot/train/${jobId}`) as any
        const job = status.data as {
          status: string; progress: number; logs: string[]
          phase: string; data_points: number; vectors_indexed: number
        }
        ai.updateProgress(job.progress, job.logs ?? [])
        if (job.status === 'completed') {
          clearInterval(trainingTimer.current!); trainingTimer.current = null
          ai.finishTraining(true)
          // New model is now active — update display
          if ((job as any).model_arch) setActiveModelArch((job as any).model_arch)
          // Refresh history from DB
          api.get('/api/v1/copilot/train').then((r: any) => {
            const jobs = (r.data as any[]) ?? []
            const lastCompleted = jobs.find((j: any) => j.status === 'completed')
            if (lastCompleted?.model_arch) setActiveModelArch(lastCompleted.model_arch)
            ai.setTrainParam('trainingJobs', jobs.map((j: any) => ({
              id:         j.id,
              startedAt:  j.started_at,
              finishedAt: j.finished_at,
              status:     j.status,
              progress:   j.progress,
              dataPoints: j.data_points,
              duration:   j.duration_sec ? `${j.duration_sec}s` : null,
              notes:      `${j.model_arch} · ${(j.data_sources ?? []).join(', ')}`,
            })))
          }).catch(() => {})
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(trainingTimer.current!); trainingTimer.current = null
          ai.finishTraining(false)
        }
      } catch { /* transient — keep polling */ }
    }, 2000)
  }, [ai, user])

  useEffect(() => {
    return () => { if (trainingTimer.current) clearInterval(trainingTimer.current) }
  }, [])

  const restartTraining = useCallback(async () => {
    // Cancel running job in DB (doesn't stop the bg task but marks it cancelled)
    const runningJob = ai.trainingJobs.find((j: TrainingJob) => j.status === 'running')
    if (runningJob) {
      try { await api.post(`/api/v1/copilot/train/${runningJob.id}/cancel`) } catch { /* ignore */ }
    }
    if (trainingTimer.current) { clearInterval(trainingTimer.current); trainingTimer.current = null }
    ai.finishTraining(false) // reset UI to idle so startLocalTraining can run
    await startLocalTraining()
  }, [ai, startLocalTraining]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTest = async () => {
    setTestState('testing'); setTestMsg('')
    const provider = ai.provider
    const key   = ai.apiKeys[provider] ?? ''
    const model = ai.models[provider] ?? ''
    const res = await testConnection(provider, key, model)
    setTestState(res.ok ? 'ok' : 'fail')
    setTestMsg(res.ok ? `Connected — ${res.latencyMs}ms` : (res.error ?? 'Connection failed'))
    // On successful test, persist the key server-side so the copilot page
    // can use it on first request even before client-side store hydrates
    if (res.ok && key) {
      try {
        await api.post('/api/v1/copilot/config/api-key', { provider, api_key: key })
      } catch { /* non-fatal — local store still works */ }
    }
  }

  const handleSaveApiKey = async () => {
    const provider = ai.provider
    const key = ai.apiKeys[provider] ?? ''
    if (!key) return
    try {
      await api.post('/api/v1/copilot/config/api-key', { provider, api_key: key })
      setTestMsg('API key saved to server')
      setTestState('ok')
    } catch {
      setTestMsg('Saved locally — server sync failed')
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => api.get('/api/v1/tenants/settings') as any,
    enabled: !!user,
  })

  const update = useMutation({
    mutationFn: (settings: Record<string, string>) =>
      api.patch('/api/v1/tenants/settings', { settings }),
    onSuccess: () => {
      setSaved(true); setEditing({})
      qc.invalidateQueries({ queryKey: ['tenant-settings'] })
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const settings: Record<string, string> = (data as any)?.data || {}
  const merged = { ...DEFAULTS, ...settings, ...editing }

  const set = (key: string, val: string) => setEditing(prev => ({ ...prev, [key]: val }))
  const setBool = (key: string, val: boolean) => set(key, val ? '1' : '0')
  const bool = (key: string) => boolVal(merged, key)

  const saveAll = () => update.mutate(editing)
  const saveDropdown = (key: string, values: string[]) => update.mutate({ [key]: JSON.stringify(values) })

  const isDirty = Object.keys(editing).length > 0

  // ── Derived model-picker state (used in JSX below) ──
  const isAdmin        = (user as any)?.role === 'admin'
  const anyDownloaded  = LOCAL_ARCHITECTURES.some(a => modelStatuses[a.id] === 'downloaded')
  const activeArchStatus    = modelStatuses[ai.localArch]
  const activeArchDownloaded = activeArchStatus === 'downloaded'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your school configuration and preferences</p>
        </div>
        {isDirty && tab !== 'dropdowns' && tab !== 'ai' && (
          <button onClick={saveAll} disabled={update.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
            {update.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        )}
      </div>

      {/* Alerts */}
      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle2 size={16} /> Settings saved successfully.
        </div>
      )}
      {update.isError && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertCircle size={16} /> Could not reach server — changes saved locally only.
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                tab === t.id
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <t.icon size={15} className={tab === t.id ? 'text-indigo-600' : 'text-gray-400'} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
              <Loader2 size={18} className="animate-spin" /> Loading settings...
            </div>
          ) : (
            <>
              {/* ── School Profile ── */}
              {tab === 'school' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Building} title="School Information" subtitle="Basic details about your institution" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="School Name">
                          <TextInput value={v(merged, 'school_name')} onChange={val => set('school_name', val)} placeholder="e.g. Delhi Public School" />
                        </Field>
                        <Field label="Tagline / Motto">
                          <TextInput value={v(merged, 'school_tagline')} onChange={val => set('school_tagline', val)} placeholder="e.g. Knowledge is Power" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Board / Affiliation">
                          <SelectInput value={v(merged, 'school_board')} onChange={val => set('school_board', val)}
                            options={['CBSE','ICSE','State Board','IB','IGCSE','Other'].map(o => ({ value: o, label: o }))} />
                        </Field>
                        <Field label="School Type">
                          <SelectInput value={v(merged, 'school_type')} onChange={val => set('school_type', val)}
                            options={[{ value:'co-ed', label:'Co-Ed' },{ value:'boys', label:'Boys Only' },{ value:'girls', label:'Girls Only' }]} />
                        </Field>
                        <Field label="Medium of Instruction">
                          <SelectInput value={v(merged, 'school_medium')} onChange={val => set('school_medium', val)}
                            options={['English','Hindi','Regional','Bilingual'].map(o => ({ value: o, label: o }))} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Year Established">
                          <TextInput value={v(merged, 'school_established')} onChange={val => set('school_established', val)} placeholder="e.g. 1985" type="number" />
                        </Field>
                        <Field label="Affiliation Number">
                          <TextInput value={v(merged, 'school_affiliation_no')} onChange={val => set('school_affiliation_no', val)} placeholder="e.g. 2730001" />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={MapPin} title="Address & Contact" />
                    <div className="space-y-4">
                      <Field label="Street Address">
                        <TextInput value={v(merged, 'school_address')} onChange={val => set('school_address', val)} placeholder="Building no., Street name, Area" />
                      </Field>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="City">
                          <TextInput value={v(merged, 'school_city')} onChange={val => set('school_city', val)} placeholder="New Delhi" />
                        </Field>
                        <Field label="State">
                          <TextInput value={v(merged, 'school_state')} onChange={val => set('school_state', val)} placeholder="Delhi" />
                        </Field>
                        <Field label="PIN Code">
                          <TextInput value={v(merged, 'school_pin')} onChange={val => set('school_pin', val)} placeholder="110001" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Phone Number">
                          <TextInput value={v(merged, 'school_phone')} onChange={val => set('school_phone', val)} placeholder="+91 11 2345 6789" />
                        </Field>
                        <Field label="Official Email">
                          <TextInput value={v(merged, 'school_email')} onChange={val => set('school_email', val)} placeholder="info@school.edu.in" type="email" />
                        </Field>
                        <Field label="Website">
                          <TextInput value={v(merged, 'school_website')} onChange={val => set('school_website', val)} placeholder="www.school.edu.in" />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Academic ── */}
              {tab === 'academic' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={BookOpen} title="Academic Year" subtitle="Configure session start, end and structure" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Year Start Month">
                          <SelectInput value={v(merged, 'academic_year_start_month')} onChange={val => set('academic_year_start_month', val)}
                            options={['January','February','March','April','May','June','July','August','September','October','November','December']
                              .map((m, i) => ({ value: String(i + 1), label: m }))} />
                        </Field>
                        <Field label="Year End Month">
                          <SelectInput value={v(merged, 'academic_year_end_month')} onChange={val => set('academic_year_end_month', val)}
                            options={['January','February','March','April','May','June','July','August','September','October','November','December']
                              .map((m, i) => ({ value: String(i + 1), label: m }))} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Working Days / Week">
                          <SelectInput value={v(merged, 'working_days_per_week')} onChange={val => set('working_days_per_week', val)}
                            options={['5','6'].map(o => ({ value: o, label: `${o} days` }))} />
                        </Field>
                        <Field label="Periods / Day">
                          <TextInput value={v(merged, 'periods_per_day')} onChange={val => set('periods_per_day', val)} type="number" />
                        </Field>
                        <Field label="Period Duration (min)">
                          <TextInput value={v(merged, 'period_duration_min')} onChange={val => set('period_duration_min', val)} type="number" />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Clock} title="School Timings" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="School Start Time">
                          <TextInput value={v(merged, 'school_start_time')} onChange={val => set('school_start_time', val)} type="time" />
                        </Field>
                        <Field label="School End Time">
                          <TextInput value={v(merged, 'school_end_time')} onChange={val => set('school_end_time', val)} type="time" />
                        </Field>
                        <Field label="Lunch Break Duration (min)">
                          <TextInput value={v(merged, 'lunch_break_duration_min')} onChange={val => set('lunch_break_duration_min', val)} type="number" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Timezone">
                          <SelectInput value={v(merged, 'timezone')} onChange={val => set('timezone', val)}
                            options={['Asia/Kolkata','Asia/Dubai','America/New_York','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Singapore'].map(o => ({ value: o, label: o }))} />
                        </Field>
                        <Field label="Date Format">
                          <SelectInput value={v(merged, 'date_format')} onChange={val => set('date_format', val)}
                            options={['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD','DD-MM-YYYY'].map(o => ({ value: o, label: o }))} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Currency">
                          <SelectInput value={v(merged, 'currency')} onChange={val => set('currency', val)}
                            options={['INR','USD','GBP','EUR','AED','SGD','AUD'].map(o => ({ value: o, label: o }))} />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Attendance ── */}
              {tab === 'attendance' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={UserCheck} title="Attendance Rules" subtitle="Define thresholds and policies for attendance tracking" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Minimum Attendance %" hint="Students below this % will be flagged">
                          <TextInput value={v(merged, 'attendance_threshold_percent')} onChange={val => set('attendance_threshold_percent', val)} type="number" />
                        </Field>
                        <Field label="Late Mark (minutes after start)" hint="Student is marked late after this many minutes">
                          <TextInput value={v(merged, 'late_mark_minutes')} onChange={val => set('late_mark_minutes', val)} type="number" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Half Day Threshold (hours)" hint="Attendance below this = half day">
                          <TextInput value={v(merged, 'half_day_hours')} onChange={val => set('half_day_hours', val)} type="number" />
                        </Field>
                        <Field label="Auto Absent After (minutes)" hint="Auto-mark absent if not checked in within this time">
                          <TextInput value={v(merged, 'auto_absent_after_minutes')} onChange={val => set('auto_absent_after_minutes', val)} type="number" />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Bell} title="Attendance Alerts" subtitle="Notify parents/guardians of attendance events" />
                    <div className="space-y-1">
                      <Toggle label="Send SMS on absence" hint="Text parents when student is marked absent"
                        value={bool('attendance_sms_alert')} onChange={val => setBool('attendance_sms_alert', val)} />
                      <Toggle label="Send Email on absence"
                        value={bool('attendance_email_alert')} onChange={val => setBool('attendance_email_alert', val)} />
                      <Toggle label="Alert on low attendance" hint="Notify when student falls below minimum threshold"
                        value={bool('notify_attendance_low')} onChange={val => setBool('notify_attendance_low', val)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Grading ── */}
              {tab === 'grading' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Trophy} title="Grading System" subtitle="Configure pass marks and grade boundaries" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Total Marks Scale">
                          <SelectInput value={v(merged, 'grading_scale')} onChange={val => set('grading_scale', val)}
                            options={['100','10'].map(o => ({ value: o, label: `Out of ${o}` }))} />
                        </Field>
                        <Field label="Pass Mark (%)">
                          <TextInput value={v(merged, 'pass_mark_percent')} onChange={val => set('pass_mark_percent', val)} type="number" />
                        </Field>
                      </div>
                      <div className="space-y-1">
                        <Toggle label="Enable GPA / CGPA system" hint="Show letter grades alongside percentage scores"
                          value={bool('gpa_enabled')} onChange={val => setBool('gpa_enabled', val)} />
                        <Toggle label="Show class rank in report card"
                          value={bool('rank_in_class')} onChange={val => setBool('rank_in_class', val)} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Sliders} title="Grade Boundaries" subtitle="Set minimum percentage for each grade" />
                    <div className="space-y-0">
                      <GradeRow grade="A+" color="bg-emerald-100 text-emerald-700" minKey="grade_a_plus_min" merged={merged} set={set} />
                      <GradeRow grade="A" color="bg-green-100 text-green-700" minKey="grade_a_min" merged={merged} set={set} />
                      <GradeRow grade="B+" color="bg-blue-100 text-blue-700" minKey="grade_b_plus_min" merged={merged} set={set} />
                      <GradeRow grade="B" color="bg-sky-100 text-sky-700" minKey="grade_b_min" merged={merged} set={set} />
                      <GradeRow grade="C+" color="bg-yellow-100 text-yellow-700" minKey="grade_c_plus_min" merged={merged} set={set} />
                      <GradeRow grade="C" color="bg-orange-100 text-orange-700" minKey="grade_c_min" merged={merged} set={set} />
                      <GradeRow grade="D" color="bg-red-100 text-red-700" minKey="grade_d_min" merged={merged} set={set} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Fees ── */}
              {tab === 'fees' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={CreditCard} title="Fee Configuration" subtitle="Payment rules, late fees, and receipt settings" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Late Fee Rate (%/month)" hint="Applied after grace period">
                          <TextInput value={v(merged, 'late_fee_percent')} onChange={val => set('late_fee_percent', val)} type="number" />
                        </Field>
                        <Field label="Grace Period (days)" hint="No late fee within this many days of due date">
                          <TextInput value={v(merged, 'late_fee_grace_days')} onChange={val => set('late_fee_grace_days', val)} type="number" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Receipt Prefix" hint="Prefix for auto-generated receipt numbers">
                          <TextInput value={v(merged, 'receipt_prefix')} onChange={val => set('receipt_prefix', val)} placeholder="RCP" />
                        </Field>
                        <Field label="Fee Reminder (days before due)" hint="Send reminder this many days before due date">
                          <TextInput value={v(merged, 'fee_reminder_days')} onChange={val => set('fee_reminder_days', val)} type="number" />
                        </Field>
                      </div>
                      <Field label="Accepted Payment Modes" hint="Comma-separated list of accepted methods">
                        <TextInput value={v(merged, 'payment_modes')} onChange={val => set('payment_modes', val)} placeholder="Cash,UPI,NEFT,Cheque" />
                      </Field>
                    </div>
                  </div>

                  {/* Receipt Template Picker */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Receipt} title="Receipt Template" subtitle="Choose the design used when generating fee receipts" />
                    <div className="grid grid-cols-3 gap-4">
                      {([
                        {
                          id: 'classic',
                          label: 'Classic',
                          desc: 'Traditional formal receipt with letterhead',
                          preview: (
                            <div className="w-full h-full bg-white border border-gray-300 p-2 flex flex-col gap-1">
                              <div className="h-1.5 bg-gray-800 rounded-sm mx-4" />
                              <div className="h-1 bg-gray-400 rounded-sm mx-6" />
                              <div className="h-px bg-gray-300 mt-1 mb-1" />
                              <div className="flex gap-1">
                                <div className="flex-1 space-y-0.5">
                                  <div className="h-0.5 bg-gray-300 rounded" />
                                  <div className="h-0.5 bg-gray-300 rounded w-3/4" />
                                </div>
                                <div className="flex-1 space-y-0.5">
                                  <div className="h-0.5 bg-gray-300 rounded" />
                                  <div className="h-0.5 bg-gray-300 rounded w-2/3" />
                                </div>
                              </div>
                              <div className="mt-1 bg-gray-800 rounded-sm h-1.5 flex items-center px-1 gap-2">
                                <div className="flex-1 h-0.5 bg-white/40 rounded" />
                                <div className="w-4 h-0.5 bg-white/40 rounded" />
                              </div>
                              <div className="space-y-0.5 mt-0.5">
                                {[1,2,3].map(i => (
                                  <div key={i} className="flex justify-between">
                                    <div className="h-0.5 bg-gray-200 rounded flex-1 mr-2" />
                                    <div className="h-0.5 bg-gray-200 rounded w-4" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 'modern',
                          label: 'Modern',
                          desc: 'Colorful gradient header with clean card layout',
                          preview: (
                            <div className="w-full h-full bg-white flex flex-col overflow-hidden">
                              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-2 flex-shrink-0">
                                <div className="h-1.5 bg-white/60 rounded w-16 mb-1" />
                                <div className="h-0.5 bg-white/40 rounded w-10" />
                              </div>
                              <div className="p-2 flex-1 space-y-1.5">
                                <div className="grid grid-cols-3 gap-1">
                                  {['bg-gray-100','bg-green-100','bg-red-100'].map(c => (
                                    <div key={c} className={`${c} rounded h-4`} />
                                  ))}
                                </div>
                                <div className="space-y-0.5">
                                  {[1,2].map(i => (
                                    <div key={i} className="flex justify-between border-b border-gray-100 pb-0.5">
                                      <div className="h-0.5 bg-gray-200 rounded flex-1 mr-2" />
                                      <div className="h-0.5 bg-gray-300 rounded w-4" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 'minimal',
                          label: 'Minimal',
                          desc: 'Clean, typographic, white-space focused',
                          preview: (
                            <div className="w-full h-full bg-white p-2 flex flex-col gap-1.5">
                              <div className="flex justify-between items-start">
                                <div className="h-1.5 bg-gray-900 rounded w-12" />
                                <div className="h-1 bg-gray-400 rounded w-8 font-mono" />
                              </div>
                              <div className="h-0.5 bg-gray-900 rounded" />
                              <div className="flex gap-3">
                                <div className="space-y-0.5">
                                  <div className="h-0.5 bg-gray-200 rounded w-8" />
                                  <div className="h-0.5 bg-gray-400 rounded w-12" />
                                </div>
                              </div>
                              <div className="space-y-0.5 mt-1">
                                {[1,2,3].map(i => (
                                  <div key={i} className="flex justify-between border-b border-gray-100 pb-0.5">
                                    <div className="h-0.5 bg-gray-200 rounded flex-1 mr-2" />
                                    <div className="h-0.5 bg-gray-300 rounded w-5" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ),
                        },
                      ] as const).map(tmpl => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => set('receipt_template', tmpl.id)}
                          className={`relative text-left rounded-xl border-2 overflow-hidden transition-all ${
                            v(merged, 'receipt_template') === tmpl.id
                              ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Miniature preview */}
                          <div className="h-24 bg-gray-50 border-b border-gray-100 overflow-hidden">
                            {tmpl.preview}
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-sm font-semibold text-gray-900">{tmpl.label}</p>
                              {v(merged, 'receipt_template') === tmpl.id && (
                                <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                    <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 leading-tight">{tmpl.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Sliders} title="Payment Options" />
                    <div className="space-y-1">
                      <Toggle label="Allow partial payments" hint="Let parents pay fees in partial amounts"
                        value={bool('partial_payment')} onChange={val => setBool('partial_payment', val)} />
                      <Toggle label="Send fee due reminder" hint="Auto-remind parents before fee due date"
                        value={bool('notify_fee_due')} onChange={val => setBool('notify_fee_due', val)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Notifications ── */}
              {tab === 'notifications' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Bell} title="Notification Channels" subtitle="Choose how to send notifications to parents and staff" />
                    <div className="space-y-1">
                      <Toggle label="Email Notifications" hint="Send alerts via email"
                        value={bool('email_enabled')} onChange={val => setBool('email_enabled', val)} />
                      <Toggle label="SMS Notifications" hint="Send alerts via SMS (carrier charges may apply)"
                        value={bool('sms_enabled')} onChange={val => setBool('sms_enabled', val)} />
                      <Toggle label="WhatsApp Notifications" hint="Send via WhatsApp Business API"
                        value={bool('whatsapp_enabled')} onChange={val => setBool('whatsapp_enabled', val)} />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Bell} title="Notification Events" subtitle="Choose which events trigger notifications" />
                    <div className="space-y-1">
                      <Toggle label="Fee Due / Overdue"
                        value={bool('notify_fee_due')} onChange={val => setBool('notify_fee_due', val)} />
                      <Toggle label="Low Attendance Alert"
                        value={bool('notify_attendance_low')} onChange={val => setBool('notify_attendance_low', val)} />
                      <Toggle label="Exam Schedule Published"
                        value={bool('notify_exam_schedule')} onChange={val => setBool('notify_exam_schedule', val)} />
                      <Toggle label="Results Published"
                        value={bool('notify_result_published')} onChange={val => setBool('notify_result_published', val)} />
                      <Toggle label="Leave Approved / Rejected"
                        value={bool('notify_leave_approved')} onChange={val => setBool('notify_leave_approved', val)} />
                      <Toggle label="Birthday Wishes" hint="Auto-send birthday message to students and staff"
                        value={bool('notify_birthday')} onChange={val => setBool('notify_birthday', val)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Appearance ── */}
              {tab === 'appearance' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Palette} title="Theme & Branding" subtitle="Customize how the dashboard looks" />
                    <div className="space-y-4">
                      <Field label="Primary Color" hint="Used for buttons, links, and accents">
                        <div className="flex items-center gap-3">
                          <input type="color" value={v(merged, 'theme_color')} onChange={e => set('theme_color', e.target.value)}
                            className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                          <TextInput value={v(merged, 'theme_color')} onChange={val => set('theme_color', val)} placeholder="#4f46e5" />
                        </div>
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Theme Mode">
                          <SelectInput value={v(merged, 'theme_mode')} onChange={val => set('theme_mode', val)}
                            options={[{ value:'light', label:'Light' },{ value:'dark', label:'Dark' },{ value:'system', label:'System Default' }]} />
                        </Field>
                        <Field label="Sidebar Style">
                          <SelectInput value={v(merged, 'sidebar_style')} onChange={val => set('sidebar_style', val)}
                            options={[{ value:'default', label:'Default' },{ value:'compact', label:'Compact' },{ value:'minimal', label:'Minimal (icons only)' }]} />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Settings} title="Display Options" />
                    <div className="space-y-1">
                      <Toggle label="Show student photo in lists" hint="Display profile photos in student tables and cards"
                        value={bool('show_student_photo')} onChange={val => setBool('show_student_photo', val)} />
                      <Toggle label="Compact view" hint="Reduce padding for denser information display"
                        value={bool('compact_view')} onChange={val => setBool('compact_view', val)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Security ── */}
              {tab === 'security' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Shield} title="Session & Access" subtitle="Control how users are authenticated and session-managed" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Session Timeout (hours)" hint="Auto-logout after this period of inactivity">
                          <TextInput value={v(merged, 'session_timeout_hours')} onChange={val => set('session_timeout_hours', val)} type="number" />
                        </Field>
                        <Field label="Max Login Attempts" hint="Lock account after this many failed attempts">
                          <TextInput value={v(merged, 'login_attempts_limit')} onChange={val => set('login_attempts_limit', val)} type="number" />
                        </Field>
                      </div>
                      <Field label="IP Whitelist" hint="Comma-separated IPs allowed to access admin panel (leave blank for all)">
                        <TextInput value={v(merged, 'ip_whitelist')} onChange={val => set('ip_whitelist', val)} placeholder="192.168.1.1, 10.0.0.1" />
                      </Field>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Hash} title="Password Policy" />
                    <div className="space-y-4">
                      <Field label="Minimum Password Length">
                        <TextInput value={v(merged, 'password_min_length')} onChange={val => set('password_min_length', val)} type="number" />
                      </Field>
                      <div className="space-y-1">
                        <Toggle label="Require special character (!@#...)"
                          value={bool('password_require_special')} onChange={val => setBool('password_require_special', val)} />
                        <Toggle label="Require at least one number"
                          value={bool('password_require_number')} onChange={val => setBool('password_require_number', val)} />
                        <Toggle label="Enable Two-Factor Authentication (2FA)" hint="Require OTP on login for all admin accounts"
                          value={bool('two_factor_auth')} onChange={val => setBool('two_factor_auth', val)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Dropdowns ── */}
              {tab === 'dropdowns' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
                    Customize options available in dropdowns across the app. Changes take effect immediately for new entries.
                  </div>
                  <div className="space-y-3">
                    {DROPDOWN_CATEGORIES.map(cat => (
                      <DropdownCategoryCard
                        key={cat.key}
                        category={cat}
                        currentValues={parseList(settings[cat.key], cat.defaults)}
                        onSave={values => saveDropdown(cat.key, values)}
                      />
                    ))}
                  </div>
                  {saved && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                      Dropdown options saved.
                    </div>
                  )}
                </div>
              )}

              {/* ── AI & LLM ── */}
              {tab === 'ai' && (
                <div className="space-y-5">

                  {/* ── Provider Grid ── */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Brain} title="AI Provider" subtitle="Choose which AI model powers your school assistant" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {AI_PROVIDERS.map(p => {
                        const active = ai.provider === p.id
                        return (
                          <button key={p.id} onClick={() => ai.setProvider(p.id as ProviderId)}
                            style={active ? { borderColor: p.color, background: p.bg } : {}}
                            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition text-center ${
                              active ? '' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}>
                            {/* Color dot / logo area */}
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                              style={{ background: p.color }}>
                              {p.id === 'local' ? <Cpu size={18} /> : p.name.slice(0, 2)}
                            </div>
                            <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                            {p.models.length > 0 && (
                              <span className="text-[10px] text-gray-400">{p.models.length} models</span>
                            )}
                            {active && (
                              <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: p.color }} />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── External provider config ── */}
                  {!isLocal && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                      <SectionTitle icon={Zap} title={`${selectedProvider.name} Configuration`}
                        subtitle="Enter your API key and choose a model" />

                      {/* API Key */}
                      <Field label="API Key">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showKey[ai.provider] ? 'text' : 'password'}
                              value={ai.apiKeys[ai.provider] ?? ''}
                              onChange={e => ai.setApiKey(ai.provider, e.target.value)}
                              placeholder={`sk-... or your ${selectedProvider.name} key`}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                            />
                            <button onClick={() => setShowKey(s => ({ ...s, [ai.provider]: !s[ai.provider] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showKey[ai.provider] ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          <button onClick={handleSaveApiKey} disabled={!ai.apiKeys[ai.provider]}
                            className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition whitespace-nowrap">
                            <Save size={13} /> Save
                          </button>
                          <button onClick={handleTest} disabled={testState === 'testing' || !ai.apiKeys[ai.provider]}
                            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition whitespace-nowrap">
                            {testState === 'testing'
                              ? <><Loader2 size={14} className="animate-spin" /> Testing...</>
                              : testState === 'ok'
                                ? <><CheckCircle2 size={14} className="text-green-600" /> Connected</>
                                : testState === 'fail'
                                  ? <><AlertCircle size={14} className="text-red-500" /> Failed</>
                                  : <>Test Connection</>
                            }
                          </button>
                        </div>
                        {testMsg && (
                          <p className={`text-xs mt-1 ${testState === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{testMsg}</p>
                        )}
                      </Field>

                      {/* Model Select */}
                      <Field label="Model">
                        <div className="grid grid-cols-2 gap-2">
                          {selectedProvider.models.map((m: any) => {
                            const active = ai.models[ai.provider] === m.id
                            return (
                              <button key={m.id} onClick={() => ai.setModel(ai.provider, m.id)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition ${
                                  active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                <span className="font-medium truncate">{m.label}</span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{m.ctx}</span>
                              </button>
                            )
                          })}
                        </div>
                      </Field>
                    </div>
                  )}

                  {/* ── Local LLM ── */}
                  {isLocal && (
                    <div className="space-y-5">
                      {/* Status card */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <SectionTitle icon={Cpu} title="Local LLM" subtitle="Train and run your own model on tenant data — stays fully private" />
                          {/* Ollama health indicator */}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            ollamaHealth === 'checking' ? 'bg-gray-100 text-gray-400' :
                            ollamaHealth === 'running'  ? 'bg-green-50 text-green-700 border border-green-200' :
                                                          'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              ollamaHealth === 'checking' ? 'bg-gray-300 animate-pulse' :
                              ollamaHealth === 'running'  ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            {ollamaHealth === 'checking' ? 'Checking…' :
                             ollamaHealth === 'running'  ? 'Ollama running' : 'Ollama unreachable'}
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className={`flex items-center gap-3 p-4 rounded-xl mb-5 ${
                          ai.localStatus === 'ready'    ? 'bg-green-50 border border-green-200' :
                          ai.localStatus === 'training' ? 'bg-blue-50 border border-blue-200'   :
                          ai.localStatus === 'failed'   ? 'bg-red-50 border border-red-200'     :
                                                          'bg-gray-50 border border-gray-200'
                        }`}>
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            ai.localStatus === 'ready'    ? 'bg-green-500' :
                            ai.localStatus === 'training' ? 'bg-blue-500 animate-pulse' :
                            ai.localStatus === 'failed'   ? 'bg-red-500'  : 'bg-gray-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {ai.localStatus === 'ready'    ? 'Model ready' :
                               ai.localStatus === 'training' ? `Training new model — ${ai.localProgress}%` :
                               ai.localStatus === 'failed'   ? 'Training failed' : 'Not trained yet'}
                            </p>
                            {ai.localStatus === 'training' && activeModelArch && (
                              <p className="text-xs text-blue-600 mt-0.5">
                                Current model still serving chats: <strong>{LOCAL_ARCHITECTURES.find(a => a.id === activeModelArch)?.name ?? activeModelArch}</strong>
                              </p>
                            )}
                            {ai.localTrainedAt && ai.localStatus === 'ready' && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Last trained: {new Date(ai.localTrainedAt).toLocaleString()}
                                {activeModelArch && <span className="ml-2 font-medium text-gray-700">· Active: {LOCAL_ARCHITECTURES.find(a => a.id === activeModelArch)?.name ?? activeModelArch}</span>}
                              </p>
                            )}
                          </div>
                          {ai.localStatus === 'training' && (
                            <span className="text-xs text-blue-600 font-mono">{ai.localProgress}%</span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {ai.localStatus === 'training' && (
                          <div className="mb-5">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500 rounded-full"
                                style={{ width: `${ai.localProgress}%` }} />
                            </div>
                          </div>
                        )}

                        {/* Architecture picker */}
                        <Field label="Model Architecture" hint="Larger models are more accurate but require more RAM and training time">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            {LOCAL_ARCHITECTURES.map(arch => {
                              const active         = ai.localArch === arch.id
                              const st             = modelStatuses[arch.id] ?? 'unknown'
                              const isDownloaded   = st === 'downloaded'
                              const isDownloading  = st === 'downloading'
                              const isChecking     = st === 'checking'
                              const isDeleting     = st === 'deleting'
                              const awaitingDelete = deleteConfirm === arch.id
                              return (
                                <div key={arch.id} className={`relative rounded-lg border transition ${
                                  active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                                } ${ai.localStatus === 'training' ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <button onClick={() => ai.setLocalArch(arch.id)}
                                    className="flex items-start gap-3 p-3 w-full text-left">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                      isChecking || isDownloading || isDeleting ? 'bg-yellow-400 animate-pulse' :
                                      isDownloaded ? 'bg-green-500' :
                                      active ? 'bg-indigo-500' : 'bg-gray-300'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium ${active ? 'text-indigo-700' : 'text-gray-800'}`}>{arch.name}</p>
                                      <p className="text-xs text-gray-400">{arch.size} &bull; RAM: {arch.ram} &bull; {arch.speed}</p>
                                    </div>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                                      isChecking    ? 'bg-gray-100 text-gray-400' :
                                      isDownloading ? 'bg-yellow-50 text-yellow-600' :
                                      isDeleting    ? 'bg-red-50 text-red-400' :
                                      isDownloaded  ? 'bg-green-50 text-green-600' :
                                                      'bg-gray-100 text-gray-400'
                                    }`}>
                                      {isChecking ? '…' : isDownloading ? 'Downloading' : isDeleting ? 'Deleting' : isDownloaded ? '✓ Ready' : 'Not downloaded'}
                                    </span>
                                  </button>

                                  {/* Admin delete button */}
                                  {isAdmin && isDownloaded && !awaitingDelete && (
                                    <button
                                      onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); setDeleteConfirm(arch.id) }}
                                      className="absolute top-2 right-2 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                  {isAdmin && awaitingDelete && (
                                    <div className="flex items-center gap-2 px-3 pb-2">
                                      <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                                      <span className="text-xs text-gray-600 flex-1">Delete this model?</span>
                                      <button onClick={() => deleteModel(arch.id)} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-400 hover:underline">No</button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* No models downloaded warning */}
                          {!anyDownloaded && LOCAL_ARCHITECTURES.every(a => modelStatuses[a.id] !== 'checking') && (
                            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700">No models downloaded. Select one and click <strong>Download &amp; Train</strong> to get started.</p>
                            </div>
                          )}
                        </Field>

                        {/* Train / download button */}
                        <div className="mt-5 flex items-center gap-3 flex-wrap">
                          <button
                            onClick={activeArchDownloaded ? startLocalTraining : () => pullModel(ai.localArch)}
                            disabled={
                              ai.localStatus === 'training' ||
                              activeArchStatus === 'downloading' ||
                              activeArchStatus === 'checking' ||
                              activeArchStatus === 'deleting'
                            }
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                            {ai.localStatus === 'training' ? (
                              <><Loader2 size={15} className="animate-spin" /> Training...</>
                            ) : activeArchStatus === 'downloading' ? (
                              <><Loader2 size={15} className="animate-spin" /> Downloading...</>
                            ) : !activeArchDownloaded ? (
                              <><Download size={15} /> Download &amp; Train</>
                            ) : (
                              <><Play size={15} fill="currentColor" /> {ai.localStatus === 'ready' ? 'Re-train Model' : 'Start Training'}</>
                            )}
                          </button>
                          {ai.localStatus === 'training' && (
                            <button onClick={restartTraining}
                              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                              <RotateCcw size={14} /> Restart Training
                            </button>
                          )}
                          {(ai.localStatus === 'ready' || ai.localStatus === 'failed') && (
                            <button onClick={() => ai.clearIndex()}
                              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                              <RotateCcw size={14} /> Reset
                            </button>
                          )}
                          <button onClick={() => setShowLogs((s: boolean) => !s)}
                            className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition">
                            <Terminal size={13} /> {showLogs ? 'Hide' : 'Show'} logs
                          </button>
                        </div>

                        {/* Training logs */}
                        {showLogs && ai.localLogs.length > 0 && (
                          <div className="mt-4 bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400 max-h-48 overflow-y-auto space-y-0.5">
                            {ai.localLogs.slice(0, 80).map((l, i) => (
                              <div key={i}>{l}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Training Data Sources */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <button onClick={() => setShowTrainCfg(s => !s)}
                          className="w-full flex items-center justify-between">
                          <SectionTitle icon={Database} title="Training Data Sources"
                            subtitle="Select which school data to include in training" />
                          {showTrainCfg ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>

                        {showTrainCfg && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {DATA_SOURCES.map(src => {
                              const on = ai.trainSources.includes(src.id)
                              return (
                                <button key={src.id} onClick={() => ai.toggleSource(src.id)}
                                  disabled={ai.localStatus === 'training'}
                                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                                    on ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                                  } disabled:opacity-50`}>
                                  {on
                                    ? <CheckSquare size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                    : <Square size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                                  }
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{src.label}</p>
                                    <p className="text-xs text-gray-400">{src.desc}</p>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Hyperparameters */}
                        {showTrainCfg && (
                          <div className="mt-5 border-t border-gray-100 pt-5 space-y-4">
                            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <FlaskConical size={14} className="text-indigo-500" /> Training Parameters
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <Field label="Epochs" hint="Full passes over data">
                                <input type="number" min={1} max={100}
                                  value={ai.trainEpochs}
                                  onChange={e => ai.setTrainParam('trainEpochs', Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                              </Field>
                              <Field label="Learning Rate">
                                <input type="number" step="0.00001"
                                  value={ai.trainLR}
                                  onChange={e => ai.setTrainParam('trainLR', Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                              </Field>
                              <Field label="Batch Size">
                                <input type="number" min={1}
                                  value={ai.trainBatch}
                                  onChange={e => ai.setTrainParam('trainBatch', Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                              </Field>
                              <Field label="Max Seq Length">
                                <input type="number" min={128}
                                  value={ai.trainMaxLen}
                                  onChange={e => ai.setTrainParam('trainMaxLen', Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                              </Field>
                            </div>
                            <Field label="Model Size Preset">
                              <div className="flex gap-2 mt-1">
                                {(['tiny', 'small', 'medium'] as const).map(sz => (
                                  <button key={sz} onClick={() => ai.setTrainParam('trainModelSize', sz)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition capitalize ${
                                      ai.trainModelSize === sz
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-gray-300 text-gray-600 hover:border-indigo-300'
                                    }`}>{sz}</button>
                                ))}
                              </div>
                            </Field>
                          </div>
                        )}
                      </div>

                      {/* Training Schedule */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <button onClick={() => setShowSchedule(s => !s)}
                          className="w-full flex items-center justify-between">
                          <SectionTitle icon={Calendar} title="Training Schedule"
                            subtitle="Automate re-training to keep your model current" />
                          {showSchedule ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>

                        {showSchedule && (
                          <div className="mt-4 space-y-4">
                            <div className="flex gap-2">
                              {(['manual', 'daily', 'weekly', 'monthly'] as const).map(f => (
                                <button key={f} onClick={() => ai.setTrainParam('scheduleFreq', f)}
                                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition capitalize ${
                                    ai.scheduleFreq === f
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                                  }`}>{f}</button>
                              ))}
                            </div>

                            {ai.scheduleFreq !== 'manual' && (
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Time of Day">
                                  <input type="time" value={ai.scheduleTime}
                                    onChange={e => ai.setTrainParam('scheduleTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </Field>
                                {ai.scheduleFreq === 'weekly' && (
                                  <Field label="Day of Week">
                                    <SelectInput value={String(ai.scheduleDow)} onChange={v => ai.setTrainParam('scheduleDow', Number(v))}
                                      options={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => ({ value: String(i), label: d }))} />
                                  </Field>
                                )}
                              </div>
                            )}

                            {ai.scheduleFreq !== 'manual' && (
                              <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 flex items-center gap-2">
                                <RefreshCw size={14} />
                                {scheduleNextRun
                                  ? `Next run: ${new Date(scheduleNextRun).toLocaleString()}`
                                  : `Next run: ${ai.scheduleFreq === 'daily'
                                      ? `Tomorrow at ${ai.scheduleTime}`
                                      : ai.scheduleFreq === 'weekly'
                                        ? `Next ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][ai.scheduleDow]} at ${ai.scheduleTime}`
                                        : `1st of next month at ${ai.scheduleTime}`}`
                                }
                              </div>
                            )}

                            {/* Save schedule button */}
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                onClick={saveSchedule}
                                disabled={scheduleSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                              >
                                {scheduleSaving
                                  ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                                  : <><Save size={14} /> Save Schedule</>
                                }
                              </button>
                              {scheduleSaved && (
                                <span className="flex items-center gap-1.5 text-sm text-green-600">
                                  <CheckCircle2 size={14} /> Schedule saved
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* RAG Configuration */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <button onClick={() => setShowRAG(s => !s)}
                          className="w-full flex items-center justify-between">
                          <SectionTitle icon={Sliders} title="RAG Pipeline"
                            subtitle="Retrieval-Augmented Generation — inject relevant data into every query" />
                          {showRAG ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>

                        {showRAG && (
                          <div className="mt-4 space-y-4">
                            <div className="space-y-1">
                              <Toggle label="Enable RAG pipeline"
                                hint="Retrieved chunks from school data are injected into prompts before inference"
                                value={ai.ragEnabled}
                                onChange={v => ai.setTrainParam('ragEnabled', v)} />
                            </div>

                            {ai.ragEnabled && (
                              <>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <Field label="Chunk Size (tokens)" hint="Size of each text chunk">
                                    <input type="number" min={128} max={4096}
                                      value={ai.ragChunkSize}
                                      onChange={e => ai.setTrainParam('ragChunkSize', Number(e.target.value))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                  </Field>
                                  <Field label="Overlap (tokens)" hint="Overlap between adjacent chunks">
                                    <input type="number" min={0}
                                      value={ai.ragOverlap}
                                      onChange={e => ai.setTrainParam('ragOverlap', Number(e.target.value))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                  </Field>
                                  <Field label="Top K Results" hint="How many chunks to retrieve">
                                    <input type="number" min={1} max={20}
                                      value={ai.ragTopK}
                                      onChange={e => ai.setTrainParam('ragTopK', Number(e.target.value))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                  </Field>
                                  <Field label="Similarity Threshold" hint="Min score to include (0–1)">
                                    <input type="number" min={0} max={1} step={0.05}
                                      value={ai.ragThreshold}
                                      onChange={e => ai.setTrainParam('ragThreshold', Number(e.target.value))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                  </Field>
                                </div>
                                <Field label="Embedding Model">
                                  <SelectInput value={ai.ragEmbedding}
                                    onChange={v => ai.setTrainParam('ragEmbedding', v)}
                                    options={[
                                      { value: 'local',                      label: 'Local TF-IDF (no API needed)' },
                                      { value: 'text-embedding-3-small',     label: 'OpenAI text-embedding-3-small' },
                                      { value: 'text-embedding-3-large',     label: 'OpenAI text-embedding-3-large' },
                                      { value: 'embed-english-v3.0',         label: 'Cohere embed-english-v3.0' },
                                      { value: 'models/text-embedding-004',  label: 'Google text-embedding-004' },
                                    ]} />
                                </Field>

                                {/* Index stats */}
                                <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-4">
                                  <Database size={18} className="text-indigo-500 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">
                                      Vector Index: {ai.ragChunks.length} chunks stored
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {ai.ragChunks.length > 0
                                        ? `Sources: ${[...new Set(ai.ragChunks.map(c => c.source))].join(', ')}`
                                        : 'Train model to build the index'}
                                    </p>
                                  </div>
                                  {ai.ragChunks.length > 0 && (
                                    <button onClick={() => ai.clearIndex()}
                                      className="text-xs text-red-500 hover:text-red-700 transition">Clear</button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Training History */}
                      {ai.trainingJobs.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <SectionTitle icon={RefreshCw} title="Training History" subtitle="Past training jobs for this tenant" />
                          <div className="space-y-2">
                            {ai.trainingJobs.slice(0, 10).map((job: TrainingJob) => (
                              <div key={job.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  job.status === 'completed' ? 'bg-green-500' :
                                  job.status === 'running'   ? 'bg-blue-500 animate-pulse' : 'bg-red-400'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800">
                                    {job.status === 'running' ? `Training… ${job.progress}%` :
                                     job.status === 'completed' ? 'Completed' : 'Failed'}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">{job.notes}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs text-gray-500">{new Date(job.startedAt).toLocaleDateString()}</p>
                                  {job.duration && <p className="text-xs text-gray-400">{job.duration}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── AI Assistant Settings (both local and external) ── */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <SectionTitle icon={Brain} title="AI Assistant" subtitle="Control where AI is available in the dashboard" />
                    <div className="space-y-4">
                      <Toggle label="Enable AI Assistant" hint="Show AI chat button across the dashboard"
                        value={ai.assistantEnabled}
                        onChange={v => ai.setTrainParam('assistantEnabled', v)} />

                      {ai.assistantEnabled && (
                        <>
                          <Field label="Response Language">
                            <SelectInput value={ai.assistantLang}
                              onChange={v => ai.setTrainParam('assistantLang', v)}
                              options={['English','Hindi','Bengali','Tamil','Telugu','Marathi','Gujarati','Kannada'].map(l => ({ value: l, label: l }))} />
                          </Field>

                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Enabled Modules</p>
                            <div className="flex flex-wrap gap-2">
                              {AI_MODULES.map(mod => {
                                const on = ai.assistantModules.includes(mod)
                                return (
                                  <button key={mod} onClick={() => ai.toggleModule(mod)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                      on
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                                    }`}>{mod}</button>
                                )
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Save Bar (non-dropdown tabs) */}
              {tab !== 'dropdowns' && tab !== 'ai' && isDirty && (
                <div className="mt-6 flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-sm text-indigo-700">You have unsaved changes on this page.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing({})}
                      className="px-3 py-2 text-sm border border-indigo-200 text-indigo-700 rounded-lg hover:bg-white transition">
                      Discard
                    </button>
                    <button onClick={saveAll} disabled={update.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                      {update.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
