'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bot, BookOpen, Users, CalendarCheck, GraduationCap, Bell,
  Check, Menu, X, ArrowRight, Shield, BarChart3, Clock,
  Zap, Mail, ChevronRight, Star, Building2, Brain,
  TrendingUp, FileText, CreditCard, MessageSquare,
} from 'lucide-react'

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Schoolify</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Features', href: '#features' },
              { label: 'AI Copilot', href: '#ai' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Contact', href: '#contact' },
            ].map(item => (
              <a key={item.label} href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/register"
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors">
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {['Features', 'AI Copilot', 'Pricing', 'Contact'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
              onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 py-2">
              {item}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <Link href="/login" className="text-center text-sm font-medium text-gray-700 py-2.5 border border-gray-300 rounded-lg">Sign in</Link>
            <Link href="/register" className="text-center text-sm font-semibold bg-indigo-600 text-white py-2.5 rounded-lg">Get Started Free</Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-white">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-indigo-50/80 via-violet-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-32 right-0 w-72 h-72 bg-indigo-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/60 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
              </span>
              AI-Powered School Management
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
              Run your school{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                smarter
              </span>{' '}
              with AI
            </h1>

            <p className="mt-6 text-lg text-gray-500 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Schoolify brings attendance, grades, fees, communication, and an AI copilot into one elegant platform — so administrators and teachers can focus on what matters.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/register"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300">
                Start for free
                <ArrowRight size={16} />
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-6 py-3.5 rounded-xl border border-gray-200 transition-colors">
                Sign in to your school
              </Link>
            </div>

            {/* Trust row */}
            <div className="mt-10 flex flex-wrap items-center gap-5 justify-center lg:justify-start">
              {[
                { icon: Shield, label: 'Multi-tenant secure' },
                { icon: Zap,    label: 'Setup in minutes' },
                { icon: Clock,  label: 'Free to get started' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Icon size={14} className="text-indigo-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard preview */}
          <div className="relative lg:block">
            <DashboardMockup />
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { value: '500+', label: 'Schools onboarded' },
            { value: '1.2M+', label: 'Students managed' },
            { value: '7',     label: 'AI providers supported' },
            { value: '99.9%', label: 'Uptime SLA' },
          ].map(s => (
            <div key={s.label} className="text-center lg:text-left">
              <div className="text-3xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-3xl blur-2xl" />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Browser bar */}
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="ml-3 flex-1 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400 font-mono">
            app.schoolify.tech/feed
          </div>
        </div>

        {/* App chrome */}
        <div className="flex h-72">
          {/* Sidebar */}
          <div className="w-14 bg-indigo-600 flex flex-col items-center py-4 gap-4">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <GraduationCap size={14} className="text-white" />
            </div>
            {[BookOpen, Users, CalendarCheck, BarChart3, Bot].map((Icon, i) => (
              <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                <Icon size={13} className="text-white/80" />
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="h-2.5 w-28 bg-gray-800 rounded-full" />
                <div className="h-2 w-20 bg-gray-300 rounded-full mt-1.5" />
              </div>
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Bell size={12} className="text-indigo-600" />
                </div>
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">SA</div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Students', value: '1,284', color: 'indigo' },
                { label: 'Attendance', value: '94.2%', color: 'emerald' },
                { label: 'Fee Due', value: '₹2.4L', color: 'amber' },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-lg p-2.5 border border-gray-100">
                  <div className="text-[10px] text-gray-400">{c.label}</div>
                  <div className={`text-sm font-bold text-${c.color}-600 mt-0.5`}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Attendance chart stub */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-[10px] font-medium text-gray-500 mb-2">Weekly Attendance</div>
              <div className="flex items-end gap-1.5 h-10">
                {[65, 80, 72, 90, 85, 78, 92].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-500 rounded-sm opacity-80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            {/* AI bar */}
            <div className="mt-3 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg p-2.5 flex items-center gap-2">
              <Bot size={12} className="text-white flex-shrink-0" />
              <div className="text-[10px] text-white/90 flex-1 truncate">AI Copilot: "3 students have &lt;75% attendance this week…"</div>
              <div className="text-[10px] text-white/60 font-medium">Ask →</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute -right-6 top-10 bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex items-center gap-2.5 w-48">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <TrendingUp size={14} className="text-emerald-600" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-gray-800">Attendance Up</div>
          <div className="text-[10px] text-gray-400">+4.2% this week</div>
        </div>
      </div>

      <div className="absolute -left-6 bottom-16 bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex items-center gap-2.5 w-44">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Brain size={14} className="text-indigo-600" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-gray-800">AI Insight</div>
          <div className="text-[10px] text-gray-400">Ready to assist</div>
        </div>
      </div>
    </div>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Bot,
    color: 'indigo',
    title: 'AI Copilot',
    desc: 'Ask anything about your school data. Get instant insights on attendance, grades, fees, and more — powered by your choice of AI model.',
  },
  {
    icon: CalendarCheck,
    color: 'emerald',
    title: 'Smart Attendance',
    desc: 'Mark attendance in seconds with bulk actions, calendar views, and automated reports. Get alerts for chronic absentees.',
  },
  {
    icon: Users,
    color: 'violet',
    title: 'Student Management',
    desc: 'Complete student profiles, enrollment, document storage, parent linking, and academic history in one place.',
  },
  {
    icon: BarChart3,
    color: 'amber',
    title: 'Exam & Grades',
    desc: 'Create exams, record marks, auto-calculate grades, and generate report cards for students and parents.',
  },
  {
    icon: CreditCard,
    color: 'rose',
    title: 'Fee Management',
    desc: 'Track fee collection, generate invoices, manage dues, and get financial summaries at a glance.',
  },
  {
    icon: Bell,
    color: 'sky',
    title: 'Notifications',
    desc: 'Keep parents, teachers, and staff informed with smart notifications for attendance, results, and announcements.',
  },
]

function Features() {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  }

  return (
    <section id="features" className="py-24 bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">
            Everything you need
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            One platform for your entire school
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            From daily attendance to AI-powered insights — Schoolify handles it all so you can focus on education.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className={`w-11 h-11 rounded-xl ${colorMap[f.color]} flex items-center justify-center mb-4`}>
                <f.icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── AI Spotlight ─────────────────────────────────────────────────────────────
function AISpotlight() {
  const capabilities = [
    'Ask "Which students are at risk this semester?"',
    'Get instant attendance summaries for any class',
    'Analyze fee collection trends and predict shortfalls',
    'Generate parent-ready progress reports in seconds',
    'Works with OpenAI, Claude, Gemini, Mistral, Groq & more',
    'Your data stays private — RAG runs per school tenant',
  ]

  return (
    <section id="ai" className="py-24 bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.08),transparent_60%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-indigo-300 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
              <Bot size={12} />
              AI Copilot — Powered by RAG
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Your school's data,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300">
                finally speaking to you
              </span>
            </h2>
            <p className="mt-5 text-indigo-200 text-lg leading-relaxed">
              Schoolify's AI Copilot uses Retrieval-Augmented Generation to answer questions about your real school data — not generic answers, but insights specific to your students, classes, and history.
            </p>

            <ul className="mt-8 space-y-3">
              {capabilities.map(cap => (
                <li key={cap} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={11} className="text-indigo-300" />
                  </div>
                  <span className="text-indigo-100 text-sm">{cap}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex gap-3">
              <Link href="/register"
                className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-indigo-50 transition-colors">
                Try AI Copilot free
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Right — chat mockup */}
          <div className="relative">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
              {/* Chat header */}
              <div className="border-b border-white/10 px-5 py-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">AI Copilot</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-xs text-indigo-300">Connected to your school data</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">A</div>
                  <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-indigo-100 max-w-xs">
                    Which classes have attendance below 80% this month?
                  </div>
                </div>
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={13} className="text-white" />
                  </div>
                  <div className="bg-indigo-600/50 border border-indigo-500/30 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white max-w-xs">
                    <p className="font-medium mb-2">3 classes found with low attendance:</p>
                    <ul className="space-y-1 text-indigo-200 text-xs">
                      <li>• Grade 8-B — 74.2% (12 absences)</li>
                      <li>• Grade 6-A — 77.8% (8 absences)</li>
                      <li>• Grade 10-C — 79.1% (6 absences)</li>
                    </ul>
                    <p className="mt-2 text-indigo-300 text-xs">Would you like me to draft parent notification letters?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">A</div>
                  <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-indigo-100 max-w-xs">
                    Yes, draft letters for Grade 8-B parents.
                  </div>
                </div>
                {/* Typing indicator */}
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={13} className="text-white" />
                  </div>
                  <div className="bg-indigo-600/50 border border-indigo-500/30 rounded-2xl rounded-tr-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="border-t border-white/10 p-4">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="text-sm text-indigo-400 flex-1">Ask anything about your school…</span>
                  <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <ChevronRight size={14} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: Building2,
      title: 'Register your school',
      desc: 'Create your school account in minutes. Pick a school code and invite your team — no credit card needed.',
    },
    {
      num: '02',
      icon: Users,
      title: 'Add students & staff',
      desc: 'Import or manually add students, teachers, and staff. Assign classes, roles, and parents in one go.',
    },
    {
      num: '03',
      icon: Brain,
      title: 'Let AI do the heavy lifting',
      desc: 'Connect your preferred AI model, index your school data, and start asking questions in plain English.',
    },
  ]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Simple setup</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Get running in 3 steps</h2>
          <p className="mt-4 text-gray-500 text-lg">No IT team required. Schoolify is built to be up and running on day one.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-14 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-200" />

          {steps.map((step, i) => (
            <div key={step.num} className="relative text-center lg:text-left">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <step.icon size={24} className="text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-indigo-600 rounded-full text-[10px] font-bold text-indigo-600 flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-400 tracking-widest mb-1">{step.num}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'Priya Mehta',
    role: 'Principal, Delhi Public School',
    avatar: 'PM',
    color: 'indigo',
    quote: 'Schoolify transformed how we manage 2,000 students. The AI copilot answers questions in seconds that used to take my staff an entire morning.',
    stars: 5,
  },
  {
    name: 'Rajesh Kumar',
    role: 'Admin Head, Sunrise Academy',
    avatar: 'RK',
    color: 'emerald',
    quote: 'Attendance tracking used to be chaos. Now teachers mark in 30 seconds and parents get notified automatically. It just works.',
    stars: 5,
  },
  {
    name: 'Anita Sharma',
    role: 'Teacher, Greenwood International',
    avatar: 'AS',
    color: 'violet',
    quote: 'The fee management and report card features alone saved us weeks of manual work every term. Highly recommend to any school.',
    stars: 5,
  },
]

function Testimonials() {
  return (
    <section className="py-24 bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Loved by educators</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Schools that run on Schoolify
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name}
              className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-md transition-shadow">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 text-sm leading-relaxed mb-6">
                "{t.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-${t.color}-100 text-${t.color}-700 text-sm font-bold flex items-center justify-center`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    desc: 'Perfect for small schools just getting started.',
    cta: 'Get started free',
    ctaLink: '/register',
    featured: false,
    features: [
      'Up to 200 students',
      'Attendance tracking',
      'Basic class management',
      'Student profiles',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: '₹2,999',
    period: '/month',
    desc: 'Everything a growing school needs, including AI.',
    cta: 'Start free trial',
    ctaLink: '/register',
    featured: true,
    features: [
      'Unlimited students',
      'AI Copilot (all providers)',
      'Fee management',
      'Exam & grade reports',
      'Parent notifications',
      'Advanced analytics',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large institutions with custom needs.',
    cta: 'Contact us',
    ctaLink: 'mailto:satyam@schoolify.tech',
    featured: false,
    features: [
      'Everything in Pro',
      'Multiple campuses',
      'Custom integrations',
      'Dedicated onboarding',
      'SLA guarantee',
      'On-premise deployment',
    ],
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Pricing</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-gray-500 text-lg">Start free. Scale as your school grows. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map(plan => (
            <div key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.featured
                  ? 'bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-200 scale-105'
                  : 'bg-white border-gray-200 hover:shadow-md'
              } transition-all`}>
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className={`text-sm font-semibold mb-1 ${plan.featured ? 'text-indigo-200' : 'text-indigo-600'}`}>
                {plan.name}
              </div>
              <div className={`flex items-end gap-1 mb-2 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                <span className="text-4xl font-extrabold">{plan.price}</span>
                {plan.period && <span className={`text-sm mb-1.5 ${plan.featured ? 'text-indigo-200' : 'text-gray-400'}`}>{plan.period}</span>}
              </div>
              <p className={`text-sm mb-6 ${plan.featured ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.desc}</p>

              <Link href={plan.ctaLink}
                className={`block text-center text-sm font-semibold py-3 px-5 rounded-xl transition-colors mb-6 ${
                  plan.featured
                    ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}>
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check size={15} className={plan.featured ? 'text-indigo-300 flex-shrink-0' : 'text-indigo-600 flex-shrink-0'} />
                    <span className={plan.featured ? 'text-indigo-100' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Ready to transform your school?
        </h2>
        <p className="mt-5 text-indigo-200 text-lg">
          Join hundreds of schools already using Schoolify. Free to start, no credit card required.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register"
            className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors text-sm">
            Create your school free
            <ArrowRight size={16} />
          </Link>
          <a href="mailto:satyam@schoolify.tech"
            className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-colors text-sm">
            <Mail size={16} />
            Talk to us
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer id="contact" className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <GraduationCap size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">Schoolify</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              AI-Powered School Management. Built for administrators, teachers, and parents who want less admin and more impact.
            </p>
            <a href="mailto:satyam@schoolify.tech"
              className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              <Mail size={14} />
              satyam@schoolify.tech
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              {['Features', 'AI Copilot', 'Pricing', 'Changelog'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* School */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">School</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Register School', href: '/register' },
                { label: 'Sign In', href: '/login' },
                { label: 'Documentation', href: '#' },
                { label: 'API Reference', href: '#' },
              ].map(l => (
                <li key={l.label}><Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="mailto:satyam@schoolify.tech" className="hover:text-white transition-colors">
                  satyam@schoolify.tech
                </a>
              </li>
              {['Help Center', 'Privacy Policy', 'Terms of Service', 'Status'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} Schoolify. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield size={13} className="text-gray-500" />
            SOC2-ready · GDPR-compliant · Data encrypted at rest
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <AISpotlight />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  )
}
