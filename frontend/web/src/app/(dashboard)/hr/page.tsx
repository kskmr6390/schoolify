'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, IndianRupee, CalendarDays, Briefcase, X, Loader2,
  Pencil, Search, TrendingUp, UserCheck, Building2, GraduationCap,
} from 'lucide-react'
import api from '../../../lib/api'

const DEPARTMENTS = [
  'Science', 'Mathematics', 'English', 'Social Studies', 'Arts', 'Physical Education',
  'Computer Science', 'Administration', 'Library', 'Counselling', 'Finance', 'Other',
]

const DESIGNATIONS = [
  'Principal', 'Vice Principal', 'Head of Department', 'Senior Teacher', 'Teacher',
  'Assistant Teacher', 'Lab Assistant', 'Librarian', 'Counsellor', 'Admin Officer',
  'Accountant', 'Office Staff',
]

const SALARY_TYPES = ['monthly', 'annual']

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
  role: string
  staff_profile: {
    id: string | null
    employee_id: string | null
    department: string | null
    designation: string | null
    date_of_joining: string | null
    salary: string | null
    salary_type: string | null
    staff_type: string | null
    leave_balance: number | null
  } | null
}

function EditHRModal({ member, onClose, onSaved }: { member: StaffMember; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    employee_id: member.staff_profile?.employee_id || '',
    department: member.staff_profile?.department || '',
    designation: member.staff_profile?.designation || '',
    date_of_joining: member.staff_profile?.date_of_joining || '',
    salary: member.staff_profile?.salary || '',
    salary_type: member.staff_profile?.salary_type || 'monthly',
    leave_balance: String(member.staff_profile?.leave_balance ?? 12),
    staff_type: member.staff_profile?.staff_type || 'teaching',
  })
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        user_id: member.id,
        employee_id: form.employee_id || null,
        department: form.department || null,
        designation: form.designation || null,
        date_of_joining: form.date_of_joining || null,
        salary: form.salary || null,
        salary_type: form.salary_type,
        leave_balance: parseInt(form.leave_balance) || 12,
        staff_type: form.staff_type,
      }
      if (member.staff_profile?.id) {
        return api.put(`/api/v1/users/staff-profiles/${member.id}`, payload) as any
      }
      return api.post('/api/v1/users/staff-profiles', payload) as any
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e: any) => setError(e.message || 'Failed to save'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">HR Details</h2>
            <p className="text-sm text-gray-500">{member.first_name} {member.last_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee ID</label>
              <input value={form.employee_id} onChange={f('employee_id')} placeholder="EMP-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of Joining</label>
              <input type="date" value={form.date_of_joining} onChange={f('date_of_joining')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <select value={form.department} onChange={f('department')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
              <select value={form.designation} onChange={f('designation')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select designation</option>
                {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Salary (₹)</label>
              <input type="number" value={form.salary} onChange={f('salary')} placeholder="50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Salary Type</label>
              <select value={form.salary_type} onChange={f('salary_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {SALARY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Leave Balance (days)</label>
              <input type="number" value={form.leave_balance} onChange={f('leave_balance')} min={0} max={365}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Staff Type</label>
              <select value={form.staff_type} onChange={f('staff_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="teaching">Teaching</option>
                <option value="non_teaching">Non-Teaching</option>
                <option value="admin">Administrative</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {save.isPending && <Loader2 size={16} className="animate-spin" />}
            Save HR Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HRPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editMember, setEditMember] = useState<StaffMember | null>(null)
  const [filterDept, setFilterDept] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['hr', 'staff-list'],
    queryFn: () => api.get('/api/v1/users/staff-list?role=teacher') as any,
  })
  const staff: StaffMember[] = (data as any)?.data || []

  const filtered = staff.filter(s => {
    const name = `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase()
    const deptMatch = !filterDept || s.staff_profile?.department === filterDept
    return name.includes(search.toLowerCase()) && deptMatch
  })

  const totalSalary = staff.reduce((sum, s) => {
    const sal = parseFloat(s.staff_profile?.salary || '0')
    return sum + (s.staff_profile?.salary_type === 'annual' ? sal / 12 : sal)
  }, 0)

  const byDept = staff.reduce((acc, s) => {
    const dept = s.staff_profile?.department || 'Unassigned'
    acc[dept] = (acc[dept] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const withProfile = staff.filter(s => s.staff_profile?.id).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Human Resources</h1>
        <p className="text-sm text-gray-500 mt-1">Manage teacher & staff HR details, salary, and leave</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: staff.length, icon: Users, color: 'indigo' },
          { label: 'Monthly Payroll', value: `₹${Math.round(totalSalary).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'emerald' },
          { label: 'Departments', value: Object.keys(byDept).length, icon: Building2, color: 'amber' },
          { label: 'Profiles Complete', value: `${withProfile}/${staff.length}`, icon: UserCheck, color: 'violet' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-${c.color}-100 flex items-center justify-center flex-shrink-0`}>
              <c.icon size={18} className={`text-${c.color}-600`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Department distribution */}
      {Object.keys(byDept).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-amber-500" /> Staff by Department
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byDept).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
              <button key={dept} onClick={() => setFilterDept(filterDept === dept ? '' : dept)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                  filterDept === dept
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}>
                {dept} <span className="ml-1 opacity-70">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
          </div>
          {filterDept && (
            <button onClick={() => setFilterDept('')}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
              <X size={12} /> Clear filter
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No staff members found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(member => {
              const sp = member.staff_profile
              return (
                <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-600 flex-shrink-0">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                      {sp?.employee_id && (
                        <span className="text-xs text-gray-400">#{sp.employee_id}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>

                  {/* Department & Designation */}
                  <div className="hidden md:block text-right min-w-[140px]">
                    <p className="text-sm font-medium text-gray-700">{sp?.designation || '—'}</p>
                    <p className="text-xs text-gray-400">{sp?.department || 'No department'}</p>
                  </div>

                  {/* Salary */}
                  <div className="hidden lg:block text-right min-w-[100px]">
                    {sp?.salary ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900">
                          ₹{parseInt(sp.salary).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-400">{sp.salary_type}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">No salary set</p>
                    )}
                  </div>

                  {/* Leave */}
                  <div className="hidden lg:block text-center min-w-[80px]">
                    <p className="text-sm font-semibold text-gray-900">{sp?.leave_balance ?? 12}</p>
                    <p className="text-xs text-gray-400">leave days</p>
                  </div>

                  {/* Status */}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {member.status}
                  </span>

                  {/* Edit */}
                  <button onClick={() => setEditMember(member)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                    <Pencil size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editMember && (
        <EditHRModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['hr', 'staff-list'] })}
        />
      )}
    </div>
  )
}
