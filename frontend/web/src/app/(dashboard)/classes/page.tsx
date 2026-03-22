'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Plus, X, Loader2, Pencil, Trash2,
  Users, ChevronDown, ChevronUp, UserCheck, GraduationCap,
} from 'lucide-react'
import api from '../../../lib/api'

interface ClassItem {
  id: string; name: string; grade: number; section: string
  capacity: number; class_teacher_id: string | null
}

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']
const GRADE_COLORS = [
  'indigo', 'violet', 'sky', 'emerald', 'amber', 'orange',
  'pink', 'rose', 'teal', 'cyan', 'lime', 'red',
]

function ClassFormModal({
  academicYearId, teachers, editing, onClose, onSaved,
}: {
  academicYearId: string; teachers: any[]; editing: ClassItem | null
  onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    grade: editing ? String(editing.grade) : '1',
    section: editing?.section || 'A',
    capacity: editing ? String(editing.capacity) : '40',
    class_teacher_id: editing?.class_teacher_id || '',
  })
  const [error, setError] = useState('')
  const [autoName, setAutoName] = useState(!editing)

  const buildName = (grade: string, section: string) => `Grade ${grade}-${section}`

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        academic_year_id: academicYearId,
        name: form.name || buildName(form.grade, form.section),
        grade: parseInt(form.grade),
        section: form.section,
        capacity: parseInt(form.capacity) || 40,
        class_teacher_id: form.class_teacher_id || null,
      }
      if (editing) return api.patch(`/api/v1/classes/${editing.id}`, payload) as any
      return api.post('/api/v1/classes', payload) as any
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e: any) => setError(e.response?.data?.detail || e.message || 'Failed to save'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value
    setForm(p => {
      const next = { ...p, [k]: val }
      if (autoName && (k === 'grade' || k === 'section')) {
        next.name = buildName(k === 'grade' ? val : p.grade, k === 'section' ? val : p.section)
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Class' : 'Add Class'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade *</label>
              <select value={form.grade} onChange={f('grade')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section *</label>
              <select value={form.section} onChange={f('section')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class Name</label>
            <div className="flex items-center gap-2">
              <input value={form.name} onChange={e => { setAutoName(false); setForm(p => ({ ...p, name: e.target.value })) }}
                placeholder={buildName(form.grade, form.section)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="button" onClick={() => { setAutoName(true); setForm(p => ({ ...p, name: buildName(p.grade, p.section) })) }}
                className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-2 whitespace-nowrap">Auto</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
              <input type="number" value={form.capacity} onChange={f('capacity')} min="1" max="200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Class Teacher</label>
              <select value={form.class_teacher_id} onChange={f('class_teacher_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">None</option>
                {teachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {save.isPending && <Loader2 size={16} className="animate-spin" />}
            {editing ? 'Save Changes' : 'Create Class'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClassCard({
  cls, teachers, onEdit, onDelete,
}: { cls: ClassItem; teachers: any[]; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const colorIdx = ((cls.grade - 1) % GRADE_COLORS.length)
  const color = GRADE_COLORS[colorIdx]

  const { data: studentsData } = useQuery({
    queryKey: ['class-students', cls.id],
    queryFn: () => api.get(`/api/v1/classes/${cls.id}/students`) as any,
    enabled: expanded,
  })
  const students: any[] = (studentsData as any)?.data || []

  const teacher = teachers.find(t => t.id === cls.class_teacher_id)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header strip */}
      <div className={`h-1.5 bg-${color}-500`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl bg-${color}-100 flex items-center justify-center`}>
            <BookOpen size={18} className={`text-${color}-600`} />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 text-base">{cls.name}</h3>
        <p className="text-sm text-gray-500 mt-0.5">Section {cls.section} · Capacity {cls.capacity}</p>

        {teacher && (
          <div className="flex items-center gap-1.5 mt-2">
            <UserCheck size={12} className="text-indigo-400" />
            <span className="text-xs text-gray-500">{teacher.first_name} {teacher.last_name}</span>
          </div>
        )}

        <button onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 flex items-center justify-between text-xs text-gray-400 hover:text-indigo-600 transition">
          <span className="flex items-center gap-1"><Users size={12} />View students</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 max-h-48 overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No students enrolled yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {students.map((s: any) => (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold flex-shrink-0">
                    {s.first_name?.[0]}
                  </span>
                  <span className="text-gray-700">{s.first_name} {s.last_name}</span>
                  <span className="text-gray-400 ml-auto font-mono">{s.student_code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function ClassesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ClassItem | null>(null)

  const { data: ayData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/api/v1/academic-years') as any,
  })
  const academicYears: any[] = (ayData as any)?.data?.items || (ayData as any)?.data || []
  const currentYear = academicYears.find((y: any) => y.is_current) || academicYears[0]

  const { data: teacherData } = useQuery({
    queryKey: ['users', 'teacher'],
    queryFn: () => api.get('/api/v1/auth/users?role=teacher&per_page=100') as any,
  })
  const teachers: any[] = (teacherData as any)?.data?.items || []

  const { data, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/api/v1/classes') as any,
  })
  const classes: ClassItem[] = (data as any)?.data?.items || (data as any)?.data || []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/classes/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  })

  // Group by grade
  const byGrade = classes.reduce((acc, cls) => {
    const g = String(cls.grade)
    if (!acc[g]) acc[g] = []
    acc[g].push(cls)
    return acc
  }, {} as Record<string, ClassItem[]>)
  const sortedGrades = Object.keys(byGrade).sort((a, b) => parseInt(a) - parseInt(b))

  return (
    <div className="space-y-6">
      {showForm && currentYear && (
        <ClassFormModal
          academicYearId={currentYear.id}
          teachers={teachers}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => qc.invalidateQueries({ queryKey: ['classes'] })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {classes.length} classes{currentYear ? ` · ${currentYear.name}` : ''}
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          <Plus size={16} /> Add Class
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Classes', value: classes.length },
          { label: 'Total Capacity', value: classes.reduce((s, c) => s + c.capacity, 0) },
          { label: 'Grades Covered', value: sortedGrades.length },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No classes yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Class" to create your first class.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGrades.map(grade => (
            <div key={grade}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Grade {grade}</h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{byGrade[grade].length} section{byGrade[grade].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {byGrade[grade].map(cls => (
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    teachers={teachers}
                    onEdit={() => { setEditing(cls); setShowForm(true) }}
                    onDelete={() => { if (confirm(`Delete ${cls.name}?`)) deleteMutation.mutate(cls.id) }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
