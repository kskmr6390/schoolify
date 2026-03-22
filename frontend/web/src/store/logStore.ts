import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LogAction = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'export' | 'import' | 'approve' | 'reject'

export interface ActivityLog {
  id:         string
  tenantId:   string
  userId:     string
  userName:   string
  userEmail:  string
  userRole:   string
  action:     LogAction
  module:     string
  target?:    string   // e.g. "Student: John Doe"
  detail?:    string   // human-readable description
  metadata?:  Record<string, unknown>
  ip?:        string
  createdAt:  string
}

interface LogStore {
  logs: ActivityLog[]
  add:  (entry: Omit<ActivityLog, 'id' | 'createdAt'>) => void
  getByTenant: (tenantId: string) => ActivityLog[]
  clear: (tenantId: string) => void
}

export const useLogStore = create<LogStore>()(
  persist(
    (set, get) => ({
      logs: [],

      add: (entry) => {
        const log: ActivityLog = {
          ...entry,
          id:        crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ logs: [log, ...s.logs].slice(0, 5000) })) // cap at 5k entries
      },

      getByTenant: (tenantId) =>
        get().logs.filter(l => l.tenantId === tenantId),

      clear: (tenantId) =>
        set(s => ({ logs: s.logs.filter(l => l.tenantId !== tenantId) })),
    }),
    { name: 'schoolify-activity-logs' }
  )
)

// ── Helper to log from anywhere ──────────────────────────────────────────────
export function logActivity(
  store: LogStore,
  tenantId: string,
  user: { id: string; first_name: string; last_name: string; email: string; role: string },
  action: LogAction,
  module: string,
  target?: string,
  detail?: string,
  metadata?: Record<string, unknown>,
) {
  store.add({
    tenantId,
    userId:    user.id,
    userName:  `${user.first_name} ${user.last_name}`.trim(),
    userEmail: user.email,
    userRole:  user.role,
    action,
    module,
    target,
    detail,
    metadata,
  })
}
