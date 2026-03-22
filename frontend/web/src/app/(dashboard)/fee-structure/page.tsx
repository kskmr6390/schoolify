'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, Loader2, Trash2, Pencil, IndianRupee,
  GraduationCap, RefreshCw, CheckCircle2, AlertCircle,
} from 'lucide-react'
import api from '../../../lib/api'

const FEE_TYPES = [
  { value: 'tuition',   label: 'Monthly Tuition',  color: 'indigo' },
  { value: 'admission', label: 'Admission Fee',     color: 'emerald' },
  { value: 'transport', label: 'Transport Fee',     color: 'amber' },
  { value: 'lab',       label: 'Lab Fee',           color: 'violet' },
  { value: 'sports',    label: 'Sports Fee',        color: 'sky' },
  { value: 'library',   label: 'Library Fee',       color: 'orange' },
  { value: 'exam',      label: 'Exam Fee',          color: 'pink' },
  { value: 'other',     label: 'Other Charge',      color: 'gray' },
]

const TYPE_BADGE: Record<string, string> = {
  tuition:   'bg-indigo-100 text-indigo-700',
  admission: 'bg-emerald-100 text-emerald-700',
  transport: 'bg-amber-100 text-amber-700',
  lab:       'bg-violet-100 text-violet-700',
  sports:    'bg-sky-100 text-sky-700',
  library:   'bg-orange-100 text-orange-700',
  exam:      'bg-pink-100 text-pink-700',
  other:     'bg-gray-100 text-gray-600',
}

const RECURRENCE = ['monthly', 'quarterly', 'half-yearly', 'annual', 'one-time']

interface FeeStructure {
  id: string
  name: string
  fee_type: string
  amount: number
  due_date: string
  is_recurring: boolean
  recurrence: string | null
  class_id: string | null
  academic_year_id: string
}

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

interface FormState {
  name: string; fee_type: string; amount: string; due_date: string
  is_recurring: boolean; recurrence: string; class_id: string; description: string
}

const BLANK: FormState = {
  name: '', fee_type: 'tuition', amount: '', due_date: new Date().toISOString().split('T')[0],
  is_recurring: false, recurrence: 'monthly', class_id: '', description: '',
}

function FeeFormModal({
  academicYearId, classes, editing, onClose, onSaved,
}: {
  academicYearId: string
  classes: any[]
  editing: FeeStructure | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(editing ? {
    name: editing.name,
    fee_type: editing.fee_type,
    amount: String(editing.amount),
    due_date: editing.due_date,
    is_recurring: editing.is_recurring,
    recurrence: editing.recurrence || 'monthly',
    class_id: editing.class_id || '',
    description: '',
  } : BLANK)
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        academic_year_id: academicYearId,
        name: form.name,
        fee_type: form.fee_type,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        is_recurring: form.is_recurring,
        recurrence: form.is_recurring ? form.recurrence : null,
        class_id: form.class_id || null,
        description: form.description || null,
      }
      if (editing) {
        return api.patch(`/api/v1/fees/structures/${editing.id}`, payload) as any
      }
      return api.post('/api/v1/fees/structures', payload) as any
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e: any) => setError(e.message || 'Failed to save'),
  })

  const f = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Fee Structure' : 'Add Fee Structure'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fee Name *</label>
            <input value={form.name} onChange={f('name')} placeholder="e.g., Monthly Tuition Fee"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fee Type *</label>
              <select value={form.fee_type} onChange={f('fee_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {FEE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={f('amount')} placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
              <input type="date" value={form.due_date} onChange={f('due_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Applicable Class</label>
              <select value={form.class_id} onChange={f('class_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" id="recurring" checked={form.is_recurring}
              onChange={e => setForm(p => ({ ...p, is_recurring: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 rounded" />
            <label htmlFor="recurring" className="text-sm font-medium text-gray-700">Recurring charge</label>
            {form.is_recurring && (
              <select value={form.recurrence} onChange={f('recurrence')}
                className="ml-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {RECURRENCE.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea value={form.description} onChange={f('description')} rows={2}
              placeholder="Any additional notes about this fee..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => save.mutate()}
            disabled={save.isPending || !form.name || !form.amount}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {save.isPending && <Loader2 size={16} className="animate-spin" />}
            {editing ? 'Save Changes' : 'Create Fee Structure'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FeeStructurePage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FeeStructure | null>(null)

  const { data: ayData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/api/v1/academic-years') as any,
  })
  const academicYears: any[] = (ayData as any)?.data?.items || (ayData as any)?.data || []
  const currentYear = academicYears.find((y: any) => y.is_current) || academicYears[0]

  const { data: classData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/api/v1/classes') as any,
  })
  const classes: any[] = (classData as any)?.data?.items || []

  const { data, isLoading } = useQuery({
    queryKey: ['fee-structures', currentYear?.id],
    queryFn: () => api.get(`/api/v1/fees/structures${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ''}`) as any,
    enabled: true,
  })
  const structures: FeeStructure[] = (data as any)?.data || []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/fees/structures/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fee-structures'] }),
  })

  const grouped = FEE_TYPES.reduce((acc, t) => {
    acc[t.value] = structures.filter(s => s.fee_type === t.value)
    return acc
  }, {} as Record<string, FeeStructure[]>)

  const totalMonthly = structures
    .filter(s => s.is_recurring && s.recurrence === 'monthly')
    .reduce((sum, s) => sum + Number(s.amount), 0)

  const totalAnnual = structures.reduce((sum, s) => {
    if (!s.is_recurring) return sum + Number(s.amount)
    const multipliers: Record<string, number> = { monthly: 12, quarterly: 4, 'half-yearly': 2, annual: 1 }
    return sum + Number(s.amount) * (multipliers[s.recurrence || 'annual'] || 1)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentYear ? `Academic Year: ${currentYear.name}` : 'Manage school fee components'}
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          <Plus size={16} /> Add Fee
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Fee Heads', value: structures.length, icon: IndianRupee, color: 'indigo' },
          { label: 'Monthly Recurring', value: formatINR(totalMonthly), icon: RefreshCw, color: 'emerald' },
          { label: 'Annual Total (per student)', value: formatINR(totalAnnual), icon: CheckCircle2, color: 'amber' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-${c.color}-100 flex items-center justify-center`}>
              <c.icon size={18} className={`text-${c.color}-600`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fee type sections */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : structures.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <IndianRupee size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No fee structures yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Fee" to define admission, tuition and other charges.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {FEE_TYPES.map(type => {
            const items = grouped[type.value] || []
            if (items.length === 0) return null
            return (
              <div key={type.value} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[type.value]}`}>
                      {type.label}
                    </span>
                    <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatINR(items.reduce((s, i) => s + Number(i.amount), 0))}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(fs => (
                    <div key={fs.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{fs.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {fs.class_id ? (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <GraduationCap size={11} />
                              {classes.find(c => c.id === fs.class_id)?.name || 'Specific class'}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600">All classes</span>
                          )}
                          {fs.is_recurring && (
                            <span className="text-xs text-indigo-600 flex items-center gap-1">
                              <RefreshCw size={10} /> {fs.recurrence}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">Due: {fs.due_date}</span>
                        </div>
                      </div>
                      <span className="text-base font-bold text-gray-900">{formatINR(Number(fs.amount))}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditing(fs); setShowForm(true) }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteMutation.mutate(fs.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && currentYear && (
        <FeeFormModal
          academicYearId={currentYear.id}
          classes={classes}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['fee-structures'] })}
        />
      )}
    </div>
  )
}
