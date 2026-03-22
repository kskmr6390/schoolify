'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, Loader2, Search, UserCog, CreditCard,
  Briefcase, Phone, Mail, Building2, ChevronRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import api from '../../../lib/api'
import IDCardModal from '../../../components/IDCardModal'

const STAFF_ROLES = [
  { value: 'librarian',     label: 'Librarian' },
  { value: 'lab_assistant', label: 'Lab Assistant' },
  { value: 'counsellor',    label: 'Counsellor' },
  { value: 'security',      label: 'Security' },
  { value: 'peon',          label: 'Peon / Attendant' },
  { value: 'driver',        label: 'Driver' },
  { value: 'cook',          label: 'Cook / Canteen' },
  { value: 'accountant',    label: 'Accountant' },
  { value: 'clerk',         label: 'Office Clerk' },
  { value: 'it_support',    label: 'IT Support' },
  { value: 'other',         label: 'Other' },
]

const DEPARTMENTS = [
  'Administration', 'Library', 'Laboratory', 'Security', 'Transport',
  'Canteen', 'Finance', 'IT', 'Maintenance', 'Other',
]

function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: any) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: 'Staff@1234',
    phone: '', designation: 'other', department: 'Administration',
  })
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: async () => {
      const userRes = await (api as any).post('/api/v1/auth/users', {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || undefined,
        role: 'teacher',
      }) as any
      const userId = userRes?.data?.id
      if (userId) {
        try {
          await (api as any).post('/api/v1/users/staff-profiles', {
            user_id: userId,
            designation: STAFF_ROLES.find(r => r.value === form.designation)?.label || form.designation,
            department: form.department,
            staff_type: 'non_teaching',
          })
        } catch { /* non-fatal */ }
      }
      return userRes
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['staff-list'] })
      onCreated({ ...data?.data, designation: form.designation, department: form.department })
    },
    onError: (e: any) => setError(e.message || 'Failed to add staff member'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Staff Member</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            {([['first_name', 'First Name *'], ['last_name', 'Last Name *']] as [string, string][]).map(([k, l]) => (
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <select value={form.department} onChange={f('department')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role / Designation</label>
            <select value={form.designation} onChange={f('designation')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Password</label>
            <input value={form.password} onChange={f('password')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-xs text-gray-400 mt-1">Staff will be asked to change on first login</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => create.mutate()}
            disabled={create.isPending || !form.first_name || !form.last_name || !form.email}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {create.isPending && <Loader2 size={16} className="animate-spin" />}
            Add Staff Member
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [idCardPerson, setIdCardPerson] = useState<any>(null)
  const [filterDept, setFilterDept] = useState('')
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/api/v1/users/staff-list') as any,
  })

  const allStaff: any[] = (data as any)?.data || []
  // Show non-teaching staff only on this page
  const nonTeaching = allStaff.filter(s =>
    s.staff_profile?.staff_type === 'non_teaching' ||
    (s.staff_profile?.staff_type == null && s.role !== 'admin')
  )

  const depts = [...new Set(nonTeaching.map(s => s.staff_profile?.department || 'Other').filter(Boolean))]

  const filtered = nonTeaching.filter(s => {
    const name = `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase()
    const deptMatch = !filterDept || (s.staff_profile?.department || 'Other') === filterDept
    return name.includes(search.toLowerCase()) && deptMatch
  })

  return (
    <div className="space-y-6">
      {showModal && (
        <AddStaffModal
          onClose={() => setShowModal(false)}
          onCreated={(s) => { setShowModal(false); setIdCardPerson(s) }}
        />
      )}
      {idCardPerson && (
        <IDCardModal
          person={{ ...idCardPerson, subject: idCardPerson.designation || idCardPerson.department }}
          role="teacher"
          onClose={() => setIdCardPerson(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-1">Non-teaching staff & support personnel</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: nonTeaching.length },
          { label: 'Departments', value: depts.length },
          { label: 'Active', value: nonTeaching.filter(s => s.status === 'active').length },
          { label: 'With Profile', value: nonTeaching.filter(s => s.staff_profile?.id).length },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Department chips */}
      {depts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {depts.map(dept => (
            <button key={dept} onClick={() => setFilterDept(filterDept === dept ? '' : dept)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                filterDept === dept
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}>
              <Building2 size={10} className="inline mr-1" />{dept}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
          </div>
          {filterDept && (
            <button onClick={() => setFilterDept('')} className="text-xs text-indigo-600 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UserCog size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No staff members found</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add Staff" to add non-teaching staff.</p>
            </div>
          ) : filtered.map((s: any) => (
            <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer group"
              onClick={() => router.push(`/staff/${s.id}`)}>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-semibold text-amber-700 flex-shrink-0">
                {s.first_name?.[0]}{s.last_name?.[0]}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Mail size={10} /> {s.email}
                  </span>
                </div>
              </div>

              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-700">{s.staff_profile?.designation || '—'}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                  <Building2 size={10} />{s.staff_profile?.department || 'No dept'}
                </p>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {s.status}
              </span>

              <button onClick={e => { e.stopPropagation(); setIdCardPerson(s) }}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                title="View ID Card">
                <CreditCard size={15} />
              </button>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
