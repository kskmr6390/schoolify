import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  present: 'text-green-700 bg-green-50 border-green-200',
  absent: 'text-red-700 bg-red-50 border-red-200',
  late: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  excused: 'text-blue-700 bg-blue-50 border-blue-200',
}

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: 'text-green-700 bg-green-50',
  pending: 'text-yellow-700 bg-yellow-50',
  overdue: 'text-red-700 bg-red-50',
  partial: 'text-blue-700 bg-blue-50',
  draft: 'text-gray-700 bg-gray-50',
  cancelled: 'text-gray-500 bg-gray-50',
}
