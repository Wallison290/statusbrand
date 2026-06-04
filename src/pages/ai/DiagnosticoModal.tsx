import { useState, useRef } from 'react'
import {
  X, Search, Upload, Trash2, Loader2, Instagram,
  Target, Users, TrendingUp, MessageSquare, ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/formatters'

// ─── Resize + encode helper ───────────────────────────────────────────────────
async function resizeAndEncode(file: File, maxPx = 1024): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height / width) * maxPx); width = maxPx }
        else { width = Math.round((width / height) * maxPx); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(blobUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = blobUrl
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Objetivo = 'seguidores' | 'posicionamento' | 'vendas'

interface Props {
  onClose: () => void
  onStart: (prompt: string, images: string[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DiagnosticoModal({ onClose, onStart }: Props) {
  // ── Obrigatórios ──
  const [handle,    setHandle]    = useState('')
  const [objetivo,  setObjetivo]  = useState<Objetivo>('seguidores')
  const [rivals,    setRivals]    = useState(['', '', ''])
  const [nicho,     setNicho]     = useState('')

  // ── Opcionais ──
  const [seguidores,   setSeguidores]   = useState('')
  const [engajamento,  setEngajamento]  = useState('')
  const [oferta,       setOferta]       = useState('')
  const [audiencia,    setAudiencia]    = useState('')
  const [showOptional, setShowOptional] = useState(false)

  // ── Imagens ──
  const [images,   setImages]   = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const canStart = handle.trim() && nicho.trim() && rivals.filter(r => r.trim()).length >= 1

  // ── Handlers ──
  const handleRival = (i: number, val: string) => {
    setRivals(prev => { const next = [...prev]; next[i] = val; return next })
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const encoded = await Promise.all(files.map(f => resizeAndEncode(f)))
    setImages(prev => [...prev, ...encoded].slice(0, 8))
    setUploading(false)
    e.target.value = ''
  }

  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i))

  const objetivoLabel: Record<Objetivo, string> = {
    seguidores:    'Crescer seguidores',
    posicionamento: 'Fortalecer posicionamento',
    vendas:        'Gerar mais vendas',
  }

  const handleStart = () => {
    const rivalLines = rivals
      .map((r, i) => r.trim() ? `${i + 1}. @${r.trim().replace('@', '')}` : null)
      .filter(Boolean)
      .join('\n')

    const lines: string[] = [
      'Faça o **diagnóstico completo** do perfil abaixo usando todos os seus agentes (Sherlock, Vera, Nina e Max):',
      '',
      '## Perfil Principal',
      `- Instagram: @${handle.trim().replace('@', '')}`,
      `- Objetivo: ${objetivoLabel[objetivo]}`,
    ]

    if (seguidores.trim()) lines.push(`- Seguidores: ${seguidores.trim()}`)
    if (engajamento.trim()) lines.push(`- Engajamento médio: ${engajamento.trim()}%`)
    if (oferta.trim()) lines.push(`- Oferta principal: ${oferta.trim()}`)
    if (audiencia.trim()) lines.push(`- Público-alvo: ${audiencia.trim()}`)

    lines.push('', '## Concorrentes', rivalLines)
    lines.push('', '## Nicho', nicho.trim())

    if (images.length > 0) {
      lines.push('', `## Prints de Referência`, `${images.length} print(s) anexados para análise visual.`)
    }

    lines.push(
      '',
      '---',
      'Execute o diagnóstico completo em sequência: benchmark de concorrência (Sherlock), análise de oportunidades (Vera), identificação do gargalo (Nina) e plano de ação com calendário de 30 dias (Max).',
    )

    onStart(lines.join('\n'), images)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f0f0] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
            <Search className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-[#0f0f0f]">Diagnóstico de Perfil</h2>
            <p className="text-[11px] text-[#888]">Sherlock · Vera · Nina · Max</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors">
            <X className="w-4 h-4 text-[#999]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Handle */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-1.5">
              Perfil a diagnosticar <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@usuario ou usuario"
                className="w-full pl-9 pr-3 py-2.5 border border-[#e0e0e0] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#bbb]"
              />
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-2">
              Objetivo principal <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'seguidores',    icon: Users,       label: 'Crescer\nseguidores' },
                { value: 'posicionamento', icon: Target,     label: 'Posicio-\nnamento' },
                { value: 'vendas',        icon: TrendingUp,  label: 'Mais\nvendas' },
              ] as { value: Objetivo; icon: any; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setObjetivo(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all',
                    objetivo === opt.value
                      ? 'bg-[#f0f0ff] border-[#6366f1] text-[#6366f1]'
                      : 'border-[#e0e0e0] text-[#777] hover:border-[#c4b5fd] hover:bg-[#faf9ff]',
                  )}
                >
                  <opt.icon className="w-4 h-4" />
                  <span className="text-[10px] font-semibold whitespace-pre-line leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Concorrentes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-1.5">
              Concorrentes <span className="text-red-500">*</span>
              <span className="ml-1 text-[10px] font-normal text-[#aaa] normal-case">(mínimo 1)</span>
            </label>
            <div className="space-y-2">
              {rivals.map((r, i) => (
                <div key={i} className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
                  <input
                    value={r}
                    onChange={e => handleRival(i, e.target.value)}
                    placeholder={`Concorrente ${i + 1}${i === 0 ? ' (obrigatório)' : ''}`}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#e0e0e0] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#bbb]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Nicho */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-1.5">
              Descrição do nicho <span className="text-red-500">*</span>
            </label>
            <textarea
              value={nicho}
              onChange={e => setNicho(e.target.value)}
              placeholder="Ex: clínica de estética focada em procedimentos minimamente invasivos para mulheres de 30 a 50 anos..."
              rows={3}
              className="w-full px-3 py-2.5 border border-[#e0e0e0] rounded-xl text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#bbb]"
            />
          </div>

          {/* Opcionais toggle */}
          <button
            onClick={() => setShowOptional(o => !o)}
            className="flex items-center gap-2 text-[11px] font-semibold text-[#6366f1] hover:text-[#4f52cc] transition-colors"
          >
            <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', showOptional && 'rotate-90')} />
            Informações opcionais {showOptional ? '(ocultar)' : '(expandir)'}
          </button>

          {showOptional && (
            <div className="space-y-3 border border-[#f0f0f0] rounded-xl p-4 bg-[#fafafa]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-1">Seguidores</label>
                  <input
                    value={seguidores}
                    onChange={e => setSeguidores(e.target.value)}
                    placeholder="Ex: 12.500"
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#ccc]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-1">Engajamento %</label>
                  <input
                    value={engajamento}
                    onChange={e => setEngajamento(e.target.value)}
                    placeholder="Ex: 3,2"
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#ccc]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-1">Oferta principal</label>
                <input
                  value={oferta}
                  onChange={e => setOferta(e.target.value)}
                  placeholder="Ex: curso online de confeitaria avançada"
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#ccc]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-1">Público-alvo</label>
                <input
                  value={audiencia}
                  onChange={e => setAudiencia(e.target.value)}
                  placeholder="Ex: mulheres de 25 a 45 anos, classe B/C, com filhos"
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#ccc]"
                />
              </div>
            </div>
          )}

          {/* Upload de prints */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-1.5">
              Prints de referência
              <span className="ml-1 text-[10px] font-normal text-[#aaa] normal-case">(até 8 imagens — feed, stories, concorrentes)</span>
            </label>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            {images.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-[#e0e0e0]">
                      <img src={src} alt={`Print ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < 8 && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-[#ddd] flex items-center justify-center hover:border-[#6366f1] hover:bg-[#f9f8ff] transition-colors"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin text-[#aaa]" /> : <Upload className="w-4 h-4 text-[#bbb]" />}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[#e0e0e0] rounded-xl hover:border-[#6366f1] hover:bg-[#f9f8ff] transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#aaa]" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-[#bbb]" />
                    <span className="text-[11px] text-[#aaa]">Clique para adicionar prints</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#f0f0f0] flex-shrink-0 bg-[#fafafa]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#e0e0e0] text-[13px] font-medium text-[#666] hover:bg-[#f5f5f5] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2',
              canStart
                ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white hover:opacity-90 shadow-sm'
                : 'bg-[#f0f0f0] text-[#bbb] cursor-not-allowed',
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Iniciar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  )
}
