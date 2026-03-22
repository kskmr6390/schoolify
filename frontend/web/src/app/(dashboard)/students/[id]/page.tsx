'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, User, Phone, Mail, Calendar, MapPin, BookOpen,
  ClipboardCheck, CreditCard, FileText, Award, AlertCircle,
  CheckCircle, Clock, TrendingUp, Download, Eye,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import api from '../../../../lib/api'
import { formatDate, formatCurrency, ATTENDANCE_STATUS_COLORS, INVOICE_STATUS_COLORS } from '../../../../lib/utils'

type TabKey = 'overview' | 'attendance' | 'results' | 'fees' | 'documents'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview',    label: 'Overview',    icon: User },
  { key: 'attendance',  label: 'Attendance',  icon: ClipboardCheck },
  { key: 'results',     label: 'Results',     icon: Award },
  { key: 'fees',        label: 'Fees',        icon: CreditCard },
  { key: 'documents',   label: 'Documents',   icon: FileText },
]

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceTab({ studentId }: { studentId: string }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay = new Date(year, month, 1).getDay()

  const fromDate = `${year}-${String(month+1).padStart(2,'0')}-01`
  const toDate = `${year}-${String(month+1).padStart(2,'0')}-${daysInMonth}`

  const { data: history } = useQuery({
    queryKey: ['student-attendance', studentId, year, month],
    queryFn: async () => {
      const res = await api.get(`/api/v1/attendance/student/${studentId}`, {
        params: { from_date: fromDate, to_date: toDate },
      })
      return (res as any)?.data ?? []
    },
  })

  const { data: summary } = useQuery({
    queryKey: ['student-attendance-summary', studentId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/attendance/student/${studentId}/summary`)
      return (res as any)?.data ?? {}
    },
  })

  const recordMap: Record<string, string> = {}
  ;(Array.isArray(history) ? history : []).forEach((r: any) => {
    recordMap[r.date?.split('T')[0] ?? r.date] = r.status
  })

  const STATUS_COLORS: Record<string, string> = {
    present: 'bg-green-500',
    absent:  'bg-red-500',
    late:    'bg-yellow-500',
    excused: 'bg-purple-500',
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayStr = new Date().toISOString().split('T')[0]

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  const thisMonthRecords = Array.isArray(history) ? history : []
  const presentDays = thisMonthRecords.filter((r: any) => r.status === 'present').length
  const absentDays  = thisMonthRecords.filter((r: any) => r.status === 'absent').length
  const lateDays    = thisMonthRecords.filter((r: any) => r.status === 'late').length

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Rate', value: summary?.overall_rate != null ? `${summary.overall_rate.toFixed(1)}%` : '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Present', value: summary?.total_present ?? presentDays, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Absent', value: summary?.total_absent ?? absentDays, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Late', value: summary?.total_late ?? lateDays, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">{MONTHS[month]} {year}</h4>
          <div className="flex gap-1">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500 capitalize">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              {status}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const status = recordMap[dateStr]
            const isToday = dateStr === todayStr
            return (
              <div key={dateStr} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs ${
                isToday ? 'ring-2 ring-indigo-400' : ''
              } ${status ? '' : 'text-gray-400'}`}>
                <span className={`font-medium ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>{day}</span>
                {status && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${STATUS_COLORS[status] ?? 'bg-gray-300'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent records */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-900">Recent Records</h4>
        </div>
        {thisMonthRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No attendance records this month</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...thisMonthRecords].reverse().slice(0, 20).map((r: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-700">{formatDate(r.date)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${ATTENDANCE_STATUS_COLORS[r.status] ?? ''}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Results Tab ──────────────────────────────────────────────────────────────
function ResultsTab({ studentId }: { studentId: string }) {
  const { data: results } = useQuery({
    queryKey: ['student-results', studentId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/exams/results/student/${studentId}`)
      return (res as any)?.data ?? []
    },
  })

  const list: any[] = Array.isArray(results) ? results : []

  const avgMarks = list.length > 0
    ? list.reduce((acc, r) => acc + (r.marks_obtained / r.max_marks) * 100, 0) / list.length
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Exams Taken', value: list.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Average Score', value: list.length > 0 ? `${avgMarks.toFixed(1)}%` : '—', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Passed', value: list.filter(r => r.is_pass).length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-900">Exam Results</h4>
        </div>
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No exam results yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Exam</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Marks</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((r: any, i: number) => {
                const pct = r.max_marks > 0 ? (r.marks_obtained / r.max_marks) * 100 : 0
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{r.exam_name ?? r.exam?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{r.subject ?? r.exam?.subject ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDate(r.exam_date ?? r.exam?.exam_date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {r.marks_obtained} / {r.max_marks}
                      <span className="text-xs text-gray-400 ml-1">({pct.toFixed(0)}%)</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-indigo-600">{r.grade ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.is_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.is_pass ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {r.is_pass ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Fees Tab ─────────────────────────────────────────────────────────────────
function FeesTab({ studentId }: { studentId: string }) {
  const { data: invoices } = useQuery({
    queryKey: ['student-invoices', studentId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/fees/invoices`, { params: { student_id: studentId, per_page: 50 } })
      return (res as any)?.data?.items ?? []
    },
  })

  const list: any[] = Array.isArray(invoices) ? invoices : []
  const totalDue = list.reduce((acc, inv) => acc + (inv.amount_due ?? 0), 0)
  const totalPaid = list.reduce((acc, inv) => acc + (inv.amount_paid ?? 0), 0)
  const totalOutstanding = list.reduce((acc, inv) => acc + (inv.outstanding_amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Billed', value: formatCurrency(totalDue), color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Paid', value: formatCurrency(totalPaid), color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), color: totalOutstanding > 0 ? 'text-red-600' : 'text-green-600', bg: totalOutstanding > 0 ? 'bg-red-50' : 'bg-green-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Invoices</h4>
          <span className="text-xs text-gray-400">{list.length} invoices</span>
        </div>
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No invoices found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-mono text-gray-700">{inv.invoice_number ?? inv.id?.slice(0,8)}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatDate(inv.due_date)}</td>
                  <td className="px-5 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(inv.amount_due ?? 0)}</td>
                  <td className="px-5 py-3 text-sm text-green-600 text-right">{formatCurrency(inv.amount_paid ?? 0)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ studentId }: { studentId: string }) {
  const { data: docs } = useQuery({
    queryKey: ['student-docs', studentId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/students/${studentId}/documents`)
      return (res as any)?.data ?? []
    },
  })

  const list: any[] = Array.isArray(docs) ? docs : []

  const DOC_TYPES: Record<string, { label: string; color: string }> = {
    birth_certificate:  { label: 'Birth Certificate', color: 'bg-blue-100 text-blue-700' },
    aadhar:             { label: 'Aadhar Card', color: 'bg-orange-100 text-orange-700' },
    transfer_cert:      { label: 'Transfer Certificate', color: 'bg-purple-100 text-purple-700' },
    marksheet:          { label: 'Marksheet', color: 'bg-green-100 text-green-700' },
    medical:            { label: 'Medical Record', color: 'bg-red-100 text-red-700' },
    photo:              { label: 'Photograph', color: 'bg-gray-100 text-gray-700' },
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Documents</h4>
          <span className="text-xs text-gray-400">{list.length} files</span>
        </div>
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm gap-2">
            <FileText size={32} className="text-gray-200" />
            No documents uploaded
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((doc: any, i: number) => {
              const meta = DOC_TYPES[doc.doc_type] ?? { label: doc.doc_type ?? 'Document', color: 'bg-gray-100 text-gray-700' }
              return (
                <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-indigo-100 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta.color}`}>
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.filename ?? meta.label}</p>
                    <p className="text-xs text-gray-400">{meta.label} · {formatDate(doc.uploaded_at)}</p>
                  </div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer"
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <Download size={14} className="text-gray-400" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const { data, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/students/${id}`)
      return (res as any)?.data
    },
    enabled: !!id,
  })

  const student = data

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Link href="/students" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={14} /> Back to Students
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <User size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Student not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> Back to Students
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 flex-shrink-0">
            {student.first_name?.[0]}{student.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {student.first_name} {student.last_name}
                </h1>
                <p className="text-sm text-gray-500 font-mono mt-0.5">{student.student_code}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>{student.status}</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {[
                { icon: BookOpen, label: 'Class', value: student.class_name ?? student.class?.name ?? '—' },
                { icon: Calendar, label: 'Date of Birth', value: formatDate(student.dob) },
                { icon: User, label: 'Gender', value: student.gender ?? '—' },
                { icon: MapPin, label: 'Blood Group', value: student.blood_group ?? '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Full Name', value: `${student.first_name} ${student.last_name}` },
                { label: 'Student Code', value: student.student_code },
                { label: 'Date of Birth', value: formatDate(student.dob) },
                { label: 'Gender', value: student.gender ?? '—' },
                { label: 'Blood Group', value: student.blood_group ?? '—' },
                { label: 'Nationality', value: student.nationality ?? '—' },
                { label: 'Religion', value: student.religion ?? '—' },
                { label: 'Caste / Category', value: student.caste ?? '—' },
                { label: 'Enrollment Date', value: formatDate(student.enrollment_date) },
                { label: 'Roll Number', value: student.roll_number ?? '—' },
                { label: 'Aadhar No.', value: student.aadhar_number ?? '—' },
                { label: 'Section', value: student.section ?? '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Address */}
          {(student.address || student.city) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Address', value: student.address ?? '—' },
                  { label: 'City', value: student.city ?? '—' },
                  { label: 'State', value: student.state ?? '—' },
                  { label: 'Pincode', value: student.pincode ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parents */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Parents / Guardians</h2>
            {!student.parents?.length ? (
              <p className="text-sm text-gray-400">No parent records linked</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {student.parents.map((parent: any) => (
                  <div key={parent.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                      {parent.first_name?.[0]}{parent.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {parent.first_name} {parent.last_name}
                      </p>
                      <p className="text-xs text-indigo-600 capitalize mb-2">{parent.relation_type}</p>
                      <div className="space-y-1">
                        {parent.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone size={11} /> {parent.phone}
                          </div>
                        )}
                        {parent.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail size={11} /> {parent.email}
                          </div>
                        )}
                        {parent.occupation && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <User size={11} /> {parent.occupation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'View Attendance', icon: ClipboardCheck, color: 'text-blue-600 bg-blue-50', tab: 'attendance' as TabKey },
                { label: 'Exam Results', icon: Award, color: 'text-indigo-600 bg-indigo-50', tab: 'results' as TabKey },
                { label: 'Fee Invoices', icon: CreditCard, color: 'text-amber-600 bg-amber-50', tab: 'fees' as TabKey },
                { label: 'Documents', icon: FileText, color: 'text-purple-600 bg-purple-50', tab: 'documents' as TabKey },
              ].map(({ label, icon: Icon, color, tab }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl ${color} hover:opacity-80 transition-opacity`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && <AttendanceTab studentId={id} />}
      {activeTab === 'results' && <ResultsTab studentId={id} />}
      {activeTab === 'fees' && <FeesTab studentId={id} />}
      {activeTab === 'documents' && <DocumentsTab studentId={id} />}
    </div>
  )
}
