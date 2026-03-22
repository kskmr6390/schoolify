'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, LayoutDashboard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useDashboardStore } from '../../../../store/dashboardStore'
import { CHART_MAP } from '../../../../lib/chartRegistry'
import api from '../../../../lib/api'

const COLS = 12
const ROW_H = 200   // px
const GAP  = 12     // px

function getStyle(col: number, row: number, colSpan: number, rowSpan: number, cw: number) {
  return {
    position: 'absolute' as const,
    left:  col  * (cw + GAP),
    top:   row  * (ROW_H + GAP),
    width: colSpan * (cw + GAP) - GAP,
    height: rowSpan * (ROW_H + GAP) - GAP,
  }
}

export default function DashboardViewPage() {
  const { id } = useParams<{ id: string }>()
  const { getDashboard } = useDashboardStore()
  const dashboard = getDashboard(id)

  const { data: raw } = useQuery({
    queryKey: ['school-analytics'],
    queryFn: () => api.get('/api/v1/reports/school-analytics') as any,
    staleTime: 5 * 60 * 1000,
  })
  const analytics = (raw as any)?.data ?? {}

  if (!dashboard) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/dashboards" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={14} /> Dashboards
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <LayoutDashboard size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Dashboard not found</p>
        </div>
      </div>
    )
  }

  const maxRowBottom = dashboard.widgets.length
    ? Math.max(...dashboard.widgets.map(w => w.row + w.rowSpan))
    : 4
  const containerHeight = maxRowBottom * (ROW_H + GAP) + GAP

  return (
    <div className="p-6 max-w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboards" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{dashboard.name}</h1>
            <p className="text-xs text-gray-400">{dashboard.widgets.length} charts</p>
          </div>
        </div>
        <Link href={`/dashboards/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Pencil size={14} />
          Edit Dashboard
        </Link>
      </div>

      {dashboard.widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <LayoutDashboard size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No charts yet</h3>
          <p className="text-sm text-gray-400 mb-6">Add charts to this dashboard in the editor</p>
          <Link href={`/dashboards/${id}/edit`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
            Open Editor
          </Link>
        </div>
      ) : (
        /* Canvas */
        <div className="overflow-x-auto">
          <div className="relative min-w-0 w-full" style={{ height: containerHeight }}>
            {dashboard.widgets.map(widget => {
              const containerWidth = typeof window !== 'undefined' ? window.innerWidth - 320 : 1200
              const cw = (containerWidth - (COLS - 1) * GAP) / COLS
              const style = getStyle(widget.col, widget.row, widget.colSpan, widget.rowSpan, cw)
              const def = CHART_MAP.get(widget.type)

              return (
                <div key={widget.id} style={style}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {widget.title || def?.label || widget.type}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0 p-3">
                    {def ? def.render(analytics, widget) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">Unknown chart</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
