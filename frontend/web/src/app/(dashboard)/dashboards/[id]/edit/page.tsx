'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Eye, Save, Trash2, GripVertical, Search,
  LayoutDashboard, ChevronDown, ChevronRight, RotateCcw,
} from 'lucide-react'
import { useDashboardStore, type ChartWidget } from '../../../../../store/dashboardStore'
import { CHART_REGISTRY, CHART_MAP, CATEGORIES, type ChartDef } from '../../../../../lib/chartRegistry'
import api from '../../../../../lib/api'

// ─── Grid constants ────────────────────────────────────────────────────────────
const COLS    = 12
const ROW_H   = 200   // px per row
const GAP     = 12    // px gap

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCellWidth(containerWidth: number) {
  return (containerWidth - (COLS - 1) * GAP) / COLS
}

function widgetStyle(w: ChartWidget, cw: number, isDragging: boolean, ghost?: { col: number; row: number } | null) {
  const col = isDragging && ghost ? ghost.col : w.col
  const row = isDragging && ghost ? ghost.row : w.row
  return {
    position: 'absolute' as const,
    left:   col  * (cw + GAP),
    top:    row  * (ROW_H + GAP),
    width:  w.colSpan * (cw + GAP) - GAP,
    height: w.rowSpan * (ROW_H + GAP) - GAP,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
    transition: isDragging ? 'none' : 'left 0.15s ease, top 0.15s ease, opacity 0.15s',
  }
}

function ghostStyle(w: ChartWidget, cw: number, ghost: { col: number; row: number }) {
  return {
    position: 'absolute' as const,
    left:   ghost.col * (cw + GAP),
    top:    ghost.row * (ROW_H + GAP),
    width:  w.colSpan * (cw + GAP) - GAP,
    height: w.rowSpan * (ROW_H + GAP) - GAP,
    zIndex: 50,
    pointerEvents: 'none' as const,
  }
}

function findFreePosition(widgets: ChartWidget[], colSpan: number, rowSpan: number) {
  for (let row = 0; row < 50; row++) {
    for (let col = 0; col <= COLS - colSpan; col++) {
      const occupied = widgets.some(w => !(
        col + colSpan <= w.col ||
        col >= w.col + w.colSpan ||
        row + rowSpan <= w.row ||
        row >= w.row + w.rowSpan
      ))
      if (!occupied) return { col, row }
    }
  }
  return { col: 0, row: 100 }
}

