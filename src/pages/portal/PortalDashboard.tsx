import { useState, useMemo, useEffect, useRef } from 'react'
import { useWeeklyFormConfig } from '@/hooks/useWeeklyForm'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Paperclip, Link2,
  FileText, ImageIcon, Video, Music, File, Building2,
  ExternalLink, Instagram, Mail, Globe, Phone, Sparkles,
  CheckCircle2, AlertCircle, XCircle, Clock, MessageSquare, X,
  LayoutDashboard, CalendarDays, FolderOpen, LifeBuoy,
  ArrowRight, Bell, Calendar, MessageCircle, Download, Eye,
  ClipboardList, Copy,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO, isThisMonth, startOfToday, isBefore,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  usePortalClient, usePortalPlanner, usePortalContents,
  useSubmitPartialApproval, useApproveAll,
  usePortalMaterials, usePortalSupportContacts,
  usePortalContentAssets, usePortalBrandDNA, usePortalPayments,
} from '@/hooks/usePortal'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { PlannerCommentsThread } from '@/components/PlannerCommentsThread'
import { NotificationsModal } from '@/components/NotificationsModal'
import { PortalResultadosTab } from './PortalResultadosTab'
import { PortalFinanceiroTab } from './PortalFinanceiroTab'
import { PortalNotesTab } from './PortalNotesTab'
import { useNotifications } from '@/hooks/useNotifications'
import type { ApprovalStatus, Client, Content, ClientMaterial, ClientSupportContact, MaterialType, ContactType, ContentAsset, BrandDNA } from '@/types'
import { contentTypeLabels, formatDate, formatRelative } from '@/utils/formatters'
import { calcFinancialStatus, getFinancialAuxText, hasPaidCurrentCycle } from '@/utils/financial'
import { isImageUrl, isVideoUrl } from '@/utils/media'
import type { PlannerItem, PlannerAttachment, PlannerStatus, ContentType } from '@/types'

// ─── Status config ────────────────────────────────────────────────────────────

const statusColors: Record<PlannerStatus, string> = {
  ideia: 'bg-purple-500', producao: 'bg-blue-500', revisao: 'bg-yellow-500',
  aprovado: 'bg-green-500', publicado: 'bg-emerald-500',
}
const statusTextColors: Record<PlannerStatus, string> = {
  ideia: 'text-purple-600', producao: 'text-blue-600', revisao: 'text-yellow-600',
  aprovado: 'text-green-600', publicado: 'text-emerald-600',
}
const statusLabels: Record<PlannerStatus, string> = {
  ideia: 'Ideia', producao: 'Produção', revisao: 'Revisão',
  aprovado: 'Aprovado', publicado: 'Publicado',
}

// ─── Approval config ─────────────────────────────────────────────────────────

