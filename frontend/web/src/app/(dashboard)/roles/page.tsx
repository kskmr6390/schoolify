'use client'

import { useState } from 'react'
import {
  Plus, Pencil, Trash2, X, Shield, Check, ChevronDown, ChevronRight,
  Lock, Eye, EyeOff, ShieldCheck,
} from 'lucide-react'
import { useRoleStore, ALL_MODULES, Role, PermissionMap } from '../../../store/roleStore'
import { useAuthStore } from '../../../store/authStore'
import { useLogStore } from '../../../store/logStore'
import { cn } from '../../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────
const GROUPS = Array.from(new Set(ALL_MODULES.map(m => m.group)))

const COLOR_OPTIONS = [
  '#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b',
]

function emptyPerms(): PermissionMap {
  return ALL_MODULES.reduce((acc, m) => ({
    ...acc, [m.key]: { read: false, write: false, delete: false },
  }), {} as PermissionMap)
}

// ── Permission Matrix ─────────────────────────────────────────────────────────
function PermMatrix({
  perms,
  onChange,
  readOnly = false,
}: {
  perms: PermissionMap
  onChange?: (perms: PermissionMap) => void
  readOnly?: boolean
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (group: string) =>
    setCollapsed(c => ({ ...c, [group]: !c[group] }))

  const setAll = (key: string, field: 'read' | 'write' | 'delete', val: boolean) => {
    if (readOnly || !onChange) return
    const next = { ...perms, [key]: { ...perms[key], [field]: val } }
    // write/delete requires read
    if (field === 'write' && val) next[key].read = true
    if (field === 'delete' && val) next[key].read = true
    // removing read removes write & delete
    if (field === 'read' && !val) { next[key].write = false; next[key].delete = false }
    onChange(next)
  }

  const setGroupAll = (group: string, val: boolean) => {
    if (readOnly || !onChange) return
    const next = { ...perms }
    ALL_MODULES.filter(m => m.group === group).forEach(m => {
      next[m.key] = { read: val, write: val, delete: val }
    })
    onChange(next)
  }

  const setColumnAll = (field: 'read' | 'write' | 'delete', val: boolean) => {
    if (readOnly || !onChange) return
    const next = { ...perms }
    ALL_MODULES.forEach(m => {
      next[m.key] = { ...next[m.key], [field]: val }
      if (field === 'write' && val) next[m.key].read = true
      if (field === 'delete' && val) next[m.key].read = true
      if (field === 'read' && !val) { next[m.key].write = false; next[m.key].delete = false }
    })
    onChange(next)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_80px_80px] bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <div className="px-4 py-2.5">Module</div>
        {(['read','write','delete'] as const).map(f => (
          <div key={f} className="py-2.5 text-center">
            {readOnly ? f : (
              <button
                onClick={() => setColumnAll(f, !ALL_MODULES.every(m => perms[m.key]?.[f]))}
                className="hover:text-indigo-600 transition-colors"
                title={`Toggle all ${f}`}
              >{f}</button>
            )}
          </div>
        ))}
      </div>

      {GROUPS.map(group => {
        const modules = ALL_MODULES.filter(m => m.group === group)
        const isOpen = !collapsed[group]
        const allOn = modules.every(m => perms[m.key]?.read && perms[m.key]?.write && perms[m.key]?.delete)

        return (
          <div key={group} className="border-b border-gray-100 last:border-0">
            {/* Group header */}
            <button
              onClick={() => toggle(group)}
              className="w-full grid grid-cols-[1fr_80px_80px_80px] items-center bg-gray-50/60 hover:bg-gray-100/60 transition-colors py-2 px-4 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {group}
                <span className="text-gray-400 font-normal">({modules.length})</span>
              </span>
              {!readOnly && (
                <div className="col-span-3 flex justify-end pr-1">
                  <button
                    onClick={e => { e.stopPropagation(); setGroupAll(group, !allOn) }}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                      allOn
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:border-indigo-200 hover:text-indigo-600"
                    )}
                  >
                    {allOn ? 'All On' : 'All Off'}
                  </button>
                </div>
              )}
            </button>

            {/* Module rows */}
            {isOpen && modules.map(m => (
              <div key={m.key} className="grid grid-cols-[1fr_80px_80px_80px] items-center py-2 px-4 hover:bg-gray-50/50 border-t border-gray-50">
                <span className="text-sm text-gray-700 pl-5">{m.label}</span>
                {(['read','write','delete'] as const).map(field => (
                  <div key={field} className="flex justify-center">
                    <button
                      disabled={readOnly}
                      onClick={() => setAll(m.key, field, !perms[m.key]?.[field])}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        perms[m.key]?.[field]
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-gray-300 hover:border-indigo-400",
                        readOnly && "cursor-default"
                      )}
                    >
                      {perms[m.key]?.[field] && <Check size={11} className="text-white" />}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────
function RoleModal({
  existing,
  tenantId,
  onClose,
}: {
  existing?: Role
  tenantId: string
  onClose: () => void
}) {
  const { create, update } = useRoleStore()
  const { user } = useAuthStore()
  const logStore = useLogStore()

  const [name, setName]               = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [color, setColor]             = useState(existing?.color ?? COLOR_OPTIONS[0])
  const [perms, setPerms]             = useState<PermissionMap>(
    existing?.permissions ?? emptyPerms()
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (existing) {
      update(existing.id, { name: name.trim(), description: description.trim(), color, permissions: perms })
      if (user) {
        logStore.add({
          tenantId, userId: user.id,
          userName: `${user.first_name} ${user.last_name}`, userEmail: user.email, userRole: user.role,
          action: 'update', module: 'roles', target: `Role: ${name}`,
          detail: `Updated role "${name}"`,
        })
      }
    } else {
      const r = create(tenantId, { name: name.trim(), description: description.trim(), color, permissions: perms })
      if (user) {
        logStore.add({
          tenantId, userId: user.id,
          userName: `${user.first_name} ${user.last_name}`, userEmail: user.email, userRole: user.role,
          action: 'create', module: 'roles', target: `Role: ${r.name}`,
          detail: `Created role "${r.name}"`,
        })
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-lg">
            {existing ? 'Edit Role' : 'Create Role'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role Name *</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Class Teacher, Lab In-charge"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Badge Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    color === c ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Module Permissions</label>
            <PermMatrix perms={perms} onChange={setPerms} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {existing ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ role, onClose }: { role: Role; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
            <div>
              <h3 className="font-semibold text-gray-900">{role.name}</h3>
              {role.description && <p className="text-xs text-gray-400">{role.description}</p>}
            </div>
            {role.isSystem && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">System</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          <PermMatrix perms={role.permissions} readOnly />
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const { tenant, user } = useAuthStore()
  const { getAll, remove } = useRoleStore()
  const logStore = useLogStore()

  const [showCreate, setShowCreate]   = useState(false)
  const [editing, setEditing]         = useState<Role | null>(null)
  const [viewing, setViewing]         = useState<Role | null>(null)

  const tenantId = tenant?.tenant_id ?? ''
  const roles = getAll(tenantId)

  const handleDelete = (role: Role) => {
    if (role.isSystem) return
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    remove(role.id)
    if (user) {
      logStore.add({
        tenantId, userId: user.id,
        userName: `${user.first_name} ${user.last_name}`, userEmail: user.email, userRole: user.role,
        action: 'delete', module: 'roles', target: `Role: ${role.name}`,
        detail: `Deleted role "${role.name}"`,
      })
    }
  }

  const permCount = (role: Role) => {
    let r = 0, w = 0, d = 0
    Object.values(role.permissions).forEach(p => {
      if (p.read) r++; if (p.write) w++; if (p.delete) d++
    })
    return { r, w, d }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage what each role can access across modules
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Role
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><Eye size={13} className="text-blue-500" /> Read — can view</span>
        <span className="flex items-center gap-1.5"><Pencil size={13} className="text-emerald-500" /> Write — can create/edit</span>
        <span className="flex items-center gap-1.5"><Trash2 size={13} className="text-rose-500" /> Delete — can delete records</span>
        <span className="flex items-center gap-1.5"><Lock size={13} className="text-gray-400" /> System — cannot be deleted</span>
      </div>

      {/* Roles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map(role => {
          const { r, w, d } = permCount(role)
          const total = ALL_MODULES.length
          return (
            <div key={role.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Color bar */}
              <div className="h-1.5" style={{ backgroundColor: role.color }} />

              <div className="p-5">
                {/* Name + badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: role.color + '20' }}>
                      <ShieldCheck size={18} style={{ color: role.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 leading-tight">{role.name}</p>
                      {role.isSystem && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                          System
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {role.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{role.description}</p>
                )}

                {/* Permission stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Read',   value: r, color: 'text-blue-600',   bg: 'bg-blue-50' },
                    { label: 'Write',  value: w, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Delete', value: d, color: 'text-rose-600',   bg: 'bg-rose-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-lg p-2 text-center`}>
                      <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Access bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Module access</span>
                    <span>{r}/{total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(r / total) * 100}%`, backgroundColor: role.color }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewing(role)}
                    className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye size={12} /> View
                  </button>
                  {!role.isSystem && (
                    <>
                      <button
                        onClick={() => setEditing(role)}
                        className="flex-1 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(role)}
                        className="py-1.5 px-3 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Add new card */}
        <button
          onClick={() => setShowCreate(true)}
          className="border-2 border-dashed border-gray-200 rounded-2xl h-64 flex flex-col items-center justify-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
            <Plus size={20} className="text-gray-400 group-hover:text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">
            Custom Role
          </span>
        </button>
      </div>

      {showCreate && <RoleModal tenantId={tenantId} onClose={() => setShowCreate(false)} />}
      {editing   && <RoleModal existing={editing} tenantId={tenantId} onClose={() => setEditing(null)} />}
      {viewing   && <ViewModal role={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
