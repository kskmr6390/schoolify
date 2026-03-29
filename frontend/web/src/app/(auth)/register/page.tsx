'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Eye, EyeOff, GraduationCap, Loader2, CheckCircle, ChevronRight, Building2, User } from 'lucide-react'
import api from '../../../lib/api'
import { useAuthStore } from '../../../store/authStore'

// ── Step 1: School details ───────────────────────────────────────────────────
const schoolSchema = z.object({
  school_name: z.string().min(2, 'School name must be at least 2 characters'),
  school_code: z
    .string()
    .min(3, 'School code must be at least 3 characters')
    .max(50, 'School code must be 50 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
    .refine(v => !['www', 'api', 'app', 'admin', 'mail', 'static', 'assets'].includes(v), {
      message: 'This school code is reserved',
    }),
  school_email: z.string().email('Enter a valid email address'),
  school_phone: z.string().optional(),
})

// ── Step 2: Admin account ────────────────────────────────────────────────────
const adminSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type SchoolForm = z.infer<typeof schoolSchema>
type AdminForm = z.infer<typeof adminSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [schoolCode, setSchoolCode] = useState('')

  const schoolForm = useForm<SchoolForm>({ resolver: zodResolver(schoolSchema) })
  const adminForm = useForm<AdminForm>({ resolver: zodResolver(adminSchema) })

  // Auto-generate school code from name
  const handleSchoolNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const code = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!schoolForm.getValues('school_code')) {
      schoolForm.setValue('school_code', code)
    }
  }

  const onSchoolSubmit = async (data: SchoolForm) => {
    setError('')
    setIsLoading(true)
    try {
      await api.post('/api/v1/tenants/register', {
        school_name: data.school_name,
        school_code: data.school_code,
        school_email: data.school_email,
        school_phone: data.school_phone || undefined,
      })
      setSchoolCode(data.school_code)
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Failed to register school')
    } finally {
      setIsLoading(false)
    }
  }

  const onAdminSubmit = async (data: AdminForm) => {
    setError('')
    setIsLoading(true)
    try {
      await api.post('/api/v1/auth/register', {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        role: 'admin',
        tenant_slug: schoolCode,
      })
      // Auto-login after registration and go straight to dashboard
      await login(data.email, data.password, schoolCode)
      router.push('/feed')
    } catch (err: any) {
      const msg = err.message || 'Failed to create admin account'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Schoolify</h1>
          <p className="text-gray-500 mt-1">Register your school</p>
        </div>

        {/* Steps indicator */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {[
              { n: 1, label: 'School Info', icon: Building2 },
              { n: 2, label: 'Admin Account', icon: User },
            ].map(({ n, label, icon: Icon }, i) => (
              <div key={n} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  step === n
                    ? 'bg-indigo-600 text-white shadow-md'
                    : step > n
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon size={14} />
                  <span>{label}</span>
                </div>
                {i === 0 && <ChevronRight size={16} className="text-gray-300" />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">

          {/* ── Step 1: School Info ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">School Information</h2>
              <p className="text-sm text-gray-500 mb-6">Tell us about your school</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={schoolForm.handleSubmit(onSchoolSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                  <input
                    {...schoolForm.register('school_name')}
                    onChange={e => { schoolForm.register('school_name').onChange(e); handleSchoolNameChange(e) }}
                    placeholder="Greenwood High School"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  {schoolForm.formState.errors.school_name && (
                    <p className="mt-1 text-xs text-red-600">{schoolForm.formState.errors.school_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School Code *
                    <span className="ml-2 text-xs text-gray-400 font-normal">Used to log in — cannot be changed later</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">schoolify.com/</span>
                    <input
                      {...schoolForm.register('school_code')}
                      placeholder="greenwood-high"
                      className="w-full pl-[118px] pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-mono"
                    />
                  </div>
                  {schoolForm.formState.errors.school_code && (
                    <p className="mt-1 text-xs text-red-600">{schoolForm.formState.errors.school_code.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Email *</label>
                  <input
                    {...schoolForm.register('school_email')}
                    type="email"
                    placeholder="office@greenwoodhigh.edu"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  {schoolForm.formState.errors.school_email && (
                    <p className="mt-1 text-xs text-red-600">{schoolForm.formState.errors.school_email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    {...schoolForm.register('school_phone')}
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
                >
                  {isLoading && <Loader2 className="animate-spin" size={16} />}
                  {isLoading ? 'Creating school...' : 'Continue'}
                  {!isLoading && <ChevronRight size={16} />}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Admin Account ───────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Create Admin Account</h2>
              <p className="text-sm text-gray-500 mb-6">
                This will be the primary admin for <span className="font-medium text-indigo-600">{schoolCode}</span>
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      {...adminForm.register('first_name')}
                      placeholder="Raj"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    {adminForm.formState.errors.first_name && (
                      <p className="mt-1 text-xs text-red-600">{adminForm.formState.errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      {...adminForm.register('last_name')}
                      placeholder="Sharma"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    {adminForm.formState.errors.last_name && (
                      <p className="mt-1 text-xs text-red-600">{adminForm.formState.errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
                  <input
                    {...adminForm.register('email')}
                    type="email"
                    placeholder="raj@greenwoodhigh.edu"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  {adminForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{adminForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      {...adminForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {adminForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">{adminForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input
                      {...adminForm.register('confirm_password')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {adminForm.formState.errors.confirm_password && (
                    <p className="mt-1 text-xs text-red-600">{adminForm.formState.errors.confirm_password.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setError(''); setStep(1) }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-2 flex-grow flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isLoading && <Loader2 className="animate-spin" size={16} />}
                    {isLoading ? 'Creating account...' : 'Complete Registration'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 3: Success ─────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Registration Complete!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Your school <span className="font-medium text-gray-800">{schoolCode}</span> is ready.
                Sign in with your admin credentials to get started.
              </p>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-1">Your School Code</p>
                <p className="text-indigo-800 font-mono font-semibold text-lg">{schoolCode}</p>
                <p className="text-xs text-indigo-400 mt-1">Use this to log in from any device</p>
              </div>

              <button
                onClick={() => router.push(`/login?school=${schoolCode}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
              >
                Go to Login
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
