// ── Portal do Colaborador ─────────────────────────────────────────────────────
// Rota pública: /colaborador/:token
// O colaborador visualiza um dashboard com suas demandas separadas por cliente
// e pode atualizar status, nota e URL de entrega de cada uma.

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2, Clock, AlertCircle, Circle, ExternalLink, ChevronDown,
  Loader2, Send, FileText, Link as LinkIcon, Calendar, Briefcase,
  X, Image, Film, Folder, Building2, AlertTriangle, ListChecks,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CollaboratorMember {
  id:          string
  name:        string
  role:        string | null
  color:       string
  avatar_url:  string | null
  portal_token: string
  user_id:     string
}

interface TaskLink {
  id:    string
  label: string
  url:   string
  type:  'link' | 'imagem' | 'video' | 'arquivo' | 'pasta'
}

interface CollaboratorTask {
  id:                string
  title:             string
  description:       string | null
  status:            string
  priority:          string
  due_date:          string | null
  collaborator_note: string | null
  delivery_url:      string | null
  task_links:        TaskLink[] | null
  created_at:        string
  updated_at:        string
  client_id:         string | null
  clients:           { id: string; company_name: string } | null
}

interface ClientTaskGroup {
  clientId:    string | null
  companyName: string
  tasks:       CollaboratorTask[]
  openCount:   number
  totalCount:  number
  nextDueDate: string | null
}

// Ícone por tipo de link
function LinkTypeIcon({ type, className }: { type: TaskLink['type']; className?: string }) {
  const cls = className ?? 'w-4 h-4'
  if (type === 'imagem')  return <Image   className={cls} />
  if (type === 'video')   return <Film    className={cls} />
  if (type === 'arquivo') return <FileText className={cls} />
  if (type === 'pasta')   return <Folder  className={cls} />
  return <LinkIcon className={cls} />
}

const LINK_TYPE_COLORS: Record<TaskLink['type'], string> = {
  link:    'text-blue-800   bg-blue-50',
  imagem:  'text-pink-800   bg-pink-50',
  video:   'text-red-800    bg-red-50',
  arquivo: 'text-amber-800  bg-amber-50',
  pasta:   'text-violet-800 bg-violet-50',
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'a_fazer',      label: 'A fazer',       icon: Circle,       color: 'text-slate-400',  bg: 'bg-slate-100' },
  { value: 'em_andamento', label: 'Em andamento',  icon: Clock,        color: 'text-blue-800',   bg: 'bg-blue-50'   },
  { value: 'revisao',      label: 'Em revisão',    icon: AlertCircle,  color: 'text-amber-800',  bg: 'bg-amber-50'  },
  { value: 'concluido',    label: 'Concluído',     icon: CheckCircle2, color: 'text-green-800',  bg: 'bg-green-50'  },
]

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  baixa:  { label: 'Baixa',   color: 'text-slate-500',  bg: 'bg-slate-100'  },
  media:  { label: 'Média',   color: 'text-blue-800',   bg: 'bg-blue-100'   },
  alta:   { label: 'Alta',    color: 'text-orange-800', bg: 'bg-orange-100' },
  urgente:{ label: 'Urgente', color: 'text-red-800',    bg: 'bg-red-100'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function isOverdue(due_date: string | null, status: string) {
  if (!due_date || status === 'concluido') return false
  return new Date(due_date) < new Date()
}

function getStatusConfig(value: string) {
  return STATUS_OPTIONS.find(s => s.value === value) ?? STATUS_OPTIONS[0]
}

// Agrupa as demandas por cliente — tarefas sem client_id caem no grupo "Sem cliente"
function buildClientGroups(tasks: CollaboratorTask[]): ClientTaskGroup[] {
  const buckets = new Map<string, { clientId: string | null; companyName: string; tasks: CollaboratorTask[] }>()

  for (const t of tasks) {
    const key = t.client_id ?? '__none__'
    if (!buckets.has(key)) {
      buckets.set(key, { clientId: t.client_id, companyName: t.clients?.company_name ?? 'Sem cliente', tasks: [] })
    }
    buckets.get(key)!.tasks.push(t)
  }

  const groups: ClientTaskGroup[] = Array.from(buckets.values()).map(b => {
    const openTasksWithDate = b.tasks.filter(t => t.status !== 'concluido' && t.due_date)
    const nextDueDate = openTasksWithDate.length
      ? openTasksWithDate.reduce((min, t) => (t.due_date! < min ? t.due_date! : min), openTasksWithDate[0].due_date!)
      : null
    return {
      clientId:    b.clientId,
      companyName: b.companyName,
      tasks:       b.tasks,
      openCount:   b.tasks.filter(t => t.status !== 'concluido').length,
      totalCount:  b.tasks.length,
      nextDueDate,
    }
  })

  groups.sort((a, b) => {
    if (a.clientId === null) return 1
    if (b.clientId === null) return -1
    return a.companyName.localeCompare(b.companyName, 'pt-BR')
  })

  return groups
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ member }: { member: CollaboratorMember }) {
  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.name}
        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow"
      />
    )
  }
  const initials = member.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-white shadow"
      style={{ background: member.color }}
    >
      {initials}
    </div>
  )
}

