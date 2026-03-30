/**
 * Shared CSV export utility.
 * Adds a UTF-8 BOM so Excel opens the file correctly.
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`

  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download a blank (or single sample-row) CSV template for imports.
 */
export function downloadTemplate(
  filename: string,
  headers: string[],
  sampleRows: (string | number)[][] = [],
) {
  downloadCSV(filename + '-template', headers, sampleRows)
}
