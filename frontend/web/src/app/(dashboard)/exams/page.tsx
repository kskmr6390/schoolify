'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, X, Loader2, ClipboardList, ChevronDown, ChevronUp,
  CheckCircle2, Clock, BookOpen, Award,
} from 'lucide-react'
import api from '../../../lib/api'

const EXAM_TYPES = [
  { value: 'unit_test',   label: 'Unit Test' },
  { value: 'terminal',    label: 'Terminal Exam' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annual',      label: 'Annual Exam' },
  { value: 'pre_board',   label: 'Pre-Board' },
  { value: 'practice',    label: 'Practice Test' },
]

const STATUS_STYLE: Record<string, string> = {
  scheduled:  'bg-blue-100 text-blue-700',
  ongoing:    'bg-yellow-100 text-yellow-700',
  completed:  'bg-green-100 text-green-700',
  published:  'bg-indigo-100 text-indigo-700',
  cancelled:  'bg-red-100 text-red-700',
}

// ── Schedule Exam Modal ───────────────────────────────────────────────────────

function ScheduleExamModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '', exam_type: 'unit_test', class_id: '', subject_id: '',
    academic_year_id: '', exam_date: '', start_time: '09:00',
    duration_minutes: '60', max_marks: '100', passing_marks: '35',
    instructions: '',
  })
  const [error, setError] = useState('')

  const { data: classData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/api/v1/classes') as any,
  })
  const classes: any[] = (classData as any)?.data?.items || (classData as any)?.data || []

  const { data: subjData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/api/v1/subjects') as any,
  })
  const subjects: any[] = (subjData as any)?.data || []

  const { data: ayData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/api/v1/academic-years') as any,
  })
  const years: any[] = (ayData as any)?.data?.items || (ayData as any)?.data || []
  const currentYear = years.find((y: any) => y.is_current) || years[0]

  const save = useMutation({
    mutationFn: () => api.post('/api/v1/exams', {
      name: form.name,
      exam_type: form.exam_type,
      class_id: form.class_id,
      subject_id: form.subject_id,
      academic_year_id: form.academic_year_id || currentYear?.id,
      exam_date: form.exam_date ? `${form.exam_date}T${form.start_time}:00` : undefined,
      duration_minutes: parseInt(form.duration_minutes) || 60,
      max_marks: parseFloat(form.max_marks) || 100,
      passing_marks: parseFloat(form.passing_marks) || 35,
      instructions: form.instructions || undefined,
    }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); onClose() },
    onError: (e: any) => setError(e.response?.data?.detail || e.message || 'Failed to schedule exam'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Schedule Exam</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Exam Name *</label>
            <input value={form.name} onChange={f('name')} placeholder="e.g. Unit Test 1 – Mathematics"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type *</label>
              <select value={form.exam_type} onChange={f('exam_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Class *</label>
              <select value={form.class_id} onChange={f('class_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
              <select value={form.subject_id} onChange={f('subject_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select subject</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
              <select value={form.academic_year_id || currentYear?.id || ''} onChange={f('academic_year_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {years.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Exam Date *</label>
              <input type="date" value={form.exam_date} onChange={f('exam_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
              <input type="time" value={form.start_time} onChange={f('start_time')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
              <input type="number" value={form.duration_minutes} onChange={f('duration_minutes')} min="10" max="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Marks *</label>
              <input type="number" value={form.max_marks} onChange={f('max_marks')} min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Passing Marks</label>
              <input type="number" value={form.passing_marks} onChange={f('passing_marks')} min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Instructions (optional)</label>
            <textarea value={form.instructions} onChange={f('instructions')} rows={3}
              placeholder="Exam instructions for students..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.class_id || !form.subject_id || !form.exam_date}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {save.isPending && <Loader2 size={16} className="animate-spin" />} Schedule Exam
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Enter Results Modal ───────────────────────────────────────────────────────

function EnterResultsModal({ exam, onClose }: { exam: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['class-students', exam.class_id],
    queryFn: () => api.get(`/api/v1/classes/${exam.class_id}/students`) as any,
    enabled: !!exam.class_id,
  })
  const students: any[] = (studentsData as any)?.data || []

  const save = useMutation({
    mutationFn: () => api.post(`/api/v1/exams/${exam.id}/results/bulk`, {
      results: students
        .filter((s: any) => marks[s.id] !== undefined && marks[s.id] !== '')
        .map((s: any) => ({ student_id: s.id, marks_obtained: parseFloat(marks[s.id]) })),
    }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); onClose() },
    onError: (e: any) => setError(e.response?.data?.detail || e.message || 'Failed to save results'),
  })

  const filled = Object.values(marks).filter(v => v !== '').length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Enter Results</h2>
            <p className="text-xs text-gray-500 mt-0.5">{exam.name} · Max: {exam.max_marks} · Pass: {exam.passing_marks ?? '—'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">No students in this class.</div>
          ) : (
            <div className="space-y-2">
              {students.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs flex-shrink-0">
                    {s.first_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{s.student_code}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min="0" max={exam.max_marks}
                      value={marks[s.id] ?? ''}
                      onChange={e => setMarks(p => ({ ...p, [s.id]: e.target.value }))}
                      placeholder="—"
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-400">/{exam.max_marks}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex-1 text-xs text-gray-500 flex items-center">{filled}/{students.length} results entered</div>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || filled === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {save.isPending && <Loader2 size={14} className="animate-spin" />} Save Results
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Exam Row ──────────────────────────────────────────────────────────────────

function ExamRow({ exam, subjects, classes }: { exam: any; subjects: any[]; classes: any[] }) {
  const [expanded, setExpanded] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const subjectName = subjects.find((s: any) => s.id === exam.subject_id)?.name || exam.subject_id?.slice(0, 8) + '...'
  const className   = classes.find((c: any) => c.id === exam.class_id)?.name || '—'
  const examDate    = exam.exam_date ? new Date(exam.exam_date) : null
  const status      = exam.is_published ? (exam.results_published ? 'published' : 'scheduled') : 'scheduled'

  const { data: resultsData } = useQuery({
    queryKey: ['exam-results', exam.id],
    queryFn: () => api.get(`/api/v1/exams/${exam.id}/results`) as any,
    enabled: expanded,
  })
  const results: any[] = (resultsData as any)?.data || []

  return (
    <>
      {showResults && <EnterResultsModal exam={exam} onClose={() => setShowResults(false)} />}
      <tr className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900 text-sm">{exam.name}</div>
          <div className="text-xs text-gray-400 capitalize mt-0.5">{exam.exam_type?.replace('_', ' ')}</div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{subjectName}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{className}</td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {examDate ? examDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          {examDate && <div className="text-xs text-gray-400">{examDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{exam.max_marks}</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowResults(true)}
              className="text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium flex items-center gap-1">
              <ClipboardList size={12} /> Enter Results
            </button>
            <button onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="bg-indigo-50/40 px-4 py-3 border-b border-gray-100">
            {results.length === 0 ? (
              <p className="text-xs text-gray-400">No results entered yet. Click "Enter Results" to add marks.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {results.slice(0, 8).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <div className={`w-2 h-2 rounded-full ${r.is_pass ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-gray-700 truncate">{r.student_id?.slice(0, 8)}</span>
                    <span className="text-xs font-bold ml-auto">{r.marks_obtained}</span>
                    {r.grade && <span className="text-xs text-gray-400">{r.grade}</span>}
                  </div>
                ))}
                {results.length > 8 && <p className="text-xs text-gray-400 col-span-full">+{results.length - 8} more</p>}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const [showModal, setShowModal] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['exams', typeFilter],
    queryFn: () => api.get(`/api/v1/exams?per_page=100${typeFilter ? `&exam_type=${typeFilter}` : ''}`) as any,
  })
  const exams: any[] = (data as any)?.data?.items || []

  const { data: subjData } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/api/v1/subjects') as any })
  const subjects: any[] = (subjData as any)?.data || []

  const { data: classData } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/api/v1/classes') as any })
  const classes: any[] = (classData as any)?.data?.items || (classData as any)?.data || []

  const stats = {
    total: exams.length,
    scheduled: exams.filter(e => !e.results_published).length,
    completed: exams.filter(e => e.results_published).length,
  }

  return (
    <div className="space-y-6">
      {showModal && <ScheduleExamModal onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-gray-500 text-sm mt-1">{exams.length} exams this year</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          <Plus size={16} /> Schedule Exam
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Exams', value: stats.total, icon: FileText, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Pending Results', value: stats.scheduled, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Results Published', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${!typeFilter ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
          All Types
        </button>
        {EXAM_TYPES.map(t => (
          <button key={t.value} onClick={() => setTypeFilter(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${typeFilter === t.value ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Exam', 'Subject', 'Class', 'Date & Time', 'Max Marks', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-12">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />Loading exams...
              </td></tr>
            ) : exams.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16">
                <BookOpen size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No exams scheduled</p>
                <p className="text-gray-400 text-xs mt-1">Click "Schedule Exam" to create one.</p>
              </td></tr>
            ) : exams.map((exam: any) => (
              <ExamRow key={exam.id} exam={exam} subjects={subjects} classes={classes} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
