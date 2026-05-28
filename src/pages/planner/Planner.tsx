import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon,
  Save, Send, Paperclip, Link2, X, FileText, ImageIcon, Video, Music, File,
  Building2, Upload, Trash2, Pencil, CalendarDays, ExternalLink, Check, Instagram, Loader2,
  LayoutGrid, Film,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { usePlanner, useCreatePlannerItem, useUpdatePlannerItem, useDeletePlannerItem } from '@/hooks/usePlanner'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { contentTypeLabels } from '@/utils/formatters'
import { supabase } from '@/integrations/supabase/client'
import { useContentAssets } from '@/hooks/useContentAssets'
import { PlannerCommentsThread } from '@/components/PlannerCommentsThread'
import { useClientInstagramAccount, useCreateScheduledPost } from '@/hooks/useInstagram'
import type { PlannerStatus, PlannerItem, PlannerAttachment, PlannerLink, ContentType, ApprovalStatus, ContentAsset } from '@/types'

// ─── Status config ────────────────────────────────────────────────────────────

const statusColors: Record<PlannerStatus, string> = {
  ideia: 'bg-purple-500',
  producao: 'bg-blue-500',
  revisao: 'bg-yellow-500',
  aprovado: 'bg-green-500',
  publicado: 'bg-emerald-500',
}

const statusTextColors: Record<PlannerStatus, string> = {
  ideia: 'text-purple-400',
  producao: 'text-blue-400',
  revisao: 'text-yellow-400',
  aprovado: 'text-green-400',
  publicado: 'text-emerald-400',
}

const statusLabels: Record<PlannerStatus, string> = {
  ideia: 'Ideia',
  producao: 'Produção',
  revisao: 'Revisão',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
}

// ─── Approval config ─────────────────────────────────────────────────────────

const approvalDot: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'bg-yellow-400',
  aprovado: 'bg-green-400',
  ajuste_solicitado: 'bg-orange-400',
  ajuste_realizado: 'bg-blue-400',
  reprovado: 'bg-red-400',
}
const approvalTextColor: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'text-yellow-400',
  aprovado: 'text-green-400',
  ajuste_solicitado: 'text-orange-400',
  ajuste_realizado: 'text-blue-400',
  reprovado: 'text-red-400',
}
const approvalLabel: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado pelo cliente',
  ajuste_solicitado: 'Ajuste solicitado',
  ajuste_realizado: 'Ajuste realizado',
  reprovado: 'Reprovado pelo cliente',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileTypeIcon({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
  if (type.startsWith('image/')) return <ImageIcon className={`${cls} text-blue-400`} />
  if (type.startsWith('video/')) return <Video className={`${cls} text-purple-400`} />
  if (type.startsWith('audio/')) return <Music className={`${cls} text-green-400`} />
  if (type === 'application/pdf') return <FileText className={`${cls} text-red-400`} />
  return <File className={`${cls} text-gray-400`} />
}

function extractStoragePath(url: string): string | null {
  const marker = '/planner-attachments/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

// ─── Video Preview (pending file — objectURL gerenciado) ─────────────────────

function VideoPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [src, setSrc]           = useState<string>('')
  const [loading, setLoading]   = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    setLoading(true)
    setHasError(false)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!src) return null

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden bg-black">
      {hasError ? (
        // Codec não suportado pelo browser (ex: HEVC/MOV do iOS) — arquivo ainda sobe normalmente
        <div className="flex flex-col items-center justify-center py-5 gap-2 text-gray-400">
          <Video className="w-7 h-7 text-purple-400" />
          <p className="text-[11px] text-center leading-relaxed">
            Preview indisponível neste browser<br />
            <span className="text-gray-600">O arquivo será enviado normalmente ao salvar</span>
          </p>
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          )}
          <video
            src={src}
            muted
            playsInline
            controls
            className="w-full max-h-[220px] object-contain bg-black"
            onCanPlay={() => setLoading(false)}
            onError={() => { setHasError(true); setLoading(false) }}
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.04]">
        <Video className="w-3 h-3 text-purple-400 flex-shrink-0" />
        <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
        <span className="text-[10px] text-gray-600 flex-shrink-0">{formatFileSize(file.size)}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Helpers de mídia ────────────────────────────────────────────────────────

function guessMediaType(url: string): string {
  const lower = url.toLowerCase().split('?')[0]
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(lower)) return 'image/jpeg'
  if (/\.(mp4|mov|webm|avi|mkv|m4v|ogv)$/.test(lower)) return 'video/mp4'
  if (/\.(pdf)$/.test(lower)) return 'application/pdf'
  return 'application/octet-stream'
}

// MIME type com fallback por extensão (para File objects que retornam '' em alguns browsers)
function getMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska', m4v: 'video/mp4', ogv: 'video/ogg',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
    pdf: 'application/pdf',
  }
  return map[ext] || file.type || 'application/octet-stream'
}

// Detecção de vídeo/imagem com fallback por extensão da URL (cobre file_type salvo incorretamente)
function isVideoAttachment(att: { file_type: string; file_url: string }): boolean {
  if (att.file_type.startsWith('video/')) return true
  const url = att.file_url.toLowerCase().split('?')[0]
  return /\.(mp4|mov|webm|avi|mkv|m4v|ogv)$/.test(url)
}

function isImageAttachment(att: { file_type: string; file_url: string }): boolean {
  if (att.file_type.startsWith('image/')) return true
  const url = att.file_url.toLowerCase().split('?')[0]
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(url)
}

// ─── Content Picker Dialog ────────────────────────────────────────────────────

