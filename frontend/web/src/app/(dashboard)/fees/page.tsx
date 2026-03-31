'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  CreditCard, Plus, X, Loader2, Search, FileText,
  CheckCircle2, AlertCircle, Clock, IndianRupee, Receipt,
  Eye, RefreshCw, Trash2, Download, Mail, ExternalLink,
  Users, Zap, ChevronRight,
} from 'lucide-react'
import api from '../../../lib/api'
import { downloadCSV } from '../../../lib/csvExport'
import FeeReceiptModal, { type FeeReceiptData, type ReceiptTemplate } from '../../../components/FeeReceiptModal'

const STATUS_STYLES: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-600',
  sent:    'bg-blue-100 text-blue-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  paid: CheckCircle2, overdue: AlertCircle, partial: Clock,
  sent: FileText, draft: FileText,
}

// ── Generate Invoice Modal ────────────────────────────────────────────────────

function GenerateInvoiceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'single' | 'bulk'>('single')
  const [studentId, setStudentId] = useState('')
  const [classId, setClassId] = useState('')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [selectedStructures, setSelectedStructures] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: ayData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/api/v1/academic-years') as any,
  })
  const years: any[] = (ayData as any)?.data?.items || (ayData as any)?.data || []
  const currentYear = years.find((y: any) => y.is_current) || years[0]

  const { data: classData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/api/v1/classes') as any,
  })
  const classes: any[] = (classData as any)?.data?.items || (classData as any)?.data || []

  const { data: studentData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => api.get('/api/v1/students?per_page=200') as any,
  })
  const students: any[] = (studentData as any)?.data?.items || []

  const { data: structureData } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: () => api.get('/api/v1/fees/structures') as any,
  })
  const structures: any[] = (structureData as any)?.data || []

  const toggleStructure = (id: string) =>
    setSelectedStructures(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const selectedTotal = structures
    .filter(s => selectedStructures.includes(s.id))
    .reduce((sum, s) => sum + (s.amount || 0), 0)

  const createSingle = useMutation({
    mutationFn: () => {
      const selectedFees = structures.filter(s => selectedStructures.includes(s.id))
      return api.post('/api/v1/fees/invoices', {
        student_id: studentId,
        academic_year_id: currentYear?.id,
        due_date: dueDate,
        notes: notes || undefined,
        idempotency_key: crypto.randomUUID(),
        items: selectedFees.map(s => ({
          fee_structure_id: s.id,
          description: s.name || s.fee_type,
          amount: s.amount,
          quantity: 1,
        })),
      }) as any
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setSuccess('Invoice created!'); setTimeout(onClose, 1200) },
    onError: (e: any) => setError(e.response?.data?.detail || e.message || 'Failed to create invoice'),
  })

  const createBulk = useMutation({
    mutationFn: () => api.post('/api/v1/fees/invoices/bulk-generate', {
      academic_year_id: currentYear?.id,
      class_id: classId || undefined,
      due_date: dueDate,
    }) as any,
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['invoices'] }); setSuccess((res as any)?.data?.message || 'Bulk generation started!'); setTimeout(onClose, 1500) },
    onError: (e: any) => setError(e.response?.data?.detail || e.message || 'Bulk generation failed'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Generate Invoices</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 m-5 mb-0 bg-gray-100 rounded-xl p-1">
          {(['single', 'bulk'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>
              {t === 'single' ? 'Single Student' : 'Bulk (All/Class)'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2"><CheckCircle2 size={16} />{success}</div>}

          {tab === 'single' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Student *</label>
                <select value={studentId} onChange={e => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Choose student...</option>
                  {students.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Fee Items *</label>
                {structures.length === 0 ? (
                  <p className="text-xs text-gray-400">No fee structures found. Create fee structures first.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {structures.map((s: any) => (
                      <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedStructures.includes(s.id) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="checkbox" checked={selectedStructures.includes(s.id)} onChange={() => toggleStructure(s.id)} className="rounded text-indigo-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{s.name || s.fee_type}</p>
                          <p className="text-xs text-gray-400 capitalize">{s.fee_type} · {s.frequency}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">₹{(s.amount || 0).toLocaleString('en-IN')}</span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedStructures.length > 0 && (
                  <div className="mt-2 text-right text-sm font-semibold text-indigo-700">
                    Total: ₹{selectedTotal.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <button onClick={() => createSingle.mutate()} disabled={createSingle.isPending || !studentId || selectedStructures.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                {createSingle.isPending && <Loader2 size={16} className="animate-spin" />} Generate Invoice
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class (optional)</label>
                <select value={classId} onChange={e => setClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">All Classes</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                This will generate invoices for all active students{classId ? ' in the selected class' : ''} using active fee structures for the current academic year.
              </div>
              <button onClick={() => createBulk.mutate()} disabled={createBulk.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                {createBulk.isPending && <Loader2 size={16} className="animate-spin" />} Generate Bulk Invoices
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Record Payment Modal ──────────────────────────────────────────────────────

function RecordPaymentModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(invoice.balance_due ?? invoice.total_amount))
  const [method, setMethod] = useState('cash')
  const [txnId, setTxnId] = useState('')
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () => api.post('/api/v1/fees/payments', {
      invoice_id: invoice.id,
      amount: parseFloat(amount),
      payment_method: method,
      transaction_id: txnId || undefined,
      idempotency_key: crypto.randomUUID(),
    }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); onClose() },
    onError: (e: any) => setError(e.response?.data?.detail || e.message || 'Payment failed'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Record Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">Invoice {invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['cash', 'upi', 'neft', 'rtgs', 'cheque', 'card', 'online'].map(m => (
                <option key={m} value={m} className="capitalize">{m.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Transaction ID / Reference</label>
            <input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !amount}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {save.isPending && <Loader2 size={16} className="animate-spin" />} Record Payment
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bulk Receipt Progress Bar ─────────────────────────────────────────────────

function BulkJobProgress({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const qc = useQueryClient()
  const doneRef = useRef(false)

  const { data } = useQuery({
    queryKey: ['bulk-receipt-job', jobId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/fees/receipts/bulk-jobs/${jobId}`)
      return (res as any)?.data ?? {}
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'done' || status === 'failed') return false
      return 2000
    },
  })

  useEffect(() => {
    if ((data?.status === 'done' || data?.status === 'failed') && !doneRef.current) {
      doneRef.current = true
      qc.invalidateQueries({ queryKey: ['receipts'] })
      setTimeout(onDone, 3000)
    }
  }, [data?.status, qc, onDone])

  const total = data?.total ?? 0
  const completed = data?.completed ?? 0
  const failed = data?.failed ?? 0
  const status = data?.status ?? 'pending'
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const isDone = status === 'done' || status === 'failed'

  return (
    <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDone ? (
            failed === 0
              ? <CheckCircle2 size={16} className="text-emerald-500" />
              : <AlertCircle size={16} className="text-amber-500" />
          ) : (
            <Loader2 size={16} className="text-indigo-500 animate-spin" />
          )}
          <span className="text-sm font-medium text-gray-800">
            {status === 'pending' ? 'Preparing...' :
              status === 'running' ? `Generating receipts... ${completed}/${total}` :
              status === 'done' ? `Done — ${completed} receipt${completed !== 1 ? 's' : ''} generated` :
              `Finished with ${failed} error${failed !== 1 ? 's' : ''}`}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${isDone && failed > 0 ? 'bg-amber-400' : 'bg-indigo-500'}`}
          style={{ width: `${isDone ? 100 : pct}%` }}
        />
      </div>
      {failed > 0 && (
        <p className="text-xs text-amber-600">{failed} student{failed !== 1 ? 's' : ''} failed — check error log</p>
      )}
    </div>
  )
}

// ── Student Receipts Panel ────────────────────────────────────────────────────

function ReceiptsPanel({ schoolName }: { schoolName: string }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [bulkJobId, setBulkJobId] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['school-settings'],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings')
      return (res as any)?.data ?? {}
    },
    staleTime: 60_000,
  })

  const { data: jobsData } = useQuery({
    queryKey: ['bulk-receipt-jobs'],
    queryFn: async () => {
      const res = await api.get('/api/v1/fees/receipts/bulk-jobs')
      return (res as any)?.data ?? []
    },
  })
  const jobs: any[] = Array.isArray(jobsData) ? jobsData : []
  const latestJob = jobs[0]

  const startBulk = async () => {
    setBulkLoading(true)
    try {
      const res: any = await api.post('/api/v1/fees/receipts/bulk-generate', {
        template: (settings?.receipt_template as string) || 'classic',
        send_email: true,
        school_name: settings?.school_name || schoolName || 'School',
      })
      const job = (res as any)?.data
      if (job?.id) {
        setBulkJobId(job.id)
        qc.invalidateQueries({ queryKey: ['bulk-receipt-jobs'] })
      }
    } catch { /* user sees nothing on error — button re-enables */ }
    finally { setBulkLoading(false) }
  }

  const sendEmail = useMutation({
    mutationFn: (receiptId: string) => api.post(`/api/v1/fees/receipts/${receiptId}/send-email`, {}) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  })
  const regenerate = useMutation({
    mutationFn: (receiptId: string) => api.post(`/api/v1/fees/receipts/${receiptId}/regenerate`, {}) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipts'] }); qc.invalidateQueries({ queryKey: ['bulk-receipt-jobs'] }) },
  })
  const deleteReceipt = useMutation({
    mutationFn: (receiptId: string) => api.delete(`/api/v1/fees/receipts/${receiptId}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  })

  // We'll load receipts per student only when we have a student search.
  // For the "all receipts" view we list latest bulk job receipts via polling.
  // Actually let's just show bulk job history + ability to view/email/regen
  const showActiveJob = bulkJobId || (latestJob && (latestJob.status === 'running' || latestJob.status === 'pending'))
  const activeJobId = bulkJobId || (showActiveJob ? latestJob?.id : null)

  return (
    <div className="space-y-4">
      {/* Bulk generate header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Bulk Receipt Generation</p>
          <p className="text-xs text-gray-500 mt-0.5">Generate PDF receipts for all paid/partial invoices and send via email</p>
        </div>
        <button
          onClick={startBulk}
          disabled={bulkLoading || (showActiveJob && latestJob?.status === 'running')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {bulkLoading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          Bulk Generate
        </button>
      </div>

      {/* Active job progress */}
      {activeJobId && (
        <BulkJobProgress
          jobId={activeJobId}
          onDone={() => {
            setBulkJobId(null)
            qc.invalidateQueries({ queryKey: ['bulk-receipt-jobs'] })
          }}
        />
      )}

      {/* Past jobs */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past Jobs</p>
          <div className="space-y-2">
            {jobs.slice(0, 5).map((job: any) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  {job.status === 'done'
                    ? <CheckCircle2 size={14} className="text-emerald-500" />
                    : job.status === 'failed'
                    ? <AlertCircle size={14} className="text-red-500" />
                    : <Loader2 size={14} className="text-indigo-500 animate-spin" />}
                  <div>
                    <p className="text-xs font-medium text-gray-800 capitalize">{job.status} — {job.completed}/{job.total} receipts</p>
                    <p className="text-[10px] text-gray-400">{new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                {job.failed > 0 && (
                  <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{job.failed} failed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && !showActiveJob && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
            <Receipt size={22} className="text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-gray-600">No receipts generated yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Bulk Generate" to create receipts for all paid invoices</p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'invoices' | 'receipts'>('invoices')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null)
  const [receiptData, setReceiptData] = useState<FeeReceiptData | null>(null)
  const [page, setPage] = useState(1)

  // Fetch school settings for template + school info
  const { data: settings } = useQuery({
    queryKey: ['school-settings'],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings')
      return (res as any)?.data ?? {}
    },
  })
  const preferredTemplate: ReceiptTemplate = (settings?.receipt_template as ReceiptTemplate) ?? 'classic'
  const schoolName: string = settings?.school_name ?? 'School'

  const generateReceipt = useMutation({
    mutationFn: (inv: any) =>
      api.post('/api/v1/fees/receipts/generate', {
        student_id: inv.student_id,
        invoice_ids: [inv.id],
        template: preferredTemplate,
      }) as any,
    onSuccess: (res: any, inv: any) => {
      const r = (res as any)?.data
      setReceiptData({
        receipt_number: r.receipt_number,
        template: r.template ?? preferredTemplate,
        is_clubbed: false,
        total_amount: Number(r.total_amount),
        paid_amount: Number(r.paid_amount),
        notes: r.notes,
        created_at: r.created_at,
        invoices: (r.invoices ?? []).map((i: any) => ({
          id: i.id,
          invoice_number: i.invoice_number,
          issued_date: i.issued_date,
          due_date: i.due_date,
          items: (i.items ?? []).map((item: any) => ({
            description: item.description,
            amount: Number(item.amount),
            quantity: item.quantity ?? 1,
          })),
          total_amount: Number(i.total_amount),
          paid_amount: Number(i.paid_amount),
          discount_amount: Number(i.discount_amount ?? 0),
          late_fee: Number(i.late_fee ?? 0),
        })),
        student: {
          name: inv.student_name ?? inv.student_id?.slice(0, 8),
          student_code: inv.student_code ?? '',
        },
        school: {
          name: settings?.school_name ?? 'School',
          address: settings?.school_address,
          phone: settings?.school_phone,
          email: settings?.school_email,
        },
      })
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20', page: String(page) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/api/v1/fees/invoices?${params}`)
      return (res as any)?.data
    },
  })

  const invoices: any[] = data?.items ?? []
  const total: number = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const exportInvoices = () => {
    downloadCSV('invoices',
      ['Invoice #', 'Student', 'Status', 'Total', 'Paid', 'Balance Due', 'Issued', 'Due Date'],
      invoices.map(i => [
        i.invoice_number,
        i.student_name ?? i.student_id,
        i.status,
        i.total_amount,
        i.paid_amount ?? 0,
        i.balance_due ?? (i.total_amount - (i.paid_amount ?? 0)),
        i.issued_date,
        i.due_date,
      ]),
    )
  }

  const summary = {
    outstanding: invoices.reduce((s: number, i: any) => s + (i.balance_due ?? (i.total_amount - i.paid_amount)), 0),
    paid: invoices.filter((i: any) => i.status === 'paid' || i.status === 'PAID').length,
    overdue: invoices.filter((i: any) => i.status === 'overdue' || i.status === 'OVERDUE').length,
  }

  return (
    <div className="space-y-6">
      {showGenerate && <GenerateInvoiceModal onClose={() => setShowGenerate(false)} />}
      {paymentInvoice && <RecordPaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} />}
      {receiptData && <FeeReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-sm text-gray-500 mt-1">{total} invoices total</p>
        </div>
        <div className="flex gap-2">
          {tab === 'invoices' && (
            <>
              <button onClick={exportInvoices} disabled={invoices.length === 0}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">
                <Download size={15} /> Export CSV
              </button>
              <button onClick={() => setShowGenerate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
                <Plus size={16} /> Generate Invoice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['invoices', 'receipts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {t === 'invoices' ? 'Invoices' : 'Receipts & PDF'}
          </button>
        ))}
      </div>

      {tab === 'receipts' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ReceiptsPanel schoolName={schoolName} />
        </div>
      )}

      {tab === 'invoices' && (<>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Outstanding Amount', value: `₹${summary.outstanding.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-red-600 bg-red-50' },
          { label: 'Paid Invoices', value: summary.paid, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
          { label: 'Overdue', value: summary.overdue, icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}>
              <c.icon size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by student name or invoice #..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['draft', 'sent', 'partial', 'overdue', 'paid'].map(s => (
            <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 h-48 text-gray-400">
            <Loader2 size={20} className="animate-spin" /> Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Receipt size={36} className="text-gray-300" />
            <p className="font-medium">No invoices found</p>
            <p className="text-xs">Generate invoices using the button above</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Invoice #', 'Student', 'Total', 'Balance', 'Due Date', 'Status', 'Receipt', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv: any) => {
                  const balanceDue = inv.balance_due ?? (inv.total_amount - inv.paid_amount)
                  const statusKey = (inv.status || '').toLowerCase()
                  const StatusIcon = STATUS_ICONS[statusKey] || FileText
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-700 text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {inv.student_name || (inv.student?.first_name ? `${inv.student.first_name} ${inv.student.last_name}` : inv.student_id?.slice(0, 8))}
                      </td>
                      <td className="px-4 py-3 text-gray-700">₹{(inv.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td className={`px-4 py-3 font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ₹{balanceDue.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[statusKey] || 'bg-gray-100 text-gray-600'}`}>
                          <StatusIcon size={10} />
                          {statusKey}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => generateReceipt.mutate(inv)}
                          disabled={generateReceipt.isPending}
                          title="Generate / View Receipt"
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition font-medium disabled:opacity-40"
                        >
                          {generateReceipt.isPending ? <Loader2 size={11} className="animate-spin" /> : <Receipt size={11} />}
                          Receipt
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {balanceDue > 0 && (
                          <button onClick={() => setPaymentInvoice(inv)}
                            className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium">
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </>)}
    </div>
  )
}
