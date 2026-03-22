'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Upload, X, Loader2, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'
import Link from 'next/link'
import api from '../../../lib/api'
import { formatDate, cn } from '../../../lib/utils'
import IDCardModal from '../../../components/IDCardModal'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  graduated: 'bg-blue-100 text-blue-700',
  transferred: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
}

function AddStudentModal({ onClose, classes, onCreated }: { onClose: () => void; classes: any[]; onCreated: (s: any) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: '', dob: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    class_id: '', roll_number: '', blood_group: '',
    phone: '', parent_first: '', parent_last: '', relation_type: 'father',
  })
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: async () => {
      const studentRes = await api.post('/api/v1/students', {
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender || undefined,
        dob: form.dob || undefined,
        enrollment_date: form.enrollment_date,
        class_id: form.class_id || undefined,
        roll_number: form.roll_number ? Number(form.roll_number) : undefined,
        blood_group: form.blood_group || undefined,
      }) as any
      const student = (studentRes as any).data
      if (form.parent_first && form.phone) {
        await api.post('/api/v1/parents', {
          student_id: student.id,
          first_name: form.parent_first,
          last_name: form.parent_last,
          relation_type: form.relation_type,
          phone: form.phone,
        })
      }
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      const cls = classes.find((c: any) => c.id === form.class_id)
      onCreated({ ...data?.data, class_name: cls?.name })
    },
    onError: (e: any) => setError(e.message || 'Failed to add student'),
  })

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add New Student</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Student Information</p>
            <div className="grid grid-cols-2 gap-3">
              {([['first_name','First Name *'],['last_name','Last Name *']] as [string,string][]).map(([k,l]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                  <input value={(form as any)[k]} onChange={f(k)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                <select value={form.gender} onChange={f('gender')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                <input type="date" value={form.dob} onChange={f('dob')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Enrollment Date *</label>
                <input type="date" value={form.enrollment_date} onChange={f('enrollment_date')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select value={form.class_id} onChange={f('class_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">No class assigned</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Roll Number</label>
                <input type="number" value={form.roll_number} onChange={f('roll_number')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Blood Group</label>
                <select value={form.blood_group} onChange={f('blood_group')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Unknown</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Parent / Guardian <span className="normal-case font-normal text-gray-400">(optional)</span></p>
            <div className="grid grid-cols-2 gap-3">
              {([['parent_first','First Name'],['parent_last','Last Name']] as [string,string][]).map(([k,l]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                  <input value={(form as any)[k]} onChange={f(k)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Relation</label>
                <select value={form.relation_type} onChange={f('relation_type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => create.mutate()} disabled={create.isPending || !form.first_name || !form.last_name}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {create.isPending && <Loader2 className="animate-spin" size={16} />}
            Add Student
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [idCardStudent, setIdCardStudent] = useState<any>(null)

  const { data: classData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/api/v1/classes') as any,
  })
  const classes: any[] = (classData as any)?.data || []

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, statusFilter, classFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (classFilter) params.set('class_id', classFilter)
      return api.get(`/api/v1/students?${params}`) as any
    },
  })

  const students: any[] = (data as any)?.data?.items || []
  const total: number = (data as any)?.data?.total || 0
  const totalPages = Math.ceil(total / 20) || 1

  return (
    <div>
      {showModal && <AddStudentModal onClose={() => setShowModal(false)} classes={classes} onCreated={(s) => { setShowModal(false); setIdCardStudent(s) }} />}
      {idCardStudent && <IDCardModal person={idCardStudent} role="student" onClose={() => setIdCardStudent(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total students</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
            <Plus size={15} /> Add Student
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or student code..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>
        <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-36">
          <option value="">All Classes</option>
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">All Status</option>
          {['active','inactive','graduated','transferred','suspended'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Student</th>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Class</th>
              <th className="text-left px-4 py-3">Roll No</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Enrolled</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </td></tr>
              ))
            ) : students.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                No students found. Click &ldquo;Add Student&rdquo; to get started.
              </td></tr>
            ) : students.map((s: any) => {
              const cls = classes.find((c: any) => c.id === s.class_id)
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-indigo-600">{s.first_name} {s.last_name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.student_code}</td>
                  <td className="px-4 py-3 text-gray-600">{cls?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.roll_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600')}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(s.enrollment_date)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setIdCardStudent({ ...s, class_name: cls?.name })}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="ID Card">
                      <CreditCard size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">Showing {((page-1)*20)+1}–{Math.min(page*20, total)} of {total}</p>
            <div className="flex items-center gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition"><ChevronLeft size={16}/></button>
              <span className="px-3 py-1 text-sm text-gray-700">{page} / {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
