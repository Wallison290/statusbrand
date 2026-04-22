import { useState } from 'react'
import {
  ImageIcon, Video, Music, FileText, File,
  ExternalLink, Link2, Building2, Pencil, Trash2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdatePlannerItem, useDeletePlannerItem } from '@/hooks/usePlanner'
import { useToast } from '@/components/ui/toast'
import { contentTypeLabels } from '@/utils/formatters'
import { PlannerCommentsThread } from '@/components/PlannerCommentsThread'
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
  ajuste_solicitado: 'bg-orange-400', reprovado: 'bg-red-400',
}
const approvalTextColor: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'text-yellow-400', aprovado: 'text-green-400',
  ajuste_solicitado: 'text-orange-400', reprovado: 'text-red-400',
}
const approvalLabel: Record<ApprovalStatus, string> = {
  pendente_aprovacao: 'Aguardando aprovação', aprovado: 'Aprovado pelo cliente',
  ajuste_solicitado: 'Ajuste solicitado', reprovado: 'Reprovado pelo cliente',
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

  const updateItem = useUpdatePlannerItem()
  const deleteItem = useDeletePlannerItem()
  const { toast } = useToast()

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[item.status as PlannerStatus]}`} />
            <DialogTitle className="text-base leading-snug">{item.title}</DialogTitle>
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

        <div className="space-y-4 mt-1">

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
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Imagens */}
          {images.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Imagens</p>
              <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {images.map(img => (
                  <a key={img.id} href={img.file_url} target="_blank" rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl border border-white/8 hover:border-white/20 transition-colors">
                    <img src={img.file_url} alt={img.file_name} className="w-full object-cover"
                      style={{ maxHeight: images.length === 1 ? 260 : 150 }} />
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
                    className="flex items-center gap-2.5 p-2.5 bg-white/3 border border-white/8 rounded-xl hover:border-white/20 hover:bg-white/5 transition-colors">
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
                    className="flex items-center gap-2.5 p-2.5 bg-white/3 border border-white/8 rounded-xl hover:border-white/20 hover:bg-white/5 transition-colors">
                    <Link2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-blue-300 truncate flex-1">{link.label || link.url}</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resposta do cliente */}
          {item.approval_status && (
            <div className="p-3 bg-white/3 rounded-xl border border-white/8">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Resposta do Cliente</p>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${approvalDot[item.approval_status as ApprovalStatus]}`} />
                <span className={`text-xs font-medium ${approvalTextColor[item.approval_status as ApprovalStatus]}`}>
                  {approvalLabel[item.approval_status as ApprovalStatus]}
                </span>
                {item.reviewed_at && (
                  <span className="text-[10px] text-gray-600 ml-auto">
                    {format(parseISO(item.reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
              {item.client_feedback && (
                <p className="text-xs text-gray-300 leading-relaxed bg-white/5 rounded-lg px-3 py-2">
                  "{item.client_feedback}"
                </p>
              )}
            </div>
          )}

          {/* Thread de comentários */}
          <PlannerCommentsThread plannerId={item.id} role="agency" />
        </div>

        <DialogFooter className="flex-wrap gap-2">
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
