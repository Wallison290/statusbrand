// ── Página: Agendamento Instagram ─────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Instagram, Plus, Calendar, Image, Film, LayoutGrid,
  CheckCircle2, XCircle, Clock, Loader2, Upload, X,
  ExternalLink, Unlink, RefreshCw, AlertCircle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import {
  useInstagramAccount,
  useScheduledPosts,
  useCreateScheduledPost,
  useCancelScheduledPost,
  useDisconnectInstagram,
  type ScheduledPost,
} from '@/hooks/useInstagram'

// ── Env vars ──────────────────────────────────────────────────────────────────
const META_APP_ID  = import.meta.env.VITE_META_APP_ID  as string | undefined
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

// ── Constantes ────────────────────────────────────────────────────────────────

type PostType = 'IMAGE' | 'CAROUSEL_ALBUM' | 'REELS'
type TabType  = 'scheduled' | 'published' | 'failed' | 'cancelled'

const POST_TYPES = [
  { value: 'IMAGE'          as PostType, label: 'Imagem',    Icon: Image,      desc: 'Foto única',   accept: 'image/*',  max: 1  },
  { value: 'CAROUSEL_ALBUM' as PostType, label: 'Carrossel', Icon: LayoutGrid, desc: 'Até 10 fotos', accept: 'image/*',  max: 10 },
  { value: 'REELS'          as PostType, label: 'Reel',      Icon: Film,       desc: 'Vídeo curto',  accept: 'video/*',  max: 1  },
]