// ─── Chart Library Sidebar ────────────────────────────────────────────────────
function ChartLibrary({ onAdd }: { onAdd: (def: ChartDef) => void }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const filtered = useMemo(() =>
    CHART_REGISTRY.filter(c =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    ), [search])

  const byCategory = useMemo(() => {
    const map: Record<string, ChartDef[]> = {}
    filtered.forEach(c => {
      if (!map[c.category]) map[c.category] = []
      map[c.category].push(c)
    })
    return map
  }, [filtered])

  const toggle = (cat: string) => setCollapsed(p => {
    const n = new Set(p)
    n.has(cat) ? n.delete(cat) : n.add(cat)
    return n
  })

  return (
    <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Chart Library</p>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search charts..."
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {Object.entries(byCategory).map(([cat, defs]) => {
          const meta = CATEGORIES[cat]
          const isOpen = !collapsed.has(cat)
          return (
            <div key={cat}>
              <button
                onClick={() => toggle(cat)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta?.color ?? 'text-gray-600 bg-gray-100'}`}>
                    {meta?.label ?? cat}
                  </span>
                  <span className="text-xs text-gray-400">{defs.length}</span>
                </div>
                {isOpen ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
              </button>

              {isOpen && (
                <div className="mt-1 space-y-1 ml-1">
                  {defs.map(def => (
                    <button
                      key={def.type}
                      onClick={() => onAdd(def)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 border border-transparent transition-all group"
                    >
                      <p className="text-xs font-medium text-gray-800 group-hover:text-indigo-700 truncate">{def.label}</p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{def.description}</p>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{def.defaultColSpan}/12 cols</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{def.defaultRowSpan} row{def.defaultRowSpan > 1 ? 's' : ''}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {Object.keys(byCategory).length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No charts match your search</p>
        )}
      </div>
    </div>
  )
}

// ─── Widget on Canvas ─────────────────────────────────────────────────────────
interface WidgetCardProps {
  widget: ChartWidget
  analytics: any
  cw: number
  isBeingDragged: boolean
  ghost: { col: number; row: number } | null
  onDragStart: (e: React.PointerEvent, widget: ChartWidget) => void
  onRemove: (id: string) => void
  onResizeStart: (e: React.PointerEvent, widget: ChartWidget) => void
}

function WidgetCard({ widget, analytics, cw, isBeingDragged, ghost, onDragStart, onRemove, onResizeStart }: WidgetCardProps) {
  const def = CHART_MAP.get(widget.type)
  const style = widgetStyle(widget, cw, isBeingDragged, ghost)

  return (
    <div style={style} className={`flex flex-col bg-white rounded-xl border ${isBeingDragged ? 'border-indigo-300 shadow-xl' : 'border-gray-200 shadow-sm'} overflow-hidden`}>
      {/* Drag handle header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0 select-none">
        <div
          onPointerDown={e => onDragStart(e, widget)}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
          title="Drag to move"
        >
          <GripVertical size={14} className="text-gray-400" />
        </div>
        <span className="text-xs font-semibold text-gray-700 flex-1 truncate">
          {widget.title || def?.label || widget.type}
        </span>
        <button
          onClick={() => onRemove(widget.id)}
          className="p-1 rounded hover:bg-red-100 transition-colors flex-shrink-0"
        >
          <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
        </button>
      </div>

      {/* Chart content */}
      <div className="flex-1 min-h-0 p-3">
        {def ? def.render(analytics, widget) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">Unknown chart type</div>
        )}
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={e => onResizeStart(e, widget)}
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pr-1 pb-1"
        title="Drag to resize"
      >
        <svg width="8" height="8" className="text-gray-300"><path d="M0 8 L8 0 M4 8 L8 4" stroke="currentColor" strokeWidth="1.5" /></svg>
      </div>
    </div>
  )
}

// ─── Main Builder Page ────────────────────────────────────────────────────────
export default function DashboardEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const store = useDashboardStore()
  const dashboard = store.getDashboard(id)

  const [layout, setLayout] = useState<ChartWidget[]>(dashboard?.widgets ?? [])
  const [isDirty, setIsDirty] = useState(false)

  // Drag state
  const containerRef = useRef<HTMLDivElement>(null)
  const dragDataRef = useRef<{
    widgetId: string
    startX: number; startY: number
    origCol: number; origRow: number
    colSpan: number
  } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const ghostRef = useRef<{ col: number; row: number } | null>(null)
  const [ghostCell, setGhostCell] = useState<{ id: string; col: number; row: number } | null>(null)

  // Fetch analytics data for chart rendering
  const { data: raw } = useQuery({
    queryKey: ['school-analytics'],
    queryFn: () => api.get('/api/v1/reports/school-analytics') as any,
    staleTime: 5 * 60 * 1000,
  })
  const analytics = (raw as any)?.data ?? {}

  // Container width for cell size calculation
  const [containerWidth, setContainerWidth] = useState(900)
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const cw = getCellWidth(containerWidth)

  // Canvas height
  const canvasHeight = useMemo(() => {
    const maxRow = layout.length ? Math.max(...layout.map(w => w.row + w.rowSpan)) : 4
    return Math.max(4, maxRow) * (ROW_H + GAP) + GAP + 200
  }, [layout])

  // ── Drag ──────────────────────────────────────────────────────────────────
  const startDrag = useCallback((e: React.PointerEvent, widget: ChartWidget) => {
    e.preventDefault()
    e.stopPropagation()

    dragDataRef.current = {
      widgetId: widget.id,
      startX: e.clientX,
      startY: e.clientY,
      origCol: widget.col,
      origRow: widget.row,
      colSpan: widget.colSpan,
    }
    setDraggingId(widget.id)

    const cw_ = getCellWidth(containerRef.current?.clientWidth ?? containerWidth)

    const onMove = (me: PointerEvent) => {
      if (!dragDataRef.current) return
      const { startX, startY, origCol, origRow, colSpan } = dragDataRef.current
      const dx = me.clientX - startX
      const dy = me.clientY - startY
      const newCol = Math.max(0, Math.min(COLS - colSpan, Math.round(origCol + dx / (cw_ + GAP))))
      const newRow = Math.max(0, Math.round(origRow + dy / (ROW_H + GAP)))
      ghostRef.current = { col: newCol, row: newRow }
      setGhostCell({ id: dragDataRef.current.widgetId, col: newCol, row: newRow })
    }

    const onUp = () => {
      if (dragDataRef.current && ghostRef.current) {
        const { widgetId } = dragDataRef.current
        const { col, row } = ghostRef.current
        setLayout(prev => {
          const updated = prev.map(w => w.id === widgetId ? { ...w, col, row } : w)
          return updated
        })
        setIsDirty(true)
      }
      setDraggingId(null)
      setGhostCell(null)
      ghostRef.current = null
      dragDataRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [containerWidth])

  // ── Resize ────────────────────────────────────────────────────────────────
  const startResize = useCallback((e: React.PointerEvent, widget: ChartWidget) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const origColSpan = widget.colSpan
    const origRowSpan = widget.rowSpan
    const cw_ = getCellWidth(containerRef.current?.clientWidth ?? containerWidth)

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - startX
      const dy = me.clientY - startY
      const newColSpan = Math.max(2, Math.min(COLS - widget.col, Math.round(origColSpan + dx / (cw_ + GAP))))
      const newRowSpan = Math.max(1, Math.round(origRowSpan + dy / (ROW_H + GAP)))
      setLayout(prev => prev.map(w => w.id === widget.id ? { ...w, colSpan: newColSpan, rowSpan: newRowSpan } : w))
      setIsDirty(true)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [containerWidth])

  // ── Add chart ─────────────────────────────────────────────────────────────
  const addChart = useCallback((def: ChartDef) => {
    const { col, row } = findFreePosition(layout, def.defaultColSpan, def.defaultRowSpan)
    const widget: ChartWidget = {
      id: crypto.randomUUID(),
      type: def.type,
      title: def.label,
      col, row,
      colSpan: def.defaultColSpan,
      rowSpan: def.defaultRowSpan,
    }
    setLayout(prev => [...prev, widget])
    setIsDirty(true)
  }, [layout])

  // ── Remove widget ─────────────────────────────────────────────────────────
  const removeWidget = useCallback((widgetId: string) => {
    setLayout(prev => prev.filter(w => w.id !== widgetId))
    setIsDirty(true)
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = () => {
    store.updateLayout(id, layout)
    setIsDirty(false)
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setLayout(dashboard?.widgets ?? [])
    setIsDirty(false)
  }

  if (!dashboard) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Dashboard not found.</p>
        <Link href="/dashboards" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">Back to dashboards</Link>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Chart Library Sidebar */}
      <ChartLibrary onAdd={addChart} />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <Link href="/dashboards" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} className="text-gray-500" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <LayoutDashboard size={16} className="text-indigo-600 flex-shrink-0" />
            <h1 className="text-sm font-semibold text-gray-900 truncate">{dashboard.name}</h1>
            {isDirty && <span className="text-xs text-amber-600 font-medium px-2 py-0.5 bg-amber-50 rounded-full">Unsaved</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{layout.length} charts</span>
            {isDirty && (
              <button onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <RotateCcw size={13} /> Reset
              </button>
            )}
            <Link href={`/dashboards/${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Eye size={13} /> Preview
            </Link>
            <button
              onClick={save}
              disabled={!isDirty}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save size={13} /> Save
            </button>
          </div>
        </div>

        {/* Hint bar */}
        <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-2 flex items-center gap-3 text-xs text-indigo-600 flex-shrink-0">
          <span>Click a chart in the sidebar to add it to the canvas.</span>
          <span className="text-indigo-400">|</span>
          <span>Drag the <GripVertical size={11} className="inline" /> handle to move. Drag the corner to resize.</span>
          <span className="text-indigo-400">|</span>
          <span>Press <kbd className="px-1 py-0.5 bg-indigo-100 rounded text-indigo-700 font-mono">Save</kbd> to keep changes.</span>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-5">
          <div
            ref={containerRef}
            className="relative w-full"
            style={{
              height: canvasHeight,
              backgroundImage: `
                repeating-linear-gradient(to right, rgba(99,102,241,0.06) 0px, rgba(99,102,241,0.06) 1px, transparent 1px, transparent ${((containerWidth + GAP) / COLS)}px),
                repeating-linear-gradient(to bottom, rgba(99,102,241,0.06) 0px, rgba(99,102,241,0.06) 1px, transparent 1px, transparent ${ROW_H + GAP}px)
              `,
            }}
          >
            {layout.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <LayoutDashboard size={48} className="text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium">Canvas is empty</p>
                <p className="text-gray-300 text-sm mt-1">Click a chart from the left panel to add it here</p>
              </div>
            )}

            {layout.map(widget => {
              const isBeingDragged = draggingId === widget.id
              const ghost = ghostCell?.id === widget.id ? { col: ghostCell.col, row: ghostCell.row } : null

              return (
                <React.Fragment key={widget.id}>
                  {/* Ghost drop zone */}
                  {isBeingDragged && ghost && (
                    <div
                      style={ghostStyle(widget, cw, ghost)}
                      className="bg-indigo-100 border-2 border-dashed border-indigo-400 rounded-xl"
                    />
                  )}
                  <WidgetCard
                    widget={widget}
                    analytics={analytics}
                    cw={cw}
                    isBeingDragged={isBeingDragged}
                    ghost={ghost}
                    onDragStart={startDrag}
                    onRemove={removeWidget}
                    onResizeStart={startResize}
                  />
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
