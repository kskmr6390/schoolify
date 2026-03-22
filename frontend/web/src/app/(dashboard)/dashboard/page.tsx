'use client'

import { useAuthStore } from '../../../store/authStore'
import { AdminDashboard } from '../../../components/dashboard/AdminDashboard'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const title: Record<string, string> = {
    admin: 'School Dashboard',
    super_admin: 'Platform Dashboard',
    teacher: 'Teacher Dashboard',
    student: 'My Dashboard',
    parent: 'Parent Dashboard',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {title[user?.role || 'student']}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {user?.first_name}! Here's what's happening today.
        </p>
      </div>

      {/* Render role-specific dashboard */}
      {(user?.role === 'admin' || user?.role === 'super_admin') && <AdminDashboard />}
      {user?.role === 'teacher' && (
        <div className="text-gray-500">Teacher dashboard coming soon...</div>
      )}
      {user?.role === 'student' && (
        <div className="text-gray-500">Student dashboard coming soon...</div>
      )}
      {user?.role === 'parent' && (
        <div className="text-gray-500">Parent dashboard coming soon...</div>
      )}
    </div>
  )
}
