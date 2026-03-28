'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, LayoutDashboard, Pencil, Trash2, X, BarChart3, Clock } from 'lucide-react'
import { useDashboardStore } from '../../../store/dashboardStore'
import { useAuthStore } from '../../../store/authStore'

function CreateModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const { create } = useDashboardStore()
  const router = useRouter()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const d = create(name.trim(), tenantId)
    onClose()
    router.push(`/dashboards/${d.id}/edit`)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">New Dashboard</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Dashboard Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Weekly Overview, Fee Monitor..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">You can add charts after creating the dashboard</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Create &amp; Edit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RenameModal({ id, currentName, onClose }: { id: string; currentName: string; onClose: () => void }) {
  const [name, setName] = useState(currentName)
  const { rename } = useDashboardStore()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    rename(id, name.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Rename Dashboard</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Rename</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const PALETTE = [
  'from-indigo-500 to-indigo-600', 'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600', 'from-rose-500 to-rose-600',
  'from-violet-500 to-violet-600', 'from-cyan-500 to-cyan-600',
  'from-teal-500 to-teal-600', 'from-pink-500 to-pink-600',
]

export default function DashboardsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const { tenant } = useAuthStore()
  const { getTenantDashboards, remove } = useDashboardStore()

  const tenantId = tenant?.tenant_id ?? 'default'
  const dashboards = getTenantDashboards(tenantId)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboards</h1>
          <p className="text-sm text-gray-500 mt-1">Create custom dashboards with drag-and-drop charts</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} />
          New Dashboard
        </button>
      </div>

      {dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
            <LayoutDashboard size={28} className="text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No dashboards yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Create your first custom dashboard and add charts to visualize your school data exactly how you want it.
          </p>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} />
            Create Your First Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboards.map((d, idx) => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
              {/* Preview header */}
              <div className={`h-28 bg-gradient-to-br ${PALETTE[idx % PALETTE.length]} relative flex items-center justify-center`}>
                <LayoutDashboard size={40} className="text-white/30" />
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setRenaming({ id: d.id, name: d.name })}
                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                    <Pencil size={13} className="text-white" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${d.name}"?`)) remove(d.id) }}
                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-red-500/60 flex items-center justify-center transition-colors">
                    <Trash2 size={13} className="text-white" />
                  </button>
                </div>
                {/* Widget count badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <BarChart3 size={11} className="text-white" />
                  <span className="text-white text-xs font-medium">{d.widgets.length} charts</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{d.name}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                  <Clock size={11} />
                  Updated {formatDate(d.updatedAt)}
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/dashboards/${d.id}`}
                    className="flex-1 text-center py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors">
                    View
                  </Link>
                  <Link href={`/dashboards/${d.id}/edit`}
                    className="flex-1 text-center py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <button onClick={() => setShowCreate(true)}
            className="border-2 border-dashed border-gray-200 rounded-2xl h-48 flex flex-col items-center justify-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
              <Plus size={20} className="text-gray-400 group-hover:text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">New Dashboard</span>
          </button>
        </div>
      )}

      {showCreate && <CreateModal tenantId={tenantId} onClose={() => setShowCreate(false)} />}
      {renaming && <RenameModal id={renaming.id} currentName={renaming.name} onClose={() => setRenaming(null)} />}
    </div>
  )
}
