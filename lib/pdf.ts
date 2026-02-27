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
  const src = getPdfViewerSrc(value)
  if (!src) return false

  window.open(src, '_blank', 'noopener,noreferrer')
  return true
}
