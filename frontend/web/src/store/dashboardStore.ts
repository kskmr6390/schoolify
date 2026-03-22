import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChartWidget {
  id: string
  type: string
  title: string     // custom title (overrides chart def label)
  col: number       // 0-based column start (0–11)
  row: number       // 0-based row start
  colSpan: number   // columns wide  (1–12)
  rowSpan: number   // rows tall (1–4)
}

export interface CustomDashboard {
  id: string
  tenantId: string
  name: string
  widgets: ChartWidget[]
  createdAt: string
  updatedAt: string
}

interface DashboardStore {
  dashboards: CustomDashboard[]
  create: (name: string, tenantId: string) => CustomDashboard
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  addWidget: (dashboardId: string, widget: Omit<ChartWidget, 'id'>) => void
  removeWidget: (dashboardId: string, widgetId: string) => void
  updateLayout: (dashboardId: string, widgets: ChartWidget[]) => void
  getDashboard: (id: string) => CustomDashboard | undefined
  getTenantDashboards: (tenantId: string) => CustomDashboard[]
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      dashboards: [],

      create: (name, tenantId) => {
        const d: CustomDashboard = {
          id: crypto.randomUUID(),
          tenantId,
          name,
          widgets: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set(s => ({ dashboards: [...s.dashboards, d] }))
        return d
      },

      rename: (id, name) =>
        set(s => ({
          dashboards: s.dashboards.map(d =>
            d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d
          ),
        })),

      remove: (id) =>
        set(s => ({ dashboards: s.dashboards.filter(d => d.id !== id) })),

      addWidget: (dashboardId, widget) =>
        set(s => ({
          dashboards: s.dashboards.map(d => {
            if (d.id !== dashboardId) return d
            return {
              ...d,
              widgets: [...d.widgets, { ...widget, id: crypto.randomUUID() }],
              updatedAt: new Date().toISOString(),
            }
          }),
        })),

      removeWidget: (dashboardId, widgetId) =>
        set(s => ({
          dashboards: s.dashboards.map(d => {
            if (d.id !== dashboardId) return d
            return {
              ...d,
              widgets: d.widgets.filter(w => w.id !== widgetId),
              updatedAt: new Date().toISOString(),
            }
          }),
        })),

      updateLayout: (dashboardId, widgets) =>
        set(s => ({
          dashboards: s.dashboards.map(d => {
            if (d.id !== dashboardId) return d
            return { ...d, widgets, updatedAt: new Date().toISOString() }
          }),
        })),

      getDashboard: (id) => get().dashboards.find(d => d.id === id),

      getTenantDashboards: (tenantId) =>
        get().dashboards.filter(d => d.tenantId === tenantId),
    }),
    { name: 'schoolify-custom-dashboards' }
  )
)
