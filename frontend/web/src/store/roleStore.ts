import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ALL_MODULES = [
  { key: 'dashboard',        label: 'Dashboard',              group: 'Core' },
  { key: 'feed',             label: 'Feed & Announcements',   group: 'Core' },
  { key: 'chat',             label: 'Chat & Communication',   group: 'Core' },
  { key: 'notifications',    label: 'Notifications',          group: 'Core' },
  { key: 'students',         label: 'Students',               group: 'People' },
  { key: 'teachers',         label: 'Teachers',               group: 'People' },
  { key: 'staff',            label: 'Staff',                  group: 'People' },
  { key: 'parents',          label: 'Parents',                group: 'People' },
  { key: 'classes',          label: 'Classes',                group: 'Academic' },
  { key: 'attendance',       label: 'Attendance',             group: 'Academic' },
  { key: 'exams',            label: 'Exams & Results',        group: 'Academic' },
  { key: 'assignments',      label: 'Assignments',            group: 'Academic' },
  { key: 'timetable',        label: 'Timetable',              group: 'Academic' },
  { key: 'holidays',         label: 'Holidays',               group: 'Academic' },
  { key: 'fee_structure',    label: 'Fee Structure',          group: 'Finance' },
  { key: 'fees',             label: 'Fees & Invoices',        group: 'Finance' },
  { key: 'hr',               label: 'HR & Payroll',           group: 'Finance' },
  { key: 'reports',          label: 'Reports & Analytics',    group: 'Analytics' },
  { key: 'custom_dashboards',label: 'Custom Dashboards',      group: 'Analytics' },
  { key: 'ai_copilot',       label: 'AI Copilot',             group: 'Analytics' },
  { key: 'compliance',       label: 'Compliance',             group: 'Admin' },
  { key: 'settings',         label: 'Settings',               group: 'Admin' },
  { key: 'roles',            label: 'Roles & Permissions',    group: 'Admin' },
  { key: 'activity_logs',    label: 'Activity Logs',          group: 'Admin' },
]

export interface ModulePermission {
  read:   boolean
  write:  boolean
  delete: boolean
}

export type PermissionMap = Record<string, ModulePermission>

export interface Role {
  id:          string
  tenantId:    string
  name:        string
  description: string
  color:       string
  isSystem:    boolean
  permissions: PermissionMap
  createdAt:   string
  updatedAt:   string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function allPerms(): PermissionMap {
  return ALL_MODULES.reduce((acc, m) => ({
    ...acc, [m.key]: { read: true, write: true, delete: true },
  }), {} as PermissionMap)
}

function readPerms(...keys: string[]): PermissionMap {
  return ALL_MODULES.reduce((acc, m) => ({
    ...acc, [m.key]: { read: keys.includes(m.key), write: false, delete: false },
  }), {} as PermissionMap)
}

function customPerms(rw: string[], ro: string[]): PermissionMap {
  return ALL_MODULES.reduce((acc, m) => {
    if (rw.includes(m.key)) return { ...acc, [m.key]: { read: true, write: true, delete: false } }
    if (ro.includes(m.key)) return { ...acc, [m.key]: { read: true, write: false, delete: false } }
    return { ...acc, [m.key]: { read: false, write: false, delete: false } }
  }, {} as PermissionMap)
}

const SYSTEM_ROLES: Role[] = [
  {
    id: 'role_super_admin', tenantId: '__system__', name: 'Super Admin',
    description: 'Unrestricted access to all modules', color: '#6366f1',
    isSystem: true, permissions: allPerms(),
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_admin', tenantId: '__system__', name: 'Admin',
    description: 'Full school management access', color: '#0ea5e9',
    isSystem: true,
    permissions: ALL_MODULES.reduce((acc, m) => ({
      ...acc,
      [m.key]: {
        read: true,
        write: !['roles'].includes(m.key),
        delete: !['roles','settings','activity_logs'].includes(m.key),
      },
    }), {} as PermissionMap),
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_teacher', tenantId: '__system__', name: 'Teacher',
    description: 'Academic and teaching related modules', color: '#10b981',
    isSystem: true,
    permissions: customPerms(
      ['attendance','exams','assignments','feed','chat','notifications','custom_dashboards'],
      ['dashboard','students','classes','timetable','holidays','ai_copilot'],
    ),
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_staff', tenantId: '__system__', name: 'Staff',
    description: 'General staff access', color: '#f59e0b',
    isSystem: true,
    permissions: customPerms(
      ['chat','feed','notifications'],
      ['dashboard','students','attendance','holidays','timetable'],
    ),
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
]

// ── Store ─────────────────────────────────────────────────────────────────────
interface RoleStore {
  customRoles:   Role[]
  getAll:        (tenantId: string) => Role[]
  getById:       (id: string) => Role | undefined
  create:        (tenantId: string, data: Omit<Role, 'id' | 'isSystem' | 'createdAt' | 'updatedAt'>) => Role
  update:        (id: string, data: Partial<Pick<Role, 'name' | 'description' | 'color' | 'permissions'>>) => void
  remove:        (id: string) => void
}

export const useRoleStore = create<RoleStore>()(
  persist(
    (set, get) => ({
      customRoles: [],

      getAll: (tenantId) => [
        ...SYSTEM_ROLES,
        ...get().customRoles.filter(r => r.tenantId === tenantId),
      ],

      getById: (id) =>
        SYSTEM_ROLES.find(r => r.id === id) ??
        get().customRoles.find(r => r.id === id),

      create: (tenantId, data) => {
        const role: Role = {
          ...data,
          id:       crypto.randomUUID(),
          tenantId,
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set(s => ({ customRoles: [...s.customRoles, role] }))
        return role
      },

      update: (id, data) =>
        set(s => ({
          customRoles: s.customRoles.map(r =>
            r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
          ),
        })),

      remove: (id) =>
        set(s => ({ customRoles: s.customRoles.filter(r => r.id !== id) })),
    }),
    { name: 'schoolify-roles' }
  )
)
