'use client'

import { useRef, useState } from 'react'
import { X, Printer, Upload, Camera, GraduationCap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

interface IDCardModalProps {
  person: any
  role: 'student' | 'teacher'
  onClose: () => void
}

export default function IDCardModal({ person, role, onClose }: IDCardModalProps) {
  const { tenant } = useAuthStore()
  const [photo, setPhoto] = useState<string>(person.avatar_url || person.profile_photo_url || '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const schoolName = tenant?.name || 'Greenwood High School'
  const displayName = `${person.first_name || ''} ${person.last_name || ''}`.trim()
  const idNumber = person.student_code || person.id?.slice(0, 8).toUpperCase() || 'N/A'
  const classInfo = person.class_name || person.subject || (role === 'teacher' ? 'Teacher' : '')
  const bloodGroup = person.blood_group || ''
  const phone = person.phone || ''

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await (api as any).post('/api/v1/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }) as any
      const url = res?.data?.url || res?.url
      if (url) setPhoto(url)
    } catch {
      // If upload fails, use local preview
      const reader = new FileReader()
      reader.onload = (ev) => setPhoto(ev.target?.result as string)
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  function handlePrint() {
    const printContent = cardRef.current
    if (!printContent) return
    const win = window.open('', '_blank', 'width=400,height=600')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>ID Card - ${displayName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const roleColor = role === 'teacher' ? '#7c3aed' : '#1d4ed8'
  const roleLabel = role === 'teacher' ? 'TEACHER' : 'STUDENT'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">ID Card Generated</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>

        {/* ID Card Preview */}
        <div className="p-6 flex justify-center">
          <div ref={cardRef} style={{
            width: '320px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            fontFamily: 'Arial, sans-serif',
          }}>
            {/* Card Header */}
            <div style={{ background: roleColor, padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '16px' }}>🎓</span>
                </div>
                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>{schoolName}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.25)', display: 'inline-block', padding: '2px 12px', borderRadius: '20px', marginTop: '4px' }}>
                <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px' }}>{roleLabel} ID CARD</span>
              </div>
            </div>

            {/* Card Body */}
            <div style={{ background: 'white', padding: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Photo */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '80px', height: '96px', borderRadius: '8px', overflow: 'hidden',
                    border: `3px solid ${roleColor}`, background: '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {photo ? (
                      <img src={photo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '32px', fontWeight: 'bold', color: roleColor }}>
                        {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)',
                    background: roleColor, borderRadius: '4px', padding: '1px 8px',
                  }}>
                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{idNumber}</span>
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, paddingTop: '4px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#111', marginBottom: '2px' }}>{displayName}</div>
                  {classInfo && (
                    <div style={{ fontSize: '12px', color: roleColor, fontWeight: '600', marginBottom: '8px' }}>{classInfo}</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {bloodGroup && (
                      <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                        <span style={{ color: '#6b7280', minWidth: '70px' }}>Blood Group</span>
                        <span style={{ color: '#111', fontWeight: '600' }}>{bloodGroup}</span>
                      </div>
                    )}
                    {phone && (
                      <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                        <span style={{ color: '#6b7280', minWidth: '70px' }}>Phone</span>
                        <span style={{ color: '#111' }}>{phone}</span>
                      </div>
                    )}
                    {person.email && (
                      <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                        <span style={{ color: '#6b7280', minWidth: '70px' }}>Email</span>
                        <span style={{ color: '#111', wordBreak: 'break-all' }}>{person.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Barcode-style bottom */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>Academic Year</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>2025–2026</div>
                </div>
                {/* Simple barcode lines */}
                <div style={{ display: 'flex', gap: '2px', height: '24px', alignItems: 'flex-end' }}>
                  {[4,6,3,7,5,4,6,3,5,7,4,5].map((h, i) => (
                    <div key={i} style={{ width: '2px', height: `${h * 3}px`, background: '#374151' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div style={{ background: '#f9fafb', padding: '8px 20px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: '#9ca3af' }}>
                If found, please return to {schoolName} • Powered by Schoolify
              </span>
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="px-6 pb-6">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-50">
            {uploading ? (
              <><Camera size={16} className="animate-pulse" /> Uploading photo...</>
            ) : (
              <><Upload size={16} /> {photo ? 'Change photo' : 'Upload photo for ID card'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
