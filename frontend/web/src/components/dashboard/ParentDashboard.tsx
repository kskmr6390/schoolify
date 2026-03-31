'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ClipboardCheck, Trophy, CreditCard, ArrowRight,
  Users, BookOpen, Bell,
} from 'lucide-react'
import Link from 'next/link'
import api from '../../lib/api'

function ChildCard({ child, isSelected, onClick }: { child: any; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left w-full ${
        isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
        {child.first_name?.[0]}{child.last_name?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
          {child.first_name} {child.last_name}
        </p>
        <p className="text-xs text-gray-500">{child.relationship} · {child.student_code ?? 'Student'}</p>
      </div>
    </button>
  )
}

function ChildSummary({ child }: { child: any }) {
  const { data: attRaw } = useQuery({
    queryKey: ['child-att', child.id],
    queryFn: () => api.get(`/api/v1/attendance/student/${child.id}/summary`) as any,
    select: (d: any) => d?.data ?? d,
    enabled: !!child.id,
  })
  const att = attRaw as any

  const { data: awardsRaw } = useQuery({
    queryKey: ['child-awards', child.id],
    queryFn: () => api.get(`/api/v1/notifications/awards?recipient_id=${child.id}`) as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
    enabled: !!child.id,
  })
  const awards: any[] = awardsRaw ?? []

  const { data: feesRaw } = useQuery({
    queryKey: ['child-fees', child.id],
    queryFn: () => api.get(`/api/v1/fees/invoices?student_id=${child.id}&limit=3`) as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
    enabled: !!child.id,
  })
  const fees: any[] = feesRaw ?? []
  const pendingFees = fees.filter((f: any) => f.status === 'pending' || f.status === 'overdue')

  const attPct = att?.percentage ?? null
  const attColor = attPct === null ? 'text-gray-400' : attPct >= 90 ? 'text-green-600' : attPct >= 75 ? 'text-amber-600' : 'text-red-600'
  const attBg = attPct === null ? 'bg-gray-100' : attPct >= 90 ? 'bg-green-500' : attPct >= 75 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className={`text-2xl font-bold ${attColor}`}>{attPct !== null ? `${attPct}%` : '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Attendance</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{awards.length}</p>
          <p className="text-xs text-gray-500 mt-1">Awards</p>
        </div>
        <div className={`bg-white rounded-xl border border-gray-100 p-4 text-center`}>
          <p className={`text-2xl font-bold ${pendingFees.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {pendingFees.length > 0 ? `${pendingFees.length}` : '✓'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Pending Fees</p>
        </div>
      </div>

      {/* Attendance bar */}
      {att && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Attendance Overview</h4>
            <Link href="/attendance" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Details <ArrowRight size={11} />
            </Link>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full ${attBg}`} style={{ width: `${att.percentage ?? 0}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Present', v: att.present, c: 'text-green-600' },
              { label: 'Absent',  v: att.absent,  c: 'text-red-600' },
              { label: 'Late',    v: att.late,     c: 'text-amber-600' },
              { label: 'Excused', v: att.excused,  c: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-base font-bold ${s.c}`}>{s.v ?? 0}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awards */}
      {awards.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Recent Awards</h4>
            <Link href="/awards" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {awards.slice(0, 3).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <Trophy size={14} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900 truncate">{a.title}</p>
                  <p className="text-xs text-amber-600">{a.category} · {a.awarded_by_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Child's Progress", href: '/progress', icon: ClipboardCheck, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
            { label: 'School Feed',      href: '/feed',     icon: Bell,           color: 'bg-violet-50 text-violet-600 border-violet-100' },
            { label: 'Fee Details',      href: '/fees',     icon: CreditCard,     color: 'bg-rose-50 text-rose-600 border-rose-100' },
            { label: 'Results',          href: '/results',  icon: BookOpen,       color: 'bg-amber-50 text-amber-600 border-amber-100' },
          ].map(q => (
            <Link
              key={q.href}
              href={q.href}
              className={`flex items-center gap-2.5 p-3 rounded-xl border ${q.color} hover:opacity-80 transition-opacity`}
            >
              <q.icon size={15} />
              <span className="text-xs font-medium">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ParentDashboard() {
  const { data: childrenRaw } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => api.get('/api/v1/users/parent-links/my-children') as any,
    select: (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []),
  })
  const children: any[] = childrenRaw ?? []
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selected = children[selectedIdx]

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Users size={28} className="text-gray-300" />
        </div>
        <p className="text-gray-600 font-semibold">No children linked yet</p>
        <p className="text-gray-400 text-sm mt-1">Ask the school admin to link your account to your child.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {children.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Children</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((child, idx) => (
              <ChildCard
                key={child.id}
                child={child}
                isSelected={idx === selectedIdx}
                onClick={() => setSelectedIdx(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
              {selected.first_name?.[0]}{selected.last_name?.[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selected.first_name} {selected.last_name}</p>
              <p className="text-xs text-gray-500">{selected.student_code} {selected.grade ? `· Grade ${selected.grade}` : ''}</p>
            </div>
          </div>
          <ChildSummary child={selected} />
        </div>
      )}
    </div>
  )
}