const approvalBg: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'bg-yellow-50 border-yellow-200',
  aprovado: 'bg-green-50 border-green-200',
  ajuste_solicitado: 'bg-orange-50 border-orange-200',
  ajuste_realizado: 'bg-blue-50 border-blue-200',
  reprovado: 'bg-red-50 border-red-200',
}
const approvalText: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'text-yellow-600',
  aprovado: 'text-green-600',
  ajuste_solicitado: 'text-orange-600',
  ajuste_realizado: 'text-blue-600',
  reprovado: 'text-red-600',
}
const approvalLabels: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  ajuste_solicitado: 'Ajuste solicitado',
  ajuste_realizado: 'Ajuste realizado — revise e decida',
  reprovado: 'Reprovado',
}
const approvalIcons: Record<ApprovalStatus, React.ReactNode> = {
  pendente_aprovacao: <Clock className="w-3.5 h-3.5" />,
  aprovado: <CheckCircle2 className="w-3.5 h-3.5" />,
  ajuste_solicitado: <AlertCircle className="w-3.5 h-3.5" />,
  ajuste_realizado: <CheckCircle2 className="w-3.5 h-3.5" />,
  reprovado: <XCircle className="w-3.5 h-3.5" />,
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

// ─── Hover Tooltip ────────────────────────────────────────────────────────────

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
          <div key={item.id} className={i > 0 ? 'mt-2.5 pt-2.5 border-t border-[#e2e8f0]' : ''}>
            <div className="flex items-start gap-2 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full mt-[3px] flex-shrink-0 ${statusColors[item.status as PlannerStatus]}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#0f0f0f] text-[11px] leading-snug">{item.title}</p>
                <p className="text-[10px] text-[#64748b] mt-0.5">
                  {contentTypeLabels[item.content_type as ContentType]} · {statusLabels[item.status as PlannerStatus]}
                </p>
              </div>
            </div>
            {item.notes && (
              <p className="text-[10px] text-[#64748b] line-clamp-2 mb-1.5 leading-relaxed">{item.notes}</p>
            )}
            {(() => {
              const img = item.attachments?.find(a => a.file_type.startsWith('image/'))
              return img ? <img src={img.file_url} alt="" className="w-full h-20 object-cover rounded-lg mb-1.5" /> : null
            })()}
            <div className="flex items-center gap-3 flex-wrap">
              {item.attachments && item.attachments.length > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3 text-[#94a3b8]" />
                  <span className="text-[10px] text-[#64748b]">
                    {item.attachments.length} {item.attachments.length === 1 ? 'anexo' : 'anexos'}
                  </span>
                </div>
              )}
              {item.links && item.links.length > 0 && (
                <div className="flex items-center gap-1 min-w-0">
                  <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  <span className="text-[10px] text-blue-600 truncate">
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

// ─── Bloco de aprovação parcial (Arte ou Copy) ───────────────────────────────

interface PartialApprovalBlockProps {
  label: string
  description: string
  status: ApprovalStatus | null
  pending: ApprovalStatus | null
  feedback: string
  isBusy: boolean
  busyThis: boolean
  onAction: (s: ApprovalStatus) => void
  onFeedbackChange: (v: string) => void
  onCancelPending: () => void
}

const approvalDot: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'bg-yellow-400',
  aprovado:           'bg-green-500',
  ajuste_solicitado:  'bg-orange-400',
  ajuste_realizado:   'bg-blue-400',
  reprovado:          'bg-red-500',
}

function PartialApprovalBlock({
  label, description, status, pending, feedback, isBusy, busyThis, onAction, onFeedbackChange, onCancelPending,
}: PartialApprovalBlockProps) {
  const resolved = status || 'pendente_aprovacao'
  const isDecided = resolved !== 'pendente_aprovacao' && resolved !== 'ajuste_realizado'
  const needsFeedback = pending === 'ajuste_solicitado' || pending === 'reprovado'

  return (
    <div className="space-y-2.5">
      {/* Label + status atual */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
          <span className="text-[9px] text-gray-300">·</span>
          <span className="text-[10px] text-gray-400">{description}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${approvalText[resolved]}`}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[resolved]}`} />
          {approvalLabels[resolved]}
        </div>
      </div>

      {/* Chips de ação — só quando não decidido */}
      {!isDecided && (
        <div className="flex gap-1.5 flex-wrap">
          {/* Aprovar */}
          <button
            onClick={() => onAction('aprovado')}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50"
          >
            {busyThis && !pending
              ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <CheckCircle2 className="w-3 h-3" />}
            Aprovar
          </button>

          {/* Solicitar ajuste */}
          <button
            onClick={() => onAction('ajuste_solicitado')}
            disabled={isBusy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed
              ${pending === 'ajuste_solicitado'
                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50'}`}
          >
            {busyThis && pending === 'ajuste_solicitado'
              ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <AlertCircle className="w-3 h-3" />}
            {pending === 'ajuste_solicitado' ? 'Confirmar' : 'Solicitar ajuste'}
          </button>

          {/* Reprovar */}
          <button
            onClick={() => onAction('reprovado')}
            disabled={isBusy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed
              ${pending === 'reprovado'
                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50'}`}
          >
            {busyThis && pending === 'reprovado'
              ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <XCircle className="w-3 h-3" />}
            {pending === 'reprovado' ? 'Confirmar' : 'Reprovar'}
          </button>
        </div>
      )}

      {/* Feedback já salvo */}
      {status && (status === 'ajuste_solicitado' || status === 'reprovado') && feedback && !pending && (
        <div className="flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
          <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-gray-600 leading-relaxed break-words select-text">{feedback}</p>
        </div>
      )}

      {/* Textarea inline para feedback */}
      {needsFeedback && (
        <div className="space-y-1.5">
          <textarea
            value={feedback}
            onChange={e => onFeedbackChange(e.target.value)}
            placeholder={`O que precisa ajustar na ${label.toLowerCase()}?`}
            rows={2}
            className="w-full text-[11px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none transition-all"
          />
          <button onClick={onCancelPending} className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helper: recalcular status geral no cliente (espelha lógica do hook) ─────

function computeClientOverall(
  art: ApprovalStatus | null,
  copy: ApprovalStatus | null,
): ApprovalStatus {
  const statuses = [art, copy].filter(Boolean) as ApprovalStatus[]
  if (statuses.some(s => s === 'reprovado')) return 'reprovado'
  if (statuses.some(s => s === 'ajuste_solicitado')) return 'ajuste_solicitado'
  if (statuses.some(s => s === 'ajuste_realizado')) return 'ajuste_realizado'
  if (statuses.length > 0 && statuses.every(s => s === 'aprovado')) return 'aprovado'
  return 'pendente_aprovacao'
}

// ─── Item Detail View ─────────────────────────────────────────────────────────

function ItemDetailView({
  item, open, onClose,
}: { item: PlannerItem; open: boolean; onClose: () => void }) {
  const submitPartial = useSubmitPartialApproval()
  const approveAll   = useApproveAll()
  const { toast }    = useToast()
  const scrollRef     = useRef<HTMLDivElement>(null)  // wrapper mobile
  const bodyScrollRef = useRef<HTMLDivElement>(null)  // corpo desktop

  // Garante que o modal sempre abre no topo em ambos os layouts
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      if (scrollRef.current)     scrollRef.current.scrollTop = 0
      if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = 0
    }, 0)
    return () => clearTimeout(t)
  }, [open])

  // Mídias (imagens + vídeos, ordenadas por sort_order)
  const mediaItems = useMemo(() => [
    ...(item.attachments?.filter(a => a.file_type.startsWith('image/')) || []).map(a => ({ ...a, kind: 'image' as const })),
    ...(item.attachments?.filter(a => a.file_type.startsWith('video/')) || []).map(a => ({ ...a, kind: 'video' as const })),
  ].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [item.attachments])

  const otherAttachments = item.attachments?.filter(
    (a: PlannerAttachment) => !a.file_type.startsWith('image/') && !a.file_type.startsWith('video/')
  ) || []

  const isCarousel = mediaItems.length > 1
  const [mediaIdx, setMediaIdx]       = useState(0)
  const currentMedia                   = mediaItems[mediaIdx] ?? null
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [expandedSection, setExpandedSection] = useState<'completa' | 'partes'>('partes')

  // Approval state
  const [localStatus, setLocalStatus] = useState<ApprovalStatus>(
    (item.approval_status || 'pendente_aprovacao') as ApprovalStatus
  )
  const [localArtStatus, setLocalArtStatus] = useState<ApprovalStatus | null>(
    (item.art_approval_status as ApprovalStatus) || null
  )
  const [localCopyStatus, setLocalCopyStatus] = useState<ApprovalStatus | null>(
    (item.copy_approval_status as ApprovalStatus) || null
  )
  const [artFeedback, setArtFeedback]   = useState(item.art_feedback || '')
  const [copyFeedback, setCopyFeedback] = useState(item.copy_feedback || '')
  const [artPending, setArtPending]     = useState<ApprovalStatus | null>(null)
  const [copyPending, setCopyPending]   = useState<ApprovalStatus | null>(null)
  const [busyField, setBusyField]       = useState<'all' | 'art' | 'copy' | null>(null)

  // Per-slide approval state (carousel) — inclui ajuste_solicitado e feedback por slide
  type SlideDecision = {
    status: 'aprovado' | 'ajuste_solicitado' | 'reprovado' | null
    feedback: string
    pendingStatus: 'ajuste_solicitado' | 'reprovado' | null
  }
  const [slideDecisions, setSlideDecisions] = useState<Record<string, SlideDecision>>(() => {
    const m: Record<string, SlideDecision> = {}
    mediaItems.forEach(s => { m[s.id] = { status: null, feedback: '', pendingStatus: null } })
    return m
  })

  useEffect(() => {
    setLocalStatus((item.approval_status || 'pendente_aprovacao') as ApprovalStatus)
    setLocalArtStatus((item.art_approval_status as ApprovalStatus) || null)
    setLocalCopyStatus((item.copy_approval_status as ApprovalStatus) || null)
    setArtFeedback(item.art_feedback || '')
    setCopyFeedback(item.copy_feedback || '')
    setArtPending(null)
    setCopyPending(null)
    setBusyField(null)
    setMediaIdx(0)
    setNotesExpanded(false)
    setExpandedSection('partes')
    const m: Record<string, SlideDecision> = {}
    mediaItems.forEach(s => { m[s.id] = { status: null, feedback: '', pendingStatus: null } })
    setSlideDecisions(m)
  }, [item.id])

  const isBusy        = busyField !== null
  const overallDecided = localStatus !== 'pendente_aprovacao' && localStatus !== 'ajuste_realizado'
  const artResolved   = (localArtStatus  || 'pendente_aprovacao') as ApprovalStatus
  const copyResolved  = (localCopyStatus || 'pendente_aprovacao') as ApprovalStatus
  const needsReview   = localStatus === 'ajuste_realizado'

  // Aprovado → decisão permanente, botões somem para sempre.
  // Ajuste solicitado / reprovado → botões somem enquanto aguarda agência.
  // Quando agência retorna (ajuste_realizado), apenas as partes com ajuste/reprovado
  // reaparecem com botões — o que já estava aprovado continua sem botões.
  const artDecided  = artResolved  === 'aprovado'
    || (artResolved  !== 'pendente_aprovacao' && artResolved  !== 'ajuste_realizado' && !needsReview)
  const copyDecided = copyResolved === 'aprovado'
    || (copyResolved !== 'pendente_aprovacao' && copyResolved !== 'ajuste_realizado' && !needsReview)

  // Quando a agência devolveu (ajuste_realizado), mostrar "Ajuste realizado" no label
  // em vez do status anterior (ajuste_solicitado / reprovado) — contexto mais claro pro cliente
  const displayArtStatus: ApprovalStatus  = (needsReview && (artResolved  === 'ajuste_solicitado' || artResolved  === 'reprovado')) ? 'ajuste_realizado' : artResolved
  const displayCopyStatus: ApprovalStatus = (needsReview && (copyResolved === 'ajuste_solicitado' || copyResolved === 'reprovado')) ? 'ajuste_realizado' : copyResolved
  const artNeedsFeedback  = artPending  === 'ajuste_solicitado' || artPending  === 'reprovado'
  const copyNeedsFeedback = copyPending === 'ajuste_solicitado' || copyPending === 'reprovado'

  // ── Handlers ──

  const handleApproveAll = async () => {
    setBusyField('all')
    try {
      await approveAll.mutateAsync({ plannerId: item.id })
      setLocalStatus('aprovado'); setLocalArtStatus('aprovado'); setLocalCopyStatus('aprovado')
      const all: Record<string, SlideDecision> = {}
      mediaItems.forEach(s => { all[s.id] = { status: 'aprovado', feedback: '', pendingStatus: null } })
      setSlideDecisions(all)
      toast('Tudo aprovado! 🎉', 'success')
    } catch (err: any) { toast(err.message, 'error') }
    finally { setBusyField(null) }
  }

  const handleArtAction = async (status: ApprovalStatus) => {
    const needsFeedback = status === 'ajuste_solicitado' || status === 'reprovado'
    if (needsFeedback && artPending !== status) { setArtPending(status); return }
    setBusyField('art')
    try {
      await submitPartial.mutateAsync({ plannerId: item.id, field: 'art', status, feedback: artFeedback, currentArtStatus: localArtStatus, currentCopyStatus: localCopyStatus })
      setLocalArtStatus(status)
      setLocalStatus(computeClientOverall(status, localCopyStatus))
      setArtPending(null)
      toast(`Arte: ${approvalLabels[status]}!`, 'success')
    } catch (err: any) { toast(err.message, 'error') }
    finally { setBusyField(null) }
  }

  // Seleciona status para o slide atual — se precisa feedback, entra em modo pendente
  const handleSlideStatus = (slideId: string, status: 'aprovado' | 'ajuste_solicitado' | 'reprovado') => {
    const needsFeedback = status === 'ajuste_solicitado' || status === 'reprovado'
    setSlideDecisions(prev => ({
      ...prev,
      [slideId]: {
        ...prev[slideId],
        pendingStatus: needsFeedback ? status : null,
        status: needsFeedback ? prev[slideId].status : status,
      }
    }))
  }

  // Confirma decisão do slide (com ou sem feedback) e verifica se todos estão decididos
  const confirmSlideDecision = async (slideId: string) => {
    const decision = slideDecisions[slideId]
    const finalStatus = decision.pendingStatus ?? decision.status!
    const updatedDecisions = {
      ...slideDecisions,
      [slideId]: { status: finalStatus, feedback: decision.feedback.trim(), pendingStatus: null }
    }
    setSlideDecisions(updatedDecisions)

    // Se todos os slides têm decisão confirmada, submete
    const allDecided = mediaItems.every(m => {
      const d = updatedDecisions[m.id]
      return d.status !== null && d.pendingStatus === null
    })
    if (!allDecided) return

    // Agrega: prioridade reprovado > ajuste_solicitado > aprovado
    const statuses = mediaItems.map(m => updatedDecisions[m.id].status!)
    const aggregate: ApprovalStatus = statuses.every(s => s === 'aprovado') ? 'aprovado'
      : statuses.some(s => s === 'reprovado') ? 'reprovado'
      : 'ajuste_solicitado'

    // Feedback estruturado por slide (JSON) para a agência ver com detalhes
    const feedbackData = mediaItems.map((m, i) => ({
      slide: i + 1,
      status: updatedDecisions[m.id].status!,
      feedback: updatedDecisions[m.id].feedback,
    }))

    setBusyField('art')
    try {
      await submitPartial.mutateAsync({
        plannerId: item.id, field: 'art', status: aggregate,
        feedback: JSON.stringify(feedbackData),
        currentArtStatus: localArtStatus, currentCopyStatus: localCopyStatus,
      })
      setLocalArtStatus(aggregate)
      setLocalStatus(computeClientOverall(aggregate, localCopyStatus))
      toast('Carrossel avaliado! ✓', 'success')
    } catch (err: any) { toast(err.message, 'error') }
    finally { setBusyField(null) }
  }

  const handleCopyAction = async (status: ApprovalStatus) => {
    const needsFeedback = status === 'ajuste_solicitado' || status === 'reprovado'
    if (needsFeedback && copyPending !== status) { setCopyPending(status); return }
    setBusyField('copy')
    try {
      await submitPartial.mutateAsync({ plannerId: item.id, field: 'copy', status, feedback: copyFeedback, currentArtStatus: localArtStatus, currentCopyStatus: localCopyStatus })
      setLocalCopyStatus(status); setCopyPending(null)
      setLocalStatus(computeClientOverall(localArtStatus, status))
      toast(`Copy: ${approvalLabels[status]}!`, 'success')
    } catch (err: any) { toast(err.message, 'error') }
    finally { setBusyField(null) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent
        className="w-[96vw] max-w-[96vw] lg:max-w-5xl p-0 overflow-hidden bg-white flex flex-col"
        style={{ maxHeight: 'min(92vh, 900px)', height: 'min(92vh, 900px)' }}
        onOpenAutoFocus={e => { e.preventDefault(); if (scrollRef.current) scrollRef.current.scrollTop = 0 }}
      >

        {/* Wrapper único: rola no mobile como um todo, flex-row no desktop */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent"
        >

          {/* ══ HEADER MOBILE — primeiro filho = topo no mobile ══ */}
          <div className="lg:hidden px-4 pt-3.5 pb-3 border-b border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-[11px] text-gray-500">
                  {format(parseISO(item.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {item.scheduled_time && ` às ${item.scheduled_time.slice(0, 5)}`}
                </span>
                <span className="text-gray-200">·</span>
                <div className={`flex items-center gap-1 text-[10px] font-semibold ${approvalText[localStatus]}`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[localStatus]}`} />
                  {approvalLabels[localStatus]}
                </div>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h2 className="text-[15px] font-semibold text-gray-900 leading-snug break-words">{item.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">
                {statusLabels[item.status as PlannerStatus]}
              </span>
              <span className="text-[10px] text-gray-400">{contentTypeLabels[item.content_type as ContentType]}</span>
            </div>
          </div>

          {/* ══ ESQUERDA: Prévia ══ */}
          {mediaItems.length > 0 && (
            <div className="lg:w-[44%] flex-shrink-0 flex flex-col bg-[#f7f7f7] border-b lg:border-b-0 lg:border-r border-gray-100">
              {/* Badge "Prévia do post" */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
                <div className="w-5 h-5 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <ImageIcon className="w-3 h-3 text-gray-500" />
                </div>
                <span className="text-[11px] font-medium text-gray-600">Prévia do post</span>
                {isCarousel && (
                  <span className="ml-auto text-[10px] text-gray-400 font-medium">
                    {mediaIdx + 1} / {mediaItems.length}
                  </span>
                )}
              </div>

              {/* Mídia principal — h-64 fixo no mobile, flex-1 no desktop */}
              <div className="relative bg-[#e8e8e8] h-64 lg:h-auto lg:flex-1 lg:min-h-0">
                {currentMedia?.kind === 'image' ? (
                  <img src={currentMedia.file_url} alt={currentMedia.file_name}
                    className="absolute inset-0 w-full h-full object-contain" />
                ) : currentMedia?.kind === 'video' ? (
                  <video key={currentMedia.file_url} src={currentMedia.file_url}
                    autoPlay muted loop playsInline controls
                    className="absolute inset-0 w-full h-full object-contain" />
                ) : null}

                {/* Setas de navegação */}
                {isCarousel && (
                  <>
                    <button onClick={() => setMediaIdx(i => Math.max(0, i - 1))} disabled={mediaIdx === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow border border-gray-200 flex items-center justify-center transition-all disabled:opacity-30 active:scale-95">
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button onClick={() => setMediaIdx(i => Math.min(mediaItems.length - 1, i + 1))} disabled={mediaIdx === mediaItems.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow border border-gray-200 flex items-center justify-center transition-all disabled:opacity-30 active:scale-95">
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  </>
                )}

                {/* Dots indicadores */}
                {isCarousel && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                    {mediaItems.map((_, i) => (
                      <button key={i} onClick={() => setMediaIdx(i)}
                        className={`rounded-full transition-all ${i === mediaIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
                    ))}
                  </div>
                )}

                {currentMedia && (
                  <a href={currentMedia.file_url} target="_blank" rel="noopener noreferrer"
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center transition-all">
                    <ExternalLink className="w-3 h-3" style={{ color: '#fff' }} />
                  </a>
                )}
              </div>

              {/* Thumbnails de slides (carrossel) */}
              {isCarousel && (
                <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {mediaItems.map((m, i) => {
                      const sd = slideDecisions[m.id]
                      const ss = sd?.status
                      return (
                        <button key={m.id} onClick={() => setMediaIdx(i)}
                          className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all
                            ${i === mediaIdx ? 'border-blue-500 shadow-sm' : ss === 'aprovado' ? 'border-green-400' : ss === 'ajuste_solicitado' ? 'border-orange-400' : ss === 'reprovado' ? 'border-red-400' : 'border-gray-200 hover:border-gray-300 opacity-60'}`}>
                          {m.kind === 'image'
                            ? <img src={m.file_url} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Video className="w-4 h-4 text-gray-400" /></div>}
                          <div className="absolute bottom-0 right-0 bg-black/50 text-[8px] px-1 leading-4 rounded-tl font-bold" style={{ color: '#fff' }}>{i + 1}</div>
                          {ss === 'aprovado'          && <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3" style={{ color: '#fff' }} /></div>}
                          {ss === 'ajuste_solicitado' && <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"><AlertCircle className="w-3 h-3" style={{ color: '#fff' }} /></div>}
                          {ss === 'reprovado'         && <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><XCircle className="w-3 h-3" style={{ color: '#fff' }} /></div>}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    ℹ️ Esse post contém {mediaItems.length} artes (imagem, vídeo ou carrossel)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══ DIREITA: Info + Aprovação ══ */}
          <div className="lg:flex lg:flex-col lg:flex-1 lg:overflow-hidden bg-white min-w-0">

            {/* Header — oculto no mobile (aparece acima no bloco dedicado) */}
            <div className="hidden lg:block flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-500">
                    {format(parseISO(item.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {item.scheduled_time && ` às ${item.scheduled_time.slice(0, 5)}`}
                  </span>
                  <span className="text-gray-200">·</span>
                  <div className={`flex items-center gap-1 text-[10px] font-semibold ${approvalText[localStatus]}`}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[localStatus]}`} />
                    {approvalLabels[localStatus]}
                  </div>
                </div>
                <button onClick={onClose}
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h2 className="text-[15px] font-semibold text-gray-900 leading-snug break-words">{item.title}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">
                  {statusLabels[item.status as PlannerStatus]}
                </span>
                <span className="text-[10px] text-gray-400">{contentTypeLabels[item.content_type as ContentType]}</span>
              </div>
            </div>

            {/* Corpo — sem scroll próprio no mobile (o wrapper pai rola); scroll interno apenas no desktop */}
            <div ref={bodyScrollRef} className="px-5 py-4 space-y-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">

              {/* Legenda */}
              {item.notes && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Legenda</p>
                  <p className={`text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words select-text ${!notesExpanded ? 'line-clamp-3' : ''}`}>
                    {item.notes}
                  </p>
                  {item.notes.length > 120 && (
                    <button onClick={() => setNotesExpanded(v => !v)}
                      className="text-[12px] text-blue-500 hover:text-blue-700 mt-0.5 font-medium transition-colors">
                      {notesExpanded ? 'ver menos' : 'ver mais'}
                    </button>
                  )}
                </div>
              )}

              {/* Links */}
              {item.links && item.links.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Links</p>
                  <div className="space-y-1.5">
                    {item.links.map(link => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors">
                        <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-600 truncate flex-1">{link.label || link.url}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Outros anexos */}
              {otherAttachments.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Anexos</p>
                  <div className="space-y-1.5">
                    {otherAttachments.map((att: PlannerAttachment) => (
                      <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors">
                        <FileTypeIcon type={att.file_type} size="md" />
                        <span className="text-xs text-gray-700 truncate flex-1">{att.file_name}</span>
                        {att.file_size && <span className="text-[10px] text-gray-400 flex-shrink-0">{formatFileSize(att.file_size)}</span>}
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Aprovação do cliente ── */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                {/* Card header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-[13px] font-semibold text-gray-800">Aprovação do cliente</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Escolha como deseja aprovar este post.</p>
                </div>

                {/* ─ Opção 1: Aprovação completa ─ */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setExpandedSection(s => s === 'completa' ? 'partes' : 'completa')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800">Aprovação completa</p>
                      <p className="text-[11px] text-gray-400">Aprova todas as artes e textos do post de uma vez.</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expandedSection === 'completa' ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedSection === 'completa' && (
                    <div className="px-4 pb-3.5">
                      {overallDecided ? (
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${approvalBg[localStatus]}`}>
                          <span className={approvalText[localStatus]}>{approvalIcons[localStatus]}</span>
                          <span className={`text-[12px] font-semibold ${approvalText[localStatus]}`}>{approvalLabels[localStatus]}</span>
                        </div>
                      ) : (
                        <button onClick={handleApproveAll} disabled={isBusy}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all"
                          style={{ color: '#ffffff' }}>
                          {busyField === 'all'
                            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <CheckCircle2 className="w-4 h-4" />}
                          Aprovar tudo de uma vez
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ─ Opção 2: Aprovação por partes ─ */}
                <div>
                  <button
                    onClick={() => setExpandedSection(s => s === 'partes' ? 'completa' : 'partes')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800">Aprovação por partes</p>
                      <p className="text-[11px] text-gray-400">Aprove ou reprove cada arte ou texto individualmente.</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expandedSection === 'partes' ? 'rotate-90' : ''}`} />
                  </button>

                  {expandedSection === 'partes' && (
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-50">

                      {/* ── ARTE ── */}
                      <div className="pt-3">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Arte</span>
                            <span className="text-[9px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">Imagem, vídeo ou carrossel</span>
                          </div>
                          <div className={`flex items-center gap-1 text-[10px] font-semibold ${approvalText[displayArtStatus]}`}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[displayArtStatus]}`} />
                            {approvalLabels[displayArtStatus]}
                          </div>
                        </div>

                        {artDecided ? (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${approvalBg[displayArtStatus]}`}>
                            <span className={approvalText[displayArtStatus]}>{approvalIcons[displayArtStatus]}</span>
                            <span className={`text-[11px] font-semibold ${approvalText[displayArtStatus]}`}>{approvalLabels[displayArtStatus]}</span>
                          </div>
                        ) : isCarousel ? (
                          /* Carrossel: seletor por slide sincronizado com o painel esquerdo */
                          <div className="space-y-3">
                            {/* Barra de progresso dos slides */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {mediaItems.map((slide, i) => {
                                const sd = slideDecisions[slide.id]
                                const ss = sd?.status
                                const isPending = sd?.pendingStatus !== null
                                const isActive = i === mediaIdx
                                const dotColor = ss === 'aprovado' ? 'bg-green-500'
                                  : ss === 'ajuste_solicitado' ? 'bg-orange-400'
                                  : ss === 'reprovado' ? 'bg-red-500'
                                  : isPending ? 'bg-yellow-400'
                                  : 'bg-gray-200'
                                return (
                                  <button key={slide.id} onClick={() => setMediaIdx(i)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all
                                      ${isActive ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                                    Slide {i + 1}
                                  </button>
                                )
                              })}
                            </div>

                            {/* Controles do slide atual */}
                            {(() => {
                              const slide = mediaItems[mediaIdx]
                              if (!slide) return null
                              const sd = slideDecisions[slide.id]
                              const ss = sd?.status
                              const pending = sd?.pendingStatus
                              const needsFeedback = pending === 'ajuste_solicitado' || pending === 'reprovado'
                              const isConfirmed = ss !== null && pending === null

                              return (
                                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2.5">
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                    Slide {mediaIdx + 1} de {mediaItems.length}
                                    {isConfirmed && (
                                      <span className={`ml-2 font-semibold ${ss === 'aprovado' ? 'text-green-600' : ss === 'ajuste_solicitado' ? 'text-orange-600' : 'text-red-600'}`}>
                                        · {ss === 'aprovado' ? 'Aprovado' : ss === 'ajuste_solicitado' ? 'Ajuste solicitado' : 'Reprovado'}
                                      </span>
                                    )}
                                  </p>

                                  {isConfirmed ? (
                                    /* Slide já decidido — mostra status + botão para alterar */
                                    <div className="space-y-1.5">
                                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-semibold
                                        ${ss === 'aprovado' ? 'bg-green-50 border-green-200 text-green-700'
                                          : ss === 'ajuste_solicitado' ? 'bg-orange-50 border-orange-200 text-orange-700'
                                          : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        {ss === 'aprovado' ? <CheckCircle2 className="w-3.5 h-3.5" />
                                          : ss === 'ajuste_solicitado' ? <AlertCircle className="w-3.5 h-3.5" />
                                          : <XCircle className="w-3.5 h-3.5" />}
                                        {ss === 'aprovado' ? 'Aprovado' : ss === 'ajuste_solicitado' ? 'Ajuste solicitado' : 'Reprovado'}
                                      </div>
                                      {sd.feedback && (
                                        <div className="flex items-start gap-1.5 px-2.5 py-2 bg-white border border-gray-100 rounded-lg">
                                          <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <p className="text-[11px] text-gray-600">{sd.feedback}</p>
                                        </div>
                                      )}
                                      <button onClick={() => setSlideDecisions(prev => ({ ...prev, [slide.id]: { status: null, feedback: '', pendingStatus: null } }))}
                                        className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
                                        Alterar decisão
                                      </button>
                                    </div>
                                  ) : (
                                    /* Slide aguardando decisão */
                                    <div className="space-y-2">
                                      <div className="flex gap-1.5 flex-wrap">
                                        <button onClick={async () => {
                                            // Aprovar não precisa de feedback — confirma direto
                                            const updatedDecisions = {
                                              ...slideDecisions,
                                              [slide.id]: { status: 'aprovado' as const, feedback: '', pendingStatus: null }
                                            }
                                            setSlideDecisions(updatedDecisions)
                                            const allDecided = mediaItems.every(m => updatedDecisions[m.id]?.status !== null && updatedDecisions[m.id]?.pendingStatus === null)
                                            if (!allDecided) return
                                            const statuses = mediaItems.map(m => updatedDecisions[m.id].status!)
                                            const aggregate: ApprovalStatus = statuses.every(s => s === 'aprovado') ? 'aprovado' : statuses.some(s => s === 'reprovado') ? 'reprovado' : 'ajuste_solicitado'
                                            const feedbackData = mediaItems.map((m, i) => ({ slide: i + 1, status: updatedDecisions[m.id].status!, feedback: updatedDecisions[m.id].feedback }))
                                            setBusyField('art')
                                            try {
                                              await submitPartial.mutateAsync({ plannerId: item.id, field: 'art', status: aggregate, feedback: JSON.stringify(feedbackData), currentArtStatus: localArtStatus, currentCopyStatus: localCopyStatus })
                                              setLocalArtStatus(aggregate); setLocalStatus(computeClientOverall(aggregate, localCopyStatus))
                                              toast('Carrossel avaliado! ✓', 'success')
                                            } catch (err: any) { toast(err.message, 'error') }
                                            finally { setBusyField(null) }
                                          }} disabled={isBusy}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all disabled:opacity-50">
                                          <CheckCircle2 className="w-3 h-3" /> Aprovar
                                        </button>
                                        <button onClick={() => handleSlideStatus(slide.id, 'ajuste_solicitado')} disabled={isBusy}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50
                                            ${pending === 'ajuste_solicitado' ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50'}`}>
                                          <AlertCircle className="w-3 h-3" /> Solicitar ajuste
                                        </button>
                                        <button onClick={() => handleSlideStatus(slide.id, 'reprovado')} disabled={isBusy}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50
                                            ${pending === 'reprovado' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50'}`}>
                                          <XCircle className="w-3 h-3" /> Reprovar
                                        </button>
                                      </div>
                                      {needsFeedback && (
                                        <div className="space-y-2">
                                          <textarea
                                            value={sd.feedback}
                                            onChange={e => setSlideDecisions(prev => ({ ...prev, [slide.id]: { ...prev[slide.id], feedback: e.target.value } }))}
                                            placeholder={pending === 'ajuste_solicitado' ? 'O que precisa ajustar neste slide?' : 'Por que este slide foi reprovado?'}
                                            rows={2}
                                            className="w-full text-[11px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
                                          />
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => confirmSlideDecision(slide.id)} disabled={isBusy}
                                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all disabled:opacity-50
                                                ${pending === 'ajuste_solicitado' ? 'bg-orange-500 border-orange-500' : 'bg-red-500 border-red-500'}`}
                                              style={{ color: '#fff' }}>
                                              {isBusy ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                              Confirmar
                                            </button>
                                            <button onClick={() => setSlideDecisions(prev => ({ ...prev, [slide.id]: { ...prev[slide.id], pendingStatus: null } }))}
                                              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {!needsFeedback && (
                                        <button onClick={() => confirmSlideDecision(slide.id)} disabled={isBusy || sd.status === null}
                                          className="text-[10px] text-blue-500 hover:text-blue-700 font-medium transition-colors disabled:opacity-0">
                                          Confirmar e ir para próximo
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {/* Resumo + contador de progresso */}
                            {(() => {
                              const decided = mediaItems.filter(m => slideDecisions[m.id]?.status !== null && slideDecisions[m.id]?.pendingStatus === null).length
                              const total = mediaItems.length
                              return decided > 0 && decided < total ? (
                                <p className="text-[10px] text-gray-400">
                                  {decided} de {total} slides avaliados · navegue pelos slides para avaliar todos
                                </p>
                              ) : null
                            })()}
                          </div>
                        ) : (
                          /* Arte única */
                          <div className="space-y-2">
                            <div className="flex gap-1.5 flex-wrap">
                              <button onClick={() => handleArtAction('aprovado')} disabled={isBusy}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all disabled:opacity-50">
                                {busyField === 'art' && !artPending ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Aprovar
                              </button>
                              <button onClick={() => handleArtAction('ajuste_solicitado')} disabled={isBusy}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50
                                  ${artPending === 'ajuste_solicitado' ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50'}`}>
                                <AlertCircle className="w-3 h-3" /> Solicitar ajuste
                              </button>
                              <button onClick={() => handleArtAction('reprovado')} disabled={isBusy}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50
                                  ${artPending === 'reprovado' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50'}`}>
                                <XCircle className="w-3 h-3" /> Reprovar
                              </button>
                            </div>
                            {artNeedsFeedback && (
                              <div className="space-y-2">
                                <textarea value={artFeedback} onChange={e => setArtFeedback(e.target.value)}
                                  placeholder="O que precisa ajustar na arte?" rows={2}
                                  className="w-full text-[11px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none" />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleArtAction(artPending!)}
                                    disabled={isBusy}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all disabled:opacity-50
                                      ${artPending === 'ajuste_solicitado' ? 'bg-orange-500 border-orange-500' : 'bg-red-500 border-red-500'}`}
                                    style={{ color: '#fff' }}>
                                    {busyField === 'art'
                                      ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      : <CheckCircle2 className="w-3 h-3" />}
                                    Confirmar
                                  </button>
                                  <button onClick={() => setArtPending(null)} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Feedback arte salvo */}
                        {artFeedback && (artResolved === 'reprovado' || artResolved === 'ajuste_solicitado') && (
                          <div className="mt-2 flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                            <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-gray-600 leading-relaxed">{artFeedback}</p>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-gray-100" />

                      {/* ── COPY ── */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Copy</span>
                            <span className="text-[9px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">Legenda e texto do post</span>
                          </div>
                          <div className={`flex items-center gap-1 text-[10px] font-semibold ${approvalText[displayCopyStatus]}`}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${approvalDot[displayCopyStatus]}`} />
                            {approvalLabels[displayCopyStatus]}
                          </div>
                        </div>

                        {copyDecided ? (
                          <div>
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${approvalBg[displayCopyStatus]}`}>
                              <span className={approvalText[displayCopyStatus]}>{approvalIcons[displayCopyStatus]}</span>
                              <span className={`text-[11px] font-semibold ${approvalText[displayCopyStatus]}`}>{approvalLabels[displayCopyStatus]}</span>
                            </div>
                            {copyFeedback && (copyResolved === 'ajuste_solicitado' || copyResolved === 'reprovado') && !needsReview && (
                              <div className="mt-2 flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                                <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-gray-600 leading-relaxed">{copyFeedback}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-1.5 flex-wrap">
                              <button onClick={() => handleCopyAction('aprovado')} disabled={isBusy}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all disabled:opacity-50">
                                {busyField === 'copy' && !copyPending ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Aprovar
                              </button>
                              <button onClick={() => handleCopyAction('ajuste_solicitado')} disabled={isBusy}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50
                                  ${copyPending === 'ajuste_solicitado' ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50'}`}>
                                <AlertCircle className="w-3 h-3" />
                                Solicitar ajuste
                              </button>
                              <button onClick={() => handleCopyAction('reprovado')} disabled={isBusy}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50
                                  ${copyPending === 'reprovado' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50'}`}>
                                <XCircle className="w-3 h-3" />
                                Reprovar
                              </button>
                            </div>
                            {copyNeedsFeedback && (
                              <div className="space-y-2">
                                <textarea value={copyFeedback} onChange={e => setCopyFeedback(e.target.value)}
                                  placeholder="O que precisa ajustar na copy?" rows={2}
                                  className="w-full text-[11px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none" />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleCopyAction(copyPending!)}
                                    disabled={isBusy}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all disabled:opacity-50
                                      ${copyPending === 'ajuste_solicitado' ? 'bg-orange-500 border-orange-500' : 'bg-red-500 border-red-500'}`}
                                    style={{ color: '#fff' }}>
                                    {busyField === 'copy'
                                      ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      : <CheckCircle2 className="w-3 h-3" />}
                                    Confirmar
                                  </button>
                                  <button onClick={() => setCopyPending(null)} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              </div>

              {/* Comentários */}
              <div className="pb-2">
                <PlannerCommentsThread plannerId={item.id} role="client" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Chip style helper (mesmo sistema de cores da agência) ───────────────────

function getPortalChipStyle(item: PlannerItem): { bg: string; border: string; text: string } {
  const s = item.status as PlannerStatus
  const as_ = (item.approval_status || 'pendente_aprovacao') as ApprovalStatus
  // Publicado tem prioridade máxima
  if (s === 'publicado') return { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' }
  // Aprovado pelo cliente (status de produção OU approval_status) → verde
  if (s === 'aprovado' || as_ === 'aprovado') return { bg: '#f0fdf4', border: '#86efac', text: '#166534' }
  // Demais estados de aprovação do cliente
  if (as_ === 'reprovado')         return { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' }
  if (as_ === 'ajuste_solicitado') return { bg: '#fff7ed', border: '#fdba74', text: '#9a3412' }
  if (as_ === 'ajuste_realizado')  return { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
  // Fallback por status de produção
  if (s === 'revisao')   return { bg: '#fefce8', border: '#fde047', text: '#854d0e' }
  if (s === 'producao')  return { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
  return { bg: '#faf5ff', border: '#c4b5fd', text: '#5b21b6' }
}

// ─── Portal Planner (read-only) ───────────────────────────────────────────────

type PortalApprovalFilter = ApprovalStatus | 'todos'

const PORTAL_FILTER_OPTIONS: { key: PortalApprovalFilter; label: string; dot: string; activeBg: string; activeBorder: string; activeText: string }[] = [
  { key: 'todos',               label: 'Todos',             dot: 'bg-gray-400',   activeBg: 'bg-gray-100',    activeBorder: 'border-gray-400',   activeText: 'text-gray-700' },
  { key: 'pendente_aprovacao',  label: 'Pendente',          dot: 'bg-yellow-400', activeBg: 'bg-yellow-50',   activeBorder: 'border-yellow-400', activeText: 'text-yellow-700' },
  { key: 'aprovado',            label: 'Aprovado',          dot: 'bg-green-500',  activeBg: 'bg-green-50',    activeBorder: 'border-green-500',  activeText: 'text-green-700' },
  { key: 'ajuste_solicitado',   label: 'Ajuste solicitado', dot: 'bg-orange-400', activeBg: 'bg-orange-50',   activeBorder: 'border-orange-400', activeText: 'text-orange-700' },
  { key: 'ajuste_realizado',    label: 'Ajuste realizado',  dot: 'bg-blue-500',   activeBg: 'bg-blue-50',     activeBorder: 'border-blue-500',   activeText: 'text-blue-700' },
  { key: 'reprovado',           label: 'Reprovado',         dot: 'bg-red-500',    activeBg: 'bg-red-50',      activeBorder: 'border-red-500',    activeText: 'text-red-700' },
]

function PortalPlannerView({
  items,
  autoOpenItemId,
  onItemAutoOpened,
}: {
  items: PlannerItem[]
  autoOpenItemId?: string | null
  onItemAutoOpened?: () => void
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hover, setHover] = useState<HoverState | null>(null)
  const [dayItems, setDayItems] = useState<PlannerItem[]>([])
  const [dayDate, setDayDate] = useState<Date | null>(null)
  const [dayOpen, setDayOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PlannerItem | null>(null)
  const [itemOpen, setItemOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  const [approvalFilter, setApprovalFilter] = useState<PortalApprovalFilter>('todos')

  // Itens filtrados pelo status de aprovação
  const filteredItems = useMemo(() => {
    if (approvalFilter === 'todos') return items
    return items.filter(i => {
      const status = (i.approval_status || 'pendente_aprovacao') as ApprovalStatus
      return status === approvalFilter
    })
  }, [items, approvalFilter])

  // Contagem por status para os chips
  const countByStatus = useMemo(() => {
    const counts: Record<PortalApprovalFilter, number> = {
      todos: items.length,
      pendente_aprovacao: 0,
      aprovado: 0,
      ajuste_solicitado: 0,
      ajuste_realizado: 0,
      reprovado: 0,
    }
    items.forEach(i => {
      const s = (i.approval_status || 'pendente_aprovacao') as ApprovalStatus
      if (s in counts) counts[s]++
    })
    return counts
  }, [items])

  // Auto-abrir item ao receber autoOpenItemId (vindo de notificação)
  useEffect(() => {
    if (!autoOpenItemId || !items.length) return
    const found = items.find(i => i.id === autoOpenItemId)
    if (found) {
      setSelectedItem(found)
      setItemOpen(true)
      onItemAutoOpened?.()
    }
  }, [autoOpenItemId, items])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { locale: ptBR })
  const calEnd = endOfWeek(monthEnd, { locale: ptBR })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getDay = (day: Date) => filteredItems.filter(i => isSameDay(parseISO(i.scheduled_date), day))

  const handleDayClick = (day: Date, di: PlannerItem[]) => {
    if (di.length === 0) return
    setDayDate(day)
    setDayItems(di)
    setDayOpen(true)
    setHover(null)
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, di: PlannerItem[]) => {
    if (di.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const tooltipWidth = 268
    const left = rect.right + 8 + tooltipWidth > window.innerWidth ? rect.left - tooltipWidth - 4 : rect.right + 8
    const top = Math.min(rect.top, window.innerHeight - Math.min(di.length * 130, 380) - 16)
    setHover({ items: di, top, left })
  }

  return (
    <div>
      {/* ── Filtros de aprovação ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PORTAL_FILTER_OPTIONS.map(opt => {
          const count = countByStatus[opt.key]
          if (opt.key !== 'todos' && count === 0) return null
          const isActive = approvalFilter === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => setApprovalFilter(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all
                ${isActive
                  ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText} shadow-sm`
                  : 'bg-white border-[#e8e8e8] text-[#737373] hover:border-[#c0c0c0] hover:bg-[#f7f7f7]'
                }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
              {opt.label}
              {count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                  ${isActive ? 'bg-white/70' : 'bg-[#f0f0f0]'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[#0f0f0f] capitalize">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
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

      {/* Calendar */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="w-full max-w-full min-w-0">
          <div className="grid grid-cols-7 mb-1 sm:mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[9px] sm:text-xs font-medium text-gray-500 py-1 sm:py-2 truncate">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {days.map(day => {
              const di = getDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => inMonth && handleDayClick(day, di)}
                  onMouseEnter={!isMobile ? e => inMonth && handleMouseEnter(e, di) : undefined}
                  onMouseLeave={!isMobile ? () => setHover(null) : undefined}
                  className={`
                    min-h-[52px] sm:min-h-[90px] p-0.5 sm:p-1.5 rounded sm:rounded-lg border transition-all
                    ${inMonth ? 'border-[#e8e8e8]' : 'border-transparent opacity-30 cursor-default'}
                    ${inMonth && di.length > 0 ? 'hover:border-[#d0d0d0] hover:bg-[#f5f5f5] cursor-pointer' : ''}
                    ${today ? 'border-blue-500/40 bg-blue-500/5' : ''}
                  `}
                >
                  <div className={`text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full
                    ${today ? 'bg-blue-600 text-white' : inMonth ? 'text-[#737373]' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {di.slice(0, 2).map(item => {
                      const { bg, border, text } = getPortalChipStyle(item)
                      const typeLabel = contentTypeLabels[item.content_type as ContentType] ?? ''
                      return (
                        <div
                          key={item.id}
                          onClick={e => { e.stopPropagation(); setSelectedItem(item); setItemOpen(true) }}
                          style={{ backgroundColor: bg, borderColor: border, color: text }}
                          className="w-full rounded border px-1 py-0.5 min-w-0 cursor-pointer hover:brightness-95 transition-opacity"
                        >
                          <div className="flex items-start gap-0.5 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] sm:text-[9px] font-medium leading-tight truncate">{item.title}</p>
                              {typeLabel && (
                                <p className="text-[7px] sm:text-[8px] leading-tight truncate opacity-70 hidden sm:block">{typeLabel}</p>
                              )}
                            </div>
                            <Instagram className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0 mt-px opacity-50" strokeWidth={1.5} />
                          </div>
                        </div>
                      )
                    })}
                    {di.length > 2 && <p className="text-[8px] sm:text-[10px] text-[#64748b]">+{di.length - 2}</p>}
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex gap-3 mt-4 flex-wrap">
        {(Object.entries(statusColors) as [PlannerStatus, string][]).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1.5 text-xs text-[#737373]">
            <div className={`w-2 h-2 rounded-full ${c}`} />
            {statusLabels[s]}
          </div>
        ))}
      </div>

      {/* Tooltip — desktop only */}
      <AnimatePresence>
        {!isMobile && hover && <DayTooltip state={hover} />}
      </AnimatePresence>

      {/* Day modal */}
      <Dialog open={dayOpen} onOpenChange={setDayOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {dayDate && format(dayDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              {dayItems.length} {dayItems.length === 1 ? 'post planejado' : 'posts planejados'} · clique para ver detalhes
            </p>
          </DialogHeader>
          <div className="space-y-3 my-1 min-w-0 w-full max-w-full overflow-x-hidden">
            {dayItems.map(item => {
              const thumb = item.attachments?.find(a => a.file_type.startsWith('image/'))
              return (
                <div
                  key={item.id}
                  onClick={() => { setDayOpen(false); setSelectedItem(item); setItemOpen(true) }}
                  className="flex items-start gap-3 p-3 bg-white border border-[#e8e8e8] rounded-xl cursor-pointer hover:bg-[#f5f5f5] hover:border-[#d0d0d0] transition-colors group"
                >
                  {thumb && (
                    <img src={thumb.file_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border border-[#e8e8e8]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[item.status as PlannerStatus]}`} />
                      <p className="font-medium text-[#0f0f0f] text-sm break-words">{item.title}</p>
                    </div>
                    <p className="text-xs text-[#737373] ml-3.5">
                      {contentTypeLabels[item.content_type as ContentType]} · {statusLabels[item.status as PlannerStatus]}
                    </p>
                    {item.approval_status && item.approval_status !== 'pendente_aprovacao' && (
                      <span className={`ml-3.5 inline-flex items-center gap-1 text-[10px] font-medium ${approvalText[item.approval_status as ApprovalStatus]}`}>
                        {approvalIcons[item.approval_status as ApprovalStatus]}
                        {approvalLabels[item.approval_status as ApprovalStatus]}
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-xs text-[#737373] line-clamp-1 ml-3.5 mt-0.5">{item.notes}</p>
                    )}
                    <div className="flex items-center gap-3 ml-3.5 mt-1.5">
                      {item.attachments && item.attachments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-[#a0a0a0]" />
                          <span className="text-[11px] text-[#737373]">{item.attachments.length} {item.attachments.length === 1 ? 'anexo' : 'anexos'}</span>
                        </div>
                      )}
                      {item.links && item.links.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Link2 className="w-3 h-3 text-blue-500" />
                          <span className="text-[11px] text-blue-600">{item.links.length} {item.links.length === 1 ? 'link' : 'links'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#a0a0a0] group-hover:text-[#737373] transition-colors flex-shrink-0 mt-0.5" />
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedItem && (
        <ItemDetailView
          item={selectedItem}
          open={itemOpen}
          onClose={() => { setItemOpen(false); setSelectedItem(null) }}
        />
      )}
    </div>
  )
}

// ─── Dashboard helpers ────────────────────────────────────────────────────────

function humanizeActivity(status: ApprovalStatus, _item: PlannerItem): string {
  switch (status) {
    case 'aprovado':          return 'Você aprovou um conteúdo'
    case 'reprovado':         return 'Você reprovou um conteúdo'
    case 'ajuste_solicitado': return 'Você solicitou ajuste em um conteúdo'
    case 'ajuste_realizado':  return 'A agência realizou o ajuste solicitado'
    default:                  return 'Conteúdo enviado para revisão'
  }
}

type CardColor = 'amber' | 'green' | 'blue' | 'purple' | 'default'

const cardColorMap: Record<CardColor, { icon: string; label: string; value: string; ring: string; dot: string; bar: string }> = {
  amber:   { icon: 'text-orange-800',  label: 'text-orange-900',  value: 'text-orange-900',  ring: 'border-orange-200  bg-orange-50',   dot: 'bg-orange-400',  bar: 'bg-[#f97316]' },
  green:   { icon: 'text-green-800',   label: 'text-green-900',   value: 'text-green-900',   ring: 'border-green-200   bg-green-50',    dot: 'bg-green-500',   bar: 'bg-[#3fa06e]' },
  blue:    { icon: 'text-blue-800',    label: 'text-blue-900',    value: 'text-blue-900',    ring: 'border-blue-200    bg-blue-50',     dot: 'bg-blue-500',    bar: 'bg-[#3b82f6]' },
  purple:  { icon: 'text-purple-800',  label: 'text-purple-900',  value: 'text-purple-900',  ring: 'border-purple-200  bg-purple-50',   dot: 'bg-purple-500',  bar: 'bg-[#8b5cf6]' },
  default: { icon: 'text-gray-500',    label: 'text-[#737373]',   value: 'text-[#0f0f0f]',   ring: 'border-[#e8e8e8]   bg-white',      dot: 'bg-gray-400',    bar: 'bg-[#e2e8f0]' },
}

function StatusCard({
  icon, label, value, color, onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: CardColor
  onClick?: () => void
}) {
  const c = cardColorMap[color]
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border overflow-hidden flex flex-col transition-all shadow-sm ${c.ring} ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''}`}
    >
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <span className={c.icon}>{icon}</span>
          <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        </div>
        <div>
          <p className={`text-[11px] leading-snug ${c.label}`}>{label}</p>
          <p className={`text-[13px] font-semibold mt-1 leading-tight ${c.value}`}>{value}</p>
        </div>
      </div>
      <div className={`h-1 w-full ${c.bar}`} />
    </div>
  )
}

function AgencyWorkItem({
  icon, label, detail,
}: {
  icon: React.ReactNode
  label: string
  detail: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-[#f0f0f0] border border-[#e8e8e8] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[#0f0f0f] truncate">{label}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{detail}</p>
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-green-400/60 flex-shrink-0" />
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function ClientDashboardTab({
  client,
  plannerItems,
  contents,
  onNavigate,
  firstName,
  payments,
}: {
  client: Client
  plannerItems: PlannerItem[]
  contents: Content[]
  onNavigate: (tab: string) => void
  firstName: string
  payments: Array<{ status: string; payment_date: string }>
}) {
  const [selectedItem, setSelectedItem] = useState<PlannerItem | null>(null)
  const [itemOpen, setItemOpen] = useState(false)

  const today = startOfToday()

  const pendingItems = plannerItems.filter(
    i => i.approval_status === 'pendente_aprovacao' || (i.status === 'revisao' && !i.approval_status)
  )
  const approvedThisMonth = plannerItems.filter(
    i => i.approval_status === 'aprovado' && isThisMonth(parseISO(i.scheduled_date))
  )
  const thisMonthItems = plannerItems.filter(i => isThisMonth(parseISO(i.scheduled_date)))
  const publishedItems = plannerItems.filter(i => i.status === 'publicado')
  const inProductionCount = plannerItems.filter(i => i.status === 'producao' || i.status === 'revisao').length
  const inIdeaCount = plannerItems.filter(i => i.status === 'ideia').length

  const upcomingItems = plannerItems
    .filter(i => !isBefore(parseISO(i.scheduled_date), today))
    .sort((a, b) => parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime())
    .slice(0, 5)
  const recentActivity = plannerItems
    .filter(i => i.reviewed_at)
    .sort((a, b) => parseISO(b.reviewed_at!).getTime() - parseISO(a.reviewed_at!).getTime())
    .slice(0, 5)

  // Financial alert — only show for 'vence_em_breve'
  const financialStatus = calcFinancialStatus(client)
  const financialAux = getFinancialAuxText(client, financialStatus)
  const showFinancialAlert = financialStatus === 'vence_em_breve'
    && client.dia_vencimento != null
    && !hasPaidCurrentCycle(payments, client.dia_vencimento)

  // Dynamic hero copy
  const headline = pendingItems.length > 0
    ? pendingItems.length === 1
      ? 'Você tem 1 conteúdo aguardando sua aprovação'
      : `Você tem ${pendingItems.length} conteúdos aguardando sua aprovação`
    : plannerItems.length === 0
      ? 'Estamos preparando seus primeiros conteúdos'
      : 'Seu planejamento está ativo e atualizado'

  const subline = pendingItems.length > 0
    ? 'Revise e aprove para manter o calendário em dia.'
    : plannerItems.length === 0
      ? 'Em breve você verá todos os conteúdos aqui.'
      : `${thisMonthItems.length} ${thisMonthItems.length === 1 ? 'conteúdo programado' : 'conteúdos programados'} para este mês.`

  return (
    <div className="space-y-6">

      {/* ── Alertas de atenção ── */}
      {showFinancialAlert && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50"
        >
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-amber-700">Vence em breve</p>
            <p className="text-[12px] text-amber-800 mt-0.5 leading-snug">
              {financialAux === 'Vence hoje'
                ? 'Seu pagamento vence hoje.'
                : `${financialAux}. Fique atento ao pagamento.`}
            </p>
          </div>
          <button
            onClick={() => onNavigate('financeiro')}
            className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-600 transition-colors whitespace-nowrap"
          >
            Ver <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* ── Hero header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className={`rounded-2xl p-6 border ${
          pendingItems.length > 0
            ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50/40 to-transparent'
            : 'border-[#e8e8e8] bg-gradient-to-br from-[#f7f7f7] via-white to-transparent'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-600 uppercase tracking-[0.12em] mb-2">
              Olá, {firstName}
            </p>
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-[#0f0f0f] leading-snug">
              {headline}
            </h2>
            <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{subline}</p>
          </div>
          {pendingItems.length > 0 && (
            <button
              onClick={() => { setSelectedItem(pendingItems[0]); setItemOpen(true) }}
              className="hidden sm:flex items-center gap-2 flex-shrink-0 px-4 py-2.5 rounded-xl bg-[#f97316] border border-[#ea580c] text-white text-[12px] font-semibold hover:bg-[#ea580c] transition-all"
            >
              Revisar agora <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {pendingItems.length > 0 && (
          <button
            onClick={() => { setSelectedItem(pendingItems[0]); setItemOpen(true) }}
            className="sm:hidden mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316] border border-[#ea580c] text-white text-[12px] font-semibold hover:bg-[#ea580c] transition-all"
          >
            Revisar agora <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>

      {/* ── Status cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.06 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <StatusCard
          icon={<Clock className="w-4 h-4" />}
          label={pendingItems.length > 0 ? 'Aguardando sua aprovação' : 'Nada pendente'}
          value={pendingItems.length > 0
            ? `${pendingItems.length} ${pendingItems.length === 1 ? 'conteúdo' : 'conteúdos'}`
            : 'Tudo revisado'}
          color={pendingItems.length > 0 ? 'amber' : 'green'}
          onClick={pendingItems.length > 0 ? () => onNavigate('planejamento') : undefined}
        />
        <StatusCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Aprovados este mês"
          value={approvedThisMonth.length > 0
            ? `${approvedThisMonth.length} ${approvedThisMonth.length === 1 ? 'aprovado' : 'aprovados'}`
            : 'Aguardando revisões'}
          color={approvedThisMonth.length > 0 ? 'green' : 'default'}
        />
        <StatusCard
          icon={<CalendarDays className="w-4 h-4" />}
          label="Planejamento ativo"
          value={thisMonthItems.length > 0
            ? `${thisMonthItems.length} ${thisMonthItems.length === 1 ? 'conteúdo' : 'conteúdos'} no mês`
            : 'Sem conteúdos no mês'}
          color={thisMonthItems.length > 0 ? 'blue' : 'default'}
          onClick={() => onNavigate('planejamento')}
        />
        <StatusCard
          icon={<Sparkles className="w-4 h-4" />}
          label={publishedItems.length > 0 ? 'Publicados' : 'Nenhum publicado'}
          value={publishedItems.length > 0
            ? `${publishedItems.length} ${publishedItems.length === 1 ? 'publicado' : 'publicados'}`
            : 'Em breve online'}
          color={publishedItems.length > 0 ? 'purple' : 'default'}
        />
      </motion.div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Pendentes de aprovação */}
          {pendingItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="rounded-2xl border border-orange-200 bg-orange-50 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-orange-200">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                <p className="text-[13px] font-semibold text-orange-800">
                  {pendingItems.length === 1
                    ? '1 conteúdo precisa da sua aprovação'
                    : `${pendingItems.length} conteúdos precisam da sua aprovação`}
                </p>
              </div>
              <div className="divide-y divide-orange-100">
                {pendingItems.map(item => {
                  const thumb = item.attachments?.find(a => a.file_type.startsWith('image/'))
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setItemOpen(true) }}
                      className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-orange-100 transition-colors text-left group"
                    >
                      {thumb ? (
                        <img src={thumb.file_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-orange-200 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white border border-orange-200 flex items-center justify-center flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full ${statusColors[item.status as PlannerStatus]}`} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#0f0f0f] truncate">{item.title}</p>
                        <p className="text-[11px] text-[#64748b] mt-0.5">
                          {format(parseISO(item.scheduled_date), "dd 'de' MMMM", { locale: ptBR })}
                          <span className="mx-1.5 text-orange-300">·</span>
                          {contentTypeLabels[item.content_type as ContentType]}
                        </p>
                      </div>
                      <span className="text-[11px] text-orange-700 font-semibold px-2.5 py-1 rounded-lg bg-white border border-orange-200 flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                        Revisar
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Em andamento */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.14 }}
            className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#e8e8e8]">
              <div className="flex gap-0.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse [animation-delay:300ms]" />
              </div>
              <p className="text-[13px] font-semibold text-[#0f0f0f]">Em andamento</p>
            </div>
            <div className="p-5 space-y-3.5">
              {plannerItems.length === 0 ? (
                <p className="text-[12px] text-gray-600 py-1">
                  A agência está preparando a estratégia inicial para você.
                </p>
              ) : (
                <>
                  {inIdeaCount > 0 && (
                    <AgencyWorkItem
                      icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                      label="Ideias em desenvolvimento"
                      detail={`${inIdeaCount} ${inIdeaCount === 1 ? 'conteúdo' : 'conteúdos'} na fase criativa`}
                    />
                  )}
                  {inProductionCount > 0 && (
                    <AgencyWorkItem
                      icon={<CalendarDays className="w-3.5 h-3.5 text-blue-400" />}
                      label="Conteúdos em produção"
                      detail={`${inProductionCount} ${inProductionCount === 1 ? 'item sendo criado' : 'itens sendo criados'}`}
                    />
                  )}
                  <AgencyWorkItem
                    icon={<LayoutDashboard className="w-3.5 h-3.5 text-green-400" />}
                    label="Planejamento do mês ativo"
                    detail={`${thisMonthItems.length} ${thisMonthItems.length === 1 ? 'conteúdo programado' : 'conteúdos programados'}`}
                  />
                  {contents.length > 0 && (
                    <AgencyWorkItem
                      icon={<MessageSquare className="w-3.5 h-3.5 text-indigo-400" />}
                      label="Estratégia de conteúdo"
                      detail={`${contents.length} ${contents.length === 1 ? 'conteúdo gerado' : 'conteúdos gerados'}`}
                    />
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Atividade recente */}
          {recentActivity.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.18 }}
              className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden"
            >
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#e8e8e8]">
                <Bell className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-[13px] font-semibold text-[#0f0f0f]">Atividade recente</p>
              </div>
              <div className="px-5 py-4 space-y-4">
                {recentActivity.map(item => {
                  const status = (item.approval_status || 'pendente_aprovacao') as ApprovalStatus
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                        ${status === 'aprovado' ? 'bg-green-50' : status === 'reprovado' ? 'bg-red-50' : 'bg-orange-50'}`}
                      >
                        <span className={`${approvalText[status]} [&>svg]:w-3 [&>svg]:h-3`}>
                          {approvalIcons[status]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#737373] leading-relaxed">
                          {humanizeActivity(status, item)}
                        </p>
                        <p className="text-[11px] text-[#374151] truncate mt-0.5">{item.title}</p>
                        {item.reviewed_at && (
                          <p className="text-[10px] text-[#94a3b8] mt-0.5">{formatRelative(item.reviewed_at)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* Próximos conteúdos */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.11 }}
            className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e8e8e8]">
              <p className="text-[12px] font-semibold text-[#0f0f0f]">Próximos conteúdos</p>
              <button
                onClick={() => onNavigate('planejamento')}
                className="flex items-center gap-1 text-[11px] text-[#3b82f6] hover:text-blue-700 transition-colors"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {upcomingItems.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <CalendarDays className="w-6 h-6 text-[#94a3b8] mx-auto mb-2" />
                <p className="text-[12px] text-[#64748b]">Nenhum conteúdo agendado.</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">A agência está preparando o calendário.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e8e8e8]">
                {upcomingItems.map(item => {
                  const thumb = item.attachments?.find(a => a.file_type.startsWith('image/'))
                  const isPending = item.approval_status === 'pendente_aprovacao'
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setItemOpen(true) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f5] transition-colors text-left group"
                    >
                      <div className="w-9 flex-shrink-0 text-center">
                        <p className="text-[9px] text-gray-600 uppercase leading-tight">
                          {format(parseISO(item.scheduled_date), 'MMM', { locale: ptBR })}
                        </p>
                        <p className="text-[16px] font-bold text-[#0f0f0f] tabular-nums leading-tight">
                          {format(parseISO(item.scheduled_date), 'd')}
                        </p>
                      </div>
                      {thumb ? (
                        <img src={thumb.file_url} alt="" className="w-8 h-8 rounded-md object-cover border border-[#e8e8e8] flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-[#f0f0f0] border border-[#e8e8e8] flex items-center justify-center flex-shrink-0">
                          <div className={`w-1.5 h-1.5 rounded-full ${statusColors[item.status as PlannerStatus]}`} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#0f0f0f] truncate">{item.title}</p>
                        <p className={`text-[10px] mt-0.5 ${statusTextColors[item.status as PlannerStatus]}`}>
                          {contentTypeLabels[item.content_type as ContentType]}
                        </p>
                      </div>
                      {isPending && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
                      )}
                      <ChevronRight className="w-3 h-3 text-[#a0a0a0] group-hover:text-[#737373] transition-colors flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Próxima reunião */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.16 }}
            className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#e8e8e8]">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-[12px] font-semibold text-[#0f0f0f]">Próxima reunião</p>
            </div>
            <div className="p-5 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-[#e8e8e8] bg-[#f0f0f0] flex items-center justify-center">
                <Calendar className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-[#737373]">Quer alinhar estratégias?</p>
                <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                  Agende uma conversa com a agência.
                </p>
              </div>
              <button
                onClick={() => onNavigate('notas')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e8e8e8] bg-[#f7f7f7] text-[11px] text-[#737373] font-medium hover:bg-[#f0f0f0] hover:border-[#d0d0d0] transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Solicitar reunião
              </button>
            </div>
          </motion.div>

          {/* Resumo empresa */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.2 }}
            className="rounded-2xl border border-[#e8e8e8] bg-white p-4"
          >
            <div className="flex items-center gap-3 mb-3.5">
              {client.logo_url ? (
                <img src={client.logo_url} alt={client.company_name}
                  className="w-8 h-8 rounded-lg object-cover border border-[#e8e8e8] flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[#f0f0f0] border border-[#e8e8e8] flex items-center justify-center text-xs font-bold text-[#0f0f0f] flex-shrink-0">
                  {client.company_name[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#0f0f0f] truncate">{client.company_name}</p>
                <p className="text-[10px] text-gray-500 truncate">{client.niche}</p>
              </div>
            </div>
            {client.main_objective && (
              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
                {client.main_objective}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {selectedItem && (
        <ItemDetailView
          item={selectedItem}
          open={itemOpen}
          onClose={() => { setItemOpen(false); setSelectedItem(null) }}
        />
      )}
    </div>
  )
}

// ─── Portal Materiais ─────────────────────────────────────────────────────────

const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  pdf: 'PDF', imagem: 'Imagem', video: 'Vídeo',
  link: 'Link', documento: 'Documento', outro: 'Outro',
}

function matIsImage(mat: ClientMaterial): boolean {
  if (mat.type === 'imagem') return true
  return isImageUrl(mat.file_url)
}
function matIsPdf(mat: ClientMaterial): boolean {
  if (mat.type === 'pdf') return true
  if (!mat.file_url) return false
  return /\.pdf(\?|$)/i.test(mat.file_url)
}
function matIsVideo(mat: ClientMaterial): boolean {
  if (mat.type === 'video') return true
  return isVideoUrl(mat.file_url)
}

function PortalMaterialIcon({ type, size = 'sm' }: { type: MaterialType; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-8 h-8' : 'w-4 h-4'
  switch (type) {
    case 'pdf':    return <FileText  className={`${cls} text-red-400`} />
    case 'imagem': return <ImageIcon className={`${cls} text-blue-400`} />
    case 'video':  return <Video     className={`${cls} text-purple-400`} />
    case 'link':   return <Link2     className={`${cls} text-sky-400`} />
    default:       return <File      className={`${cls} text-gray-500`} />
  }
}

// ── Hover card ──────────────────────────────────────────────────────────────

interface MatHoverState { mat: ClientMaterial; top: number; left: number }

function MaterialHoverCard({ state }: { state: MatHoverState }) {
  const { mat } = state
  const isImg = matIsImage(mat)
  return (
    <div className="fixed z-50 pointer-events-none" style={{ top: state.top, left: state.left }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.13 }}
        className="bg-white border border-[#e2e8f0] rounded-xl shadow-xl w-[220px] overflow-hidden text-[#0f0f0f]"
      >
        {isImg && mat.file_url ? (
          <img
            src={mat.file_url}
            alt={mat.title}
            className="w-full h-32 object-cover"
          />
        ) : (
          <div className="w-full h-24 bg-[#f5f7fb] flex items-center justify-center">
            <PortalMaterialIcon type={mat.type} size="lg" />
          </div>
        )}
        <div className="p-3">
          <p className="text-[12px] font-medium text-[#0f0f0f] leading-snug">{mat.title}</p>
          {mat.description && (
            <p className="text-[10px] text-[#64748b] mt-0.5 line-clamp-2 leading-relaxed">{mat.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-[#94a3b8]">{MATERIAL_TYPE_LABELS[mat.type]}</span>
            <span className="text-[#94a3b8] text-[10px]">·</span>
            <span className="text-[10px] text-[#94a3b8]">{formatDate(mat.created_at)}</span>
          </div>
          <p className="text-[10px] text-blue-600 mt-1.5 flex items-center gap-1">
            <Eye className="w-2.5 h-2.5" /> Clique para visualizar
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Detail modal ────────────────────────────────────────────────────────────

function MaterialDetailModal({
  mat, open, onClose,
}: { mat: ClientMaterial; open: boolean; onClose: () => void }) {
  const isImg  = matIsImage(mat)
  const isPdf  = matIsPdf(mat)
  const isVid  = matIsVideo(mat)
  const isLink = !!(mat.link_url)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2.5 min-w-0">
            <PortalMaterialIcon type={mat.type} />
            <DialogTitle className="text-base leading-snug break-words min-w-0">{mat.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-500">{MATERIAL_TYPE_LABELS[mat.type]}</span>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-500">{formatDate(mat.created_at)}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1 min-w-0 w-full max-w-full overflow-x-hidden">
          {mat.description && (
            <div className="p-3 bg-[#f5f7fb] rounded-xl border border-[#e2e8f0]">
              <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide mb-1.5">Descrição</p>
              <p className="text-sm text-[#374151] leading-relaxed break-words">{mat.description}</p>
            </div>
          )}

          {/* Preview: imagem */}
          {isImg && mat.file_url && (
            <div className="w-full max-w-full overflow-hidden rounded-xl border border-[#e2e8f0]">
              <img
                src={mat.file_url}
                alt={mat.title}
                className="w-full max-w-full max-h-[60vh] object-contain"
              />
            </div>
          )}

          {/* Preview: vídeo */}
          {isVid && mat.file_url && (
            <video
              src={mat.file_url}
              controls
              className="w-full max-w-full rounded-xl border border-[#e2e8f0]"
            />
          )}

          {/* Preview: PDF (iframe) */}
          {isPdf && mat.file_url && (
            <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
              <iframe
                src={mat.file_url}
                title={mat.title}
                className="w-full h-72"
              />
            </div>
          )}

          {/* Link externo */}
          {isLink && mat.link_url && (
            <a
              href={mat.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 bg-[#f5f7fb] border border-[#e2e8f0] rounded-xl hover:bg-[#eef2ff] hover:border-[#c7d2fe] transition-colors"
            >
              <Link2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
              <span className="text-sm text-sky-600 flex-1 min-w-0 break-all">{mat.link_url}</span>
              <ExternalLink className="w-3 h-3 text-[#94a3b8] flex-shrink-0" />
            </a>
          )}

          {/* Fallback: nenhum preview disponível */}
          {!isImg && !isVid && !isPdf && !isLink && (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-[#e2e8f0] bg-[#f5f7fb]">
              <PortalMaterialIcon type={mat.type} size="lg" />
              <p className="text-xs text-[#94a3b8] mt-2">Sem visualização disponível</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          {isLink && mat.link_url && (
            <a href={mat.link_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm">
                <ExternalLink className="w-3.5 h-3.5" /> Acessar link
              </Button>
            </a>
          )}
          {mat.file_url && (
            <a href={mat.file_url} download target="_blank" rel="noopener noreferrer">
              <Button size="sm">
                <Download className="w-3.5 h-3.5" /> Baixar material
              </Button>
            </a>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Material row (shared between flat + grouped views) ──────────────────────

type MatHoverSetter = (s: MatHoverState | null) => void

function MatRow({
  mat,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  mat: ClientMaterial
  onClick: (m: ClientMaterial) => void
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>, m: ClientMaterial) => void
  onMouseLeave: MatHoverSetter
}) {
  const isImg  = matIsImage(mat)
  const isLink = mat.type === 'link' && !!mat.link_url

  // Links get a special card — no hover card, click opens URL directly
  if (isLink) {
    return (
      <div className="flex items-start gap-3 p-4 bg-white border border-[#e8e8e8] rounded-xl hover:border-sky-200 hover:shadow-sm transition-all group">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Link2 className="w-4.5 h-4.5 text-sky-500" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0f0f0f] text-sm truncate">{mat.title}</p>
          {mat.description && (
            <p className="text-[12px] text-[#737373] mt-0.5 leading-snug line-clamp-2">{mat.description}</p>
          )}
          <p className="text-[10px] text-[#a0a0a0] mt-1 truncate">{mat.link_url}</p>
        </div>

        {/* CTA */}
        <a
          href={mat.link_url!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sky-500 text-white text-[12px] font-medium hover:bg-sky-600 transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir
        </a>
      </div>
    )
  }

  return (
    <div
      onClick={() => onClick(mat)}
      onMouseEnter={e => onMouseEnter(e, mat)}
      onMouseLeave={() => onMouseLeave(null)}
      className="flex items-center gap-3 p-3.5 bg-white border border-[#e8e8e8] rounded-xl hover:bg-[#f5f5f5] hover:border-[#d0d0d0] transition-colors group cursor-pointer"
    >
      {/* Thumbnail */}
      {isImg && mat.file_url ? (
        <img
          src={mat.file_url}
          alt={mat.title}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-[#e8e8e8]"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-[#f0f0f0] border border-[#e8e8e8] flex items-center justify-center flex-shrink-0">
          <PortalMaterialIcon type={mat.type} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#0f0f0f] text-sm truncate">{mat.title}</p>
        {mat.description && (
          <p className="text-xs text-[#737373] truncate mt-0.5">{mat.description}</p>
        )}
        <p className="text-[10px] text-[#a0a0a0] mt-0.5">
          {MATERIAL_TYPE_LABELS[mat.type]}
          {' · '}{formatDate(mat.created_at)}
        </p>
      </div>

      {/* Hint */}
      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[11px] text-[#737373]">Visualizar</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#a0a0a0]" />
      </div>
    </div>
  )
}

// ── Tab principal ───────────────────────────────────────────────────────────

type MatTypeFilter = 'todos' | MaterialType

const MAT_TAB_LABELS: { value: MatTypeFilter; label: string }[] = [
  { value: 'todos',     label: 'Todos'     },
  { value: 'imagem',    label: 'Imagens'   },
  { value: 'video',     label: 'Vídeos'    },
  { value: 'pdf',       label: 'PDFs'      },
  { value: 'link',      label: 'Links'     },
  { value: 'documento', label: 'Documentos'},
  { value: 'outro',     label: 'Outros'    },
]

function PortalMateriaisTab({ materials }: { materials: ClientMaterial[] }) {
  const [hover, setHover]         = useState<MatHoverState | null>(null)
  const [selected, setSelected]   = useState<ClientMaterial | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<MatTypeFilter>('todos')

  const handleClick = (mat: ClientMaterial) => {
    setSelected(mat)
    setModalOpen(true)
    setHover(null)
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, mat: ClientMaterial) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const tooltipW = 228
    const left = rect.right + 8 + tooltipW > window.innerWidth
      ? rect.left - tooltipW - 4
      : rect.right + 8
    const top = Math.min(rect.top, window.innerHeight - 320 - 16)
    setHover({ mat, top, left })
  }

  // Types that actually exist in the data
  const availableTypes = useMemo(() => {
    const present = new Set(materials.map(m => m.type))
    return MAT_TAB_LABELS.filter(t => t.value === 'todos' || present.has(t.value as MaterialType))
  }, [materials])

  // Materials filtered by type
  const filtered = useMemo(() =>
    typeFilter === 'todos' ? materials : materials.filter(m => m.type === typeFilter),
    [materials, typeFilter]
  )

  // Group by folder_name
  const { folders, byFolder, noFolder } = useMemo(() => {
    const foldersSet = new Set<string>()
    const byFolder: Record<string, ClientMaterial[]> = {}
    const noFolder: ClientMaterial[] = []
    filtered.forEach(m => {
      if (m.folder_name) {
        foldersSet.add(m.folder_name)
        if (!byFolder[m.folder_name]) byFolder[m.folder_name] = []
        byFolder[m.folder_name].push(m)
      } else {
        noFolder.push(m)
      }
    })
    return { folders: [...foldersSet], byFolder, noFolder }
  }, [filtered])

  const hasFolders = folders.length > 0

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-xl border border-[#e8e8e8] bg-[#f0f0f0] flex items-center justify-center mb-4">
          <FolderOpen className="w-5 h-5 text-[#a0a0a0]" />
        </div>
        <p className="text-[14px] font-medium text-[#737373]">Nenhum material disponível</p>
        <p className="text-[12px] text-[#a0a0a0] mt-1 max-w-xs">
          Quando a agência adicionar materiais, eles aparecerão aqui.
        </p>
      </div>
    )
  }

  const rowProps = { onClick: handleClick, onMouseEnter: handleMouseEnter, onMouseLeave: setHover }

  return (
    <div className="space-y-4">
      {/* Type filter tabs — only shown when multiple types exist */}
      {availableTypes.length > 2 && (
        <div className="flex gap-1.5 flex-wrap">
          {availableTypes.map(({ value, label }) => {
            const count = value === 'todos' ? materials.length : materials.filter(m => m.type === value).length
            return (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                  typeFilter === value
                    ? 'bg-[#0f0f0f] text-white border-[#0f0f0f]'
                    : 'bg-white text-[#737373] border-[#e0e0e0] hover:bg-[#f5f5f5] hover:text-[#0f0f0f]'
                }`}
              >
                {label} <span className={`ml-1 text-[10px] ${typeFilter === value ? 'text-white/70' : 'text-[#b0b0b0]'}`}>({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Material list — grouped by folder or flat */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[13px] text-[#a0a0a0]">Nenhum material nessa categoria.</p>
        </div>
      ) : hasFolders ? (
        <div className="space-y-6">
          {/* Folders */}
          {folders.map(folder => (
            <div key={folder}>
              <div className="flex items-center gap-2 mb-2.5">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">{folder}</p>
                <span className="text-[10px] text-[#b0b0b0]">({byFolder[folder].length})</span>
              </div>
              <div className="space-y-2 pl-0.5">
                {byFolder[folder].map(mat => <MatRow key={mat.id} mat={mat} {...rowProps} />)}
              </div>
            </div>
          ))}
          {/* Items without folder */}
          {noFolder.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <p className="text-[11px] font-semibold text-[#b0b0b0] uppercase tracking-wider">Outros</p>
              </div>
              <div className="space-y-2">
                {noFolder.map(mat => <MatRow key={mat.id} mat={mat} {...rowProps} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(mat => <MatRow key={mat.id} mat={mat} {...rowProps} />)}
        </div>
      )}

      <AnimatePresence>
        {hover && <MaterialHoverCard state={hover} />}
      </AnimatePresence>

      {selected && (
        <MaterialDetailModal
          mat={selected}
          open={modalOpen}
          onClose={() => { setModalOpen(false); setSelected(null) }}
        />
      )}
    </div>
  )
}

// ─── Portal Suporte ───────────────────────────────────────────────────────────

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  whatsapp: 'WhatsApp', email: 'E-mail', telefone: 'Telefone', outro: 'Outro',
}

function PortalContactIcon({ type }: { type: ContactType }) {
  switch (type) {
    case 'whatsapp': return <MessageCircle className="w-4 h-4 text-green-500" />
    case 'email':    return <Mail          className="w-4 h-4 text-blue-500" />
    case 'telefone': return <Phone         className="w-4 h-4 text-[#64748b]" />
    default:         return <Phone         className="w-4 h-4 text-[#94a3b8]" />
  }
}

function autoLink(type: ContactType, value: string): string {
  const clean = value.trim()
  switch (type) {
    case 'whatsapp': return `https://wa.me/${clean.replace(/\D/g, '')}`
    case 'email':    return `mailto:${clean}`
    case 'telefone': return `tel:${clean.replace(/\s/g, '')}`
    default:         return clean.startsWith('http') ? clean : `https://${clean}`
  }
}

function PortalSuporteTab({ contacts }: { contacts: ClientSupportContact[] }) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-xl border border-[#e8e8e8] bg-[#f0f0f0] flex items-center justify-center mb-4">
          <LifeBuoy className="w-5 h-5 text-gray-600" />
        </div>
        <p className="text-[14px] font-medium text-[#737373]">Nenhum contato de suporte</p>
        <p className="text-[12px] text-gray-600 mt-1 max-w-xs">
          Em breve você verá os canais de atendimento da sua agência aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-4">
        Precisa de ajuda? Entre em contato com a equipe pelos canais abaixo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contacts.map(c => {
          const href = c.direct_link || autoLink(c.contact_type, c.contact_value)
          return (
            <a
              key={c.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-[#e8e8e8] rounded-xl hover:bg-[#f5f5f5] hover:border-[#d0d0d0] transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#f0f0f0] border border-[#e8e8e8] flex items-center justify-center flex-shrink-0">
                <PortalContactIcon type={c.contact_type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#0f0f0f] text-sm truncate">{c.name}</p>
                {c.role && <p className="text-xs text-gray-500 truncate">{c.role}</p>}
                <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                  {CONTACT_TYPE_LABELS[c.contact_type]} · {c.contact_value}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#737373] transition-colors flex-shrink-0" />
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ─── Content Asset Detail Modal ──────────────────────────────────────────────

function ContentAssetDetailModal({
  asset,
  open,
  onClose,
}: { asset: ContentAsset; open: boolean; onClose: () => void }) {
  const isImg = isImageUrl(asset.media_url)
  const isVid = isVideoUrl(asset.media_url)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2.5 min-w-0">
            <ImageIcon className="w-4 h-4 text-[#a0a0a0] flex-shrink-0" />
            <DialogTitle className="text-base leading-snug break-words min-w-0">{asset.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-500">{contentTypeLabels[asset.content_type as ContentType]}</span>
            {asset.category && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-xs text-gray-500">{asset.category}</span>
              </>
            )}
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-500">{formatDate(asset.created_at)}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1 min-w-0">

          {/* Imagem */}
          {isImg && asset.media_url && (
            <a href={asset.media_url} target="_blank" rel="noopener noreferrer"
              className="block w-full overflow-hidden rounded-xl border border-[#e8e8e8] hover:border-[#c8c8c8] transition-colors">
              <img src={asset.media_url} alt={asset.title} className="w-full max-w-full object-contain" style={{ maxHeight: 280 }} />
            </a>
          )}

          {/* Vídeo */}
          {isVid && asset.media_url && (
            <video src={asset.media_url} controls className="w-full max-w-full rounded-xl border border-[#e8e8e8]" />
          )}

          {/* Arquivo não-mídia */}
          {asset.media_url && !isImg && !isVid && (
            <a href={asset.media_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-2.5 bg-[#f7f7f7] border border-[#e8e8e8] rounded-xl hover:border-[#d0d0d0] hover:bg-[#f0f0f0] transition-colors min-w-0">
              <File className="w-4 h-4 text-[#a0a0a0] flex-shrink-0" />
              <span className="text-xs text-[#0f0f0f] truncate flex-1 min-w-0">Abrir arquivo</span>
              <ExternalLink className="w-3 h-3 text-[#a0a0a0] flex-shrink-0" />
            </a>
          )}

          {/* Legenda */}
          {asset.caption && (
            <div className="p-3 bg-[#f7f7f7] rounded-xl border border-[#e8e8e8]">
              <p className="text-[10px] text-[#a0a0a0] uppercase tracking-wide mb-2">Legenda / Copy</p>
              <p className="text-sm text-[#0f0f0f] leading-relaxed whitespace-pre-wrap break-words">{asset.caption}</p>
            </div>
          )}

          {/* Observações */}
          {asset.observations && (
            <div className="p-3 bg-[#f7f7f7] rounded-xl border border-[#e8e8e8]">
              <p className="text-[10px] text-[#a0a0a0] uppercase tracking-wide mb-2">Observações</p>
              <p className="text-sm text-[#737373] leading-relaxed whitespace-pre-wrap break-words">{asset.observations}</p>
            </div>
          )}

          {/* Link externo — botão proeminente */}
          {asset.link_url && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Link</p>
              <a
                href={asset.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 bg-[#f7f7f7] border border-[#e8e8e8] rounded-xl hover:border-[#d0d0d0] hover:bg-[#f0f0f0] transition-colors min-w-0 overflow-hidden"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                <span className="text-xs text-blue-800 flex-1 min-w-0 break-all">{asset.link_url}</span>
                <span className="flex items-center gap-1 text-[11px] font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 flex-shrink-0">
                  Abrir link <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </div>
          )}

          {!asset.caption && !asset.observations && !asset.media_url && !asset.link_url && (
            <p className="text-xs text-[#a0a0a0] text-center py-4">Nenhuma informação adicional.</p>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          {asset.link_url && (
            <a href={asset.link_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm">
                <Link2 className="w-3.5 h-3.5" /> Abrir link
              </Button>
            </a>
          )}
          {asset.media_url && !isImg && !isVid && (
            <a href={asset.media_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <Download className="w-3.5 h-3.5" /> Baixar arquivo
              </Button>
            </a>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Aba Formulário Semanal (portal do cliente) ───────────────────────────────

function PortalFormularioTab({ token, clientName }: { token: string; clientName: string }) {
  const { toast } = useToast()
  const formUrl = `${window.location.origin}/formulario/${token}`

  const handleCopy = () => {
    navigator.clipboard.writeText(formUrl)
    toast('Link copiado!', 'success')
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-2">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0f0f0f] mb-4">
          <ClipboardList className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-[18px] font-bold text-[#0f172a]">Formulário Semanal de Conteúdo</h2>
        <p className="text-[13px] text-[#64748b] mt-1">
          Preencha semanalmente para ajudar sua agência a criar conteúdos alinhados com sua realidade.
        </p>
      </div>

      {/* Card com link */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 mb-4 shadow-sm">
        <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">Link do formulário</p>
        <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5">
          <span className="text-[12px] text-[#374151] flex-1 truncate">{formUrl}</span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0f0f0f] text-white text-[11px] font-semibold hover:bg-[#1a1a1a] transition-colors"
          >
            <Copy className="w-3 h-3" /> Copiar
          </button>
        </div>
      </div>

      {/* Botão abrir formulário */}
      <a
        href={formUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#0f0f0f] text-white font-semibold text-[14px] hover:bg-[#1a1a1a] transition-colors"
      >
        <ClipboardList className="w-4 h-4" />
        Preencher formulário agora
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </a>

      <p className="text-center text-[11px] text-[#94a3b8] mt-4">
        Você pode compartilhar este link com outros colaboradores da {clientName || 'sua empresa'}.
      </p>
    </div>
  )
}

// ─── Main Portal Dashboard ────────────────────────────────────────────────────

export function PortalDashboard() {
  const { data: client, isLoading } = usePortalClient()
  const { data: plannerItems } = usePortalPlanner()
  const { data: contents } = usePortalContents()
  const { data: contentAssets = [] } = usePortalContentAssets()
  const { data: brandDNA } = usePortalBrandDNA()
  const { data: materials = [] } = usePortalMaterials()
  const { data: supportContacts = [] } = usePortalSupportContacts()
  const { data: portalPayments = [] } = usePortalPayments()
  const { data: notifications = [] } = useNotifications()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const clientId = profile?.linked_client_id ?? ''
  const { data: formConfig } = useWeeklyFormConfig(clientId)
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(null)
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [autoOpenPlannerItemId, setAutoOpenPlannerItemId] = useState<string | null>(null)

  const rawName = profile?.full_name || ''
  const firstName = rawName.split(' ')[0] || 'Cliente'

  const pendingCount = (plannerItems || []).filter(
    i => i.approval_status === 'pendente_aprovacao' || (i.status === 'revisao' && !i.approval_status)
  ).length

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-full py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#64748b] text-sm">Carregando...</p>
          </div>
        </div>
      </PortalLayout>
    )
  }

  if (!client) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-full py-32">
          <div className="text-center">
            <Building2 className="w-10 h-10 text-[#94a3b8] mx-auto mb-3" />
            <p className="text-[#737373] font-medium">Conta não vinculada</p>
            <p className="text-gray-500 text-sm mt-1">Entre em contato com sua agência.</p>
          </div>
        </div>
      </PortalLayout>
    )
  }

  const infoFields = [
    { label: 'Objetivo Principal', value: client.main_objective },
    { label: 'Público-alvo', value: client.target_audience },
    { label: 'Tom de Voz', value: client.tone_of_voice },
    { label: 'Estilo de Comunicação', value: client.communication_style },
    { label: 'Diferenciais', value: client.differentials },
    { label: 'Serviços Oferecidos', value: client.services_offered },
    { label: 'Observações', value: client.observations },
  ]

  return (
    <>
    <PortalLayout
      clientName={client.company_name}
      unreadCount={unreadCount}
      pendingCount={pendingCount}
      onBellClick={() => setShowNotifications(true)}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Cabeçalho da empresa */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 mb-6 p-5 rounded-2xl border border-[#e2e8f0] bg-white shadow-sm"
        >
          {client.logo_url ? (
            <img src={client.logo_url} alt={client.company_name}
              className="w-16 h-16 rounded-2xl object-cover border border-[#e8e8e8] flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#f0f0f0] border border-[#e8e8e8] flex items-center justify-center text-2xl font-bold text-[#0f0f0f] flex-shrink-0">
              {client.company_name[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-[#0f0f0f]">{client.company_name}</h1>
              <Badge status={client.status} />
            </div>
            <p className="text-[#737373] text-sm mt-0.5">{client.responsible_name} · {client.niche}</p>
            <div className="flex flex-wrap gap-3 mt-2">
              {client.instagram && (
                <span className="flex items-center gap-1 text-xs text-[#737373]">
                  <Instagram className="w-3 h-3" /> @{client.instagram.replace('@', '')}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1 text-xs text-[#737373]">
                  <Mail className="w-3 h-3" /> {client.email}
                </span>
              )}
              {client.whatsapp && (
                <span className="flex items-center gap-1 text-xs text-[#737373]">
                  <Phone className="w-3 h-3" /> {client.whatsapp}
                </span>
              )}
              {client.website && (
                <span className="flex items-center gap-1 text-xs text-[#737373]">
                  <Globe className="w-3 h-3" /> {client.website}
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-gray-500 flex-shrink-0">
            <p>Cliente desde</p>
            <p className="font-medium text-[#737373]">{formatDate(client.entry_date)}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-nowrap overflow-x-auto h-auto gap-1 mb-6 scrollbar-none lg:flex-wrap">
            <TabsTrigger value="dashboard" className="flex-shrink-0 justify-center lg:flex-1">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="planejamento" className="flex-shrink-0 justify-center lg:flex-1">
              Planejamento ({plannerItems?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="notas" className="flex-shrink-0 justify-center lg:flex-1">Solicitações/Ideias</TabsTrigger>
            <TabsTrigger value="materiais" className="flex-shrink-0 justify-center lg:flex-1">Materiais</TabsTrigger>
            <TabsTrigger value="resultados" className="flex-shrink-0 justify-center lg:flex-1">Resultados</TabsTrigger>
            <TabsTrigger value="financeiro" className="flex-shrink-0 justify-center lg:flex-1">Financeiro</TabsTrigger>
            {formConfig?.is_active && (
              <TabsTrigger value="formulario" className="flex-shrink-0 justify-center lg:flex-1">Formulário</TabsTrigger>
            )}
          </TabsList>

          {/* Aba Dashboard */}
          <TabsContent value="dashboard">
            <ClientDashboardTab
              client={client}
              plannerItems={plannerItems || []}
              contents={contents || []}
              onNavigate={setActiveTab}
              firstName={firstName}
              payments={portalPayments}
            />
          </TabsContent>

          {/* Aba Planejamento */}
          <TabsContent value="planejamento">
            {plannerItems && plannerItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#64748b] text-sm">Nenhum conteúdo planejado ainda.</p>
              </div>
            ) : (
              <PortalPlannerView
                items={plannerItems || []}
                autoOpenItemId={autoOpenPlannerItemId}
                onItemAutoOpened={() => setAutoOpenPlannerItemId(null)}
              />
            )}
          </TabsContent>

          {/* Aba Materiais */}
          <TabsContent value="materiais">
            <PortalMateriaisTab materials={materials} />
          </TabsContent>

          {/* Aba Resultados */}
          <TabsContent value="resultados">
            <PortalResultadosTab />
          </TabsContent>

          {/* Aba Financeiro */}
          <TabsContent value="financeiro">
            <PortalFinanceiroTab />
          </TabsContent>

          {/* Aba Notas */}
          <TabsContent value="notas">
            <PortalNotesTab />
          </TabsContent>

          {/* Aba Formulário */}
          {formConfig?.is_active && (
            <TabsContent value="formulario">
              <PortalFormularioTab
                token={formConfig.public_token}
                clientName={client?.company_name || ''}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modal de detalhe de conteúdo do arsenal */}
      {selectedAsset && (
        <ContentAssetDetailModal
          asset={selectedAsset}
          open={assetModalOpen}
          onClose={() => { setAssetModalOpen(false); setSelectedAsset(null) }}
        />
      )}
    </PortalLayout>

    {/* Modal de notificações */}
    <NotificationsModal
      open={showNotifications}
      onClose={() => setShowNotifications(false)}
      onView={(notification) => {
        setShowNotifications(false)
        if (notification.type === 'NEW_REPORT') {
          setActiveTab('resultados')
          return
        }
        setActiveTab('planejamento')
        if (notification.link) {
          setAutoOpenPlannerItemId(notification.link)
        }
      }}
    />
    </>
  )
}
