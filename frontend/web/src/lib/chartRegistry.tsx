import React from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ChartWidget } from '../store/dashboardStore'

const C = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6']
const GC: Record<string, string> = { 'A+':'#10b981','A':'#34d399','B+':'#6366f1','B':'#818cf8','C':'#f59e0b','D':'#f97316','F':'#ef4444' }
const FC: Record<string, string> = { Paid:'#10b981',Pending:'#f59e0b',Partial:'#6366f1',Overdue:'#ef4444',Cancelled:'#9ca3af' }

function fINR(v: number) {
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v/1000).toFixed(1)}K`
  return `₹${v}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Stat({ v, lbl, c, b }: { v: any; lbl: string; c: string; b: string }) {
  return (
    <div className={`h-full flex flex-col items-center justify-center ${b} rounded-xl p-6 gap-2`}>
      <p className={`text-4xl font-bold ${c} leading-tight text-center`}>{v ?? '—'}</p>
      <p className="text-sm text-gray-500 text-center">{lbl}</p>
    </div>
  )
}

function Empty() {
  return (
    <div className="h-full flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
      No data available yet
    </div>
  )
}

function RC({ children }: { children: React.ReactNode }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {children as any}
    </ResponsiveContainer>
  )
}

// ─── Chart Definition ─────────────────────────────────────────────────────────
export interface ChartDef {
  type: string
  label: string
  description: string
  category: 'overview' | 'students' | 'attendance' | 'fees' | 'academics' | 'hr' | 'compliance'
  defaultColSpan: number
  defaultRowSpan: number
  render: (analytics: any, widget: ChartWidget) => React.ReactNode
}