// ── StatusDropdown ─────────────────────────────────────────────────────────────

function StatusDropdown({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = getStatusConfig(value)
  const Icon = current.icon

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all
          ${current.bg} ${current.color} border-transparent hover:border-current/20 disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <Icon className="w-3.5 h-3.5" />
        {current.label}
        {!disabled && <ChevronDown className="w-3 h-3 opacity-60" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-w-[160px]">
            {STATUS_OPTIONS.map(opt => {
              const Ic = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-slate-50
                    ${opt.value === value ? 'font-semibold' : 'text-slate-600'}`}
                >
                  <Ic className={`w-4 h-4 ${opt.color}`} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── TaskDetailModal ───────────────────────────────────────────────────────────

function TaskDetailModal({
  task,
  portalToken,
  onClose,
  onUpdated,
}: {
  task: CollaboratorTask
  portalToken: string
  onClose: () => void
  onUpdated: (updated: Partial<CollaboratorTask> & { id: string }) => void
}) {
  const [status,      setStatus]      = useState(task.status)
  const [note,        setNote]        = useState(task.collaborator_note ?? '')
  const [deliveryUrl, setDeliveryUrl] = useState(task.delivery_url ?? '')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [showDelivery, setShowDelivery] = useState(false)

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media
  const overdue  = isOverdue(task.due_date, status)
  const sc       = getStatusConfig(status)
  const links    = Array.isArray(task.task_links) ? task.task_links : []

  const isDirty =
    status !== task.status ||
    note   !== (task.collaborator_note ?? '') ||
    deliveryUrl !== (task.delivery_url ?? '')

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const { data, error: rpcError } = await (supabase as any).rpc('update_collaborator_task', {
        p_token:             portalToken,
        p_task_id:           task.id,
        p_status:            status,
        p_collaborator_note: note || null,
        p_delivery_url:      deliveryUrl || null,
      })
      if (rpcError) throw new Error(rpcError.message)
      if (data?.error) throw new Error(data.error)
      setSaved(true)
      onUpdated({ id: task.id, status, collaborator_note: note, delivery_url: deliveryUrl })
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Cor da barra lateral por status
  const barColor = sc.color.includes('slate') ? '#94a3b8'
    : sc.color.includes('blue')  ? '#3b82f6'
    : sc.color.includes('amber') ? '#f59e0b'
    : '#3fa06e'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-3">
          <div className="w-1.5 self-stretch rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: barColor, minHeight: 40 }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-slate-800 text-base leading-snug flex-1">{task.title}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center flex-shrink-0 -mt-1">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.bg} ${priority.color}`}>
                {priority.label}
              </span>
              {task.clients && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  <Briefcase className="w-3 h-3" /> {task.clients.company_name}
                </span>
              )}
              {task.due_date && (
                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                  overdue ? 'text-red-800 bg-red-50 font-semibold' : 'text-slate-500 bg-slate-100'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {overdue && 'Atrasado · '}{formatDate(task.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 w-16 flex-shrink-0">Status</span>
            <StatusDropdown value={status} onChange={setStatus} />
          </div>

          {/* Descrição */}
          {task.description && (
            <div className="bg-slate-50 rounded-2xl p-3.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Descrição</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Links e referências da agência */}
          {links.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Referências e materiais ({links.length})
              </p>
              <div className="space-y-3">
                {links.map(link => {
                  // ── Prévia de imagem ──
                  if (link.type === 'imagem') {
                    return (
                      <div key={link.id} className="rounded-2xl overflow-hidden border border-slate-200">
                        <img
                          src={link.url}
                          alt={link.label}
                          className="w-full max-h-72 object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <div className="flex items-center justify-between px-3 py-2.5 bg-white">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-pink-500 bg-pink-50">
                              <LinkTypeIcon type="imagem" className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 truncate">{link.label}</span>
                          </div>
                          <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className="text-slate-300 hover:text-violet-500 ml-2 flex-shrink-0 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )
                  }

                  // ── Prévia de vídeo ──
                  if (link.type === 'video') {
                    return (
                      <div key={link.id} className="rounded-2xl overflow-hidden border border-slate-200">
                        <video
                          src={link.url}
                          controls
                          className="w-full max-h-72 bg-black"
                          preload="metadata"
                        />
                        <div className="flex items-center justify-between px-3 py-2.5 bg-white">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-red-800 bg-red-50">
                              <LinkTypeIcon type="video" className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 truncate">{link.label}</span>
                          </div>
                          <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className="text-slate-300 hover:text-violet-500 ml-2 flex-shrink-0 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )
                  }

                  // ── Outros tipos: link, arquivo, pasta ──
                  const colorCls = LINK_TYPE_COLORS[link.type] ?? 'text-blue-800 bg-blue-50'
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all group"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}>
                        <LinkTypeIcon type={link.type} className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-violet-700 transition-colors">
                          {link.label}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{link.url}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Entrega do colaborador (existente) */}
          {(task.collaborator_note || task.delivery_url) && (
            <div className="bg-violet-50 rounded-2xl p-3.5 border border-violet-100">
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2">Sua entrega atual</p>
              {task.collaborator_note && (
                <p className="text-sm text-violet-800 leading-relaxed mb-2">📝 {task.collaborator_note}</p>
              )}
              {task.delivery_url && (
                <a href={task.delivery_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver entrega enviada
                </a>
              )}
            </div>
          )}

          {/* Seção de entrega — colapsível só para nota + link */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowDelivery(d => !d)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="text-sm font-semibold text-slate-700">
                {task.collaborator_note || task.delivery_url ? 'Atualizar entrega' : 'Adicionar entrega'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDelivery ? 'rotate-180' : ''}`} />
            </button>

            {showDelivery && (
              <div className="px-4 pb-4 pt-3 space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                    <FileText className="w-3.5 h-3.5" /> Nota / observação
                  </label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Escreva uma observação, dificuldade ou comentário..."
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                    <LinkIcon className="w-3.5 h-3.5" /> Link de entrega
                  </label>
                  <input
                    type="url"
                    value={deliveryUrl}
                    onChange={e => setDeliveryUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1.5 px-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </p>
          )}

          {/* Botão salvar — sempre visível, ativo quando houver mudança */}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
              saved    ? 'bg-green-500 text-white'
              : isDirty ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
             : saved  ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
             : <><Send className="w-4 h-4" /> Salvar atualização</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TaskCard (resumo — clicável para abrir o modal) ───────────────────────────

function TaskCard({
  task,
  onOpen,
}: {
  task: CollaboratorTask
  onOpen: () => void
}) {
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media
  const overdue  = isOverdue(task.due_date, task.status)
  const sc       = getStatusConfig(task.status)
  const links    = Array.isArray(task.task_links) ? task.task_links : []

  const barColor = sc.color.includes('slate') ? '#94a3b8'
    : sc.color.includes('blue')  ? '#3b82f6'
    : sc.color.includes('amber') ? '#f59e0b'
    : '#3fa06e'

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-violet-300 hover:shadow-md transition-all overflow-hidden group"
    >
      <div className="flex gap-3 p-4">
        {/* Barra lateral de status */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: barColor, minHeight: 36 }} />

        <div className="flex-1 min-w-0">
          {/* Título + prioridade */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-violet-700 transition-colors">
              {task.title}
            </h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${priority.bg} ${priority.color}`}>
              {priority.label}
            </span>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {task.clients && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> {task.clients.company_name}
              </span>
            )}
            {task.due_date && (
              <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}>
                <Calendar className="w-3 h-3" />
                {overdue && 'Atrasado · '}{formatDate(task.due_date)}
              </span>
            )}
          </div>

          {/* Descrição (preview) */}
          {task.description && (
            <p className="mt-1.5 text-xs text-slate-400 line-clamp-1 leading-relaxed">{task.description}</p>
          )}

          {/* Footer: status + links badge */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
              {sc.label}
            </span>
            {links.length > 0 && (
              <span className="text-[10px] text-violet-500 flex items-center gap-0.5">
                <LinkIcon className="w-3 h-3" /> {links.length} anexo{links.length !== 1 ? 's' : ''}
              </span>
            )}
            {(task.collaborator_note || task.delivery_url) && (
              <span className="text-[10px] text-emerald-500 ml-auto">✓ Entrega enviada</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── KPI card (cópia local do padrão usado no portal do cliente) ───────────────

type CardColor = 'amber' | 'green' | 'blue' | 'purple' | 'red' | 'default'

const cardColorMap: Record<CardColor, { icon: string; label: string; value: string; ring: string; dot: string; bar: string }> = {
  amber:   { icon: 'text-orange-800', label: 'text-orange-900', value: 'text-orange-900', ring: 'border-orange-200 bg-orange-50', dot: 'bg-orange-400', bar: 'bg-[#f97316]' },
  green:   { icon: 'text-green-800',  label: 'text-green-900',  value: 'text-green-900',  ring: 'border-green-200 bg-green-50',  dot: 'bg-green-500',  bar: 'bg-[#3fa06e]' },
  blue:    { icon: 'text-blue-800',   label: 'text-blue-900',   value: 'text-blue-900',   ring: 'border-blue-200 bg-blue-50',    dot: 'bg-blue-500',   bar: 'bg-[#3b82f6]' },
  purple:  { icon: 'text-purple-800', label: 'text-purple-900', value: 'text-purple-900', ring: 'border-purple-200 bg-purple-50', dot: 'bg-purple-500', bar: 'bg-[#8b5cf6]' },
  red:     { icon: 'text-red-800',    label: 'text-red-900',    value: 'text-red-900',    ring: 'border-red-200 bg-red-50',      dot: 'bg-red-500',    bar: 'bg-[#ef4444]' },
  default: { icon: 'text-gray-500',   label: 'text-slate-500',  value: 'text-slate-800',  ring: 'border-slate-200 bg-white',     dot: 'bg-gray-400',   bar: 'bg-slate-200' },
}

function StatusKpiCard({
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
          <p className={`text-[15px] font-semibold mt-1 leading-tight ${c.value}`}>{value}</p>
        </div>
      </div>
      <div className={`h-1 w-full ${c.bar}`} />
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function CollaboratorHeader({ member }: { member: CollaboratorMember }) {
  const initials = member.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
          <img src="/logo-icon.png" alt="StatusMedia" className="w-full h-full object-contain select-none" draggable={false} />
        </div>
        <span className="text-slate-900 font-bold text-[14px] tracking-tight hidden sm:inline">
          Status<span className="text-violet-600">Media</span>
        </span>
        <span className="text-slate-300 text-xs mx-1 hidden sm:inline">/</span>
        <span className="text-slate-500 text-[12px] truncate">Portal do colaborador</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white shadow-sm"
            style={{ background: member.color }}>
            {initials}
          </div>
        )}
        <div className="hidden sm:block">
          <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate max-w-[140px]">{member.name}</p>
          {member.role && <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[140px]">{member.role}</p>}
        </div>
      </div>
    </header>
  )
}

// ── Hero (saudação + resumo dinâmico) ──────────────────────────────────────────

function CollaboratorHero({
  member,
  counts,
}: {
  member: CollaboratorMember
  counts: { total: number; aFazer: number; emProgresso: number; atrasadas: number; concluidas: number }
}) {
  const firstName = member.name.split(' ')[0]
  const pendentes = counts.aFazer + counts.emProgresso

  let headline: string
  let subline: string
  let tone: 'red' | 'amber' | 'green' | 'neutral'

  if (counts.total === 0) {
    headline = `Bem-vindo, ${firstName}`
    subline  = 'Você ainda não tem nenhuma demanda. Assim que a agência atribuir algo, aparece aqui.'
    tone = 'neutral'
  } else if (counts.atrasadas > 0) {
    headline = counts.atrasadas === 1 ? 'Você tem 1 demanda atrasada' : `Você tem ${counts.atrasadas} demandas atrasadas`
    subline  = 'Dá uma olhada nelas primeiro pra não acumular.'
    tone = 'red'
  } else if (pendentes > 0) {
    headline = pendentes === 1 ? 'Você tem 1 demanda em aberto' : `Você tem ${pendentes} demandas em aberto`
    subline  = `${counts.concluidas} já ${counts.concluidas === 1 ? 'concluída' : 'concluídas'}. Continue assim.`
    tone = 'amber'
  } else {
    headline = 'Tudo em dia!'
    subline  = `${counts.concluidas} ${counts.concluidas === 1 ? 'demanda concluída' : 'demandas concluídas'}. Nenhuma pendência no momento.`
    tone = 'green'
  }

  const toneClasses: Record<typeof tone, string> = {
    red:     'border-red-200 bg-gradient-to-br from-red-50 via-red-50/40 to-transparent',
    amber:   'border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50/40 to-transparent',
    green:   'border-green-200 bg-gradient-to-br from-green-50 via-green-50/40 to-transparent',
    neutral: 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-transparent',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`rounded-2xl p-6 border ${toneClasses[tone]}`}
    >
      <div className="flex items-center gap-4">
        <Avatar member={member} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] mb-1">Olá, {firstName}</p>
          <h2 className="text-[18px] sm:text-[20px] font-semibold text-slate-800 leading-snug">{headline}</h2>
          <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{subline}</p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Card de resumo por cliente ─────────────────────────────────────────────────

function ClientSummaryCard({ group, onClick }: { group: ClientTaskGroup; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-violet-300 hover:shadow-md transition-all p-4 w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-violet-500" />
        </div>
        {group.openCount > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 flex-shrink-0">
            {group.openCount} em aberto
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-800 truncate">{group.companyName}</p>
      <p className="text-xs text-slate-400 mt-0.5">
        {group.totalCount - group.openCount}/{group.totalCount} concluídas
      </p>
      {group.nextDueDate && (
        <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Próxima: {formatDate(group.nextDueDate)}
        </p>
      )}
    </button>
  )
}

// ── Linha compacta de tarefa (próximas entregas / atividade recente) ──────────

function TaskMiniRow({ task, onOpen }: { task: CollaboratorTask; onOpen: () => void }) {
  const sc = getStatusConfig(task.status)
  const Icon = sc.icon
  const overdue = isOverdue(task.due_date, task.status)
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 text-left hover:bg-slate-50 rounded-xl px-2 py-2 -mx-2 transition-colors"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${sc.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-slate-800 truncate">{task.title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
          {task.clients?.company_name ?? 'Sem cliente'}
          {task.due_date && (
            <span className={overdue ? 'text-red-500 font-medium' : ''}> · {formatDate(task.due_date)}</span>
          )}
        </p>
      </div>
    </button>
  )
}

// ── Aba Dashboard ───────────────────────────────────────────────────────────────

function CollaboratorDashboardTab({
  counts,
  clientGroups,
  upcoming,
  recent,
  onNavigate,
  onOpenTask,
}: {
  counts: { total: number; aFazer: number; emProgresso: number; atrasadas: number; concluidas: number }
  clientGroups: ClientTaskGroup[]
  upcoming: CollaboratorTask[]
  recent: CollaboratorTask[]
  onNavigate: (tab: 'dashboard' | 'demandas', clientId?: string | null) => void
  onOpenTask: (task: CollaboratorTask) => void
}) {
  if (counts.total === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">Nenhuma demanda atribuída</p>
        <p className="text-sm text-slate-400 mt-1">Fique de olho, novas demandas aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerta de atrasadas */}
      {counts.atrasadas > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-red-700">
              {counts.atrasadas === 1 ? '1 demanda atrasada' : `${counts.atrasadas} demandas atrasadas`}
            </p>
            <p className="text-[12px] text-red-800 mt-0.5 leading-snug">Priorize essas antes das outras.</p>
          </div>
          <button
            onClick={() => onNavigate('demandas')}
            className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium text-red-700 hover:text-red-600 transition-colors whitespace-nowrap"
          >
            Ver
          </button>
        </motion.div>
      )}

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.06 }}
        className="grid grid-cols-2 sm:grid-cols-5 gap-3"
      >
        <StatusKpiCard
          icon={<ListChecks className="w-4 h-4" />}
          label="Total"
          value={String(counts.total)}
          color="purple"
        />
        <StatusKpiCard
          icon={<Circle className="w-4 h-4" />}
          label="A fazer"
          value={String(counts.aFazer)}
          color="default"
          onClick={() => onNavigate('demandas')}
        />
        <StatusKpiCard
          icon={<Clock className="w-4 h-4" />}
          label="Em progresso"
          value={String(counts.emProgresso)}
          color={counts.emProgresso > 0 ? 'blue' : 'default'}
          onClick={() => onNavigate('demandas')}
        />
        <StatusKpiCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Atrasadas"
          value={String(counts.atrasadas)}
          color={counts.atrasadas > 0 ? 'red' : 'default'}
          onClick={() => onNavigate('demandas')}
        />
        <StatusKpiCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Concluídas"
          value={String(counts.concluidas)}
          color={counts.concluidas > 0 ? 'green' : 'default'}
        />
      </motion.div>

      {/* Por cliente — só faz sentido com mais de um cliente */}
      {clientGroups.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.1 }}
        >
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
            Por cliente ({clientGroups.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clientGroups.map(g => (
              <ClientSummaryCard
                key={g.clientId ?? '__none__'}
                group={g}
                onClick={() => onNavigate('demandas', g.clientId)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Próximas entregas / Atividade recente */}
      {(upcoming.length > 0 || recent.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {upcoming.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.14 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Próximas entregas</h3>
              <div className="space-y-0.5">
                {upcoming.map(t => <TaskMiniRow key={t.id} task={t} onOpen={() => onOpenTask(t)} />)}
              </div>
            </motion.div>
          )}
          {recent.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.18 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Atividade recente</h3>
              <div className="space-y-0.5">
                {recent.map(t => <TaskMiniRow key={t.id} task={t} onOpen={() => onOpenTask(t)} />)}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Aba Minhas Demandas (lista completa, separada por cliente) ────────────────

function CollaboratorDemandsTab({
  tasks,
  clientGroups,
  clientFilter,
  onFilterChange,
  onOpenTask,
}: {
  tasks: CollaboratorTask[]
  clientGroups: ClientTaskGroup[]
  clientFilter: string
  onFilterChange: (filter: string) => void
  onOpenTask: (task: CollaboratorTask) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleCollapsed(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">Nenhuma demanda atribuída</p>
        <p className="text-sm text-slate-400 mt-1">Fique de olho, novas demandas aparecerão aqui.</p>
      </div>
    )
  }

  const visibleGroups = clientFilter === 'all'
    ? clientGroups
    : clientGroups.filter(g => (g.clientId ?? '__none__') === clientFilter)

  return (
    <div className="space-y-5">
      {/* Chips de filtro por cliente */}
      {clientGroups.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('all')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              clientFilter === 'all'
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
            }`}
          >
            Todos ({tasks.length})
          </button>
          {clientGroups.map(g => {
            const key = g.clientId ?? '__none__'
            const active = clientFilter === key
            return (
              <button
                key={key}
                onClick={() => onFilterChange(key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                }`}
              >
                {g.companyName} ({g.totalCount})
              </button>
            )
          })}
        </div>
      )}

      {/* Seções por cliente */}
      {visibleGroups.map(group => {
        const key = group.clientId ?? '__none__'
        const isCollapsed = collapsed.has(key)
        return (
          <div key={key} className="space-y-3">
            {clientGroups.length > 1 && (
              <button
                onClick={() => toggleCollapsed(key)}
                className="w-full flex items-center justify-between px-1 py-1"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {group.companyName} ({group.totalCount - group.openCount}/{group.totalCount})
                  </h3>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
            )}
            {!isCollapsed && (
              <div className="space-y-3">
                {group.tasks.map(task => (
                  <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────────

function PortalLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
        <p className="text-slate-500 text-sm">Carregando suas demandas...</p>
      </div>
    </div>
  )
}

// ── Error ─────────────────────────────────────────────────────────────────────

function PortalError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-sm border border-red-100 p-8 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Link inválido</h2>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  )
}

// ── Main: CollaboratorPortal ──────────────────────────────────────────────────

export function CollaboratorPortal() {
  const { token } = useParams<{ token: string }>()
  const [member,      setMember]      = useState<CollaboratorMember | null>(null)
  const [tasks,       setTasks]       = useState<CollaboratorTask[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [openTask,    setOpenTask]    = useState<CollaboratorTask | null>(null)
  const [activeTab,   setActiveTab]   = useState<'dashboard' | 'demandas'>('dashboard')
  const [clientFilter, setClientFilter] = useState('all')

  useEffect(() => {
    if (!token) { setError('Token não encontrado na URL.'); setLoading(false); return }

    async function load() {
      try {
        const { data, error: rpcError } = await (supabase as any)
          .rpc('get_collaborator_data', { p_token: token })
        if (rpcError) throw new Error(rpcError.message)
        if (data?.error) throw new Error(data.error)
        setMember(data.member)
        setTasks(data.tasks ?? [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  function handleTaskUpdated(updated: Partial<CollaboratorTask> & { id: string }) {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    // Atualiza também o modal aberto
    setOpenTask(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev)
  }

  function handleNavigate(tab: 'dashboard' | 'demandas', clientId?: string | null) {
    setActiveTab(tab)
    if (clientId !== undefined) setClientFilter(clientId ?? '__none__')
  }

  if (loading) return <PortalLoading />
  if (error || !member) return <PortalError message={error ?? 'Colaborador não encontrado.'} />

  const counts = {
    total:       tasks.length,
    aFazer:      tasks.filter(t => t.status === 'a_fazer').length,
    emProgresso: tasks.filter(t => t.status === 'em_andamento' || t.status === 'revisao').length,
    atrasadas:   tasks.filter(t => isOverdue(t.due_date, t.status)).length,
    concluidas:  tasks.filter(t => t.status === 'concluido').length,
  }
  const clientGroups = buildClientGroups(tasks)
  const upcoming = tasks
    .filter(t => t.due_date && t.status !== 'concluido')
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
    .slice(0, 5)
  const recent = [...tasks]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <CollaboratorHeader member={member} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <CollaboratorHero member={member} counts={counts} />

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'dashboard' | 'demandas')}>
          <TabsList className="w-full flex gap-1">
            <TabsTrigger value="dashboard" className="flex-1 justify-center">Dashboard</TabsTrigger>
            <TabsTrigger value="demandas" className="flex-1 justify-center">Minhas Demandas ({tasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <CollaboratorDashboardTab
              counts={counts}
              clientGroups={clientGroups}
              upcoming={upcoming}
              recent={recent}
              onNavigate={handleNavigate}
              onOpenTask={setOpenTask}
            />
          </TabsContent>

          <TabsContent value="demandas" className="mt-6">
            <CollaboratorDemandsTab
              tasks={tasks}
              clientGroups={clientGroups}
              clientFilter={clientFilter}
              onFilterChange={setClientFilter}
              onOpenTask={setOpenTask}
            />
          </TabsContent>
        </Tabs>

        <div className="text-center pt-2 pb-8">
          <p className="text-xs text-slate-300">Powered by StatusMedia</p>
        </div>
      </div>

      {/* Modal de detalhe */}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          portalToken={token!}
          onClose={() => setOpenTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}
    </div>
  )
}
