// ── Extração de texto de PDF no navegador (client-side, via pdf.js) ───────────
// pdf.js só é baixado quando o usuário realmente anexa um PDF (import dinâmico) —
// evita inflar o chunk da StatusIA para quem nunca usa esse recurso.

const MAX_CHARS = 20_000
const MAX_PAGES = 30
const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB

export interface ExtractedPdf {
  text: string
  pageCount: number
  truncated: boolean
}

export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('PDF muito grande (máx. 15 MB).')
  }

  const [pdfjsLib, { default: pdfWorkerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const pageCount   = pdf.numPages
  const pagesToRead = Math.min(pageCount, MAX_PAGES)
  let text = ''

  for (let i = 1; i <= pagesToRead; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')
    text += `\n\n--- Página ${i} ---\n${pageText.trim()}`
    if (text.length >= MAX_CHARS) break
  }

  const truncated = text.length > MAX_CHARS || pagesToRead < pageCount
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS)

  return { text: text.trim(), pageCount, truncated }
}