const STATUS_CFG = {
  scheduled:  { label: 'Agendado',   color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',   Icon: Clock,         spin: false },
  publishing: { label: 'Publicando', color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200', Icon: Loader2,       spin: true  },
  published:  { label: 'Publicado',  color: 'text-green-600',  bg: 'bg-green-50 border-green-200', Icon: CheckCircle2,  spin: false },
  failed:     { label: 'Falhou',     color: 'text-red-600',    bg: 'bg-red-50 border-red-200',     Icon: XCircle,       spin: false },
  cancelled:  { label: 'Cancelado',  color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',   Icon: X,             spin: false },
} as const

const TABS: { value: TabType; label: string; statuses: string[] }[] = [
  { value: 'scheduled',  label: 'Agendados',  statuses: ['scheduled', 'publishing'] },
  { value: 'published',  label: 'Publicados', statuses: ['published']               },
  { value: 'failed',     label: 'Falhas',     statuses: ['failed']                  },
  { value: 'cancelled',  label: 'Cancelados', statuses: ['cancelled']               },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildOAuthUrl(userId: string) {
  const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth`
  const scope = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_read_engagement',
    'pages_show_list',
  ].join(',')
  return (
    `https://www.facebook.com/dialog/oauth` +
    `?client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}` +
    `&state=${userId}` +
    `&response_type=code`
  )
}

async function uploadMedia(file: File, userId: string): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await (supabase as any).storage.from('post-media').upload(path, file)
  if (error) throw error
  const { data } = (supabase as any).storage.from('post-media').getPublicUrl(path)
  return data.publicUrl as string
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post, onCancel }: { post: ScheduledPost; onCancel: (id: string) => void }) {
  const cfg      = STATUS_CFG[post.status]
  const StatusIcon = cfg.Icon
  const typeCfg  = POST_TYPES.find(t => t.value === post.post_type)
  const TypeIcon = typeCfg?.Icon ?? Image

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-[#64748b]" />
          <span className="text-[13px] font-medium text-[#0f0f0f]">{typeCfg?.label}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border ${cfg.color}`}>
          <StatusIcon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
          {cfg.label}
        </div>
      </div>

      {/* Prévia das mídias */}
      {post.media_urls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {post.media_urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white shadow-sm flex-shrink-0">
              {post.post_type === 'REELS'
                ? <video src={url} className="w-full h-full object-cover" />
                : <img src={url} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              }
              {i === 3 && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[11px] font-bold">
                  +{post.media_urls.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legenda */}
      {post.caption && (
        <p className="text-[13px] text-[#374151] line-clamp-2 leading-relaxed">{post.caption}</p>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5 text-[12px] text-[#64748b]">
          <Calendar className="w-3.5 h-3.5" />
          {format(parseISO(post.scheduled_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
        </div>

        <div className="flex items-center gap-3">
          {post.status === 'scheduled' && (
            <button
              onClick={() => onCancel(post.id)}
              className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Cancelar
            </button>
          )}
          {post.ig_post_id && (
            <a
              href={`https://www.instagram.com/p/${post.ig_post_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#6366f1] hover:underline font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              Ver no Instagram
            </a>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {post.error_message && (
        <div className="flex items-start gap-2 text-[11px] text-red-700 bg-white rounded-xl px-3 py-2 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{post.error_message}</span>
        </div>
      )}
    </div>
  )
}

// ── Modal: Novo Post ──────────────────────────────────────────────────────────

interface NewPostModalProps {
  accountId: string
  userId:    string
  onClose:   () => void
}

function NewPostModal({ accountId, userId, onClose }: NewPostModalProps) {
  const [postType,    setPostType]    = useState<PostType | null>(null)
  const [files,       setFiles]       = useState<File[]>([])
  const [previews,    setPreviews]    = useState<string[]>([])
  const [caption,     setCaption]     = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [uploading,   setUploading]   = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)
  const { toast }  = useToast()
  const create   = useCreateScheduledPost()
  const typeCfg  = POST_TYPES.find(t => t.value === postType)

  // Bloqueia scroll do fundo
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleFiles = (list: FileList | null) => {
    if (!list || !typeCfg) return
    const arr  = Array.from(list).slice(0, typeCfg.max)
    const urls = arr.map(f => URL.createObjectURL(f))
    setFiles(prev => postType === 'CAROUSEL_ALBUM' ? [...prev, ...arr].slice(0, typeCfg.max) : arr)
    setPreviews(prev => postType === 'CAROUSEL_ALBUM' ? [...prev, ...urls].slice(0, typeCfg.max) : urls)
  }

  const removeFile = (i: number) => {
    setFiles(prev    => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async () => {
    if (!postType || files.length === 0 || !scheduledAt) {
      toast({ title: 'Preencha todos os campos obrigatórios', type: 'error' })
      return
    }
    const scheduled = new Date(scheduledAt)
    if (scheduled <= new Date()) {
      toast({ title: 'O horário deve ser no futuro', type: 'error' })
      return
    }
    setUploading(true)
    try {
      const mediaUrls: string[] = []
      for (const file of files) {
        const url = await uploadMedia(file, userId)
        mediaUrls.push(url)
      }
      await create.mutateAsync({
        ig_account_id: accountId,
        client_id:     null,
        post_type:     postType,
        caption,
        media_urls:    mediaUrls,
        scheduled_at:  scheduled.toISOString(),
      })
      toast({ title: 'Post agendado com sucesso!', type: 'success' })
      onClose()
    } catch {
      toast({ title: 'Erro ao agendar post. Tente novamente.', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const minDatetime = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)
  const canSubmit   = !!postType && files.length > 0 && !!scheduledAt && !uploading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header fixo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-[#0f0f0f]">Novo post agendado</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center hover:bg-[#eee] transition-colors"
          >
            <X className="w-4 h-4 text-[#737373]" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Tipo de post */}
          <div>
            <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3 block">
              Tipo de post
            </label>
            <div className="grid grid-cols-3 gap-2">
              {POST_TYPES.map(type => {
                const Icon    = type.Icon
                const active  = postType === type.value
                return (
                  <button
                    key={type.value}
                    onClick={() => { setPostType(type.value); setFiles([]); setPreviews([]) }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      active
                        ? 'border-[#6366f1] bg-[#f5f3ff]'
                        : 'border-[#e8e8e8] hover:border-[#d0d0d0] bg-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-[#6366f1]' : 'text-[#94a3b8]'}`} />
                    <div className="text-center">
                      <div className={`text-[12px] font-semibold ${active ? 'text-[#6366f1]' : 'text-[#374151]'}`}>
                        {type.label}
                      </div>
                      <div className="text-[10px] text-[#94a3b8] mt-0.5">{type.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upload de mídia */}
          {postType && (
            <div>
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3 block">
                {postType === 'REELS' ? 'Vídeo' : postType === 'CAROUSEL_ALBUM' ? `Imagens (${files.length}/${typeCfg?.max})` : 'Imagem'}
              </label>

              {previews.length === 0 ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-36 rounded-2xl border-2 border-dashed border-[#e2e8f0] hover:border-[#6366f1] hover:bg-[#f5f3ff] transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <Upload className="w-6 h-6 text-[#94a3b8] group-hover:text-[#6366f1] transition-colors" />
                  <span className="text-[13px] text-[#94a3b8] group-hover:text-[#6366f1] transition-colors font-medium">
                    Clique para selecionar
                  </span>
                  <span className="text-[11px] text-[#c0c0c0]">
                    {postType === 'REELS' ? 'MP4 até 200 MB' : 'JPG, PNG até 200 MB'}
                  </span>
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {previews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#e2e8f0] flex-shrink-0">
                      {postType === 'REELS'
                        ? <video src={url} className="w-full h-full object-cover" />
                        : <img src={url} alt="" className="w-full h-full object-cover" />
                      }
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {postType === 'CAROUSEL_ALBUM' && files.length < (typeCfg?.max ?? 10) && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-[#e2e8f0] hover:border-[#6366f1] flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <Plus className="w-5 h-5 text-[#94a3b8]" />
                    </button>
                  )}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept={typeCfg?.accept}
                multiple={postType === 'CAROUSEL_ALBUM'}
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
            </div>
          )}

          {/* Legenda */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                Legenda
              </label>
              <span className="text-[11px] text-[#94a3b8]">{caption.length}/2200</span>
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, 2200))}
              placeholder="Escreva a legenda do post com hashtags, emojis..."
              rows={4}
              className="w-full rounded-2xl border border-[#e2e8f0] px-4 py-3 text-[13px] text-[#0f0f0f] placeholder-[#c0c0c0] resize-none focus:outline-none focus:border-[#6366f1] transition-colors leading-relaxed"
            />
          </div>

          {/* Data e hora */}
          <div>
            <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2 block">
              Data e hora de publicação
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDatetime}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full rounded-2xl border border-[#e2e8f0] px-4 py-3 text-[13px] text-[#0f0f0f] focus:outline-none focus:border-[#6366f1] transition-colors"
            />
          </div>
        </div>

        {/* Footer fixo */}
        <div className="px-6 pb-6 pt-4 border-t border-[#f0f0f0] flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-2xl bg-[#0f0f0f] text-white text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando mídia...</>
              : <><Calendar className="w-4 h-4" /> Agendar post</>
            }
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function InstagramPage() {
  const { user }          = useAuth()
  const [searchParams]    = useSearchParams()
  const [tab, setTab]     = useState<TabType>('scheduled')
  const [showModal, setShowModal] = useState(false)
  const { toast } = useToast()

  const { data: account, isLoading: loadingAccount, refetch: refetchAccount } = useInstagramAccount()
  const { data: posts = [], isLoading: loadingPosts, refetch: refetchPosts }  = useScheduledPosts()
  const cancelPost   = useCancelScheduledPost()
  const disconnect   = useDisconnectInstagram()

  // Processa retorno do OAuth
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error     = searchParams.get('error')
    if (connected === 'true') {
      toast({ title: 'Instagram conectado com sucesso!', type: 'success' })
      window.history.replaceState({}, '', '/instagram')
      refetchAccount()
    }
    if (error) {
      const msgs: Record<string, string> = {
        auth_denied:          'Autorização negada pelo usuário',
        no_instagram_account: 'Nenhuma conta Business ou Creator encontrada',
        token_exchange_failed:'Erro na autenticação com o Meta',
        save_failed:          'Erro ao salvar dados da conta',
        unknown:              'Erro desconhecido. Tente novamente.',
      }
      toast({ title: msgs[error] ?? error, type: 'error' })
      window.history.replaceState({}, '', '/instagram')
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    if (!META_APP_ID) {
      toast({ title: 'Configure VITE_META_APP_ID nas variáveis de ambiente', type: 'error' })
      return
    }
    window.location.href = buildOAuthUrl(user!.id)
  }

  const handleDisconnect = async () => {
    if (!account || !confirm('Desconectar esta conta do Instagram?')) return
    await disconnect.mutateAsync(account.id)
    toast({ title: 'Conta desconectada', type: 'success' })
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este post agendado?')) return
    await cancelPost.mutateAsync(id)
    toast({ title: 'Post cancelado', type: 'success' })
  }

  const filteredPosts = posts.filter(p =>
    TABS.find(t => t.value === tab)?.statuses.includes(p.status)
  )

  const scheduledCount = posts.filter(p => ['scheduled', 'publishing'].includes(p.status)).length

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-[#0f0f0f] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              Agendamento Instagram
            </h1>
            <p className="text-[13px] text-[#64748b] mt-1">
              Agende posts, carrosséis e Reels direto pelo sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { refetchAccount(); refetchPosts() }}
              className="w-9 h-9 rounded-xl border border-[#e8e8e8] bg-white flex items-center justify-center text-[#94a3b8] hover:text-[#0f0f0f] hover:border-[#d0d0d0] transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {account && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0f0f0f] text-white rounded-2xl text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Novo post
              </button>
            )}
          </div>
        </div>

        {/* Card de conta */}
        {loadingAccount ? (
          <div className="bg-white rounded-3xl border border-[#e8e8e8] p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#94a3b8]" />
          </div>
        ) : account ? (
          <div className="bg-white rounded-3xl border border-[#e8e8e8] p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {account.profile_picture_url ? (
                <img
                  src={account.profile_picture_url}
                  alt={account.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#E1306C]/20 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold text-[#0f0f0f] truncate">
                    @{account.username}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] text-green-600 font-medium">Conectado</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[12px] text-[#64748b]">
                    <span className="font-semibold text-[#0f0f0f]">
                      {account.followers_count.toLocaleString('pt-BR')}
                    </span>{' '}seguidores
                  </span>
                  <span className="text-[12px] text-[#64748b]">
                    <span className="font-semibold text-[#0f0f0f]">{scheduledCount}</span> agendados
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] text-[#94a3b8] hover:text-red-500 hover:bg-red-50 transition-colors font-medium"
            >
              <Unlink className="w-3.5 h-3.5" />
              Desconectar
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#e8e8e8] p-12 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center shadow-lg shadow-pink-200">
              <Instagram className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[#0f0f0f]">Conecte seu Instagram</h2>
              <p className="text-[13px] text-[#64748b] mt-1.5 max-w-xs leading-relaxed">
                Conecte uma conta <strong>Business ou Creator</strong> vinculada a uma Página do Facebook.
              </p>
            </div>
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E1306C] to-[#833AB4] text-white rounded-2xl text-[14px] font-semibold hover:opacity-90 transition-opacity shadow-md"
            >
              <Instagram className="w-4 h-4" />
              Conectar Instagram
            </button>
            <p className="text-[11px] text-[#94a3b8] max-w-xs">
              Você será redirecionado para o Meta para autorizar o acesso. Apenas você terá controle da conta.
            </p>
          </div>
        )}

        {/* Lista de posts */}
        {account && (
          <div className="bg-white rounded-3xl border border-[#e8e8e8] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[#f0f0f0] px-2 pt-2 overflow-x-auto">
              {TABS.map(t => {
                const count  = posts.filter(p => t.statuses.includes(p.status)).length
                const active = tab === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-t-xl transition-colors ${
                      active ? 'text-[#0f0f0f]' : 'text-[#94a3b8] hover:text-[#64748b]'
                    }`}
                  >
                    {t.label}
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                        active ? 'bg-[#0f0f0f] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                      }`}>
                        {count}
                      </span>
                    )}
                    {active && (
                      <motion.div
                        layoutId="tab-bar"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0f0f0f] rounded-full"
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Conteúdo */}
            <div className="p-4">
              {loadingPosts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-[#94a3b8]" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                  <Calendar className="w-8 h-8 text-[#e2e8f0]" />
                  <p className="text-[13px] text-[#94a3b8]">
                    {tab === 'scheduled' ? 'Nenhum post agendado ainda' : 'Nada aqui ainda'}
                  </p>
                  {tab === 'scheduled' && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="text-[13px] text-[#6366f1] font-semibold hover:underline"
                    >
                      Criar primeiro post
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map(post => (
                    <PostCard key={post.id} post={post} onCancel={handleCancel} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal novo post */}
      <AnimatePresence>
        {showModal && account && (
          <NewPostModal
            accountId={account.id}
            userId={user!.id}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
