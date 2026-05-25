// ── Portal do Colaborador ─────────────────────────────────────────────────────
// Rota pública: /colaborador/:token
// O colaborador visualiza suas tarefas e pode atualizar status, nota e URL de entrega.

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle2, Clock, AlertCircle, Circle, ExternalLink, ChevronDown,
  Loader2, Send, FileText, Link as LinkIcon, Calendar, User, Briefcase,
  X, Image, Film, Folder,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

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
  link:    'text-blue-500   bg-blue-50',
  imagem:  'text-pink-500   bg-pink-50',
  video:   'text-red-500    bg-red-50',
  arquivo: 'text-amber-600  bg-amber-50',
  pasta:   'text-violet-500 bg-violet-50',
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'a_fazer',      label: 'A fazer',       icon: Circle,       color: 'text-slate-400',  bg: 'bg-slate-100' },
  { value: 'em_andamento', label: 'Em andamento',  icon: Clock,        color: 'text-blue-500',   bg: 'bg-blue-50'   },
  { value: 'revisao',      label: 'Em revisão',    icon: AlertCircle,  color: 'text-amber-500',  bg: 'bg-amber-50'  },
  { value: 'concluido',    label: 'Concluído',     icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-50'  },
]

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  baixa:  { label: 'Baixa',   color: 'text-slate-500',  bg: 'bg-slate-100'  },
  media:  { label: 'Média',   color: 'text-blue-600',   bg: 'bg-blue-100'   },
  alta:   { label: 'Alta',    color: 'text-orange-600', bg: 'bg-orange-100' },
  urgente:{ label: 'Urgente', color: 'text-red-600',    bg: 'bg-red-100'    },
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
    : '#22c55e'

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
                  overdue ? 'text-red-600 bg-red-50 font-semibold' : 'text-slate-500 bg-slate-100'
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
              <div className="space-y-2">
                {links.map(link => {
                  const colorCls = LINK_TYPE_COLORS[link.type] ?? 'text-blue-500 bg-blue-50'
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

          {/* Seção de atualização */}
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
                {error && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                  </p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    saved ? 'bg-green-500 text-white'
                    : isDirty ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                   : saved ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
                   : <><Send className="w-4 h-4" /> Salvar atualização</>}
                </button>
              </div>
            )}
          </div>
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
    : '#22c55e'

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

// ── Loading ───────────────────────────────────────────────────────────────────

function PortalLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
        <p className="text-slate-500 text-sm">Carregando suas tarefas...</p>
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

  if (loading) return <PortalLoading />
  if (error || !member) return <PortalError message={error ?? 'Colaborador não encontrado.'} />

  const counts = {
    total:     tasks.length,
    pendentes: tasks.filter(t => t.status !== 'concluido').length,
    concluidas: tasks.filter(t => t.status === 'concluido').length,
  }
  const initials = member.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white shadow-sm"
              style={{ background: member.color }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{member.name}</p>
            {member.role && <p className="text-xs text-slate-400 truncate">{member.role}</p>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            <User className="w-3 h-3" /> Portal do colaborador
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',      value: counts.total,      color: 'text-slate-700', bg: 'bg-white'    },
            { label: 'Pendentes',  value: counts.pendentes,  color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Concluídas', value: counts.concluidas, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 border border-slate-200 text-center shadow-sm`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Lista de tarefas */}
        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Nenhuma tarefa atribuída</p>
            <p className="text-sm text-slate-400 mt-1">Fique de olho, novas tarefas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Minhas tarefas ({tasks.length})
            </h2>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} onOpen={() => setOpenTask(task)} />
            ))}
          </div>
        )}

        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-slate-300">Powered by StatusBrand</p>
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