export const CHART_REGISTRY: ChartDef[] = [

  // ── OVERVIEW STAT CARDS ───────────────────────────────────────────────────
  {
    type: 'stat_total_students', label: 'Total Students', description: 'Current enrolled student count',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={a.overview?.total_students ?? 0} lbl="Total Students" c="text-indigo-600" b="bg-indigo-50" />,
  },
  {
    type: 'stat_total_teachers', label: 'Total Teachers', description: 'Active teaching staff',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={a.overview?.total_teachers ?? 0} lbl="Active Teachers" c="text-emerald-600" b="bg-emerald-50" />,
  },
  {
    type: 'stat_total_classes', label: 'Total Classes', description: 'Number of active classes',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={a.overview?.total_classes ?? 0} lbl="Active Classes" c="text-sky-600" b="bg-sky-50" />,
  },
  {
    type: 'stat_total_staff', label: 'Total Staff', description: 'All staff members count',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={a.overview?.total_staff ?? 0} lbl="All Staff" c="text-violet-600" b="bg-violet-50" />,
  },
  {
    type: 'stat_fee_collected', label: 'Fee Collected', description: 'Total fee collected this month',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={fINR(a.overview?.fee_collected ?? 0)} lbl="Collected This Month" c="text-amber-600" b="bg-amber-50" />,
  },
  {
    type: 'stat_outstanding', label: 'Outstanding Fees', description: 'Total outstanding fee amount',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={fINR(a.overview?.fee_outstanding ?? 0)} lbl="Outstanding Fees" c="text-red-600" b="bg-red-50" />,
  },
  {
    type: 'stat_pass_rate', label: 'Pass Rate', description: 'Overall exam pass rate',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={`${a.pass_fail?.pass_rate ?? 0}%`} lbl="Overall Pass Rate" c="text-green-600" b="bg-green-50" />,
  },
  {
    type: 'stat_attendance_today', label: 'Attendance Today', description: "Today's overall attendance rate",
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={`${a.overview?.attendance_rate_today ?? 0}%`} lbl="Today Attendance" c="text-rose-600" b="bg-rose-50" />,
  },
  {
    type: 'stat_avg_class_size', label: 'Avg Class Size', description: 'Average students per class',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => {
      const avg = a.overview?.total_classes > 0 ? Math.round((a.overview.total_students ?? 0) / a.overview.total_classes) : 0
      return <Stat v={avg} lbl="Avg Class Size" c="text-cyan-600" b="bg-cyan-50" />
    },
  },
  {
    type: 'stat_total_subjects', label: 'Total Subjects', description: 'Number of active subjects',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={a.overview?.total_subjects ?? 0} lbl="Active Subjects" c="text-purple-600" b="bg-purple-50" />,
  },
  {
    type: 'stat_new_admissions', label: 'New Admissions', description: 'New students this month',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={a.overview?.new_admissions_this_month ?? 0} lbl="New This Month" c="text-teal-600" b="bg-teal-50" />,
  },
  {
    type: 'stat_pending_invoices', label: 'Pending Invoices', description: 'Unpaid invoice count',
    category: 'overview', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={a.overview?.pending_invoices ?? 0} lbl="Pending Invoices" c="text-orange-600" b="bg-orange-50" />,
  },

  // ── STUDENT CHARTS ────────────────────────────────────────────────────────
  {
    type: 'chart_enrollment_trend', label: 'Enrollment Trend', description: 'Monthly student enrollment over time',
    category: 'students', defaultColSpan: 8, defaultRowSpan: 2,
    render: (a) => !(a.enrollment_trend?.length) ? <Empty /> : (
      <RC><AreaChart data={a.enrollment_trend}>
        <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
        <Tooltip/><Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={2} fill="url(#eg)" name="Students"/>
      </AreaChart></RC>
    ),
  },
  {
    type: 'chart_students_per_class', label: 'Students per Class', description: 'Student count breakdown by class',
    category: 'students', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.students_per_class?.length) ? <Empty /> : (
      <RC><BarChart data={a.students_per_class} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
        <XAxis type="number" tick={{fontSize:11}} allowDecimals={false}/><YAxis dataKey="class" type="category" tick={{fontSize:10}} width={80}/>
        <Tooltip/><Bar dataKey="students" fill="#6366f1" radius={[0,4,4,0]} name="Students"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_gender_dist', label: 'Gender Distribution', description: 'Students by gender',
    category: 'students', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.gender_distribution?.length) ? <Empty /> : (
      <RC><PieChart>
        <Pie data={a.gender_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" innerRadius="40%" label={({name, percent}: any) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
          {a.gender_distribution.map((_: any, i: number) => <Cell key={i} fill={C[i%C.length]}/>)}
        </Pie><Tooltip/>
      </PieChart></RC>
    ),
  },
  {
    type: 'chart_age_dist', label: 'Age Distribution', description: 'Students grouped by age',
    category: 'students', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.age_distribution?.length) ? <Empty /> : (
      <RC><BarChart data={a.age_distribution}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="age" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/>
        <Tooltip/><Bar dataKey="count" fill="#06b6d4" radius={[4,4,0,0]} name="Students"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_blood_groups', label: 'Blood Group Distribution', description: 'Students by blood type',
    category: 'students', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.blood_groups?.length) ? <Empty /> : (
      <RC><BarChart data={a.blood_groups}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="group" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/>
        <Tooltip/><Bar dataKey="count" radius={[4,4,0,0]} name="Students">
          {a.blood_groups.map((_: any, i: number) => <Cell key={i} fill={C[i%C.length]}/>)}
        </Bar>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_admissions_monthly', label: 'Monthly Admissions', description: 'New student admissions per month',
    category: 'students', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.admissions_monthly?.length) ? <Empty /> : (
      <RC><LineChart data={a.admissions_monthly}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/>
        <Tooltip/><Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{r:4}} name="Admissions"/>
      </LineChart></RC>
    ),
  },
  {
    type: 'chart_caste_dist', label: 'Category Distribution', description: 'Students by social category',
    category: 'students', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.caste_dist?.length) ? <Empty /> : (
      <RC><PieChart>
        <Pie data={a.caste_dist} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius="70%" label={({category, percent}: any) => `${category} ${(percent*100).toFixed(0)}%`} labelLine={false}>
          {a.caste_dist.map((_: any, i: number) => <Cell key={i} fill={C[i%C.length]}/>)}
        </Pie><Tooltip/>
      </PieChart></RC>
    ),
  },

  // ── ATTENDANCE CHARTS ─────────────────────────────────────────────────────
  {
    type: 'chart_attendance_daily', label: 'Daily Attendance', description: 'Present vs absent last 14 days',
    category: 'attendance', defaultColSpan: 12, defaultRowSpan: 2,
    render: (a) => !(a.attendance_daily?.length) ? <Empty /> : (
      <RC><BarChart data={a.attendance_daily}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/>
        <Tooltip/><Legend/>
        <Bar dataKey="present" fill="#10b981" radius={[4,4,0,0]} name="Present"/>
        <Bar dataKey="absent" fill="#ef4444" radius={[4,4,0,0]} name="Absent"/>
        <Bar dataKey="late" fill="#f59e0b" radius={[4,4,0,0]} name="Late"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_attendance_by_class', label: 'Attendance by Class', description: 'Attendance rate per class',
    category: 'attendance', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.attendance_by_class?.length) ? <Empty /> : (
      <RC><BarChart data={a.attendance_by_class}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="class" tick={{fontSize:10}}/><YAxis domain={[0,100]} tick={{fontSize:11}} unit="%"/>
        <Tooltip formatter={(v: any) => [`${v}%`, 'Rate']}/>
        <Bar dataKey="rate" radius={[4,4,0,0]} name="Rate">
          {(a.attendance_by_class ?? []).map((c: any, i: number) => <Cell key={i} fill={c.rate>=90?'#10b981':c.rate>=75?'#f59e0b':'#ef4444'}/>)}
        </Bar>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_attendance_trend', label: 'Attendance Trend', description: 'Monthly attendance rate over time',
    category: 'attendance', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.attendance_monthly?.length) ? <Empty /> : (
      <RC><LineChart data={a.attendance_monthly}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis domain={[60,100]} tick={{fontSize:11}} unit="%"/>
        <Tooltip/><Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} dot={{r:4}} name="Attendance %"/>
      </LineChart></RC>
    ),
  },
  {
    type: 'chart_attendance_breakdown', label: 'Attendance Breakdown', description: 'Present / Absent / Late / Excused',
    category: 'attendance', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => {
      const data = [
        {name:'Present', value: a.attendance_summary?.present ?? 68},
        {name:'Absent',  value: a.attendance_summary?.absent  ?? 12},
        {name:'Late',    value: a.attendance_summary?.late    ?? 8},
        {name:'Excused', value: a.attendance_summary?.excused ?? 4},
      ]
      return <RC><PieChart><Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius="40%" outerRadius="70%" label={({name, percent}: any) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
        {['#22c55e','#ef4444','#f59e0b','#8b5cf6'].map((col, i) => <Cell key={i} fill={col}/>)}
      </Pie><Tooltip/></PieChart></RC>
    },
  },
  {
    type: 'chart_absenteeism_risk', label: 'Absenteeism Risk', description: 'Students at risk by attendance threshold',
    category: 'attendance', defaultColSpan: 4, defaultRowSpan: 1,
    render: (a) => (
      <div className="h-full grid grid-cols-3 gap-3 p-2">
        {[
          {label:'High Risk <75%', v: a.absenteeism?.high_risk ?? 0, c:'text-red-600 bg-red-50'},
          {label:'At Risk 75–85%', v: a.absenteeism?.at_risk    ?? 0, c:'text-amber-600 bg-amber-50'},
          {label:'On Track >85%',  v: a.absenteeism?.on_track   ?? 0, c:'text-green-600 bg-green-50'},
        ].map(item => (
          <div key={item.label} className={`rounded-xl flex flex-col items-center justify-center p-3 ${item.c.split(' ')[1]}`}>
            <p className={`text-3xl font-bold ${item.c.split(' ')[0]}`}>{item.v}</p>
            <p className="text-xs text-gray-500 text-center mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    type: 'chart_teacher_attendance', label: 'Teacher Attendance', description: 'Monthly teacher attendance rate',
    category: 'attendance', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.teacher_attendance?.length) ? <Empty /> : (
      <RC><BarChart data={a.teacher_attendance}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis domain={[80,100]} tick={{fontSize:11}} unit="%"/>
        <Tooltip/><Bar dataKey="rate" fill="#8b5cf6" radius={[4,4,0,0]} name="Teacher Attendance %"/>
      </BarChart></RC>
    ),
  },

  // ── FEE CHARTS ────────────────────────────────────────────────────────────
  {
    type: 'chart_fee_monthly', label: 'Monthly Fee Collection', description: 'Billed vs collected per month',
    category: 'fees', defaultColSpan: 12, defaultRowSpan: 2,
    render: (a) => !(a.fee_monthly?.length) ? <Empty /> : (
      <RC><BarChart data={a.fee_monthly}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={fINR}/>
        <Tooltip formatter={(v: any) => [fINR(Number(v)), '']} /><Legend/>
        <Bar dataKey="billed" fill="#e0e7ff" radius={[4,4,0,0]} name="Billed"/>
        <Bar dataKey="collected" fill="#6366f1" radius={[4,4,0,0]} name="Collected"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_fee_status', label: 'Invoice Status', description: 'Fee status distribution donut',
    category: 'fees', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.fee_status?.length) ? <Empty /> : (
      <RC><PieChart>
        <Pie data={a.fee_status} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius="70%" innerRadius="40%">
          {a.fee_status.map((s: any) => <Cell key={s.name} fill={FC[s.name]||'#9ca3af'}/>)}
        </Pie><Tooltip/><Legend/>
      </PieChart></RC>
    ),
  },
  {
    type: 'chart_fee_rate_trend', label: 'Collection Rate Trend', description: 'Fee collection rate over months',
    category: 'fees', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.fee_rate_trend?.length) ? <Empty /> : (
      <RC><AreaChart data={a.fee_rate_trend}>
        <defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis domain={[0,100]} tick={{fontSize:11}} unit="%"/>
        <Tooltip/><Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} fill="url(#fg)" name="Collection Rate"/>
      </AreaChart></RC>
    ),
  },
  {
    type: 'chart_outstanding_by_class', label: 'Outstanding by Class', description: 'Unpaid fees per class',
    category: 'fees', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.outstanding_by_class?.length) ? <Empty /> : (
      <RC><BarChart data={a.outstanding_by_class} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
        <XAxis type="number" tick={{fontSize:11}} tickFormatter={fINR}/><YAxis dataKey="class" type="category" tick={{fontSize:10}} width={80}/>
        <Tooltip formatter={(v: any) => [fINR(Number(v)), 'Outstanding']}/><Bar dataKey="amount" fill="#ef4444" radius={[0,4,4,0]} name="Outstanding"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_payment_methods', label: 'Payment Methods', description: 'How fees are being paid',
    category: 'fees', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.payment_methods?.length) ? <Empty /> : (
      <RC><PieChart>
        <Pie data={a.payment_methods} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius="70%" label={({method, percent}: any) => `${method} ${(percent*100).toFixed(0)}%`} labelLine={false}>
          {(a.payment_methods ?? []).map((_: any, i: number) => <Cell key={i} fill={C[i%C.length]}/>)}
        </Pie><Tooltip/>
      </PieChart></RC>
    ),
  },
  {
    type: 'chart_top_defaulters', label: 'Top Defaulters', description: 'Students with highest outstanding fees',
    category: 'fees', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.top_defaulters?.length) ? <Empty /> : (
      <div className="h-full overflow-y-auto p-2 space-y-2">
        {(a.top_defaulters ?? []).slice(0,8).map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 flex-shrink-0">{s.name?.[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
              <p className="text-xs text-gray-400">{s.class}</p>
            </div>
            <span className="text-sm font-bold text-red-600">{fINR(s.outstanding)}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    type: 'chart_fee_collection_rate', label: 'Fee Collection Rate', description: 'Overall fee collection percentage',
    category: 'fees', defaultColSpan: 3, defaultRowSpan: 1,
    render: (a) => <Stat v={`${a.overview?.fee_collection_rate ?? 0}%`} lbl="Fee Collection Rate" c="text-emerald-600" b="bg-emerald-50" />,
  },

  // ── ACADEMICS ─────────────────────────────────────────────────────────────
  {
    type: 'chart_subject_perf', label: 'Subject Performance', description: 'Average marks by subject',
    category: 'academics', defaultColSpan: 12, defaultRowSpan: 2,
    render: (a) => !(a.subject_performance?.length) ? <Empty /> : (
      <RC><BarChart data={a.subject_performance}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="subject" tick={{fontSize:11}}/><YAxis domain={[0,100]} tick={{fontSize:11}}/>
        <Tooltip/><Bar dataKey="avg_marks" radius={[4,4,0,0]} name="Avg Marks">
          {a.subject_performance.map((_: any, i: number) => <Cell key={i} fill={C[i%C.length]}/>)}
        </Bar>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_grade_dist', label: 'Grade Distribution', description: 'Students grouped by grade',
    category: 'academics', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.grade_distribution?.length) ? <Empty /> : (
      <RC><PieChart>
        <Pie data={a.grade_distribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius="70%" innerRadius="40%">
          {a.grade_distribution.map((g: any) => <Cell key={g.grade} fill={GC[g.grade]||'#9ca3af'}/>)}
        </Pie><Tooltip/><Legend/>
      </PieChart></RC>
    ),
  },
  {
    type: 'chart_pass_fail', label: 'Pass / Fail Summary', description: 'Overall pass and fail counts',
    category: 'academics', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => {
      const pf = a.pass_fail ?? {}
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
          <p className="text-5xl font-bold text-emerald-600">{pf.pass_rate ?? 0}%</p>
          <div className="w-full h-4 bg-red-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{width:`${pf.pass_rate??0}%`}}/>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full">
            {[{l:'Passed', v:pf.passed??0, c:'text-emerald-600'},{l:'Failed', v:pf.failed??0, c:'text-red-600'},{l:'Total', v:pf.total??0, c:'text-gray-800'}].map(x => (
              <div key={x.l} className="text-center">
                <p className={`text-2xl font-bold ${x.c}`}>{x.v}</p>
                <p className="text-xs text-gray-400">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
  },
  {
    type: 'chart_subject_radar', label: 'Subject Radar', description: 'Multi-axis subject performance radar',
    category: 'academics', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.subject_radar?.length) ? <Empty /> : (
      <RC><RadarChart data={a.subject_radar}>
        <PolarGrid/><PolarAngleAxis dataKey="subject" tick={{fontSize:11}}/><PolarRadiusAxis angle={90} domain={[0,100]} tick={{fontSize:10}}/>
        <Radar name="Avg Score" dataKey="avg" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25}/>
        <Tooltip/>
      </RadarChart></RC>
    ),
  },
  {
    type: 'chart_class_perf', label: 'Class Performance', description: 'Avg marks and pass rate by class',
    category: 'academics', defaultColSpan: 8, defaultRowSpan: 2,
    render: (a) => !(a.class_performance?.length) ? <Empty /> : (
      <RC><BarChart data={a.class_performance}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="class" tick={{fontSize:11}}/><YAxis domain={[0,100]} tick={{fontSize:11}} unit="%"/>
        <Tooltip/><Legend/>
        <Bar dataKey="avg_marks" fill="#6366f1" radius={[4,4,0,0]} name="Avg Marks %"/>
        <Bar dataKey="pass_rate" fill="#10b981" radius={[4,4,0,0]} name="Pass Rate %"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_top_students', label: 'Top Performers', description: 'Highest scoring students',
    category: 'academics', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.top_students?.length) ? <Empty /> : (
      <div className="h-full overflow-y-auto p-2 space-y-2">
        {(a.top_students ?? []).slice(0,8).map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i===0?'bg-yellow-100 text-yellow-700':i===1?'bg-gray-100 text-gray-600':i===2?'bg-orange-100 text-orange-600':'bg-indigo-50 text-indigo-600'}`}>{i+1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
              <p className="text-xs text-gray-400">{s.class}</p>
            </div>
            <span className="text-sm font-bold text-indigo-600">{s.avg_pct}%</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    type: 'chart_exam_types', label: 'Exams by Type', description: 'Count of exams grouped by type',
    category: 'academics', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.exam_types?.length) ? <Empty /> : (
      <RC><BarChart data={a.exam_types}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="type" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/>
        <Tooltip/><Bar dataKey="count" fill="#8b5cf6" radius={[4,4,0,0]} name="Exams">
          {(a.exam_types??[]).map((_: any, i: number) => <Cell key={i} fill={C[i%C.length]}/>)}
        </Bar>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_homework_rates', label: 'Homework Submission', description: 'Assignment submission rate by class',
    category: 'academics', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.homework_rates?.length) ? <Empty /> : (
      <RC><BarChart data={a.homework_rates}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="class" tick={{fontSize:10}}/><YAxis domain={[0,100]} tick={{fontSize:11}} unit="%"/>
        <Tooltip/><Bar dataKey="rate" radius={[4,4,0,0]} name="Submission Rate">
          {(a.homework_rates??[]).map((c: any, i: number) => <Cell key={i} fill={c.rate>=80?'#10b981':c.rate>=60?'#f59e0b':'#ef4444'}/>)}
        </Bar>
      </BarChart></RC>
    ),
  },

  // ── HR & STAFF ────────────────────────────────────────────────────────────
  {
    type: 'chart_staff_by_dept', label: 'Staff by Department', description: 'Headcount per department',
    category: 'hr', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.staff_by_dept?.length) ? <Empty /> : (
      <RC><BarChart data={a.staff_by_dept} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
        <XAxis type="number" tick={{fontSize:11}} allowDecimals={false}/><YAxis dataKey="dept" type="category" tick={{fontSize:10}} width={100}/>
        <Tooltip/><Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} name="Staff"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_employment_types', label: 'Employment Types', description: 'Full-time vs part-time vs contract',
    category: 'hr', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.employment_types?.length) ? <Empty /> : (
      <RC><PieChart>
        <Pie data={a.employment_types} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius="70%" innerRadius="40%">
          {(a.employment_types??[]).map((_: any, i: number) => <Cell key={i} fill={C[i%C.length]}/>)}
        </Pie><Tooltip/><Legend/>
      </PieChart></RC>
    ),
  },
  {
    type: 'chart_teacher_load', label: 'Teacher Load', description: 'Subjects and classes per teacher',
    category: 'hr', defaultColSpan: 8, defaultRowSpan: 2,
    render: (a) => !(a.teacher_load?.length) ? <Empty /> : (
      <RC><BarChart data={a.teacher_load}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="teacher" tick={{fontSize:10}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/>
        <Tooltip/><Legend/>
        <Bar dataKey="subjects" fill="#8b5cf6" radius={[4,4,0,0]} name="Subjects"/>
        <Bar dataKey="classes" fill="#c4b5fd" radius={[4,4,0,0]} name="Classes"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_staff_turnover', label: 'Staff Turnover', description: 'Hired vs left each month',
    category: 'hr', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => !(a.staff_turnover?.length) ? <Empty /> : (
      <RC><BarChart data={a.staff_turnover}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/>
        <Tooltip/><Legend/>
        <Bar dataKey="hired" fill="#10b981" radius={[4,4,0,0]} name="Hired"/>
        <Bar dataKey="left" fill="#ef4444" radius={[4,4,0,0]} name="Left"/>
      </BarChart></RC>
    ),
  },
  {
    type: 'chart_staff_certs', label: 'Staff Certifications', description: 'Percentage of staff with key certifications',
    category: 'hr', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => {
      const sc = a.staff_certs ?? {}
      const rows = [
        {label:'B.Ed / M.Ed', pct: sc.bed_pct??0, color:'bg-emerald-500'},
        {label:'Subject Specialist', pct: sc.subject_pct??0, color:'bg-indigo-500'},
        {label:'First Aid', pct: sc.firstaid_pct??0, color:'bg-sky-500'},
        {label:'Police Verification', pct: sc.police_pct??0, color:'bg-amber-500'},
      ]
      return (
        <div className="h-full flex flex-col justify-center gap-3 p-4">
          {rows.map(r => (
            <div key={r.label}>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">{r.label}</span><span className="font-medium">{r.pct}%</span></div>
              <div className="h-2 bg-gray-100 rounded-full"><div className={`h-full rounded-full ${r.color}`} style={{width:`${r.pct}%`}}/></div>
            </div>
          ))}
        </div>
      )
    },
  },
  {
    type: 'chart_experience_dist', label: 'Experience Distribution', description: 'Staff grouped by years of experience',
    category: 'hr', defaultColSpan: 4, defaultRowSpan: 2,
    render: (a) => !(a.experience_dist?.length) ? <Empty /> : (
      <RC><BarChart data={a.experience_dist}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="range" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/>
        <Tooltip/><Bar dataKey="count" fill="#f59e0b" radius={[4,4,0,0]} name="Staff"/>
      </BarChart></RC>
    ),
  },

  // ── COMPLIANCE ────────────────────────────────────────────────────────────
  {
    type: 'chart_compliance_score', label: 'Compliance Score', description: 'Overall school compliance score',
    category: 'compliance', defaultColSpan: 3, defaultRowSpan: 2,
    render: (a) => {
      const score = a.compliance?.score ?? 0
      const grade = a.compliance?.grade ?? '—'
      return (
        <div className={`h-full flex flex-col items-center justify-center rounded-xl p-4 gap-2 ${score>=80?'bg-emerald-50':score>=60?'bg-amber-50':'bg-red-50'}`}>
          <p className={`text-5xl font-bold ${score>=80?'text-emerald-600':score>=60?'text-amber-600':'text-red-600'}`}>{score || '—'}</p>
          <p className="text-sm text-gray-500">Compliance Score</p>
          <p className={`text-xl font-bold ${score>=80?'text-emerald-600':score>=60?'text-amber-600':'text-red-600'}`}>Grade {grade}</p>
        </div>
      )
    },
  },
  {
    type: 'chart_compliance_breakdown', label: 'Compliance Breakdown', description: 'Score by compliance domain',
    category: 'compliance', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => {
      const c = a.compliance ?? {}
      const data = [
        {domain:'Attendance', score: c.attendance??0},
        {domain:'Fees', score: c.fees??0},
        {domain:'Documentation', score: c.docs??0},
        {domain:'Staff', score: c.staff??0},
        {domain:'Academic', score: c.academic??0},
        {domain:'Infrastructure', score: c.infra??0},
      ]
      return (
        <RC><RadarChart data={data}>
          <PolarGrid/><PolarAngleAxis dataKey="domain" tick={{fontSize:11}}/><PolarRadiusAxis angle={90} domain={[0,100]} tick={{fontSize:9}}/>
          <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.25}/>
          <Tooltip/>
        </RadarChart></RC>
      )
    },
  },
  {
    type: 'chart_board_compliance', label: 'Board Requirements', description: 'CBSE / ICSE / IB / State compliance',
    category: 'compliance', defaultColSpan: 6, defaultRowSpan: 2,
    render: (a) => {
      const boards = a.boards ?? {}
      const data = Object.entries(boards).map(([name, b]: any) => ({ board: name.toUpperCase(), score: b.score ?? 0 }))
      return data.length ? (
        <RC><BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/><XAxis dataKey="board" tick={{fontSize:12}}/><YAxis domain={[0,100]} tick={{fontSize:11}} unit="%"/>
          <Tooltip/><Bar dataKey="score" fill="#10b981" radius={[4,4,0,0]} name="Compliance %"/>
        </BarChart></RC>
      ) : <Empty />
    },
  },
]

export const CHART_MAP = new Map<string, ChartDef>(CHART_REGISTRY.map(c => [c.type, c]))

export const CATEGORIES: Record<string, { label: string; color: string }> = {
  overview:    { label: 'Overview', color: 'text-indigo-600 bg-indigo-50' },
  students:    { label: 'Students', color: 'text-sky-600 bg-sky-50' },
  attendance:  { label: 'Attendance', color: 'text-emerald-600 bg-emerald-50' },
  fees:        { label: 'Fees', color: 'text-amber-600 bg-amber-50' },
  academics:   { label: 'Academics', color: 'text-violet-600 bg-violet-50' },
  hr:          { label: 'HR & Staff', color: 'text-rose-600 bg-rose-50' },
  compliance:  { label: 'Compliance', color: 'text-teal-600 bg-teal-50' },
}
