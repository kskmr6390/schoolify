'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react'
import api from '../../../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await api.post('/api/v1/auth/forgot-password', { email, tenant_slug: tenantSlug })
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Schoolify</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">We sent a password reset link to <strong>{email}</strong></p>
              <Link href="/login" className="text-indigo-600 hover:underline text-sm font-medium">Back to sign in</Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your school code and email address and we'll send you a reset link.</p>
              {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Code</label>
                  <input value={tenantSlug} onChange={e => setTenantSlug(e.target.value)} placeholder="greenwood-high"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@school.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                  {isLoading && <Loader2 className="animate-spin" size={16} />}
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