function ContentPickerDialog({
  open,
  onClose,
  clientId,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  clientId: string
  onSelect: (asset: ContentAsset) => void
}) {
  const { data: assets } = useContentAssets(clientId)
  const [search, setSearch] = useState('')

  const filtered = (assets || []).filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl max-h-[80vh] flex flex-col overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Selecionar conteúdo do arsenal</DialogTitle>
        </DialogHeader>

        <input
          type="text"
          placeholder="Buscar por título..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-8 px-3 rounded-md border border-white/[0.08] bg-white/[0.03] text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 mb-3"
        />

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="w-6 h-6 text-zinc-700 mx-auto mb-1.5" />
              <p className="text-[12px] text-zinc-600">
                {(assets || []).length === 0
                  ? 'Nenhum conteúdo no arsenal deste cliente.'
                  : 'Nenhum resultado para a busca.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filtered.map(asset => {
                const isImg = asset.media_url && /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(asset.media_url)
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => { onSelect(asset); onClose() }}
                    className="group text-left rounded-lg border border-white/[0.06] overflow-hidden bg-[#111113] hover:border-white/[0.15] transition-colors"
                  >
                    <div className="aspect-square overflow-hidden bg-white/[0.03]">
                      {isImg ? (
                        <img
                          src={asset.media_url!}
                          alt={asset.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-zinc-700" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] text-zinc-200 truncate">{asset.title}</p>
                      <p className="text-[10px] text-zinc-600">{contentTypeLabels[asset.content_type as ContentType]}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Hover Tooltip (inalterado) ───────────────────────────────────────────────

interface HoverState { items: PlannerItem[]; top: number; left: number }

function DayTooltip({ state }: { state: HoverState }) {
  return (
    <div className="fixed z-50 pointer-events-none" style={{ top: state.top, left: state.left }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.13 }}
        className="bg-white border border-[#e2e8f0] rounded-xl shadow-xl w-[260px] p-3 text-xs text-[#0f0f0f]"
      >
        {state.items.map((item, i) => (
          <div key={item.id} className={i > 0 ? 'mt-2.5 pt-2.5 border-t border-[#f0f0f0]' : ''}>
            <div className="flex items-start gap-2 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full mt-[3px] flex-shrink-0 ${statusColors[item.status as PlannerStatus]}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#0f0f0f] text-[11px] leading-snug">{item.title}</p>
                <p className="text-[10px] text-[#737373] mt-0.5">
                  {contentTypeLabels[item.content_type as ContentType]} · {statusLabels[item.status as PlannerStatus]}
                </p>
              </div>
            </div>
            {item.client && (
              <div className="flex items-center gap-1 mb-1">
                <Building2 className="w-3 h-3 text-[#9ca3af] flex-shrink-0" />
                <span className="text-[10px] text-[#737373] truncate">{item.client.company_name}</span>
              </div>
            )}
            {/* Approval badge no tooltip */}
            {(() => {
              const as_ = (item.approval_status || 'pendente_aprovacao') as ApprovalStatus
              return (
                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md mb-1.5 ${
                  as_ === 'aprovado' ? 'bg-green-50 text-green-900' :
                  as_ === 'ajuste_solicitado' ? 'bg-orange-50 text-orange-900' :
                  as_ === 'ajuste_realizado' ? 'bg-blue-50 text-blue-900' :
                  as_ === 'reprovado' ? 'bg-red-50 text-red-900' :
                  'bg-amber-50 text-amber-900'
                }`}>
                  <div className={`w-1 h-1 rounded-full flex-shrink-0 ${approvalDot[as_]}`} />
                  <span className="text-[9px] font-medium">{approvalLabel[as_]}</span>
                </div>
              )
            })()}
            {item.notes && (
              <p className="text-[10px] text-[#737373] line-clamp-2 mb-1.5 leading-relaxed">{item.notes}</p>
            )}
            {item.client_feedback && (
              <p className="text-[10px] text-[#9ca3af] italic line-clamp-1 mb-1.5">"{item.client_feedback}"</p>
            )}
            {(() => {
              const img = item.attachments?.find(a => isImageAttachment(a))
              const vid = item.attachments?.find(a => isVideoAttachment(a))
              if (img) return <img src={img.file_url} alt="" className="w-full h-20 object-cover rounded-lg mb-1.5" />
              if (vid) return (
                <div className="w-full h-20 rounded-lg mb-1.5 bg-black overflow-hidden">
                  <video
                    src={vid.file_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              )
              return null
            })()}
            <div className="flex items-center gap-3 flex-wrap">
              {item.attachments && item.attachments.length > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3 text-[#9ca3af]" />
                  <span className="text-[10px] text-[#737373]">
                    {item.attachments.length} {item.attachments.length === 1 ? 'anexo' : 'anexos'}
                  </span>
                </div>
              )}
              {item.links && item.links.length > 0 && (
                <div className="flex items-center gap-1 min-w-0">
                  <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  <span className="text-[10px] text-blue-500 truncate">
                    {item.links.length === 1 ? item.links[0].url : `${item.links.length} links`}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Instagram Schedule Section ───────────────────────────────────────────────

type IgPostType = 'IMAGE' | 'CAROUSEL_ALBUM' | 'REELS'

function InstagramScheduleSection({ item }: { item: PlannerItem; userId: string }) {
  const { data: igAccount, isLoading: igLoading } = useClientInstagramAccount(item.client_id ?? undefined)
  const createPost = useCreateScheduledPost()
  const { toast }  = useToast()

  // Tipo vem direto do planner (sem re-seleção)
  const postType = item.ig_post_type as IgPostType | null
  const ptLabel  = postType === 'IMAGE' ? 'imagem'
    : postType === 'CAROUSEL_ALBUM' ? 'carrossel'
    : postType === 'REELS' ? 'reel' : 'post'

  // ── Estados que bloqueiam agendamento ──────────────────────────────────────
  // Aprovado + agendado automaticamente
  if (item.ig_scheduled && item.approval_status === 'aprovado') {
    return (
      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
          <p className="text-xs font-semibold text-emerald-800">Aprovado e agendado automaticamente</p>
        </div>
        <p className="text-[11px] text-emerald-700 leading-relaxed">
          O cliente aprovou este {ptLabel} e ele foi agendado no Instagram automaticamente.
          Acompanhe a publicação na aba <strong>Instagram</strong>.
        </p>
      </div>
    )
  }

  // Ajuste solicitado — cliente pediu correções
  if (item.approval_status === 'ajuste_solicitado') {
    const hasPartial = item.art_approval_status || item.copy_approval_status
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ajuste solicitado pelo cliente</p>

        {hasPartial ? (
          <>
            {/* Arte */}
            {item.art_approval_status && (
              <div className={`p-2.5 rounded-xl border ${
                item.art_approval_status === 'aprovado'
                  ? 'bg-green-50 border-green-200'
                  : item.art_approval_status === 'ajuste_solicitado'
                  ? 'bg-orange-50 border-orange-200'
                  : item.art_approval_status === 'reprovado'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Arte</span>
                  <span className={`text-[10px] font-semibold ${
                    item.art_approval_status === 'aprovado' ? 'text-green-700'
                    : item.art_approval_status === 'ajuste_solicitado' ? 'text-orange-700'
                    : item.art_approval_status === 'reprovado' ? 'text-red-700'
                    : 'text-blue-700'
                  }`}>
                    {item.art_approval_status === 'aprovado' ? '✓ Aprovado'
                      : item.art_approval_status === 'ajuste_solicitado' ? '⚠ Ajuste solicitado'
                      : item.art_approval_status === 'reprovado' ? '✗ Reprovado'
                      : '↻ Ajuste realizado'}
                  </span>
                </div>
                {item.art_feedback && (
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    <span className="font-medium">Cliente:</span> "{item.art_feedback}"
                  </p>
                )}
              </div>
            )}

            {/* Copy */}
            {item.copy_approval_status && (
              <div className={`p-2.5 rounded-xl border ${
                item.copy_approval_status === 'aprovado'
                  ? 'bg-green-50 border-green-200'
                  : item.copy_approval_status === 'ajuste_solicitado'
                  ? 'bg-orange-50 border-orange-200'
                  : item.copy_approval_status === 'reprovado'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Copy</span>
                  <span className={`text-[10px] font-semibold ${
                    item.copy_approval_status === 'aprovado' ? 'text-green-700'
                    : item.copy_approval_status === 'ajuste_solicitado' ? 'text-orange-700'
                    : item.copy_approval_status === 'reprovado' ? 'text-red-700'
                    : 'text-blue-700'
                  }`}>
                    {item.copy_approval_status === 'aprovado' ? '✓ Aprovado'
                      : item.copy_approval_status === 'ajuste_solicitado' ? '⚠ Ajuste solicitado'
                      : item.copy_approval_status === 'reprovado' ? '✗ Reprovado'
                      : '↻ Ajuste realizado'}
                  </span>
                </div>
                {item.copy_feedback && (
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    <span className="font-medium">Cliente:</span> "{item.copy_feedback}"
                  </p>
                )}
              </div>
            )}

            <p className="text-[11px] text-orange-700 leading-relaxed px-0.5">
              Realize as correções, edite o post e reenvie para aprovação.
            </p>
          </>
        ) : (
          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0">
                <Pencil className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-semibold text-orange-800">Ajuste solicitado</p>
            </div>
            {item.client_feedback && (
              <p className="text-[11px] text-orange-700 leading-relaxed">
                <span className="font-medium">Cliente:</span> "{item.client_feedback}"
              </p>
            )}
            <p className="text-[11px] text-orange-700 leading-relaxed">
              Realize as correções, edite o post e reenvie para aprovação.
              O agendamento ocorrerá automaticamente após a nova aprovação.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Ajuste realizado — agência corrigiu, aguardando nova aprovação
  if (item.approval_status === 'ajuste_realizado') {
    return (
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
          <p className="text-xs font-semibold text-blue-800">Aguardando nova aprovação do cliente</p>
        </div>
        <p className="text-[11px] text-blue-700 leading-relaxed">
          Os ajustes foram realizados e o {ptLabel} foi reenviado ao cliente.
          Quando ele aprovar, o agendamento no Instagram acontecerá automaticamente.
        </p>
      </div>
    )
  }

  // Reprovado — cliente rejeitou
  if (item.approval_status === 'reprovado') {
    return (
      <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <X className="w-3 h-3 text-white" />
          </div>
          <p className="text-xs font-semibold text-red-800">Conteúdo reprovado pelo cliente</p>
        </div>
        <p className="text-[11px] text-red-700 leading-relaxed">
          Este {ptLabel} foi reprovado. Revise o conteúdo, edite e reenvie para o cliente aprovar
          antes de agendar no Instagram.
        </p>
      </div>
    )
  }

  // Mídias IG: usa is_ig_media explícito; fallback = todas as imagens/vídeos do item
  const igMediaExplicit = (item.attachments ?? [])
    .filter(a => a.is_ig_media)
    .sort((a, b) => a.sort_order - b.sort_order)
  const igMediaFallback = (item.attachments ?? [])
    .filter(a => isImageAttachment(a) || isVideoAttachment(a))
  const igMedia = igMediaExplicit.length > 0 ? igMediaExplicit : igMediaFallback

  const [caption, setCaption]       = useState(item.notes ?? '')
  const [schedDate, setSchedDate]   = useState(item.scheduled_date)
  const [schedTime, setSchedTime]   = useState(item.scheduled_time?.slice(0, 5) ?? '09:00')
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess]       = useState(false)

  const handleSchedule = async () => {
    if (!igAccount || !postType) return
    setPublishing(true)
    try {
      await createPost.mutateAsync({
        ig_account_id: igAccount.id,
        client_id:     item.client_id,
        post_type:     postType,
        caption,
        media_urls:    igMedia.map(a => a.file_url),
        scheduled_at:  new Date(`${schedDate}T${schedTime}:00`).toISOString(),
      })
      setSuccess(true)
      toast('Post agendado no Instagram!', 'success')
    } catch (err: any) {
      toast(err.message ?? 'Erro ao agendar.', 'error')
    } finally {
      setPublishing(false)
    }
  }

  if (igLoading) return (
    <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /> Verificando Instagram...
    </div>
  )

  if (!item.client_id) return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
      Post sem cliente vinculado — não é possível agendar no Instagram.
    </div>
  )

  if (!igAccount) return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
      <div className="flex items-center gap-2">
        <Instagram className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-xs text-gray-700 font-medium">Instagram não conectado</p>
      </div>
      <p className="text-[11px] text-gray-500">
        Acesse o perfil do cliente → aba <strong className="text-gray-700">Instagram</strong> para conectar a conta.
      </p>
    </div>
  )

  if (!postType) return (
    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
      <p className="text-xs text-amber-800 font-medium">Tipo de post não configurado</p>
      <p className="text-[11px] text-amber-700">Edite o post e selecione o tipo (Imagem, Carrossel ou Reel) para poder agendar.</p>
    </div>
  )

  if (igMedia.length === 0) return (
    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
      <p className="text-xs text-amber-800 font-medium">Sem mídia configurada</p>
      <p className="text-[11px] text-amber-700">Edite o post e adicione as mídias na seção "Publicação no Instagram".</p>
    </div>
  )

  if (success) return (
    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-emerald-700">Post agendado!</p>
        <p className="text-[11px] text-gray-500 mt-0.5">Veja em <strong>Instagram → Agendados</strong>.</p>
      </div>
    </div>
  )

  const typeLabel = postType === 'IMAGE' ? 'Imagem' : postType === 'CAROUSEL_ALBUM' ? `Carrossel (${igMedia.length})` : 'Reel'
  const TypeIcon  = postType === 'REELS' ? Film : postType === 'CAROUSEL_ALBUM' ? LayoutGrid : ImageIcon

  return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
      {/* Conta conectada */}
      <div className="flex items-center gap-2">
        {igAccount.profile_picture_url
          ? <img src={igAccount.profile_picture_url} alt="" className="w-6 h-6 rounded-full object-cover" />
          : <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)' }}><Instagram className="w-3.5 h-3.5 text-white" /></div>
        }
        <span className="text-xs text-gray-800 font-medium">@{igAccount.username}</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Conectado</span>
      </div>

      {/* Tipo + prévia das mídias */}
      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
        <TypeIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <span className="text-xs text-gray-700 font-medium">{typeLabel}</span>
        <div className="ml-auto flex gap-1">
          {igMedia.slice(0, 4).map((att, i) => (
            <div key={att.id} className="w-8 h-8 rounded overflow-hidden border border-gray-200 flex-shrink-0">
              {isVideoAttachment(att)
                ? <video src={att.file_url} className="w-full h-full object-cover" muted />
                : <img src={att.file_url} alt="" className="w-full h-full object-cover" />
              }
            </div>
          ))}
          {igMedia.length > 4 && (
            <span className="text-[10px] text-gray-400 self-center pl-0.5">+{igMedia.length - 4}</span>
          )}
        </div>
      </div>

      {/* Legenda */}
      <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} placeholder="Legenda..."
        className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400 transition-colors" />

      {/* Data/hora */}
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:border-blue-400 transition-colors [color-scheme:light]" />
        <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:border-blue-400 transition-colors [color-scheme:light]" />
      </div>

      <Button size="sm" onClick={handleSchedule} disabled={publishing}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0">
        {publishing
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Agendando...</>
          : <><Instagram className="w-3.5 h-3.5" /> Agendar no Instagram</>}
      </Button>
    </div>
  )
}

// ─── Visualização completa do evento ─────────────────────────────────────────

function PlannerItemView({
  item,
  open,
  onClose,
  onEdit,
  userId,
}: {
  item: PlannerItem
  open: boolean
  onClose: () => void
  onEdit: () => void
  userId: string
}) {
  const images           = item.attachments?.filter(a => isImageAttachment(a)) || []
  const videos           = item.attachments?.filter(a => isVideoAttachment(a)) || []
  const otherAttachments = item.attachments?.filter(a => !isImageAttachment(a) && !isVideoAttachment(a)) || []

  // Carrossel: imagens + vídeos juntos no painel esquerdo
  const mediaItems = [
    ...images.map(a => ({ ...a, kind: 'image' as const })),
    ...videos.map(a => ({ ...a, kind: 'video' as const })),
  ]
  const [mediaIdx, setMediaIdx] = useState(0)
  const currentMedia = mediaItems[mediaIdx] ?? null

  const [notesExpanded, setNotesExpanded]       = useState(false)
  const [localApprovalStatus, setLocalApprovalStatus] = useState<ApprovalStatus | null>(
    item.approval_status as ApprovalStatus | null
  )
  const updateItem = useUpdatePlannerItem()
  const { toast }  = useToast()

  const handleMarkAdjustmentDone = async () => {
    try {
      await updateItem.mutateAsync({ id: item.id, approval_status: 'ajuste_realizado' })
      setLocalApprovalStatus('ajuste_realizado')
      toast('Ajuste marcado como realizado.', 'success')
    } catch (err: any) { toast(err.message, 'error') }
  }

  const hasMedia = mediaItems.length > 0

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      {/* Modal estilo Instagram — altura fixa para scroll funcionar */}
      <DialogContent className="w-[96vw] max-w-[96vw] lg:max-w-4xl p-0 overflow-hidden bg-white flex flex-col h-[90vh]">

        {/* ── Layout dois painéis, cada um com altura 100% do modal ── */}
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">

          {/* ══ ESQUERDA: Mídia — preenche todo o painel, sem fundo preto ══ */}
          {hasMedia && (
            /* mobile: altura fixa 45vw (aprox. quadrado); desktop: 50% da largura, altura total do modal */
            <div className="lg:w-1/2 flex-shrink-0 relative bg-gray-200 overflow-hidden h-[45vw] lg:h-full">

              {/* Mídia — cobre todo o espaço, centralizada */}
              {currentMedia?.kind === 'image' ? (
                <img
                  src={currentMedia.file_url}
                  alt={currentMedia.file_name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : currentMedia?.kind === 'video' ? (
                <video
                  key={currentMedia.file_url}
                  src={currentMedia.file_url}
                  autoPlay muted loop playsInline controls
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}

              {/* Setas de navegação */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    onClick={() => setMediaIdx(i => Math.max(0, i - 1))}
                    disabled={mediaIdx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all disabled:opacity-20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setMediaIdx(i => Math.min(mediaItems.length - 1, i + 1))}
                    disabled={mediaIdx === mediaItems.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all disabled:opacity-20"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Dots + contador — sobreposto na base */}
              {mediaItems.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-1.5">
                  {mediaItems.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMediaIdx(i)}
                      className={`rounded-full transition-all ${i === mediaIdx ? 'w-2 h-2 bg-white shadow' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
                    />
                  ))}
                  <span className="ml-1.5 text-[10px] text-white font-semibold drop-shadow">{mediaIdx + 1}/{mediaItems.length}</span>
                </div>
              )}

              {/* Abrir original */}
              {currentMedia && (
                <a
                  href={currentMedia.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/80 hover:text-white transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* ══ DIREITA: Informações — scroll independente ══ */}
          <div className={`flex flex-col overflow-hidden bg-white ${hasMedia ? 'lg:w-1/2 flex-shrink-0 lg:h-full border-l border-gray-200' : 'w-full'} flex-1`}>
            {/* Header fixo — não rola */}
            <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {item.client && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-[11px] text-gray-500 font-medium">{item.client.company_name}</span>
                    </div>
                  )}
                  <h2 className="text-[15px] font-semibold text-gray-900 leading-snug break-words">{item.title}</h2>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[11px] text-gray-500">
                      {format(parseISO(item.scheduled_date), "dd 'de' MMM", { locale: ptBR })}
                      {item.scheduled_time && ` · ${item.scheduled_time.slice(0,5)}`}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-[11px] text-gray-500">{contentTypeLabels[item.content_type as ContentType]}</span>
                    <span className="text-gray-300">·</span>
                    <span className={`text-[11px] font-semibold ${statusTextColors[item.status as PlannerStatus]}`}>
                      {statusLabels[item.status as PlannerStatus]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Corpo — rola independentemente */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">

              {/* Legenda */}
              {item.notes && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Legenda</p>
                  <div className="relative">
                    <p className={`text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words select-text ${!notesExpanded ? 'line-clamp-4' : ''}`}>
                      {item.notes}
                    </p>
                    {item.notes.length > 200 && (
                      <button onClick={() => setNotesExpanded(v => !v)} className="text-[12px] text-gray-500 hover:text-gray-700 mt-1.5 font-medium transition-colors">
                        {notesExpanded ? 'ver menos' : 'ver mais'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Outros anexos */}
              {otherAttachments.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Anexos</p>
                  <div className="space-y-1.5">
                    {otherAttachments.map(att => (
                      <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors min-w-0 overflow-hidden">
                        <FileTypeIcon type={att.file_type} size="md" />
                        <span className="text-xs text-gray-700 truncate flex-1">{att.file_name}</span>
                        {att.file_size && <span className="text-[10px] text-gray-400 flex-shrink-0">{formatFileSize(att.file_size)}</span>}
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {item.links && item.links.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Links</p>
                  <div className="space-y-1.5">
                    {item.links.map(link => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors min-w-0 overflow-hidden">
                        <Link2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-600 flex-1 min-w-0 truncate">{link.label || link.url}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Resposta do cliente */}
              {item.approval_status && (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Resposta do Cliente</p>

                  {/* Status geral + data */}
                  <div className="flex items-center gap-2 px-0.5 flex-wrap">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${approvalDot[(localApprovalStatus ?? item.approval_status) as ApprovalStatus]}`} />
                    <span className={`text-xs font-medium ${approvalTextColor[(localApprovalStatus ?? item.approval_status) as ApprovalStatus]}`}>
                      {approvalLabel[(localApprovalStatus ?? item.approval_status) as ApprovalStatus]}
                    </span>
                    {item.reviewed_at && (
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {format(parseISO(item.reviewed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>

                  {/* ── Arte ── */}
                  {(item as any).art_approval_status && (() => {
                    const artStatus = (item as any).art_approval_status as ApprovalStatus
                    const artFeedback = (item as any).art_feedback as string | null
                    const bgMap: Record<ApprovalStatus, string> = {
                      pendente_aprovacao: 'border-yellow-200 bg-yellow-50',
                      aprovado:           'border-green-200 bg-green-50',
                      ajuste_solicitado:  'border-orange-200 bg-orange-50',
                      ajuste_realizado:   'border-blue-200 bg-blue-50',
                      reprovado:          'border-red-200 bg-red-50',
                    }
                    return (
                      <div className={`rounded-xl border p-3 ${bgMap[artStatus]}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Arte</p>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[artStatus]}`} />
                            <span className={`text-[11px] font-semibold ${approvalTextColor[artStatus]}`}>
                              {approvalLabel[artStatus]}
                            </span>
                          </div>
                        </div>
                        {artFeedback && artStatus !== 'aprovado' && artStatus !== 'pendente_aprovacao' && (
                          <div className="mt-2 flex items-start gap-2 bg-white/70 rounded-lg px-2.5 py-2">
                            <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">Cliente:</span>
                            <p className="text-xs text-gray-700 leading-relaxed break-words select-text flex-1">"{artFeedback}"</p>
                          </div>
                        )}
                        {artStatus === 'ajuste_solicitado' && (
                          <button
                            onClick={async () => {
                              try {
                                await updateItem.mutateAsync({ id: item.id, art_approval_status: 'ajuste_realizado' } as any)
                                toast('Ajuste de Arte marcado como realizado.', 'success')
                              } catch (err: any) { toast(err.message, 'error') }
                            }}
                            disabled={updateItem.isPending}
                            className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 transition-colors disabled:opacity-50"
                          >
                            {updateItem.isPending
                              ? <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              : <Check className="w-3 h-3" />}
                            Marcar ajuste de Arte como realizado
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Copy ── */}
                  {(item as any).copy_approval_status && (() => {
                    const copyStatus = (item as any).copy_approval_status as ApprovalStatus
                    const copyFeedback = (item as any).copy_feedback as string | null
                    const bgMap: Record<ApprovalStatus, string> = {
                      pendente_aprovacao: 'border-yellow-200 bg-yellow-50',
                      aprovado:           'border-green-200 bg-green-50',
                      ajuste_solicitado:  'border-orange-200 bg-orange-50',
                      ajuste_realizado:   'border-blue-200 bg-blue-50',
                      reprovado:          'border-red-200 bg-red-50',
                    }
                    return (
                      <div className={`rounded-xl border p-3 ${bgMap[copyStatus]}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Copy</p>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[copyStatus]}`} />
                            <span className={`text-[11px] font-semibold ${approvalTextColor[copyStatus]}`}>
                              {approvalLabel[copyStatus]}
                            </span>
                          </div>
                        </div>
                        {copyFeedback && copyStatus !== 'aprovado' && copyStatus !== 'pendente_aprovacao' && (
                          <div className="mt-2 flex items-start gap-2 bg-white/70 rounded-lg px-2.5 py-2">
                            <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">Cliente:</span>
                            <p className="text-xs text-gray-700 leading-relaxed break-words select-text flex-1">"{copyFeedback}"</p>
                          </div>
                        )}
                        {copyStatus === 'ajuste_solicitado' && (
                          <button
                            onClick={async () => {
                              try {
                                await updateItem.mutateAsync({ id: item.id, copy_approval_status: 'ajuste_realizado' } as any)
                                toast('Ajuste de Copy marcado como realizado.', 'success')
                              } catch (err: any) { toast(err.message, 'error') }
                            }}
                            disabled={updateItem.isPending}
                            className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 transition-colors disabled:opacity-50"
                          >
                            {updateItem.isPending
                              ? <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              : <Check className="w-3 h-3" />}
                            Marcar ajuste de Copy como realizado
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  {/* Fallback legado: feedback geral quando não há campos parciais */}
                  {!(item as any).art_approval_status && !(item as any).copy_approval_status && item.client_feedback && (
                    <p className="text-xs text-gray-700 leading-relaxed bg-white border border-gray-100 rounded-lg px-3 py-2 break-words">
                      "{item.client_feedback}"
                    </p>
                  )}

                  {/* Botão legado "Ajuste realizado" — só quando não usa campos parciais */}
                  {!(item as any).art_approval_status && !(item as any).copy_approval_status &&
                    (localApprovalStatus ?? item.approval_status) === 'ajuste_solicitado' && (
                    <button onClick={handleMarkAdjustmentDone} disabled={updateItem.isPending}
                      className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50">
                      {updateItem.isPending
                        ? <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        : <Check className="w-3 h-3" />}
                      Ajuste realizado
                    </button>
                  )}
                </div>
              )}

              {/* Agendar no Instagram */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <Instagram className="w-3 h-3" /> Agendar no Instagram
                </p>
                <InstagramScheduleSection item={item} userId={userId} />
              </div>

              {/* Comentários */}
              <div className="pb-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Comentários</p>
                <PlannerCommentsThread plannerId={item.id} role="agency" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Day Item Card — card clicável na lista do dia ────────────────────────────

function DayItemCard({
  item,
  onView,
  onEdit,
  onDelete,
  onSend,
}: {
  item: PlannerItem
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onSend: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const imageThumbnail = item.attachments?.find(a => isImageAttachment(a))
  const videoThumbnail = item.attachments?.find(a => isVideoAttachment(a))

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden w-full max-w-full min-w-0">
      {/* Área clicável para visualização */}
      <div
        onClick={onView}
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors group/view min-w-0 w-full max-w-full"
      >
        {imageThumbnail && (
          <img src={imageThumbnail.file_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
        )}
        {!imageThumbnail && videoThumbnail && (
          <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-black overflow-hidden">
            <video
              src={videoThumbnail.file_url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[item.status as PlannerStatus]}`} />
            <p className="font-medium text-white text-sm break-words">{item.title}</p>
          </div>
          <div className="flex items-center gap-2 ml-3.5 mb-1">
            <p className="text-xs text-gray-500">
              {contentTypeLabels[item.content_type as ContentType]} · {statusLabels[item.status as PlannerStatus]}
            </p>
            {item.sent_to_client
              ? <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">✓ Enviado ao cliente</span>
              : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/20">Rascunho</span>
            }
          </div>
          {item.client && (
            <div className="flex items-center gap-1 ml-3.5 mb-1">
              <Building2 className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate">{item.client.company_name}</span>
            </div>
          )}
          {item.notes && (
            <p className="text-xs text-gray-500 line-clamp-2 ml-3.5 mb-1">{item.notes}</p>
          )}
          {(() => {
            const as_ = (item.approval_status || 'pendente_aprovacao') as ApprovalStatus
            return (
              <div className="flex items-center gap-1.5 ml-3.5 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[as_]}`} />
                <span className={`text-[10px] font-medium ${approvalTextColor[as_]}`}>
                  {approvalLabel[as_]}
                </span>
              </div>
            )
          })()}
          <div className="flex items-center gap-3 ml-3.5 mt-1">
            {item.attachments && item.attachments.length > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3 text-gray-500" />
                <span className="text-[11px] text-gray-500">
                  {item.attachments.length} {item.attachments.length === 1 ? 'anexo' : 'anexos'}
                </span>
              </div>
            )}
            {item.links && item.links.length > 0 && (
              <div className="flex items-center gap-1">
                <Link2 className="w-3 h-3 text-blue-400" />
                <span className="text-[11px] text-blue-400">
                  {item.links.length} {item.links.length === 1 ? 'link' : 'links'}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Seta indicando que é clicável */}
        <ChevronRightIcon className="w-4 h-4 text-gray-600 group-hover/view:text-gray-300 transition-colors flex-shrink-0 mt-0.5" />
      </div>

      {/* Ações separadas da área de visualização */}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-2 border-t border-white/8">
          <span className="text-xs text-gray-400 flex-1">Confirmar exclusão?</span>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300"
            onClick={() => { setConfirming(false); onDelete() }}
          >
            Excluir
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2 px-3 pb-3 pt-2 border-t border-white/8">
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-500 hover:text-red-400"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
          </Button>
          {!item.sent_to_client && item.client_id && (
            <Button
              size="sm"
              variant="premium"
              onClick={e => { e.stopPropagation(); onSend() }}
              className="text-[11px]"
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Enviar ao cliente
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Drag & Drop primitives ───────────────────────────────────────────────────

function getChipStyle(item: PlannerItem): { bg: string; border: string; text: string } {
  const s   = item.status as PlannerStatus
  const as_ = (item.approval_status || 'pendente_aprovacao') as ApprovalStatus

  // Rascunho — não enviado ao cliente → cinza
  if (!item.sent_to_client)         return { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280' }

  // Publicado — estado final
  if (s === 'publicado')            return { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' }
  // Resposta do cliente tem prioridade
  if (as_ === 'aprovado')           return { bg: '#f0fdf4', border: '#86efac', text: '#166534' }
  if (as_ === 'reprovado')          return { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' }
  if (as_ === 'ajuste_solicitado')  return { bg: '#fff7ed', border: '#fdba74', text: '#9a3412' }
  if (as_ === 'ajuste_realizado')   return { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
  // Enviado, aguardando aprovação → amarelo
  return { bg: '#fefce8', border: '#fde047', text: '#854d0e' }
}

function DayPreviewChip({
  item, disabled, onItemClick,
}: { item: PlannerItem; disabled: boolean; onItemClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled })
  const { bg, border, text } = getChipStyle(item)
  const typeLabel = contentTypeLabels[item.content_type as ContentType] ?? item.content_type ?? ''

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={e => { e.stopPropagation(); onItemClick() }}
      style={{ touchAction: 'none', backgroundColor: bg, borderColor: border, color: text }}
      className={`w-full rounded border px-1 py-0.5 min-w-0 transition-opacity select-none
        ${isDragging ? 'opacity-0' : 'hover:brightness-95'}
        ${disabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <div className="flex items-start gap-0.5 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-[8px] sm:text-[9px] font-medium leading-tight truncate">{item.title}</p>
          {typeLabel && (
            <p className="text-[7px] sm:text-[8px] leading-tight truncate opacity-70 hidden sm:block">{typeLabel}</p>
          )}
        </div>
        <Instagram
          className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0 mt-px opacity-50"
          strokeWidth={1.5}
        />
      </div>
    </div>
  )
}

function DroppableDay({
  day, isCurrentMonth, isCurrentDay, hasItems, dragging,
  onDayClick, onMouseEnter, onMouseLeave, children,
}: {
  day: Date
  isCurrentMonth: boolean
  isCurrentDay: boolean
  hasItems: boolean
  dragging: boolean
  onDayClick: () => void
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseLeave: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${format(day, 'yyyy-MM-dd')}`,
    disabled: !isCurrentMonth,
  })
  return (
    <div
      ref={setNodeRef}
      onClick={() => isCurrentMonth && !dragging && onDayClick()}
      onMouseEnter={e => isCurrentMonth && !dragging && onMouseEnter(e)}
      onMouseLeave={() => !dragging && onMouseLeave()}
      className={`
        min-h-[52px] sm:min-h-[90px] p-0.5 sm:p-1.5 rounded sm:rounded-lg border transition-all
        ${isCurrentMonth
          ? `cursor-pointer ${isOver
              ? 'border-blue-400/60 bg-blue-500/10 scale-[1.02]'
              : 'border-black/10 hover:border-black/20 hover:bg-gray-50'}`
          : 'border-transparent opacity-30 cursor-default'}
        ${isCurrentDay && !isOver ? 'border-blue-500/40 bg-blue-50' : ''}
        ${hasItems && isCurrentMonth && !isOver ? 'hover:border-black/20' : ''}
      `}
    >
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Planner() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Modal de criação/edição
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content_type: 'post',
    status: 'ideia' as PlannerStatus,
    notes: '',
    client_id: null as string | null,
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '',
    ig_post_type: null as 'IMAGE' | 'CAROUSEL_ALBUM' | 'REELS' | null,
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [linkInput, setLinkInput] = useState('')
  const [pendingLinks, setPendingLinks] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  // Mídia Instagram (separada dos outros anexos)
  const [igFiles, setIgFiles]         = useState<File[]>([])
  const [igPreviews, setIgPreviews]   = useState<string[]>([])
  const [igDragOver, setIgDragOver]   = useState<number | null>(null)
  const igDragIdx  = useRef<number | null>(null)
  const igFileRef  = useRef<HTMLInputElement>(null)
  const [existingIgMedia, setExistingIgMedia] = useState<PlannerAttachment[]>([])
  const [igMediaToDelete, setIgMediaToDelete] = useState<PlannerAttachment[]>([])

  // IG drag handlers
  const igOnDragStart = useCallback((i: number) => { igDragIdx.current = i }, [])
  const igOnDragEnter = useCallback((i: number) => { setIgDragOver(i) }, [])
  const igOnDragEnd   = useCallback(() => { setIgDragOver(null); igDragIdx.current = null }, [])
  const igOnDrop      = useCallback((targetIdx: number) => {
    const from = igDragIdx.current
    if (from === null || from === targetIdx) { setIgDragOver(null); return }
    const reorder = <T,>(arr: T[]) => {
      const next = [...arr]; const [item] = next.splice(from, 1); next.splice(targetIdx, 0, item); return next
    }
    setIgFiles(reorder); setIgPreviews(reorder)
    setIgDragOver(null); igDragIdx.current = null
  }, [])

  const handleIgFiles = (list: FileList | null) => {
    if (!list || !form.ig_post_type) return
    const max    = form.ig_post_type === 'CAROUSEL_ALBUM' ? 10 : 1
    const accept = form.ig_post_type === 'REELS' ? 'video/' : 'image/'
    const arr    = Array.from(list).filter(f => f.type.startsWith(accept)).slice(0, max)
    const urls   = arr.map(f => URL.createObjectURL(f))
    setIgFiles(prev  => form.ig_post_type === 'CAROUSEL_ALBUM' ? [...prev, ...arr].slice(0, max) : arr)
    setIgPreviews(prev => form.ig_post_type === 'CAROUSEL_ALBUM' ? [...prev, ...urls].slice(0, max) : urls)
  }

  const removeIgFile = (i: number) => {
    setIgFiles(p    => p.filter((_, idx) => idx !== i))
    setIgPreviews(p => p.filter((_, idx) => idx !== i))
  }

  const removeExistingIgMedia = (att: PlannerAttachment) => {
    setExistingIgMedia(p => p.filter(a => a.id !== att.id))
    setIgMediaToDelete(p => [...p, att])
  }

  // Modo edição
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null)
  const [existingAttachments, setExistingAttachments] = useState<PlannerAttachment[]>([])
  const [existingLinks, setExistingLinks] = useState<PlannerLink[]>([])
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<PlannerAttachment[]>([])
  const [linksToDelete, setLinksToDelete] = useState<PlannerLink[]>([])

  // Modal de detalhes do dia
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false)
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null)

  // ── NOVO: visualização completa do evento ──────────────────────────────────
  const [selectedPlannerItem, setSelectedPlannerItem] = useState<PlannerItem | null>(null)
  const [itemViewOpen, setItemViewOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const autoOpenProcessed = useRef(false)

  // Arsenal: picker de conteúdo
  const [pickerOpen, setPickerOpen] = useState(false)
  const [linkedAsset, setLinkedAsset] = useState<ContentAsset | null>(null)

  // Filtro por cliente
  const [selectedClientFilter, setSelectedClientFilter] = useState<string | null>(null)

  // Filtro por status de aprovação
  const [selectedApprovalFilter, setSelectedApprovalFilter] = useState<ApprovalStatus | 'todos' | 'rascunho'>('todos')

  // Dropdowns de filtro
  const [clientDropOpen, setClientDropOpen]   = useState(false)
  const [statusDropOpen, setStatusDropOpen]   = useState(false)

  // Hover tooltip
  const [hover, setHover] = useState<HoverState | null>(null)

  // Drag and drop
  const [draggingItem, setDraggingItem] = useState<PlannerItem | null>(null)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const { data: items } = usePlanner()
  const { data: clients } = useClients()

  // Sempre usa a versão mais recente do item do cache React Query.
  // Resolve o problema de selectedPlannerItem ficar stale após save/invalidação.
  const liveSelectedItem = useMemo(
    () => selectedPlannerItem
      ? ((items || []).find(i => i.id === selectedPlannerItem.id) ?? selectedPlannerItem)
      : null,
    [selectedPlannerItem, items]
  )

  // Auto-abrir item via query param ?item=UUID (vindo de notificação)
  useEffect(() => {
    const itemId = searchParams.get('item')
    if (!itemId || !items?.length || autoOpenProcessed.current) return
    const found = items.find(i => i.id === itemId)
    if (found) {
      autoOpenProcessed.current = true
      setSelectedPlannerItem(found)
      setItemViewOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, items])
  const createItem = useCreatePlannerItem()
  const updateItem = useUpdatePlannerItem()
  const deleteItem = useDeletePlannerItem()
  const { toast } = useToast()

  // ── Auto-agendamento Instagram ─────────────────────────────────────────────
  // MOVIDO PARA TRIGGER NO BANCO (migration 041_auto_schedule_instagram_trigger.sql)
  // O agendamento agora ocorre automaticamente no servidor quando o cliente aprova,
  // independente de quem está com o sistema aberto.
  // Este efeito apenas exibe um toast informativo quando detecta um item recém-agendado.
  const notifiedScheduled = useRef(new Set<string>())

  useEffect(() => {
    if (!items) return
    items.forEach(item => {
      if (item.ig_scheduled && !notifiedScheduled.current.has(item.id)) {
        // Só notifica se o item foi aprovado recentemente (reviewed_at nas últimas 2 minutos)
        if (item.reviewed_at) {
          const reviewedAt = new Date(item.reviewed_at).getTime()
          const twoMinutesAgo = Date.now() - 2 * 60 * 1000
          if (reviewedAt > twoMinutesAgo) {
            notifiedScheduled.current.add(item.id)
            toast(`"${item.title}" agendado no Instagram! 🚀`, 'success')
          } else {
            notifiedScheduled.current.add(item.id) // marca sem notificar
          }
        }
      }
    })
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calendar calculations ──────────────────────────────────────────────────

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { locale: ptBR })
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const filteredItems = (selectedClientFilter
    ? (items || []).filter(i => i.client_id === selectedClientFilter)
    : (items || [])
  ).filter(i => {
    if (selectedApprovalFilter === 'todos') return true
    if (selectedApprovalFilter === 'rascunho') return !i.sent_to_client
    const status = (i.approval_status || 'pendente_aprovacao') as ApprovalStatus
    return status === selectedApprovalFilter
  })

  const getItemsForDay = (day: Date) =>
    filteredItems.filter(item => isSameDay(parseISO(item.scheduled_date), day))

  // ── Form helpers ───────────────────────────────────────────────────────────

  const set = (field: string, value: unknown) => setForm(p => ({ ...p, [field]: value }))

  const resetForm = () => {
    setForm({
      title: '', content_type: 'post', status: 'ideia',
      notes: '', client_id: null,
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
      scheduled_time: '',
      ig_post_type: null,
    })
    setPendingFiles([])
    setPendingLinks([])
    setLinkInput('')
    setEditingItem(null)
    setExistingAttachments([])
    setExistingLinks([])
    setAttachmentsToDelete([])
    setLinksToDelete([])
    setLinkedAsset(null)
    setIgFiles([])
    setIgPreviews([])
    setExistingIgMedia([])
    setIgMediaToDelete([])
  }

  const FILE_SIZE_LIMIT = 50 * 1024 * 1024 // 50MB — limite do Supabase free tier

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const ok: File[] = []
    const big: string[] = []

    for (const f of files) {
      if (f.size > FILE_SIZE_LIMIT) {
        big.push(`${f.name} (${formatFileSize(f.size)})`)
      } else {
        ok.push(f)
      }
    }

    if (big.length > 0) {
      toast(
        `Arquivo(s) acima de 50MB não suportados: ${big.join(', ')}. Comprima o vídeo antes de enviar.`,
        'error'
      )
    }
    if (ok.length > 0) setPendingFiles(prev => [...prev, ...ok])
    e.target.value = ''
  }

  const addLink = () => {
    const url = linkInput.trim()
    if (!url) return
    setPendingLinks(prev => [...prev, url])
    setLinkInput('')
  }

  // ── Drag and drop handlers ─────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const item = (items || []).find(i => i.id === event.active.id)
    if (item) { setDraggingItem(item); setHover(null) }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingItem(null)
    const { active, over } = event
    if (!over || !active) return
    const newDate = over.id as string          // "day-YYYY-MM-DD"
    if (!newDate.startsWith('day-')) return
    const dateStr = newDate.replace('day-', '')
    const item = (items || []).find(i => i.id === active.id)
    if (!item || item.scheduled_date === dateStr) return
    try {
      await updateItem.mutateAsync({ id: item.id, scheduled_date: dateStr })
      toast('Post movido para ' + format(new Date(dateStr + 'T00:00:00'), "dd/MM", { locale: ptBR }), 'success')
    } catch {
      toast('Erro ao mover post. Tente novamente.', 'error')
    }
  }

  // ── Click: dia vazio → criar | dia com itens → detalhes ───────────────────

  const handleDayClick = (day: Date, dayItems: PlannerItem[]) => {
    setHover(null)
    if (dayItems.length === 0) {
      resetForm()
      setForm(prev => ({
        ...prev,
        scheduled_date: format(day, 'yyyy-MM-dd'),
        client_id: selectedClientFilter ?? null,
      }))
      setOpen(true)
    } else {
      setSelectedDayDate(day)
      setDayDetailsOpen(true)
    }
  }

  // ── Abrir visualização completa do evento ──────────────────────────────────

  const openItemView = (item: PlannerItem) => {
    setSelectedPlannerItem(item)
    setItemViewOpen(true)
  }

  const closeItemView = () => {
    setItemViewOpen(false)
    setSelectedPlannerItem(null)
  }

  // ── Abrir modo edição ──────────────────────────────────────────────────────

  const openEdit = (item: PlannerItem) => {
    setDayDetailsOpen(false)
    setItemViewOpen(false)
    setSelectedPlannerItem(null)
    setEditingItem(item)
    const allAtts    = item.attachments || []
    const igPostType = (item.ig_post_type as any) ?? null
    // Mídias marcadas explicitamente como IG
    const igExplicit = allAtts.filter(a => a.is_ig_media).sort((a,b) => a.sort_order - b.sort_order)
    // Fallback: se ig_post_type configurado mas sem is_ig_media, usa imagens/vídeos regulares
    const igFallback = igPostType && igExplicit.length === 0
      ? allAtts.filter(a => isImageAttachment(a) || isVideoAttachment(a))
      : []
    const igMedia    = igExplicit.length > 0 ? igExplicit : igFallback
    const igIds      = new Set(igMedia.map(a => a.id))
    const otherAtts  = allAtts.filter(a => !igIds.has(a.id))
    setForm({
      title: item.title,
      content_type: item.content_type,
      status: item.status,
      notes: item.notes || '',
      client_id: item.client_id,
      scheduled_date: item.scheduled_date,
      scheduled_time: item.scheduled_time || '',
      ig_post_type: igPostType,
    })
    setExistingIgMedia(igMedia)
    setIgFiles([])
    setIgPreviews([])
    setIgMediaToDelete([])
    setExistingAttachments(otherAtts)
    setExistingLinks(item.links || [])
    setPendingFiles([])
    setPendingLinks([])
    setLinkInput('')
    setAttachmentsToDelete([])
    setLinksToDelete([])
    setOpen(true)
  }

  // ── Marcar para remoção (aplicado só no save) ──────────────────────────────

  const markAttachmentForDeletion = (att: PlannerAttachment) => {
    setExistingAttachments(prev => prev.filter(a => a.id !== att.id))
    setAttachmentsToDelete(prev => [...prev, att])
  }

  const markLinkForDeletion = (link: PlannerLink) => {
    setExistingLinks(prev => prev.filter(l => l.id !== link.id))
    setLinksToDelete(prev => [...prev, link])
  }

  // ── Salvar: cria ou atualiza ───────────────────────────────────────────────

  const handleSave = async (sendToClient: boolean = false) => {
    if (!form.title.trim() || !user) return

    // FIX: captura qualquer URL digitada mas não adicionada com o botão "+"
    // Evita que o usuário perca o link ao clicar em Salvar sem clicar em Adicionar
    const allLinks = [...pendingLinks]
    const rawInput = linkInput.trim()
    if (rawInput && !allLinks.includes(rawInput)) {
      allLinks.push(rawInput)
    }

    setIsUploading(true)
    try {
      if (editingItem) {
        await updateItem.mutateAsync({
          id: editingItem.id,
          title: form.title,
          content_type: form.content_type as ContentType,
          status: form.status,
          notes: form.notes || null,
          client_id: form.client_id,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time || null,
          ig_post_type: form.ig_post_type,
          sent_to_client: sendToClient ? true : (editingItem?.sent_to_client ?? false),
          approval_status: sendToClient && form.status !== 'publicado' && form.client_id ? 'pendente_aprovacao' : (editingItem?.approval_status ?? null),
        })
        // Deletar mídias IG removidas
        for (const att of igMediaToDelete) {
          const path = extractStoragePath(att.file_url)
          if (path) await supabase.storage.from('planner-attachments').remove([path])
          await supabase.from('planner_attachments').delete().eq('id', att.id)
        }
        // Promover anexos de fallback para is_ig_media = true (se ainda não estavam marcados)
        const toPromote = existingIgMedia.filter(a => !a.is_ig_media)
        for (let i = 0; i < toPromote.length; i++) {
          await (supabase as any).from('planner_attachments')
            .update({ is_ig_media: true, sort_order: i })
            .eq('id', toPromote[i].id)
        }
        // Upload novas mídias IG
        const igStart = existingIgMedia.length
        for (let fi = 0; fi < igFiles.length; fi++) {
          const file = igFiles[fi]
          const ext  = file.name.split('.').pop() || 'bin'
          const path = `${user.id}/${editingItem.id}/ig_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('planner-attachments').upload(path, file, { upsert: false })
          if (upErr) { toast(`Erro ao enviar "${file.name}": ${upErr.message}`, 'error'); continue }
          const { data: { publicUrl } } = supabase.storage.from('planner-attachments').getPublicUrl(path)
          await (supabase as any).from('planner_attachments').insert({
            planner_id: editingItem.id, user_id: user.id,
            file_name: file.name, file_type: getMimeType(file),
            file_url: publicUrl, file_size: file.size,
            is_ig_media: true, sort_order: igStart + fi,
          })
        }
        for (const att of attachmentsToDelete) {
          const path = extractStoragePath(att.file_url)
          if (path) await supabase.storage.from('planner-attachments').remove([path])
          await supabase.from('planner_attachments').delete().eq('id', att.id)
        }
        if (linksToDelete.length > 0) {
          await supabase.from('planner_links').delete().in('id', linksToDelete.map(l => l.id))
        }
        for (let fi = 0; fi < pendingFiles.length; fi++) {
          const file = pendingFiles[fi]
          setUploadProgress({ current: fi + 1, total: pendingFiles.length })
          const ext = file.name.split('.').pop() || 'bin'
          const path = `${user.id}/${editingItem.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('planner-attachments').upload(path, file, { upsert: false })
          if (upErr) {
            toast(`Erro ao enviar "${file.name}": ${upErr.message}`, 'error')
            continue
          }
          const { data: { publicUrl } } = supabase.storage.from('planner-attachments').getPublicUrl(path)
          await supabase.from('planner_attachments').insert({
            planner_id: editingItem.id, user_id: user.id,
            file_name: file.name, file_type: getMimeType(file),
            file_url: publicUrl, file_size: file.size,
          })
        }
        setUploadProgress(null)
        if (allLinks.length > 0) {
          await supabase.from('planner_links').insert(
            allLinks.map(url => ({ planner_id: editingItem.id, user_id: user.id, url, label: null }))
          )
        }
        toast(sendToClient ? 'Post enviado ao cliente!' : 'Post salvo!', 'success')
      } else {
        const created = await createItem.mutateAsync({
          user_id: user.id,
          title: form.title,
          content_type: form.content_type as ContentType,
          status: form.status,
          notes: form.notes || null,
          client_id: form.client_id,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time || null,
          ig_post_type: form.ig_post_type,
          content_id: null,
          asset_id: linkedAsset?.id ?? null,
          sent_to_client: sendToClient,
          approval_status: sendToClient && form.status !== 'publicado' && form.client_id ? 'pendente_aprovacao' : null,
          client_feedback: null,
          reviewed_at: null,
          reviewed_by: null,
        })
        // Upload mídias Instagram
        for (let fi = 0; fi < igFiles.length; fi++) {
          const file = igFiles[fi]
          const ext  = file.name.split('.').pop() || 'bin'
          const path = `${user.id}/${created.id}/ig_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('planner-attachments').upload(path, file, { upsert: false })
          if (upErr) { toast(`Erro ao enviar "${file.name}": ${upErr.message}`, 'error'); continue }
          const { data: { publicUrl } } = supabase.storage.from('planner-attachments').getPublicUrl(path)
          await (supabase as any).from('planner_attachments').insert({
            planner_id: created.id, user_id: user.id,
            file_name: file.name, file_type: getMimeType(file),
            file_url: publicUrl, file_size: file.size,
            is_ig_media: true, sort_order: fi,
          })
        }
        // Vincular mídia do arsenal como anexo
        if (linkedAsset?.media_url) {
          const ext = linkedAsset.media_url.split('.').pop()?.split('?')[0] || 'file'
          await supabase.from('planner_attachments').insert({
            planner_id: created.id,
            user_id: user.id,
            file_name: `${linkedAsset.title}.${ext}`,
            file_type: guessMediaType(linkedAsset.media_url),
            file_url: linkedAsset.media_url,
            file_size: null,
          })
        }
        for (let fi = 0; fi < pendingFiles.length; fi++) {
          const file = pendingFiles[fi]
          setUploadProgress({ current: fi + 1, total: pendingFiles.length })
          const ext = file.name.split('.').pop() || 'bin'
          const path = `${user.id}/${created.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('planner-attachments').upload(path, file, { upsert: false })
          if (upErr) {
            toast(`Erro ao enviar "${file.name}": ${upErr.message}`, 'error')
            continue
          }
          const { data: { publicUrl } } = supabase.storage.from('planner-attachments').getPublicUrl(path)
          await supabase.from('planner_attachments').insert({
            planner_id: created.id, user_id: user.id,
            file_name: file.name, file_type: getMimeType(file),
            file_url: publicUrl, file_size: file.size,
          })
        }
        setUploadProgress(null)
        if (allLinks.length > 0) {
          await supabase.from('planner_links').insert(
            allLinks.map(url => ({ planner_id: created.id, user_id: user.id, url, label: null }))
          )
        }
        toast(sendToClient ? 'Post enviado ao cliente!' : 'Post salvo internamente!', 'success')
      }

      // FIX: força refetch DEPOIS que todos os dados (incluindo links) foram salvos.
      // Sem isso, o onSuccess do mutation dispara um refetch prematuro (antes dos links
      // estarem no banco) e o modal pode abrir com dados incompletos.
      await qc.refetchQueries({ queryKey: ['planner'] })
      setOpen(false)
      resetForm()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Selecionar conteúdo do arsenal ────────────────────────────────────────

  const handleAssetSelect = (asset: ContentAsset) => {
    setLinkedAsset(asset)
    set('title', asset.title)
    set('content_type', asset.content_type)
    if (asset.caption) set('notes', asset.caption)
    if (asset.link_url) setPendingLinks(prev => {
      if (prev.includes(asset.link_url!)) return prev
      return [...prev, asset.link_url!]
    })
  }

  // ── Hover handler ──────────────────────────────────────────────────────────

  const handleDayMouseEnter = (e: React.MouseEvent<HTMLDivElement>, dayItems: PlannerItem[]) => {
    if (dayItems.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const tooltipWidth = 268
    const left = rect.right + 8 + tooltipWidth > window.innerWidth
      ? rect.left - tooltipWidth - 4
      : rect.right + 8
    const estimatedHeight = Math.min(dayItems.length * 130, 380)
    const top = Math.min(rect.top, window.innerHeight - estimatedHeight - 16)
    setHover({ items: dayItems, top, left })
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#f5f7fb]">
      <Header
        title="Planejamento"
        subtitle="Calendário editorial"
        dark={false}
        action={
          <Button
            onClick={() => {
              resetForm()
              setForm(prev => ({
                ...prev,
                scheduled_date: format(new Date(), 'yyyy-MM-dd'),
                client_id: selectedClientFilter ?? null,
              }))
              setOpen(true)
            }}
            size="sm"
            variant="premium"
          >
            <Plus className="w-4 h-4" /> Novo post
          </Button>
        }
      />

      <div className="p-4 md:p-6">
        {/* ── Filtros compactos ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">

          {/* Seletor de cliente */}
          {(() => {
            const selectedClient = (clients || []).find(c => c.id === selectedClientFilter)
            return (
              <div className="relative">
                <button
                  onClick={() => { setClientDropOpen(o => !o); setStatusDropOpen(false) }}
                  className={`flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-xl text-[12px] font-medium border transition-all ${
                    selectedClientFilter
                      ? 'bg-[#0f0f0f] text-white border-[#0f0f0f]'
                      : 'bg-white text-[#374151] border-[#e0e0e0] hover:border-[#c0c0c0] hover:bg-[#fafafa]'
                  }`}
                >
                  {selectedClient ? (
                    selectedClient.logo_url ? (
                      <img src={selectedClient.logo_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                        {selectedClient.company_name[0].toUpperCase()}
                      </span>
                    )
                  ) : (
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  )}
                  <span className="max-w-[140px] truncate">
                    {selectedClient ? selectedClient.company_name : 'Todos os clientes'}
                  </span>
                  <ChevronRightIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform opacity-60 ${clientDropOpen ? 'rotate-90' : 'rotate-90 -rotate-90'} ${clientDropOpen ? '-rotate-90' : 'rotate-90'}`} />
                </button>

                <AnimatePresence>
                  {clientDropOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setClientDropOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-[#e0e0e0] rounded-2xl shadow-xl overflow-hidden py-1.5 min-w-[200px]"
                      >
                        {/* Opção Todos */}
                        <button
                          onClick={() => { setSelectedClientFilter(null); setClientDropOpen(false) }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium transition-colors text-left ${
                            selectedClientFilter === null ? 'bg-[#f0f0f0] text-[#0f0f0f]' : 'text-[#374151] hover:bg-[#f5f5f5]'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-[#e8e8e8] flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3 h-3 text-[#9ca3af]" />
                          </span>
                          Todos os clientes
                          {selectedClientFilter === null && <Check className="w-3 h-3 ml-auto text-[#0f0f0f]" />}
                        </button>
                        {(clients || []).length > 0 && <div className="h-px bg-[#f0f0f0] mx-3 my-1" />}
                        {(clients || []).map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedClientFilter(c.id); setClientDropOpen(false) }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium transition-colors text-left ${
                              selectedClientFilter === c.id ? 'bg-[#f0f0f0] text-[#0f0f0f]' : 'text-[#374151] hover:bg-[#f5f5f5]'
                            }`}
                          >
                            {c.logo_url ? (
                              <img src={c.logo_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                                {c.company_name[0].toUpperCase()}
                              </span>
                            )}
                            <span className="truncate flex-1">{c.company_name}</span>
                            {selectedClientFilter === c.id && <Check className="w-3 h-3 ml-auto text-[#0f0f0f] flex-shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )
          })()}

          {/* Seletor de status de aprovação */}
          {(() => {
            const STATUS_OPTIONS = [
              { key: 'todos',              label: 'Todos os status',   dot: 'bg-[#c0c0c0]' },
              { key: 'rascunho',           label: 'Rascunho',           dot: 'bg-gray-400' },
              { key: 'pendente_aprovacao', label: 'Aguardando aprovação', dot: 'bg-yellow-400' },
              { key: 'aprovado',           label: 'Aprovados',          dot: 'bg-green-400' },
              { key: 'ajuste_solicitado',  label: 'Ajuste solicitado',  dot: 'bg-orange-400' },
              { key: 'ajuste_realizado',   label: 'Ajuste realizado',   dot: 'bg-blue-400' },
              { key: 'reprovado',          label: 'Reprovados',         dot: 'bg-red-400' },
            ] as const
            const current = STATUS_OPTIONS.find(s => s.key === selectedApprovalFilter) ?? STATUS_OPTIONS[0]
            const isFiltered = selectedApprovalFilter !== 'todos'
            return (
              <div className="relative">
                <button
                  onClick={() => { setStatusDropOpen(o => !o); setClientDropOpen(false) }}
                  className={`flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-xl text-[12px] font-medium border transition-all ${
                    isFiltered
                      ? 'bg-[#0f0f0f] text-white border-[#0f0f0f]'
                      : 'bg-white text-[#374151] border-[#e0e0e0] hover:border-[#c0c0c0] hover:bg-[#fafafa]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${current.dot}`} />
                  <span>{current.label}</span>
                  <ChevronRightIcon className={`w-3.5 h-3.5 flex-shrink-0 opacity-60 transition-transform ${statusDropOpen ? '-rotate-90' : 'rotate-90'}`} />
                </button>

                <AnimatePresence>
                  {statusDropOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setStatusDropOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-[#e0e0e0] rounded-2xl shadow-xl overflow-hidden py-1.5 min-w-[190px]"
                      >
                        {STATUS_OPTIONS.map(({ key, label, dot }) => (
                          <button
                            key={key}
                            onClick={() => { setSelectedApprovalFilter(key); setStatusDropOpen(false) }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium transition-colors text-left ${
                              selectedApprovalFilter === key ? 'bg-[#f0f0f0] text-[#0f0f0f]' : 'text-[#374151] hover:bg-[#f5f5f5]'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                            <span className="flex-1">{label}</span>
                            {selectedApprovalFilter === key && <Check className="w-3 h-3 ml-auto text-[#0f0f0f] flex-shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )
          })()}

        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0f0f0f] capitalize">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="w-full max-w-full min-w-0">
            <div className="grid grid-cols-7 mb-1 sm:mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-center text-[9px] sm:text-xs font-semibold text-[#0f0f0f] py-1 sm:py-2 truncate">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {days.map(day => {
                const dayItems = getItemsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isCurrentDay = isToday(day)
                const hasItems = dayItems.length > 0

                return (
                  <DroppableDay
                    key={day.toISOString()}
                    day={day}
                    isCurrentMonth={isCurrentMonth}
                    isCurrentDay={isCurrentDay}
                    hasItems={hasItems}
                    dragging={!!draggingItem}
                    onDayClick={() => handleDayClick(day, dayItems)}
                    onMouseEnter={e => handleDayMouseEnter(e, dayItems)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div className={`
                      text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full
                      ${isCurrentDay ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-[#0f0f0f]' : 'text-gray-400'}
                    `}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 2).map(item => (
                        <DayPreviewChip
                          key={item.id}
                          item={item}
                          disabled={isMobile}
                          onItemClick={() => openItemView(item)}
                        />
                      ))}
                      {dayItems.length > 2 && (
                        <p className="text-[7px] sm:text-[9px] text-gray-400 font-medium pl-0.5">+{dayItems.length - 2} mais</p>
                      )}
                    </div>
                  </DroppableDay>
                )
              })}
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Overlay visual durante o drag */}
        <DragOverlay dropAnimation={null}>
          {draggingItem ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-[#e2e8f0] shadow-lg text-[10px] text-[#0f0f0f] max-w-[160px]">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[draggingItem.status as PlannerStatus]}`} />
              <span className="truncate">{draggingItem.title}</span>
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>

        {/* Legend */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {(Object.entries(statusColors) as [PlannerStatus, string][]).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-[#737373]">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              {statusLabels[status]}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hover && <DayTooltip state={hover} />}
      </AnimatePresence>

      {/* ── Modal: Detalhes do Dia ── */}
      <Dialog open={dayDetailsOpen} onOpenChange={setDayDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <DialogTitle>
                {selectedDayDate && format(selectedDayDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </DialogTitle>
            </div>
            {selectedDayDate && (() => {
              const count = getItemsForDay(selectedDayDate).length
              return (
                <p className="text-xs text-gray-500 mt-0.5 ml-6">
                  {count} {count === 1 ? 'post planejado' : 'posts planejados'} · clique em um para ver detalhes
                </p>
              )
            })()}
          </DialogHeader>

          <div className="space-y-3 my-1 min-w-0 w-full max-w-full overflow-x-hidden">
            {selectedDayDate && getItemsForDay(selectedDayDate).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">Nenhum post neste dia.</p>
                <p className="text-xs text-gray-600 mt-1">Use o botão abaixo para adicionar.</p>
              </div>
            ) : (
              selectedDayDate && getItemsForDay(selectedDayDate).map(item => (
                <DayItemCard
                  key={item.id}
                  item={item}
                  onView={() => openItemView(item)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => deleteItem.mutateAsync(item.id)}
                  onSend={async () => {
                    try {
                      await updateItem.mutateAsync({
                        id: item.id,
                        sent_to_client: true,
                        approval_status: item.status !== 'publicado' && item.client_id ? 'pendente_aprovacao' : (item.approval_status ?? null),
                      } as any)
                      await qc.refetchQueries({ queryKey: ['planner'] })
                      toast('Post enviado ao cliente!', 'success')
                    } catch (err: any) {
                      toast(err.message, 'error')
                    }
                  }}
                />
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="premium"
              onClick={() => {
                setDayDetailsOpen(false)
                resetForm()
                setForm(prev => ({
                  ...prev,
                  scheduled_date: selectedDayDate ? format(selectedDayDate, 'yyyy-MM-dd') : prev.scheduled_date,
                }))
                setOpen(true)
              }}
            >
              <Plus className="w-4 h-4" /> Adicionar novo post neste dia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Content Picker (Arsenal) ── */}
      {form.client_id && (
        <ContentPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          clientId={form.client_id}
          onSelect={handleAssetSelect}
        />
      )}

      {/* ── Modal: Visualização Completa do Evento ── */}
      {liveSelectedItem && (
        <PlannerItemView
          item={liveSelectedItem}
          open={itemViewOpen}
          onClose={closeItemView}
          onEdit={() => openEdit(liveSelectedItem)}
          userId={user?.id ?? ''}
        />
      )}

      {/* ── Modal: Criar / Editar Post ── */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm() }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Post' : 'Adicionar ao Planejamento'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 min-w-0 w-full max-w-full overflow-x-hidden">
            <Input label="Título *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Post sobre tendências..." />

            <div className="grid grid-cols-1 xs:grid-cols-[1fr_140px] sm:grid-cols-[1fr_140px] gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Data *</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={e => set('scheduled_date', e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Hora (opcional)</label>
                <input
                  type="time"
                  value={form.scheduled_time}
                  onChange={e => set('scheduled_time', e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tipo</label>
                <Select value={form.content_type} onValueChange={v => set('content_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(contentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
                <Select value={form.status} onValueChange={v => set('status', v as PlannerStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ideia">Ideia</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                    <SelectItem value="revisao">Revisão</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Cliente</label>
              <Select value={form.client_id || '__none__'} onValueChange={v => set('client_id', v === '__none__' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cliente</SelectItem>
                  {(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Usar conteúdo do arsenal — só ao criar, quando cliente selecionado */}
            {!editingItem && form.client_id && (
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Arsenal do cliente</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPickerOpen(true)}
                  >
                    <ImageIcon className="w-3 h-3" />
                    {linkedAsset ? 'Trocar conteúdo' : 'Selecionar conteúdo'}
                  </Button>
                </div>
                {linkedAsset ? (
                  <div className="flex items-center gap-2.5 p-2 rounded-md bg-white/[0.04] border border-white/[0.08]">
                    {linkedAsset.media_url && /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(linkedAsset.media_url) ? (
                      <img
                        src={linkedAsset.media_url}
                        alt=""
                        className="w-10 h-10 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-4 h-4 text-zinc-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-zinc-200 truncate">{linkedAsset.title}</p>
                      <p className="text-[10px] text-zinc-600">{contentTypeLabels[linkedAsset.content_type as ContentType]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLinkedAsset(null)}
                      className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-600">
                    Selecione um conteúdo para preencher título, legenda e mídia automaticamente.
                  </p>
                )}
              </div>
            )}

            <Textarea label="Copy" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Contexto, referências..." />

            {/* ── Publicação Instagram ───────────────────────────────────── */}
            <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#E1306C,#833AB4)' }}>
                  <Instagram className="w-3 h-3 text-white" />
                </div>
                <p className="text-[11px] text-zinc-400 uppercase tracking-wide font-semibold">Publicação no Instagram</p>
              </div>

              {/* Seletor de tipo */}
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { value: null,             label: 'Nenhum',    Icon: X         },
                  { value: 'IMAGE',          label: 'Imagem',    Icon: ImageIcon },
                  { value: 'CAROUSEL_ALBUM', label: 'Carrossel', Icon: LayoutGrid },
                  { value: 'REELS',          label: 'Reel',      Icon: Film      },
                ] as const).map(({ value, label, Icon }) => {
                  const active = form.ig_post_type === value
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        set('ig_post_type', value)
                        setIgFiles([]); setIgPreviews([])
                      }}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-[10px] font-medium transition-all ${
                        active
                          ? 'border-pink-500/60 bg-pink-500/10 text-pink-300'
                          : 'border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Área de upload de mídia IG */}
              {form.ig_post_type && (() => {
                const isCarousel = form.ig_post_type === 'CAROUSEL_ALBUM'
                const isReel     = form.ig_post_type === 'REELS'
                const max        = isCarousel ? 10 : 1
                const totalIg    = existingIgMedia.length + igFiles.length

                return (
                  <div className="space-y-2">
                    {isCarousel && (
                      <p className="text-[10px] text-zinc-600">
                        Arraste para reordenar · 1ª imagem = capa
                      </p>
                    )}

                    {/* Mídias existentes (edição) */}
                    {existingIgMedia.length > 0 && (
                      isCarousel ? (
                        <div className="grid grid-cols-5 gap-1.5">
                          {existingIgMedia.map((att, i) => (
                            <div key={att.id} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                              {isVideoAttachment(att)
                                ? <video src={att.file_url} className="w-full h-full object-cover" />
                                : <img src={att.file_url} alt="" className="w-full h-full object-cover" />
                              }
                              <div className="absolute top-0.5 left-0.5 text-[8px] font-bold px-1 py-0.5 rounded bg-black/60 text-white">
                                {i + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExistingIgMedia(att)}
                                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500 transition-colors"
                              >
                                <X className="w-2.5 h-2.5 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="relative w-full h-28 rounded-xl overflow-hidden border border-white/10">
                          {isVideoAttachment(existingIgMedia[0])
                            ? <video src={existingIgMedia[0].file_url} className="w-full h-full object-cover" controls />
                            : <img src={existingIgMedia[0].file_url} alt="" className="w-full h-full object-cover" />
                          }
                          <button
                            type="button"
                            onClick={() => removeExistingIgMedia(existingIgMedia[0])}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500 transition-colors"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      )
                    )}

                    {/* Novas mídias pendentes */}
                    {igPreviews.length > 0 && (
                      isCarousel ? (
                        <div className="grid grid-cols-5 gap-1.5">
                          {igPreviews.map((url, i) => {
                            const globalIdx = existingIgMedia.length + i
                            return (
                              <div
                                key={i}
                                draggable
                                onDragStart={() => igOnDragStart(i)}
                                onDragEnter={() => igOnDragEnter(i)}
                                onDragOver={e => e.preventDefault()}
                                onDragEnd={igOnDragEnd}
                                onDrop={() => igOnDrop(i)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing select-none transition-all ${
                                  igDragOver === i
                                    ? 'border-pink-500 scale-105'
                                    : igDragIdx.current === i
                                    ? 'border-pink-500/40 opacity-50'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                              >
                                {isReel
                                  ? <video src={url} className="w-full h-full object-cover" />
                                  : <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                                }
                                <div className={`absolute top-0.5 left-0.5 text-[8px] font-bold px-1 py-0.5 rounded leading-none ${
                                  globalIdx === 0 ? 'bg-pink-500 text-white' : 'bg-black/60 text-white'
                                }`}>
                                  {globalIdx === 0 ? '★' : globalIdx + 1}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeIgFile(i)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500 transition-colors"
                                >
                                  <X className="w-2.5 h-2.5 text-white" />
                                </button>
                              </div>
                            )
                          })}
                          {totalIg < max && (
                            <button
                              type="button"
                              onClick={() => igFileRef.current?.click()}
                              className="aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-pink-500/50 flex flex-col items-center justify-center gap-0.5 transition-colors text-zinc-600 hover:text-zinc-400"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-[9px]">Add</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="relative w-full h-28 rounded-xl overflow-hidden border border-white/10">
                          {isReel
                            ? <video src={igPreviews[0]} className="w-full h-full object-cover" controls />
                            : <img src={igPreviews[0]} alt="" className="w-full h-full object-cover" />
                          }
                          <button
                            type="button"
                            onClick={() => { setIgFiles([]); setIgPreviews([]) }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500 transition-colors"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      )
                    )}

                    {/* Botão de upload inicial */}
                    {totalIg === 0 && (
                      <button
                        type="button"
                        onClick={() => igFileRef.current?.click()}
                        className="flex items-center gap-2 w-full h-10 px-3 rounded-lg border border-dashed border-white/15 bg-white/3 text-zinc-500 text-xs hover:border-pink-500/50 hover:text-zinc-300 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {isCarousel ? 'Selecionar imagens (até 10)' : isReel ? 'Selecionar vídeo' : 'Selecionar imagem'}
                        </span>
                      </button>
                    )}

                    {/* Carousel add button when empty new files but has existing */}
                    {isCarousel && igPreviews.length === 0 && existingIgMedia.length > 0 && existingIgMedia.length < max && (
                      <button
                        type="button"
                        onClick={() => igFileRef.current?.click()}
                        className="flex items-center gap-2 w-full h-9 px-3 rounded-lg border border-dashed border-white/15 text-zinc-600 text-xs hover:border-pink-500/50 hover:text-zinc-400 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar mais imagens ({existingIgMedia.length}/{max})
                      </button>
                    )}

                    <input
                      ref={igFileRef}
                      type="file"
                      accept={isReel ? 'video/*' : 'image/*'}
                      multiple={isCarousel}
                      className="hidden"
                      onChange={e => handleIgFiles(e.target.files)}
                    />

                    {isCarousel && (existingIgMedia.length + igFiles.length) > 1 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {[...existingIgMedia, ...igFiles].map((_, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                              i === 0 ? 'bg-pink-500 text-white' : 'bg-white/10 text-zinc-400'
                            }`}>
                              {i === 0 ? 'Capa' : `Parte ${i + 1}`}
                            </span>
                            {i < (existingIgMedia.length + igFiles.length) - 1 && (
                              <span className="text-zinc-700 text-[9px]">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Outros Anexos */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Outros anexos</label>
              {existingAttachments.length > 0 && (
                <div className="mb-2 space-y-2">
                  {existingAttachments.map(att => {
                    const isVideo = isVideoAttachment(att)
                    return isVideo ? (
                      <div key={att.id} className="border border-white/8 rounded-xl overflow-hidden bg-black">
                        <video
                          src={att.file_url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          controls
                          className="w-full max-h-[200px] object-contain bg-black"
                        />
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.04]">
                          <Video className="w-3 h-3 text-purple-400 flex-shrink-0" />
                          <span className="text-xs text-gray-300 truncate flex-1">{att.file_name}</span>
                          {att.file_size && <span className="text-[10px] text-gray-600 flex-shrink-0">{formatFileSize(att.file_size)}</span>}
                          <button type="button" onClick={() => markAttachmentForDeletion(att)} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={att.id} className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 border border-white/8 rounded-md px-2.5 py-1.5">
                        <FileTypeIcon type={att.file_type} />
                        <span className="truncate flex-1">{att.file_name}</span>
                        {att.file_size && <span className="text-gray-600 flex-shrink-0 text-[10px]">{formatFileSize(att.file_size)}</span>}
                        <button type="button" onClick={() => markAttachmentForDeletion(att)} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 w-full h-9 px-3 rounded-md border border-dashed border-white/15 bg-white/3 text-gray-400 text-xs hover:border-white/30 hover:bg-white/5 transition-colors">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Clique para anexar arquivos</span>
                <span className="ml-auto text-[10px] text-gray-600">máx. 50MB por arquivo</span>
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" className="hidden" onChange={handleFileSelect} />
              {pendingFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {pendingFiles.map((f, i) => {
                    const isVideo = getMimeType(f).startsWith('video/')
                    const remove = () => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))
                    return isVideo ? (
                      <VideoPreview key={i} file={f} onRemove={remove} />
                    ) : (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 border border-white/8 rounded-md px-2.5 py-1.5">
                        <FileTypeIcon type={f.type} />
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-gray-600 flex-shrink-0 text-[10px]">{formatFileSize(f.size)}</span>
                        <button type="button" onClick={remove} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Links */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Links de referência</label>
              {existingLinks.length > 0 && (
                <div className="mb-2 space-y-1">
                  {existingLinks.map(link => (
                    <div key={link.id} className="flex items-center gap-2 text-xs bg-white/5 border border-white/8 rounded-md px-2.5 py-1.5">
                      <Link2 className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span className="truncate flex-1 text-blue-300 text-[11px]">{link.url}</span>
                      <button type="button" onClick={() => markLinkForDeletion(link)} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                  className="flex-1 h-9 px-3 rounded-md border border-white/10 bg-white/5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button type="button" size="sm" variant="outline" onClick={addLink} disabled={!linkInput.trim()} className="flex-shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {pendingLinks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {pendingLinks.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-white/5 border border-white/8 rounded-md px-2.5 py-1.5">
                      <Link2 className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span className="truncate flex-1 text-blue-300 text-[11px]">{url}</span>
                      <button type="button" onClick={() => setPendingLinks(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); resetForm() }} className="sm:mr-auto">Cancelar</Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={createItem.isPending || updateItem.isPending || isUploading || !form.title.trim()}
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-4 h-4" /> Salvar</>
              )}
            </Button>
            <Button
              variant="premium"
              onClick={() => handleSave(true)}
              disabled={createItem.isPending || updateItem.isPending || isUploading || !form.title.trim() || !form.client_id}
              title={!form.client_id ? 'Selecione um cliente para enviar' : ''}
            >
              {isUploading ? (
                uploadProgress
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando {uploadProgress.current}/{uploadProgress.total}...</>
                  : <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-4 h-4" /> Salvar e enviar ao cliente</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
