export function getPdfViewerSrc(value?: string | null): string {
  const source = String(value || '').trim()
  if (!source) return ''

  if (
    source.startsWith('data:application/pdf') ||
    source.startsWith('blob:') ||
    source.startsWith('http://') ||
    source.startsWith('https://')
  ) {
    return source
  }

  if (source.startsWith('data:')) {
    return source
  }

  return `data:application/pdf;base64,${source.replace(/\s+/g, '')}`
}

export function openPdfInNewTab(value?: string | null): boolean {
  const src = getPdfObjectUrl(value)
  if (!src) return false

  window.open(src, '_blank', 'noopener,noreferrer')
  return true
}

export function getPdfObjectUrl(value?: string | null): string {
  const source = String(value || '').trim()
  if (!source) return ''

  if (
    source.startsWith('blob:') ||
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.startsWith('/')
  ) {
    return source
  }

  if (source.startsWith('data:application/pdf')) {
    const base64 = source.split(',')[1] || ''
    return createBlobUrl(base64)
  }

  if (source.startsWith('data:')) {
    return source
  }

  return createBlobUrl(source.replace(/\s+/g, ''))
}

function createBlobUrl(base64: string): string {
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  } catch {
    return ''
  }
}
