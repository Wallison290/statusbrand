import { useState } from 'react'
import {
  ImageIcon, Video, Music, FileText, File,
  ExternalLink, Link2, Building2, Pencil, Trash2, Check,
  Instagram, Calendar, Loader2, AlertCircle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUpdatePlannerItem, useDeletePlannerItem } from '@/hooks/usePlanner'
import { useToast } from '@/components/ui/toast'
import { contentTypeLabels } from '@/utils/formatters'
import { PlannerCommentsThread } from '@/components/PlannerCommentsThread'
import { useClientInstagramAccount, useCreateScheduledPost } from '@/hooks/useInstagram'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import type { PlannerItem, PlannerAttachment, PlannerStatus, ContentType, ApprovalStatus } from '@/types'

// ─── Config ───────────────────────────────────────────────────────────────────

const statusColors: Record<PlannerStatus, string> = {
  ideia: 'bg-purple-500', producao: 'bg-blue-500', revisao: 'bg-yellow-500',
  aprovado: 'bg-green-500', publicado: 'bg-emerald-500',
}
const statusTextColors: Record<PlannerStatus, string> = {
  ideia: 'text-purple-400', producao: 'text-blue-400', revisao: 'text-yellow-400',
  aprovado: 'text-green-400', publicado: 'text-emerald-400',
}
const statusLabels: Record<PlannerStatus, string> = {
  ideia: 'Ideia', producao: 'Produção', revisao: 'Revisão',
  aprovado: 'Aprovado', publicado: 'Publicado',
}
const approvalDot: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'bg-yellow-400', aprovado: 'bg-green-400',
  ajuste_solicitado: 'bg-orange-400', ajuste_realizado: 'bg-blue-400', reprovado: 'bg-red-400',
}
const approvalTextColor: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'text-yellow-400', aprovado: 'text-green-400',
  ajuste_solicitado: 'text-orange-400', ajuste_realizado: 'text-blue-400', reprovado: 'text-red-400',
}
const approvalLabel: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'Aguardando aprovação', aprovado: 'Aprovado pelo cliente',
  ajuste_solicitado: 'Ajuste solicitado', ajuste_realizado: 'Ajuste realizado — aguardando revisão',
  reprovado: 'Reprovado pelo cliente',
}

