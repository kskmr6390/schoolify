'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { User, Mail, Phone, Lock, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saved, setSaved] = useState(false)

  const changePassword = useMutation({
    mutationFn: () => api.post('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
    onSuccess: () => { setSaved(true); setCurrentPassword(''); setNewPassword('') },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.first_name} {user?.last_name}</h2>
            <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Mail size={16} className="text-gray-400" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <User size={16} className="text-gray-400" />
            <span>Tenant ID: {user?.tenant_id}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={16} /> Change Password
        </h3>
        {saved && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">Password changed successfully.</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={() => changePassword.mutate()} disabled={changePassword.isPending || !currentPassword || !newPassword}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {changePassword.isPending && <Loader2 className="animate-spin" size={16} />}
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}
