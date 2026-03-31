'use client'

import { useAuthStore } from '../../../store/authStore'
import { AdminDashboard } from '../../../components/dashboard/AdminDashboard'
import { TeacherDashboard } from '../../../components/dashboard/TeacherDashboard'
import { StudentDashboard } from '../../../components/dashboard/StudentDashboard'
import { ParentDashboard } from '../../../components/dashboard/ParentDashboard'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const title: Record<string, string> = {
    admin: 'School Dashboard',
    super_admin: 'Platform Dashboard',
    teacher: 'Teacher Dashboard',
    student: 'My Dashboard',
    parent: 'Parent Dashboard',
  }

  const subtitle: Record<string, string> = {
    admin: "Here's your school overview for today.",
    super_admin: "Platform-wide analytics and overview.",
    teacher: "Your classes, students, and today's schedule.",
    student: "Your attendance, assignments, and updates.",
    parent: "Stay updated on your child's progress.",
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {title[user?.role || 'student']}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {user?.first_name}! {subtitle[user?.role || 'student']}
        </p>
      </div>

      {(user?.role === 'admin' || user?.role === 'super_admin') && <AdminDashboard />}
      {user?.role === 'teacher' && <TeacherDashboard />}
      {user?.role === 'student' && <StudentDashboard />}
      {user?.role === 'parent' && <ParentDashboard />}
    </div>
  )
}
