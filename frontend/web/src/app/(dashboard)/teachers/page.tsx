'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, Plus, Search, X, Loader2, CreditCard, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import api from '../../../lib/api'
import IDCardModal from '../../../components/IDCardModal'

function AddTeacherModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: any) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: 'Teacher@1234',
    phone: '', subject: '', qualification: '',
  })
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/auth/users', {
      email: form.email,
      password: form.password,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone || undefined,
      role: 'teacher',
    }) as any,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['users', 'teacher'] })
      onCreated({ ...data?.data, subject: form.subject, qualification: form.qualification })
    },
    onError: (e: any) => setError(e.message || 'Failed to add teacher'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add New Teacher</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            {([['first_name','First Name *'],['last_name','Last Name *']] as [string,string][]).map(([k,l]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input value={(form as any)[k]} onChange={f(k)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
            <input type="email" value={form.email} onChange={f('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.phone} onChange={f('phone')} placeholder="+91 98765 00000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject / Department</label>
              <input value={form.subject} onChange={f('subject')} placeholder="e.g. Mathematics"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Qualification</label>
            <input value={form.qualification} onChange={f('qualification')} placeholder="e.g. M.Sc Mathematics, B.Ed"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Password</label>
            <input value={form.password} onChange={f('password')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-xs text-gray-400 mt-1">Teacher will be asked to change on first login</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => create.mutate()} disabled={create.isPending || !form.first_name || !form.last_name || !form.email}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {create.isPending && <Loader2 className="animate-spin" size={16} />}
            Add Teacher
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeachersPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [idCardTeacher, setIdCardTeacher] = useState<any>(null)
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['users', 'teacher'],
    queryFn: () => api.get('/api/v1/auth/users?role=teacher&per_page=50') as any,
  })

  const teachers: any[] = (data as any)?.data?.items || []
  const filtered = teachers.filter((t: any) =>
    `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {showModal && (
        <AddTeacherModal
          onClose={() => setShowModal(false)}
          onCreated={(t) => { setShowModal(false); setIdCardTeacher(t) }}
        />
      )}
      {idCardTeacher && (
        <IDCardModal
          person={idCardTeacher}
          role="teacher"
          onClose={() => setIdCardTeacher(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500 text-sm mt-1">{teachers.length} staff members</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teachers..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No teachers found</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add Teacher" to get started</p>
            </div>
          ) : filtered.map((t: any) => (
            <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer group"
              onClick={() => router.push(`/teachers/${t.id}`)}>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-600 flex-shrink-0 overflow-hidden">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>{t.first_name?.[0]}{t.last_name?.[0]}</>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{t.first_name} {t.last_name}</p>
                <p className="text-xs text-gray-500">{t.email}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                t.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {t.status}
              </span>
              <button onClick={e => { e.stopPropagation(); setIdCardTeacher(t) }}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                title="View ID Card">
                <CreditCard size={16} />
              </button>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
