// ─── Detecção de tipo de mídia (imagem / vídeo) ───────────────────────────────
// Fonte ÚNICA de verdade para previews em todo o sistema. Antes cada tela tinha
// sua própria regex e listas divergentes — por isso .jfif (que é JPEG) não
// mostrava prévia na Biblioteca. Centralizar evita esse tipo de divergência.

// Extensões de imagem reconhecidas. Inclui variações do JPEG (.jfif, .jpe, .pjpeg)
// e formatos modernos/comuns (heic/heif, avif, bmp, tiff, ico, jxl, apng).
const IMAGE_EXT = /\.(jpe?g|jfif|jpe|pjpeg|pjp|png|apng|gif|webp|avif|bmp|svg|ico|heic|heif|tiff?|jxl)(\?|#|$)/i

// Extensões de vídeo reconhecidas.
const VIDEO_EXT = /\.(mp4|m4v|webm|mov|avi|mkv|ogv|ogg|3gp|3g2|flv|wmv|mpe?g|m2ts|ts)(\?|#|$)/i

/** True se a URL/arquivo aparenta ser uma imagem pela extensão. */
export function isImageUrl(url?: string | null): boolean {
  if (!url) return false
  return IMAGE_EXT.test(url)
}

/** True se a URL/arquivo aparenta ser um vídeo pela extensão. */
export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false
  return VIDEO_EXT.test(url)
}

/** Considera o MIME type quando disponível e cai para a extensão da URL. */
export function isImageMedia(fileType?: string | null, url?: string | null): boolean {
  if (fileType && fileType.startsWith('image/')) return true
  if (fileType && fileType.startsWith('video/')) return false
  return isImageUrl(url)
}

/** Considera o MIME type quando disponível e cai para a extensão da URL. */
export function isVideoMedia(fileType?: string | null, url?: string | null): boolean {
  if (fileType && fileType.startsWith('video/')) return true
  if (fileType && fileType.startsWith('image/')) return false
  return isVideoUrl(url)
}

/** Deriva um MIME type plausível a partir do nome/URL do arquivo. */
export function mimeFromUrl(url?: string | null): string | null {
  if (!url) return null
  const clean = url.split('?')[0].split('#')[0].toLowerCase()
  const ext = clean.split('.').pop() ?? ''
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', jpe: 'image/jpeg',
    pjpeg: 'image/jpeg', pjp: 'image/jpeg', png: 'image/png', apng: 'image/apng',
    gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp',
    svg: 'image/svg+xml', ico: 'image/x-icon', heic: 'image/heic', heif: 'image/heif',
    tif: 'image/tiff', tiff: 'image/tiff', jxl: 'image/jxl',
    mp4: 'video/mp4', m4v: 'video/x-m4v', webm: 'video/webm', mov: 'video/quicktime',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska', ogv: 'video/ogg', ogg: 'video/ogg',
    '3gp': 'video/3gpp', '3g2': 'video/3gpp2', flv: 'video/x-flv', wmv: 'video/x-ms-wmv',
    mpg: 'video/mpeg', mpeg: 'video/mpeg', ts: 'video/mp2t', m2ts: 'video/mp2t',
    pdf: 'application/pdf',
  }
  return map[ext] ?? null
}

/** Rótulo curto da extensão para exibir em cards de arquivo genérico. */
export function extLabel(url?: string | null): string {
  if (!url) return 'ARQUIVO'
  return url.split('.').pop()?.split(/[?#]/)[0]?.toUpperCase() || 'ARQUIVO'
}
