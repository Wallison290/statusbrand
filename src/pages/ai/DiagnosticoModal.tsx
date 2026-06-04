import { useState, useRef } from 'react'
import {
  X, Upload, Trash2, Loader2, Target, Users, TrendingUp,
  MessageSquare, ChevronRight, BarChart2, ImageIcon, Info,
} from 'lucide-react'
import { cn } from '@/utils/formatters'

// ─── Resize + encode ──────────────────────────────────────────────────────────
async function resizeAndEncode(file: File, maxPx = 1200): Promise<string> {
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
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.src = blobUrl
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Objetivo = 'seguidores' | 'posicionamento' | 'vendas'
type Formato = 'reels' | 'posts' | 'carrosséis' | 'stories' | 'lives'

interface ImageGroup {
  key: 'feed' | 'insights' | 'concorrentes' | 'top_posts'
  label: string
  hint: string
  icon: React.ReactNode
  max: number
  images: string[]
}

interface Props {
  onClose: () => void
  onStart: (prompt: string, images: string[]) => void
}

// ─── Seção de upload de imagens ───────────────────────────────────────────────
function ImageUploadSection({
  group,
  onChange,
}: {
  group: ImageGroup
  onChange: (images: string[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const encoded = await Promise.all(files.map(f => resizeAndEncode(f)))
    onChange([...group.images, ...encoded].slice(0, group.max))
    setUploading(false)
    e.target.value = ''
  }

  const remove = (i: number) => onChange(group.images.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[#6366f1]">{group.icon}</span>
        <span className="text-[11px] font-semibold text-[#444] uppercase tracking-wide">{group.label}</span>
        <span className="text-[10px] text-[#aaa] font-normal normal-case">até {group.max} prints</span>
      </div>
      <p className="text-[10.5px] text-[#888] leading-snug">{group.hint}</p>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

      <div className="flex flex-wrap gap-2">
        {group.images.map((src, i) => (
          <div key={i} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-[#e0e0e0] flex-shrink-0">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => remove(i)}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ))}
        {group.images.length < group.max && (
          <button
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="w-16 h-16 rounded-xl border-2 border-dashed border-[#ddd] flex flex-col items-center justify-center gap-1 hover:border-[#6366f1] hover:bg-[#f9f8ff] transition-colors flex-shrink-0"
          >
            {uploading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#aaa]" />
              : <Upload className="w-3.5 h-3.5 text-[#bbb]" />
            }
            <span className="text-[8px] text-[#ccc]">Add</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function DiagnosticoModal({ onClose, onStart }: Props) {
  // Dados básicos
  const [nicho,     setNicho]    = useState('')
  const [bio,       setBio]      = useState('')
  const [objetivo,  setObjetivo] = useState<Objetivo>('seguidores')
  const [formatos,  setFormatos] = useState<Formato[]>([])
  const [freq,      setFreq]     = useState('')

  // Dados numéricos
  const [seguidores,  setSeguidores]  = useState('')
  const [engajamento, setEngajamento] = useState('')
  const [alcance,     setAlcance]     = useState('')

  // Contexto
  const [naofunciona, setNaoFunciona] = useState('')
  const [jatentou,    setJaTentou]    = useState('')

  // Grupos de imagens
  const [groups, setGroups] = useState<ImageGroup[]>([
    {
      key: 'feed',
      label: 'Seu feed / perfil',
      hint: 'Print do grid do feed, bio e foto de perfil. Mostre como o perfil aparece hoje.',
      icon: <ImageIcon className="w-3.5 h-3.5" />,
      max: 3,
      images: [],
    },
    {
      key: 'insights',
      label: 'Insights do Instagram',
      hint: 'Prints do app de insights: alcance, impressões, engajamento, dados de audiência.',
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      max: 4,
      images: [],
    },
    {
      key: 'concorrentes',
      label: 'Perfis de concorrentes',
      hint: 'Prints dos feeds, bios ou posts de concorrentes que você quer comparar.',
      icon: <Users className="w-3.5 h-3.5" />,
      max: 4,
      images: [],
    },
    {
      key: 'top_posts',
      label: 'Posts que mais performaram',
      hint: 'Prints dos seus conteúdos com mais curtidas, comentários ou alcance.',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      max: 3,
      images: [],
    },
  ])

  const updateGroup = (key: string, images: string[]) => {
    setGroups(prev => prev.map(g => g.key === key ? { ...g, images } : g))
  }

  const toggleFormato = (f: Formato) =>
    setFormatos(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const totalImages = groups.reduce((acc, g) => acc + g.images.length, 0)
  const canStart    = nicho.trim().length > 0 || totalImages > 0

  const objetivoLabel: Record<Objetivo, string> = {
    seguidores:     'Crescer seguidores',
    posicionamento: 'Fortalecer posicionamento',
    vendas:         'Gerar mais vendas',
  }

  const handleStart = () => {
    // Monta o prompt estruturado
    const lines: string[] = [
      'Faça o **diagnóstico completo** do perfil abaixo usando todos os seus agentes (Sherlock, Vera, Nina e Max).',
      '',
    ]

    if (nicho.trim()) {
      lines.push('## Nicho / Mercado', nicho.trim(), '')
    }

    lines.push('## Objetivo Principal', objetivoLabel[objetivo], '')

    if (bio.trim()) {
      lines.push('## Bio do Perfil', `"${bio.trim()}"`, '')
    }

    if (formatos.length > 0) {
      lines.push('## Formatos Utilizados', formatos.join(', '), '')
    }

    if (freq) {
      lines.push('## Frequência de Postagem', freq, '')
    }

    const temDados = seguidores || engajamento || alcance
    if (temDados) {
      lines.push('## Dados do Perfil')
      if (seguidores)  lines.push(`- Seguidores: ${seguidores}`)
      if (engajamento) lines.push(`- Taxa de engajamento: ${engajamento}%`)
      if (alcance)     lines.push(`- Alcance médio por post: ${alcance}`)
      lines.push('')
    }

    if (naofunciona.trim()) {
      lines.push('## O Que Não Está Funcionando', naofunciona.trim(), '')
    }

    if (jatentou.trim()) {
      lines.push('## O Que Já Foi Tentado', jatentou.trim(), '')
    }

    // Descreve os grupos de prints
    const groupLabels: Record<string, string> = {
      feed:          'Feed / perfil atual',
      insights:      'Insights do Instagram',
      concorrentes:  'Perfis de concorrentes',
      top_posts:     'Posts que mais performaram',
    }
    const comImagens = groups.filter(g => g.images.length > 0)
    if (comImagens.length > 0) {
      lines.push('## Prints Enviados para Análise Visual')
      comImagens.forEach(g => {
        lines.push(`- **${groupLabels[g.key]}**: ${g.images.length} print(s)`)
      })
      lines.push('')
      lines.push('> Analise visualmente cada grupo de prints conforme categorizado acima.')
      lines.push('')
    }

    lines.push(
      '---',
      'Execute o diagnóstico completo em sequência:',
      '1. **Sherlock** — analise visual do feed e comparativo com concorrentes (pelos prints)',
      '2. **Vera** — leia os insights enviados e mapeie oportunidades de crescimento',
      '3. **Nina** — identifique o principal gargalo que está travando os resultados',
      '4. **Max** — entregue um plano de ação com calendário de 30 dias baseado em tudo acima',
    )

    // Coleta todas as imagens na ordem: feed → insights → concorrentes → top_posts
    const allImages = groups.flatMap(g => g.images)

    onStart(lines.join('\n'), allImages)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f0f0] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
            <span className="text-[17px]">🔍</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-[#0f0f0f]">Diagnóstico de Perfil</h2>
            <p className="text-[11px] text-[#888]">Sherlock · Vera · Nina · Max</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors">
            <X className="w-4 h-4 text-[#999]" />
          </button>
        </div>

        {/* Aviso */}
        <div className="mx-4 mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex-shrink-0">
          <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 leading-snug">
            A IA não acessa links externos. Por isso, o diagnóstico funciona com <strong>prints que você enviar</strong> + dados que você informar aqui.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Nicho */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-1.5">
              Nicho / mercado <span className="text-red-500">*</span>
            </label>
            <textarea
              value={nicho}
              onChange={e => setNicho(e.target.value)}
              placeholder="Ex: clínica de estética focada em procedimentos para mulheres de 30 a 50 anos em São Paulo..."
              rows={2}
              className="w-full px-3 py-2.5 border border-[#e0e0e0] rounded-xl text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#bbb]"
            />
          </div>

          {/* Objetivo */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-2">
              Objetivo principal
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'seguidores',     icon: Users,      label: 'Crescer\nseguidores' },
                { value: 'posicionamento', icon: Target,     label: 'Posicio-\nnamento' },
                { value: 'vendas',         icon: TrendingUp, label: 'Mais\nvendas' },
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

          {/* Bio */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-1.5">
              Bio do perfil
              <span className="ml-1 text-[10px] font-normal text-[#aaa] normal-case">(cole o texto da bio aqui)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Cole aqui o texto da bio do Instagram..."
              rows={2}
              className="w-full px-3 py-2.5 border border-[#e0e0e0] rounded-xl text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#bbb]"
            />
          </div>

          {/* Formatos + Frequência */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-2">
                Formatos usados
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['reels', 'posts', 'carrosséis', 'stories', 'lives'] as Formato[]).map(f => (
                  <button
                    key={f}
                    onClick={() => toggleFormato(f)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[10.5px] font-medium border transition-all capitalize',
                      formatos.includes(f)
                        ? 'bg-[#6366f1] border-[#6366f1] text-white'
                        : 'border-[#e0e0e0] text-[#666] hover:border-[#c4b5fd]',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-2">
                Frequência
              </label>
              <select
                value={freq}
                onChange={e => setFreq(e.target.value)}
                className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-[12px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] text-[#555] bg-white"
              >
                <option value="">Selecionar...</option>
                <option>Todos os dias</option>
                <option>3–4x por semana</option>
                <option>2x por semana</option>
                <option>1x por semana</option>
                <option>Irregular</option>
              </select>
            </div>
          </div>

          {/* Dados numéricos */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-2">
              Dados que você já tem
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Seguidores', value: seguidores, set: setSeguidores, placeholder: 'Ex: 5.200' },
                { label: 'Engajamento %', value: engajamento, set: setEngajamento, placeholder: 'Ex: 3,5' },
                { label: 'Alcance médio', value: alcance, set: setAlcance, placeholder: 'Ex: 800' },
              ].map(field => (
                <div key={field.label}>
                  <p className="text-[9.5px] text-[#999] font-medium mb-1">{field.label}</p>
                  <input
                    value={field.value}
                    onChange={e => field.set(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-2.5 py-2 border border-[#e0e0e0] rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#ccc]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Prints — a parte mais importante */}
          <div className="border border-[#e8e8e8] rounded-xl p-4 bg-[#fafafa] space-y-5">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#6366f1]" />
              <p className="text-[11px] font-bold text-[#333] uppercase tracking-wide">Prints para análise visual</p>
              <span className="ml-auto text-[10px] text-[#999]">{totalImages} enviado(s)</span>
            </div>
            {groups.map(group => (
              <ImageUploadSection
                key={group.key}
                group={group}
                onChange={images => updateGroup(group.key, images)}
              />
            ))}
          </div>

          {/* O que não funciona */}
          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-1.5">
              O que não está funcionando
              <span className="ml-1 text-[10px] font-normal text-[#aaa] normal-case">(opcional mas muito útil)</span>
            </label>
            <textarea
              value={naofunciona}
              onChange={e => setNaoFunciona(e.target.value)}
              placeholder="Ex: os reels têm alcance mas ninguém segue, os posts não engajam, as stories somem sem interação..."
              rows={2}
              className="w-full px-3 py-2.5 border border-[#e0e0e0] rounded-xl text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#bbb]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-wide mb-1.5">
              O que você já tentou
              <span className="ml-1 text-[10px] font-normal text-[#aaa] normal-case">(opcional)</span>
            </label>
            <textarea
              value={jatentou}
              onChange={e => setJaTentou(e.target.value)}
              placeholder="Ex: já tentei postar mais vezes, usar trending sounds, contratar editor, fazer ads..."
              rows={2}
              className="w-full px-3 py-2.5 border border-[#e0e0e0] rounded-xl text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-[#bbb]"
            />
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
