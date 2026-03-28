'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Bell, Bot, BookOpen, Briefcase, CalendarDays, ClipboardCheck, CreditCard,
  FileText, GraduationCap, IndianRupee, LayoutDashboard, LogOut,
  Megaphone, MessageCircle, Plus, ScrollText, Settings, ShieldCheck, UserCog, Users, X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useDashboardStore } from '../../store/dashboardStore'
import { useChatWidgetStore } from '../../store/chatWidgetStore'
import { cn } from '../../lib/utils'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  badge?: number
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',      icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Feed',           icon: Megaphone,       href: '/feed' },
  { label: 'Students',       icon: Users,           href: '/students' },
  { label: 'Teachers',       icon: GraduationCap,   href: '/teachers' },
  { label: 'Staff',          icon: UserCog,         href: '/staff' },
  { label: 'Classes',        icon: BookOpen,        href: '/classes' },
  { label: 'Attendance',     icon: ClipboardCheck,  href: '/attendance' },
  { label: 'Holidays',       icon: CalendarDays,    href: '/holidays' },
  { label: 'Fee Structure',  icon: IndianRupee,     href: '/fee-structure' },
  { label: 'Fees',           icon: CreditCard,      href: '/fees' },
  { label: 'HR',             icon: Briefcase,       href: '/hr' },
  { label: 'Exams',          icon: FileText,        href: '/exams' },
  { label: 'Reports',        icon: BarChart3,       href: '/reports' },
  { label: 'Compliance',     icon: ShieldCheck,     href: '/compliance' },
  { label: 'Notifications',  icon: Bell,            href: '/notifications' },
  { label: 'AI Copilot',     icon: Bot,             href: '/ai-copilot' },
  { label: 'Activity Logs',  icon: ScrollText,      href: '/activity-logs' },
  { label: 'Roles',          icon: ShieldCheck,     href: '/roles' },
  { label: 'Settings',       icon: Settings,        href: '/settings' },
]

const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard',     icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Feed',          icon: Megaphone,       href: '/feed' },
  { label: 'My Classes',    icon: BookOpen,        href: '/classes' },
  { label: 'Students',      icon: Users,           href: '/students' },
  { label: 'Attendance',    icon: ClipboardCheck,  href: '/attendance' },
  { label: 'Assignments',   icon: FileText,        href: '/assignments' },
  { label: 'Exams',         icon: FileText,        href: '/exams' },
  { label: 'Notifications', icon: Bell,            href: '/notifications' },
  { label: 'AI Copilot',    icon: Bot,             href: '/ai-copilot' },
]

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard',     icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Feed',          icon: Megaphone,       href: '/feed' },
  { label: 'Timetable',     icon: BookOpen,        href: '/timetable' },
  { label: 'Assignments',   icon: FileText,        href: '/assignments' },
  { label: 'Results',       icon: BarChart3,       href: '/results' },
  { label: 'Attendance',    icon: ClipboardCheck,  href: '/attendance' },
  { label: 'Fees',          icon: CreditCard,      href: '/fees' },
  { label: 'Notifications', icon: Bell,            href: '/notifications' },
]

const PARENT_NAV: NavItem[] = [
  { label: 'Dashboard',      icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Feed',           icon: Megaphone,       href: '/feed' },
  { label: "Child's Progress", icon: BarChart3,     href: '/progress' },
  { label: 'Attendance',     icon: ClipboardCheck,  href: '/attendance' },
  { label: 'Results',        icon: FileText,        href: '/results' },
  { label: 'Fees',           icon: CreditCard,      href: '/fees' },
  { label: 'Notifications',  icon: Bell,            href: '/notifications' },
]

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: ADMIN_NAV,
  super_admin: ADMIN_NAV,
  teacher: TEACHER_NAV,
  student: STUDENT_NAV,
  parent: PARENT_NAV,
}

// Roles that can use chat (not students/parents)
const CHAT_ROLES = new Set(['admin', 'super_admin', 'teacher', 'staff'])

// Palette for custom dashboard dot indicators
const DOT_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-teal-500', 'bg-pink-500',
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, tenant, logout } = useAuthStore()
  const { getTenantDashboards } = useDashboardStore()
  const { isOpen: chatOpen, toggle: toggleChat } = useChatWidgetStore()

  const navItems = NAV_BY_ROLE[user?.role || 'student'] || STUDENT_NAV
  const tenantId = tenant?.tenant_id ?? ''
  const customDashboards = tenantId ? getTenantDashboards(tenantId) : []
  const canChat = CHAT_ROLES.has(user?.role ?? '')

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 flex flex-col transition-transform duration-300",
        "lg:translate-x-0 lg:static lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt="School Logo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {tenant?.name || 'Schoolify'}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {/* Main nav items */}
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon size={18} className={isActive ? "text-indigo-600" : "text-gray-400"} />
                {item.label}
                {item.badge ? (
                  <span className="ml-auto bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}

          {/* Chat button — triggers floating widget */}
          {canChat && (
            <button
              onClick={() => { toggleChat(); onClose() }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                chatOpen
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <MessageCircle size={18} className={chatOpen ? "text-indigo-600" : "text-gray-400"} />
              Chat
              {chatOpen && (
                <span className="ml-auto text-[10px] text-indigo-500 font-medium">Open</span>
              )}
            </button>
          )}

          {/* Custom Dashboards Section */}
          <div className="pt-3 mt-2 border-t border-gray-100">
            <div className="flex items-center justify-between px-3 mb-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                My Dashboards
              </p>
              <Link
                href="/dashboards"
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Manage dashboards"
              >
                <Plus size={13} className="text-gray-400 hover:text-indigo-600" />
              </Link>
            </div>

            {customDashboards.length === 0 ? (
              <Link
                href="/dashboards"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors border border-dashed border-gray-200"
              >
                <Plus size={13} />
                Create a dashboard
              </Link>
            ) : (
              <div className="space-y-0.5">
                {customDashboards.map((d, idx) => {
                  const isActive = pathname.startsWith(`/dashboards/${d.id}`)
                  return (
                    <Link
                      key={d.id}
                      href={`/dashboards/${d.id}`}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[idx % DOT_COLORS.length]}`} />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{d.widgets.length}</span>
                    </Link>
                  )
                })}

                <Link
                  href="/dashboards"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <Plus size={12} />
                  New dashboard
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 text-sm font-semibold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
