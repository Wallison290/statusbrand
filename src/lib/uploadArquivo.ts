import { supabase } from '@/integrations/supabase/client'

/**
 * Envia um arquivo e devolve a URL pública dele.
 *
 * Decide sozinho para onde vai:
 *   • vídeo, ou qualquer arquivo acima de 40 MB → Cloudflare R2
 *   • o resto → Supabase Storage, como sempre foi
 *
 * Por que dividir: o plano gratuito do Supabase recusa arquivo acima de 50 MB
 * e dá só 1 GB no total. O R2 dá 10 GB, aceita arquivo grande e não cobra
 * tráfego de saída. As URLs do R2 são públicas, então o agendamento do
 * Instagram continua funcionando — a Meta busca o arquivo pela URL.
 */

/** Acima disto o Supabase gratuito recusa. Deixo margem de segurança. */
const LIMITE_SUPABASE = 40 * 1024 * 1024

export type ResultadoUpload = {
  url: string
  destino: 'r2' | 'supabase'
}

export function precisaDoR2(file: File): boolean {
  return file.type.startsWith('video/') || file.size > LIMITE_SUPABASE
}

/** Envia direto ao R2 usando uma URL assinada gerada pela Edge Function. */
async function enviarParaR2(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const { data, error } = await supabase.functions.invoke('r2-upload-url', {
    body: { fileName: file.name, contentType: file.type, sizeBytes: file.size },
  })
  if (error) throw new Error('Não foi possível preparar o envio do vídeo.')
  if (data?.error) throw new Error(data.error)

  const { uploadUrl, publicUrl } = data as { uploadUrl: string; publicUrl: string }

  // XMLHttpRequest em vez de fetch: é o único jeito de ter barra de progresso
  // em upload, e arquivo grande sem progresso parece travado.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha no envio (${xhr.status}).`))
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar o arquivo.'))
    xhr.send(file)
  })

  return publicUrl
}

/**
 * Ponto único de upload do sistema.
 *
 * @param bucket  bucket do Supabase usado quando o arquivo NÃO vai para o R2
 * @param path    caminho dentro desse bucket
 */
export async function uploadArquivo(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ResultadoUpload> {
  if (precisaDoR2(file)) {
    const url = await enviarParaR2(file, onProgress)
    return { url, destino: 'r2' }
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  onProgress?.(100)
  return { url: data.publicUrl, destino: 'supabase' }
}
