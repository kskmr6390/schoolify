'use client'

import { useRef, useState } from 'react'
import { Upload, Download, X, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react'
import { downloadTemplate } from '../lib/csvExport'
import api from '../lib/api'

export interface ImportField {
  key: string        // CSV column header
  label: string      // Human label shown in template info
  required?: boolean
  example?: string   // Sample value
}

export interface ImportCSVConfig {
  title: string
  description?: string
  templateFilename: string
  fields: ImportField[]
  /** POST endpoint that accepts multipart/form-data with a "file" field */
  uploadEndpoint: string
  /** Extra query params appended to the endpoint */
  queryParams?: Record<string, string>
  /** Optional extra body fields (will be sent as form data) */
  extraFields?: Record<string, string>
}

interface Props {
  config: ImportCSVConfig
  onClose: () => void
  onSuccess?: (result: { imported: number; errors: string[] }) => void
}

export default function ImportCSVModal({ config, onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [error, setError] = useState('')

  const templateHeaders = config.fields.map(f => f.key)
  const templateSample = config.fields.map(f => f.example ?? '')

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('Only .csv files are supported.')
      return
    }
    setError('')
    setResult(null)
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (config.extraFields) {
        Object.entries(config.extraFields).forEach(([k, v]) => formData.append(k, v))
      }

      const qs = config.queryParams
        ? '?' + new URLSearchParams(config.queryParams).toString()
        : ''

      // Use the api axios instance which auto-injects auth + tenant headers
      const res = await (api as any).post(`${config.uploadEndpoint}${qs}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }) as any
      const data = res?.data ?? res
      const r = { imported: data.imported ?? 0, errors: data.errors ?? [] }
      setResult(r)
      onSuccess?.(r)
    } catch (e: any) {
      setError(e.message ?? 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Upload size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{config.title}</h2>
              {config.description && <p className="text-xs text-gray-500">{config.description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Template download */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-900 mb-1">Download Template</p>
                <p className="text-xs text-indigo-700 mb-2">
                  Use this template to prepare your CSV file with the correct columns.
                </p>
                <div className="flex flex-wrap gap-1">
                  {config.fields.map(f => (
                    <span key={f.key}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        f.required ? 'bg-indigo-200 text-indigo-800' : 'bg-white text-indigo-600 border border-indigo-200'
                      }`}>
                      {f.key}{f.required ? '*' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-indigo-500 mt-1">* required columns</p>
              </div>
              <button
                onClick={() => downloadTemplate(config.templateFilename, templateHeaders, [templateSample])}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition"
              >
                <Download size={13} />
                Template
              </button>
            </div>
          </div>

          {/* File drop zone */}
          {!result && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              <input ref={inputRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText size={20} className="text-indigo-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="ml-2 p-1 hover:bg-gray-200 rounded-lg transition">
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Drop your CSV here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Only .csv files · UTF-8 encoding</p>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {result.imported} record{result.imported !== 1 ? 's' : ''} imported successfully
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-green-700 mt-0.5">{result.errors.length} rows skipped due to errors</p>
                  )}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-amber-800 mb-2">Skipped rows:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={handleUpload} disabled={!file || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Uploading…' : 'Upload & Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
