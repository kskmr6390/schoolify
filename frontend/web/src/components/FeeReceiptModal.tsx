'use client'

import { useRef } from 'react'
import { X, Printer, Download } from 'lucide-react'

export type ReceiptTemplate = 'classic' | 'modern' | 'minimal'

export interface ReceiptInvoiceItem {
  description: string
  amount: number
  quantity: number
}

export interface ReceiptInvoice {
  id: string
  invoice_number: string
  issued_date: string
  due_date: string
  items: ReceiptInvoiceItem[]
  total_amount: number
  paid_amount: number
  discount_amount?: number
  late_fee?: number
  notes?: string
}

export interface FeeReceiptData {
  receipt_number: string
  template: ReceiptTemplate
  is_clubbed: boolean
  total_amount: number
  paid_amount: number
  notes?: string
  created_at: string
  invoices: ReceiptInvoice[]
  student: {
    name: string
    student_code: string
    class_name?: string
    roll_number?: string
  }
  school: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo?: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Template: Classic ─────────────────────────────────────────────────────────

function ClassicTemplate({ data }: { data: FeeReceiptData }) {
  const balance = data.total_amount - data.paid_amount
  const allItems = data.invoices.flatMap(inv =>
    inv.items.map(item => ({ ...item, invoice_number: inv.invoice_number }))
  )

  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', background: '#fff', padding: '40px', minWidth: '600px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '3px double #333', paddingBottom: '16px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {data.school.name}
        </h1>
        {data.school.address && (
          <p style={{ fontSize: '12px', margin: '2px 0', color: '#555' }}>{data.school.address}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '4px' }}>
          {data.school.phone && <span style={{ fontSize: '11px', color: '#666' }}>Tel: {data.school.phone}</span>}
          {data.school.email && <span style={{ fontSize: '11px', color: '#666' }}>Email: {data.school.email}</span>}
        </div>
        <h2 style={{ fontSize: '16px', letterSpacing: '4px', marginTop: '12px', color: '#333', textTransform: 'uppercase' }}>
          Fee Receipt
        </h2>
      </div>

      {/* Receipt meta + Student info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px' }}>
        <div>
          <p style={{ margin: '3px 0' }}><strong>Receipt No:</strong> {data.receipt_number}</p>
          <p style={{ margin: '3px 0' }}><strong>Date:</strong> {fmtDate(data.created_at)}</p>
          {data.invoices.length === 1 && (
            <p style={{ margin: '3px 0' }}><strong>Invoice #:</strong> {data.invoices[0].invoice_number}</p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '3px 0' }}><strong>Student:</strong> {data.student.name}</p>
          <p style={{ margin: '3px 0' }}><strong>Code:</strong> {data.student.student_code}</p>
          {data.student.class_name && <p style={{ margin: '3px 0' }}><strong>Class:</strong> {data.student.class_name}</p>}
          {data.student.roll_number && <p style={{ margin: '3px 0' }}><strong>Roll No:</strong> {data.student.roll_number}</p>}
        </div>
      </div>

      {/* Clubbed invoice ref */}
      {data.is_clubbed && (
        <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', padding: '8px 12px', marginBottom: '16px', fontSize: '12px' }}>
          <strong>Clubbed Receipt</strong> — Covers invoices:{' '}
          {data.invoices.map(inv => inv.invoice_number).join(', ')}
        </div>
      )}

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
        <thead>
          <tr style={{ background: '#333', color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Description</th>
            {data.is_clubbed && <th style={{ padding: '8px 10px', textAlign: 'left' }}>Invoice</th>}
            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '7px 10px' }}>{item.description}</td>
              {data.is_clubbed && <td style={{ padding: '7px 10px', color: '#666', fontSize: '11px' }}>{item.invoice_number}</td>}
              <td style={{ padding: '7px 10px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmt(item.amount * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <table style={{ fontSize: '13px', minWidth: '240px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 10px', color: '#555' }}>Subtotal</td>
              <td style={{ padding: '4px 10px', textAlign: 'right' }}>{fmt(data.total_amount)}</td>
            </tr>
            {data.invoices.some(i => (i.discount_amount || 0) > 0) && (
              <tr>
                <td style={{ padding: '4px 10px', color: '#555' }}>Discount</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', color: '#16a34a' }}>
                  -{fmt(data.invoices.reduce((s, i) => s + (i.discount_amount || 0), 0))}
                </td>
              </tr>
            )}
            {data.invoices.some(i => (i.late_fee || 0) > 0) && (
              <tr>
                <td style={{ padding: '4px 10px', color: '#555' }}>Late Fee</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', color: '#dc2626' }}>
                  +{fmt(data.invoices.reduce((s, i) => s + (i.late_fee || 0), 0))}
                </td>
              </tr>
            )}
            <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold' }}>
              <td style={{ padding: '6px 10px' }}>Total</td>
              <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(data.total_amount)}</td>
            </tr>
            <tr style={{ color: '#16a34a' }}>
              <td style={{ padding: '4px 10px' }}>Amount Paid</td>
              <td style={{ padding: '4px 10px', textAlign: 'right' }}>{fmt(data.paid_amount)}</td>
            </tr>
            {balance > 0 && (
              <tr style={{ color: '#dc2626', fontWeight: 'bold' }}>
                <td style={{ padding: '4px 10px' }}>Balance Due</td>
                <td style={{ padding: '4px 10px', textAlign: 'right' }}>{fmt(balance)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {data.notes && (
        <p style={{ fontSize: '12px', color: '#666', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
          <strong>Note:</strong> {data.notes}
        </p>
      )}

      {/* Footer */}
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', borderTop: '1px solid #ccc', paddingTop: '12px' }}>
        <span>This is a computer-generated receipt.</span>
        <span>Authorized Signature: _______________</span>
      </div>
    </div>
  )
}

// ── Template: Modern ──────────────────────────────────────────────────────────

function ModernTemplate({ data }: { data: FeeReceiptData }) {
  const balance = data.total_amount - data.paid_amount
  const allItems = data.invoices.flatMap(inv =>
    inv.items.map(item => ({ ...item, invoice_number: inv.invoice_number }))
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#fff', minWidth: '600px', overflow: 'hidden', borderRadius: '12px' }}>
      {/* Gradient header */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '32px 36px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>{data.school.name}</h1>
            {data.school.address && <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>{data.school.address}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 14px', display: 'inline-block' }}>
              <p style={{ margin: '0 0 2px', fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Receipt No</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', fontFamily: 'monospace' }}>{data.receipt_number}</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '32px' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Student</p>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{data.student.name}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Code</p>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', fontFamily: 'monospace' }}>{data.student.student_code}</p>
          </div>
          {data.student.class_name && (
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Class</p>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{data.student.class_name}</p>
            </div>
          )}
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Date</p>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{fmtDate(data.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '28px 36px' }}>
        {data.is_clubbed && (
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#4338ca' }}>
            <strong>Clubbed Receipt</strong> — Covers: {data.invoices.map(i => i.invoice_number).join(', ')}
          </div>
        )}

        {/* Items */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: data.is_clubbed ? '1fr auto auto auto' : '1fr auto auto', gap: '0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px 8px 0 0', borderBottom: '1px solid #e5e7eb' }}>
            <span>Description</span>
            {data.is_clubbed && <span style={{ textAlign: 'left', paddingLeft: '16px' }}>Invoice</span>}
            <span style={{ textAlign: 'center', paddingLeft: '16px' }}>Qty</span>
            <span style={{ textAlign: 'right', paddingLeft: '16px' }}>Amount</span>
          </div>
          {allItems.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: data.is_clubbed ? '1fr auto auto auto' : '1fr auto auto', gap: '0', fontSize: '13px', padding: '10px 12px', borderBottom: '1px solid #f3f4f6', background: '#fff', alignItems: 'center' }}>
              <span style={{ color: '#111827', fontWeight: '500' }}>{item.description}</span>
              {data.is_clubbed && <span style={{ color: '#9ca3af', fontSize: '11px', paddingLeft: '16px' }}>{item.invoice_number}</span>}
              <span style={{ textAlign: 'center', color: '#6b7280', paddingLeft: '16px' }}>{item.quantity}</span>
              <span style={{ textAlign: 'right', fontWeight: '600', color: '#111827', paddingLeft: '16px' }}>{fmt(item.amount * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Billed</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#111827' }}>{fmt(data.total_amount)}</p>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paid</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#16a34a' }}>{fmt(data.paid_amount)}</p>
          </div>
          <div style={{ background: balance > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: balance > 0 ? '#dc2626' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: balance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(balance)}</p>
          </div>
        </div>

        {data.notes && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#92400e', marginBottom: '20px' }}>
            <strong>Note:</strong> {data.notes}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
          <span>Computer generated receipt · {data.school.name}</span>
          <span>Authorized Signature: _______________</span>
        </div>
      </div>
    </div>
  )
}

// ── Template: Minimal ─────────────────────────────────────────────────────────

function MinimalTemplate({ data }: { data: FeeReceiptData }) {
  const balance = data.total_amount - data.paid_amount
  const allItems = data.invoices.flatMap(inv =>
    inv.items.map(item => ({ ...item, invoice_number: inv.invoice_number }))
  )

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#fff', minWidth: '600px', padding: '48px' }}>
      {/* Minimal header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>{data.school.name}</h1>
          {data.school.address && <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{data.school.address}</p>}
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Receipt</p>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{data.receipt_number}</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '2px', background: '#0f172a', marginBottom: '32px' }} />

      {/* Student + date row */}
      <div style={{ display: 'flex', gap: '40px', marginBottom: '32px', fontSize: '13px' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Billed To</p>
          <p style={{ margin: '0 0 1px', fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>{data.student.name}</p>
          <p style={{ margin: 0, color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{data.student.student_code}</p>
          {data.student.class_name && <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>{data.student.class_name}</p>}
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Issue Date</p>
          <p style={{ margin: 0, fontWeight: '500', color: '#0f172a' }}>{fmtDate(data.created_at)}</p>
        </div>
        {data.invoices.length === 1 && (
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Invoice Ref</p>
            <p style={{ margin: 0, fontWeight: '500', color: '#0f172a', fontFamily: 'monospace' }}>{data.invoices[0].invoice_number}</p>
          </div>
        )}
      </div>

      {data.is_clubbed && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', marginBottom: '24px', fontSize: '12px', color: '#475569' }}>
          Clubbed receipt covering: {data.invoices.map(i => i.invoice_number).join(' · ')}
        </div>
      )}

      {/* Items */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 0 8px', borderBottom: '1px solid #e2e8f0', marginBottom: '4px' }}>
          <span style={{ flex: 1 }}>Item</span>
          {data.is_clubbed && <span style={{ width: '100px' }}>Invoice</span>}
          <span style={{ width: '40px', textAlign: 'center' }}>Qty</span>
          <span style={{ width: '90px', textAlign: 'right' }}>Amount</span>
        </div>
        {allItems.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '10px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
            <span style={{ flex: 1, color: '#0f172a', fontWeight: '500' }}>{item.description}</span>
            {data.is_clubbed && <span style={{ width: '100px', color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>{item.invoice_number}</span>}
            <span style={{ width: '40px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</span>
            <span style={{ width: '90px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>{fmt(item.amount * item.quantity)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
        <div style={{ minWidth: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', color: '#64748b' }}>
            <span>Total</span><span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.total_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', color: '#16a34a' }}>
            <span>Paid</span><span style={{ fontWeight: '600' }}>{fmt(data.paid_amount)}</span>
          </div>
          <div style={{ height: '1px', background: '#0f172a', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700', color: balance > 0 ? '#dc2626' : '#16a34a' }}>
            <span>Balance Due</span><span>{fmt(balance)}</span>
          </div>
        </div>
      </div>

      {data.notes && (
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>
          <span style={{ fontWeight: '600' }}>Note — </span>{data.notes}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
        <span>Computer generated · not a payment demand</span>
        <span>Signature _______________</span>
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface FeeReceiptModalProps {
  data: FeeReceiptData
  onClose: () => void
}

export default function FeeReceiptModal({ data, onClose }: FeeReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank', 'width=800,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt ${data.receipt_number}</title>
      <style>body{margin:0;padding:0;background:#fff}@page{margin:15mm}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
      </head><body>${content}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const TemplateComponent =
    data.template === 'modern' ? ModernTemplate :
    data.template === 'minimal' ? MinimalTemplate :
    ClassicTemplate

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Fee Receipt</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{data.receipt_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition"
            >
              <Printer size={13} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" ref={printRef}>
            <TemplateComponent data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
