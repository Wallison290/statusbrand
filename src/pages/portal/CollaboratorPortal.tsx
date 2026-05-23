// ── Portal do Colaborador ─────────────────────────────────────────────────────
// Rota pública: /colaborador/:token
// O colaborador visualiza suas tarefas e pode atualizar status, nota e URL de entrega.

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle2, Clock, AlertCircle, Circle, ExternalLink, ChevronDown,
  Loader2, Send, FileText, Link as LinkIcon, Calendar, User, Briefcase,
} from 'lucide-react'
import { supabaseUrl, supabaseAnonKey } from '@/integrations/supabase/client'

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

interface CollaboratorTask {
  id:                string
  title:             string
  description:       string | null
  status:            string
  priority:          string
  due_date:          string | null
  collaborator_note: string | null
  delivery_url:      string | null
  created_at:        string
  updated_at:        string
  client_id:         string | null
  clients:           { id: string; name: string } | null
}

// ── Edge function helper ──────────────────────────────────────────────────────

async function callEdgeFunction(name: string, body: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':        supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`)
  return json
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

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  portalToken,
  onUpdated,
}: {
  task: CollaboratorTask
  portalToken: string
  onUpdated: (updated: Partial<CollaboratorTask> & { id: string }) => void
}) {
  const [status, setStatus]         = useState(task.status)
  const [note, setNote]             = useState(task.collaborator_note ?? '')
  const [deliveryUrl, setDeliveryUrl] = useState(task.delivery_url ?? '')
  const [expanded, setExpanded]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media
  const overdue  = isOverdue(task.due_date, status)
  const sc       = getStatusConfig(status)

  const isDirty =
    status !== task.status ||
    note !== (task.collaborator_note ?? '') ||
    deliveryUrl !== (task.delivery_url ?? '')

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await callEdgeFunction('update-collaborator-task', {
        portal_token:      portalToken,
        task_id:           task.id,
        status,
        collaborator_note: note || undefined,
        delivery_url:      deliveryUrl || undefined,
      })
      setSaved(true)
      onUpdated({ id: task.id, status, collaborator_note: note, delivery_url: deliveryUrl })
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden
      ${expanded ? 'border-slate-300' : 'border-slate-200 hover:border-slate-300'}`}>

      {/* Header da tarefa */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Indicador de status lateral */}
          <div className={`w-1 h-full rounded-full flex-shrink-0 self-stretch min-h-[40px]`}
            style={{ background: sc.color.replace('text-', '').includes('slate') ? '#94a3b8'
              : sc.color.replace('text-', '').includes('blue') ? '#3b82f6'
              : sc.color.replace('text-', '').includes('amber') ? '#f59e0b'
              : '#22c55e' }} />

          <div className="flex-1 min-w-0">
            {/* Título + prioridade */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-slate-800 text-sm leading-snug">{task.title}</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${priority.bg} ${priority.color}`}>
                {priority.label}
              </span>
            </div>

            {/* Meta: cliente + prazo */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {task.clients && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {task.clients.name}
                </span>
              )}
              {task.due_date && (
                <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}>
                  <Calendar className="w-3 h-3" />
                  {overdue && 'Atrasado · '}
                  {formatDate(task.due_date)}
                </span>
              )}
            </div>

            {/* Descrição colapsável */}
            {task.description && (
              <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Status + botão de expandir */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <StatusDropdown value={status} onChange={setStatus} />
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            {expanded ? 'Fechar' : 'Adicionar entrega'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Painel de entrega (expandido) */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3 bg-slate-50/50">
          {/* Nota do colaborador */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
              <FileText className="w-3.5 h-3.5" />
              Nota / observação
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Adicione um comentário, dificuldades ou observações..."
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white resize-none
                focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 placeholder:text-slate-300"
            />
          </div>

          {/* URL de entrega */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Link de entrega
            </label>
            <input
              type="url"
              value={deliveryUrl}
              onChange={e => setDeliveryUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white
                focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 placeholder:text-slate-300"
            />
          </div>

          {/* Mostrar link existente */}
          {task.delivery_url && !deliveryUrl && (
            <a
              href={task.delivery_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver entrega atual
            </a>
          )}

          {/* Erro */}
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}

          {/* Botão salvar */}
          <button
            onClick={handleSave}
            disabled={saving || (!isDirty && !note && !deliveryUrl)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
              ${saved
                ? 'bg-green-500 text-white'
                : isDirty || note || deliveryUrl
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Salvo com sucesso!</>
            ) : (
              <><Send className="w-4 h-4" /> Salvar atualização</>
            )}
          </button>
        </div>
      )}
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
  const [member, setMember]   = useState<CollaboratorMember | null>(null)
  const [tasks, setTasks]     = useState<CollaboratorTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setError('Token não encontrado na URL.'); setLoading(false); return }

    async function load() {
      try {
        const json = await callEdgeFunction('get-collaborator-data', { portal_token: token })
        setMember(json.member)
        setTasks(json.tasks ?? [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  function handleTaskUpdated(updated: Partial<CollaboratorTask> & { id: string }) {
    setTasks(prev =>
      prev.map(t => t.id === updated.id ? { ...t, ...updated } : t)
    )
  }

  if (loading) return <PortalLoading />
  if (error || !member) return <PortalError message={error ?? 'Colaborador não encontrado.'} />

  // Contagem por status
  const counts = {
    total:    tasks.length,
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
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white shadow-sm"
              style={{ background: member.color }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{member.name}</p>
            {member.role && (
              <p className="text-xs text-slate-400 truncate">{member.role}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            <User className="w-3 h-3" />
            Portal do colaborador
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',      value: counts.total,      color: 'text-slate-700',  bg: 'bg-white' },
            { label: 'Pendentes',  value: counts.pendentes,  color: 'text-amber-600',  bg: 'bg-amber-50' },
            { label: 'Concluídas', value: counts.concluidas, color: 'text-green-600',  bg: 'bg-green-50' },
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
              <TaskCard
                key={task.id}
                task={task}
                portalToken={token!}
                onUpdated={handleTaskUpdated}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-slate-300">Powered by StatusBrand</p>
        </div>
      </div>
    </div>
  )
}
