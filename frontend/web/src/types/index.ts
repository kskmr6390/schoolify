/**
 * Shared TypeScript types for the Schoolify frontend.
 */

export interface ApiResponse<T> {
  success: boolean
  data: T
  meta?: Record<string, any>
  errors?: { code: string; message: string; field?: string }[]
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent'

export interface User {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  avatar_url: string | null
  tenant_id: string
  status: string
}

export interface Tenant {
  tenant_id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  favicon_url: string | null
}

// ── Students ──────────────────────────────────────────────────────────────────

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred' | 'suspended'

export interface Student {
  id: string
  tenant_id: string
  student_code: string
  first_name: string
  last_name: string
  dob: string | null
  gender: 'male' | 'female' | 'other' | null
  enrollment_date: string
  class_id: string | null
  roll_number: number | null
  blood_group: string | null
  status: StudentStatus
  profile_photo_url: string | null
}

export interface Class {
  id: string
  name: string
  grade: number
  section: string
  capacity: number
  academic_year_id: string
  class_teacher_id: string | null
}

export interface Subject {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
}

export interface TimetableSlot {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  day_of_week: number
  start_time: string
  end_time: string
  room: string | null
  period_number: number | null
}

// ── Attendance ────────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AttendanceSummary {
  student_id: string
  total_days: number
  present: number
  absent: number
  late: number
  excused: number
  percentage: number
}

// ── Assignments & Exams ───────────────────────────────────────────────────────

export interface Assignment {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  title: string
  description: string | null
  due_date: string
  max_marks: number
  assignment_type: 'homework' | 'project' | 'quiz' | 'classwork'
  is_published: boolean
}

export interface Exam {
  id: string
  class_id: string
  subject_id: string
  name: string
  exam_type: 'unit_test' | 'midterm' | 'final' | 'practical' | 'internal'
  exam_date: string
  max_marks: number
  is_published: boolean
  results_published: boolean
}

export interface ExamResult {
  id: string
  exam_id: string
  student_id: string
  marks_obtained: number
  grade: string | null
  grade_points: number | null
  is_pass: boolean | null
}

// ── Fees ──────────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'refunded'

export interface Invoice {
  id: string
  student_id: string
  invoice_number: string
  total_amount: number
  paid_amount: number
  discount_amount: number
  late_fee: number
  status: InvoiceStatus
  issued_date: string
  due_date: string
  notes: string | null
  items: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  description: string
  amount: number
  quantity: number
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_method: string
  transaction_id: string | null
  status: string
  paid_at: string | null
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  title: string
  body: string
  channel: string
  is_read: boolean
  sent_at: string | null
  metadata: Record<string, any>
}

// ── Dashboard Metrics ─────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  total_students: number
  total_teachers: number
  total_parents: number
  active_classes: number
  attendance_rate_today: number
  fee_collection_this_month: number
  outstanding_fees: number
  upcoming_exams: number
}