const PLANNER_STATUSES: { value: PlannerStatus; label: string }[] = [
  { value: 'ideia',     label: 'Ideia' },
  { value: 'producao',  label: 'Produção' },
  { value: 'revisao',   label: 'Revisão' },
  { value: 'aprovado',  label: 'Aprovado' },
  { value: 'publicado', label: 'Publicado' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileTypeIcon({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
  if (type.startsWith('image/')) return <ImageIcon className={`${cls} text-blue-400`} />
  if (type.startsWith('video/')) return <Video     className={`${cls} text-purple-400`} />
  if (type.startsWith('audio/')) return <Music     className={`${cls} text-green-400`} />
  if (type === 'application/pdf') return <FileText className={`${cls} text-red-400`} />
  return <File className={`${cls} text-gray-400`} />
}

// ─── Instagram Schedule Section ───────────────────────────────────────────────

type PostType = 'IMAGE' | 'CAROUSEL_ALBUM' | 'REELS'

const POST_TYPE_OPTS: { value: PostType; label: string }[] = [
  { value: 'IMAGE',          label: 'Imagem' },
  { value: 'CAROUSEL_ALBUM', label: 'Carrossel' },
  { value: 'REELS',          label: 'Reel' },
]

async function uploadMediaFromUrl(url: string, userId: string): Promise<string> {
  const res  = await fetch(url)
  const blob = await res.blob()
  const ext  = url.split('.').pop()?.split('?')[0] ?? 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await (supabase as any).storage.from('post-media').upload(path, blob)
  if (error) throw error
  const { data } = (supabase as any).storage.from('post-media').getPublicUrl(path)
  return data.publicUrl as string
}

function InstagramScheduleSection({ item }: { item: PlannerItem }) {
  const { user } = useAuth()
  const { data: igAccount, isLoading: igLoading } = useClientInstagramAccount(item.client_id ?? undefined)
  const createPost = useCreateScheduledPost()
  const { toast } = useToast()

  const imageAttachments = item.attachments?.filter(a => a.file_type.startsWith('image/')) ?? []
  const videoAttachments = item.attachments?.filter(a => a.file_type.startsWith('video/')) ?? []

  const [postType, setPostType]     = useState<PostType>('IMAGE')
  const [caption, setCaption]       = useState(item.notes ?? '')
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduledTime, setScheduledTime] = useState(item.scheduled_time?.slice(0, 5) ?? '09:00')
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess]       = useState(false)

  // Pré-preenche data com a data do item
  const defaultDate = item.scheduled_date

  const handleSchedule = async () => {
    if (!igAccount || !user) return
    const date = scheduledAt || defaultDate
    if (!date || !scheduledTime) {
      toast('Preencha a data e horário.', 'error')
      return
    }
    const attachments = postType === 'REELS' ? videoAttachments : imageAttachments
    if (attachments.length === 0) {
      toast('Este post não tem mídia anexada no planejador.', 'error')
      return
    }

    setPublishing(true)
    try {
      // Faz upload das mídias para o bucket post-media
      const mediaUrls: string[] = []
      for (const att of attachments.slice(0, postType === 'CAROUSEL_ALBUM' ? 10 : 1)) {
        const publicUrl = await uploadMediaFromUrl(att.file_url, user.id)
        mediaUrls.push(publicUrl)
      }

      const scheduledAtISO = new Date(`${date}T${scheduledTime}:00`).toISOString()

      await createPost.mutateAsync({
        ig_account_id: igAccount.id,
        client_id:     item.client_id,
        post_type:     postType,
        caption,
        media_urls:    mediaUrls,
        scheduled_at:  scheduledAtISO,
      })

      setSuccess(true)
      toast('Post agendado no Instagram!', 'success')
    } catch (err: any) {
      toast(err.message ?? 'Erro ao agendar.', 'error')
    } finally {
      setPublishing(false)
    }
  }

  if (igLoading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
        <span className="text-xs text-gray-400">Verificando conta Instagram...</span>
      </div>
    )
  }

  if (!item.client_id) {
    return (
      <div className="flex items-center gap-2 p-3 bg-white/3 rounded-xl border border-white/8">
        <AlertCircle className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <p className="text-xs text-gray-400">Este post não está vinculado a um cliente.</p>
      </div>
    )
  }

  if (!igAccount) {
    return (
      <div className="p-3 bg-white/3 rounded-xl border border-white/8 space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
          >
            <Instagram className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-xs text-gray-300 font-medium">Instagram não conectado</p>
        </div>
        <p className="text-[11px] text-gray-500">
          Acesse o perfil do cliente → aba <strong className="text-gray-400">Instagram</strong> para conectar a conta.
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-emerald-400">Post agendado!</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Veja o status em <strong className="text-gray-400">Instagram → Agendados</strong>.</p>
        </div>
      </div>
    )
  }

  const imageCount = imageAttachments.length
  const videoCount = videoAttachments.length
  const hasMedia   = imageCount > 0 || videoCount > 0

  return (
    <div className="p-3 bg-white/3 rounded-xl border border-white/8 space-y-3">
      {/* Conta conectada */}
      <div className="flex items-center gap-2">
        {igAccount.profile_picture_url ? (
          <img src={igAccount.profile_picture_url} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
          >
            <Instagram className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <span className="text-xs text-gray-300 font-medium">@{igAccount.username}</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
          Conectado
        </span>
      </div>

      {/* Alerta sem mídia */}
      {!hasMedia && (
        <div className="flex items-center gap-2 text-[11px] text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Nenhuma imagem/vídeo anexado. Adicione mídia ao item no planejador.
        </div>
      )}

      {/* Tipo do post */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Tipo de post</p>
        <div className="flex gap-1.5">
          {POST_TYPE_OPTS.filter(o =>
            o.value === 'REELS' ? videoCount > 0 : imageCount > 0
          ).map(opt => (
            <button
              key={opt.value}
              onClick={() => setPostType(opt.value)}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
                postType === opt.value
                  ? 'bg-[#6366f1] text-white border-[#6366f1]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
              }`}
            >
              {opt.label}
              {opt.value === 'IMAGE' && imageCount > 0 && ` (${Math.min(1, imageCount)})`}
              {opt.value === 'CAROUSEL_ALBUM' && imageCount > 1 && ` (${Math.min(10, imageCount)})`}
              {opt.value === 'REELS' && videoCount > 0 && ` (1)`}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Legenda</p>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          rows={3}
          placeholder="Legenda do post..."
          className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-[#6366f1]/50 transition-colors"
        />
      </div>

      {/* Data e hora */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Data</p>
          <input
            type="date"
            value={scheduledAt || defaultDate}
            onChange={e => setScheduledAt(e.target.value)}
            className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-[#6366f1]/50 transition-colors"
          />
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Horário</p>
          <input
            type="time"
            value={scheduledTime}
            onChange={e => setScheduledTime(e.target.value)}
            className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-[#6366f1]/50 transition-colors"
          />
        </div>
      </div>

      {/* Botão */}
      <Button
        size="sm"
        onClick={handleSchedule}
        disabled={publishing || !hasMedia}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
      >
        {publishing ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Agendando...</>
        ) : (
          <><Instagram className="w-3.5 h-3.5" /> Agendar no Instagram</>
        )}
      </Button>
    </div>
  )
}

// ─── Bloco de status Arte / Copy para a agência ───────────────────────────────

const approvalBg: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'border-yellow-500/20 bg-yellow-500/5',
  aprovado:           'border-green-500/20 bg-green-500/5',
  ajuste_solicitado:  'border-orange-500/20 bg-orange-500/5',
  ajuste_realizado:   'border-blue-500/20 bg-blue-500/5',
  reprovado:          'border-red-500/20 bg-red-500/5',
}

function ApprovalFieldBlock({
  label, status, feedback, showAction, onMarkDone, isPending,
}: {
  label: string
  status: ApprovalStatus
  feedback: string | null
  showAction: boolean
  onMarkDone: () => Promise<void>
  isPending: boolean
}) {
  return (
    <div className={`rounded-xl border p-3 ${approvalBg[status]}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[status]}`} />
          <span className={`text-[11px] font-semibold ${approvalTextColor[status]}`}>
            {approvalLabel[status]}
          </span>
        </div>
      </div>

      {/* Feedback do cliente */}
      {feedback && (status === 'ajuste_solicitado' || status === 'reprovado') && (
        <div className="mt-2 flex items-start gap-2 bg-black/20 rounded-lg px-2.5 py-2">
          <span className="text-[10px] text-gray-500 flex-shrink-0 mt-0.5">Cliente:</span>
          <p className="text-xs text-gray-200 leading-relaxed break-words select-text flex-1">"{feedback}"</p>
        </div>
      )}

      {/* Botão ajuste realizado */}
      {showAction && status === 'ajuste_solicitado' && (
        <button
          onClick={onMarkDone}
          disabled={isPending}
          className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-colors disabled:opacity-50"
        >
          {isPending
            ? <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            : <Check className="w-3 h-3" />}
          Marcar ajuste de {label} como realizado
        </button>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlannerItemViewModal({
  item,
  open,
  onClose,
  showAgencyActions = false,
}: {
  item: PlannerItem
  open: boolean
  onClose: () => void
  showAgencyActions?: boolean
}) {
  const images = item.attachments?.filter(a => a.file_type.startsWith('image/')) || []
  const otherAttachments = item.attachments?.filter((a: PlannerAttachment) => !a.file_type.startsWith('image/')) || []

  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState<PlannerStatus>(item.status as PlannerStatus)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [localApprovalStatus, setLocalApprovalStatus] = useState<ApprovalStatus | null>(
    item.approval_status as ApprovalStatus | null
  )

  const updateItem = useUpdatePlannerItem()
  const deleteItem = useDeletePlannerItem()
  const { toast } = useToast()

  const handleMarkAdjustmentDone = async () => {
    try {
      await updateItem.mutateAsync({ id: item.id, approval_status: 'ajuste_realizado' })
      setLocalApprovalStatus('ajuste_realizado')
      toast('Ajuste marcado como realizado.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleStatusSave = async () => {
    try {
      await updateItem.mutateAsync({ id: item.id, status: newStatus })
      toast('Status atualizado!', 'success')
      setEditingStatus(false)
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.id)
      toast('Item removido.', 'success')
      onClose()
    } catch (err: any) {
      toast(err.message, 'error')
      setConfirmDelete(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setConfirmDelete(false); setEditingStatus(false) } }}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[item.status as PlannerStatus]}`} />
            <DialogTitle className="text-base leading-snug break-words min-w-0 select-text">{item.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-1.5 ml-4.5 flex-wrap">
            <span className="text-xs text-gray-500">
              {format(parseISO(item.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-500">
              {contentTypeLabels[item.content_type as ContentType]}
            </span>
            <span className="text-gray-700">·</span>
            <span className={`text-xs font-medium ${statusTextColors[item.status as PlannerStatus]}`}>
              {statusLabels[item.status as PlannerStatus]}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1 min-w-0 w-full max-w-full overflow-x-hidden">

          {/* Cliente */}
          {item.client && (
            <div className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/8">
              <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Cliente</p>
                <p className="text-sm text-white font-medium">{item.client.company_name}</p>
              </div>
            </div>
          )}

          {/* Status inline edit (agency only) */}
          {showAgencyActions && (
            <div className="p-3 bg-white/3 rounded-xl border border-white/8">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Status</p>
              {editingStatus ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={newStatus}
                    onValueChange={v => setNewStatus(v as PlannerStatus)}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANNER_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleStatusSave} disabled={updateItem.isPending}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingStatus(false); setNewStatus(item.status as PlannerStatus) }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[item.status as PlannerStatus]}`} />
                  <span className={`text-sm font-medium ${statusTextColors[item.status as PlannerStatus]}`}>
                    {statusLabels[item.status as PlannerStatus]}
                  </span>
                  <button
                    onClick={() => setEditingStatus(true)}
                    className="ml-auto flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Alterar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notas */}
          {item.notes && (
            <div className="p-3 bg-white/3 rounded-xl border border-white/8">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Notas</p>
              <p className="text-sm text-[#0f0f0f] leading-relaxed whitespace-pre-wrap break-words select-text">{item.notes}</p>
            </div>
          )}

          {/* Imagens */}
          {images.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Imagens</p>
              <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {images.map(img => (
                  <a key={img.id} href={img.file_url} target="_blank" rel="noopener noreferrer"
                    className="block w-full max-w-full overflow-hidden rounded-xl border border-white/8 hover:border-white/20 transition-colors">
                    <img src={img.file_url} alt={img.file_name} className="w-full max-w-full object-contain max-h-[60vh]" />
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/3">
                      <ImageIcon className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-gray-400 truncate flex-1">{img.file_name}</span>
                      <ExternalLink className="w-3 h-3 text-gray-600" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Outros anexos */}
          {otherAttachments.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Anexos</p>
              <div className="space-y-1.5">
                {otherAttachments.map((att: PlannerAttachment) => (
                  <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 bg-white/3 border border-white/8 rounded-xl hover:border-white/20 hover:bg-white/5 transition-colors min-w-0 max-w-full overflow-hidden">
                    <FileTypeIcon type={att.file_type} size="md" />
                    <span className="text-xs text-gray-300 truncate flex-1">{att.file_name}</span>
                    {att.file_size && (
                      <span className="text-[10px] text-gray-600 flex-shrink-0">{formatFileSize(att.file_size)}</span>
                    )}
                    <ExternalLink className="w-3 h-3 text-gray-600 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {item.links && item.links.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Links</p>
              <div className="space-y-1.5">
                {item.links.map(link => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 bg-white/3 border border-white/8 rounded-xl hover:border-white/20 hover:bg-white/5 transition-colors min-w-0 overflow-hidden">
                    <Link2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-blue-300 flex-1 min-w-0 break-all">{link.label || link.url}</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resposta do cliente — Arte e Copy separados */}
          {item.approval_status && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Resposta do Cliente</p>

              {/* Status geral + data */}
              <div className="flex items-center gap-2 px-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${approvalDot[(localApprovalStatus ?? item.approval_status) as ApprovalStatus]}`} />
                <span className={`text-xs font-medium ${approvalTextColor[(localApprovalStatus ?? item.approval_status) as ApprovalStatus]}`}>
                  {approvalLabel[(localApprovalStatus ?? item.approval_status) as ApprovalStatus]}
                </span>
                {item.reviewed_at && (
                  <span className="text-[10px] text-gray-600 ml-auto">
                    {format(parseISO(item.reviewed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>

              {/* Arte */}
              {item.art_approval_status && (
                <ApprovalFieldBlock
                  label="Arte"
                  status={item.art_approval_status as ApprovalStatus}
                  feedback={item.art_feedback ?? null}
                  showAction={showAgencyActions}
                  onMarkDone={async () => {
                    await updateItem.mutateAsync({ id: item.id, art_approval_status: 'ajuste_realizado' } as any)
                    toast('Ajuste de Arte marcado como realizado.', 'success')
                  }}
                  isPending={updateItem.isPending}
                />
              )}

              {/* Copy */}
              {item.copy_approval_status && (
                <ApprovalFieldBlock
                  label="Copy"
                  status={item.copy_approval_status as ApprovalStatus}
                  feedback={item.copy_feedback ?? null}
                  showAction={showAgencyActions}
                  onMarkDone={async () => {
                    await updateItem.mutateAsync({ id: item.id, copy_approval_status: 'ajuste_realizado' } as any)
                    toast('Ajuste de Copy marcado como realizado.', 'success')
                  }}
                  isPending={updateItem.isPending}
                />
              )}

              {/* Fallback legado: feedback geral quando não há campos parciais */}
              {!item.art_approval_status && !item.copy_approval_status && item.client_feedback && (
                <p className="text-xs text-gray-300 leading-relaxed bg-white/5 rounded-lg px-3 py-2 break-words select-text">
                  "{item.client_feedback}"
                </p>
              )}

              {/* Botão legado "Ajuste realizado" — só quando não usa campos parciais */}
              {showAgencyActions && !item.art_approval_status && !item.copy_approval_status &&
                (localApprovalStatus ?? item.approval_status) === 'ajuste_solicitado' && (
                <button
                  onClick={handleMarkAdjustmentDone}
                  disabled={updateItem.isPending}
                  className="mt-1 flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                >
                  {updateItem.isPending
                    ? <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    : <Check className="w-3 h-3" />}
                  Ajuste realizado
                </button>
              )}
            </div>
          )}

          {/* Agendar no Instagram */}
          {showAgencyActions && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Instagram className="w-3 h-3" /> Agendar no Instagram
              </p>
              <InstagramScheduleSection item={item} />
            </div>
          )}

          {/* Thread de comentários */}
          <PlannerCommentsThread plannerId={item.id} role="agency" />
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          {showAgencyActions && (
            <>
              {confirmDelete ? (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-[12px] text-gray-400">Confirmar exclusão?</span>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Não</Button>
                  <Button
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteItem.isPending}
                    className="bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25"
                  >
                    Sim, excluir
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="mr-auto flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              )}
            </>
          )}
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
