import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, X, Check, Loader2, Copy, ExternalLink,
  Pencil, Trash2, AlertCircle, Phone, Mail,
  Users, ClipboardList, ChevronDown, Plus,
  Calendar, Flag, Building2,
  Link as LinkIcon, Image, Film, FileText as FileIcon, Folder,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { useToast } from '@/components/ui/toast'
import { useClients } from '@/hooks/useClients'
import { useUpdateTask, useDeleteTask as useDeleteTaskHook } from '@/hooks/useTasks'
import {
  useTeamMembers, useTeamTasks,
  useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember,
  useCreateAndDelegateTask, useDelegateTask,
  type TeamMember, type TeamTask, type TaskLink,
} from '@/hooks/useTeamMembers'

// ── Cores disponíveis para membros ────────────────────────────────────────────
const COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#dc2626', '#db2777', '#0891b2', '#65a30d',
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  a_fazer:      { label: 'A fazer',       color: '#64748b', bg: '#f1f5f9' },
  em_andamento: { label: 'Em andamento',  color: '#d97706', bg: '#fef3c7' },
  revisao:      { label: 'Em revisão',    color: '#2563eb', bg: '#dbeafe' },
  concluido:    { label: 'Concluído',     color: '#059669', bg: '#d1fae5' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baixa:   { label: 'Baixa',   color: '#94a3b8' },
  media:   { label: 'Normal',  color: '#f59e0b' },
  alta:    { label: 'Alta',    color: '#f97316' },
  urgente: { label: 'Urgente', color: '#ef4444' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPortalUrl(token: string) {
  return `${window.location.origin}/colaborador/${token}`
}

// Evita o bug de fuso horário: 'YYYY-MM-DD' interpretado como UTC converte
// para o dia anterior em UTC-3. Parseando a string diretamente resolvemos.
function formatDate(date: string | null) {
  if (!date) return '—'
  const d = date.split('T')[0] // garante só a parte da data
  const [, mm, dd] = d.split('-')
  return `${dd}/${mm}`
}

function isOverdue(date: string | null, status: string) {
  if (!date || status === 'concluido') return false
  // Comparação como string YYYY-MM-DD é segura e sem fuso
  const today = new Date()
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return date.split('T')[0] < ymd
}

// ── Helpers de link ───────────────────────────────────────────────────────────

const LINK_TYPES: { value: TaskLink['type']; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'link',    label: 'Link',    Icon: LinkIcon  },
  { value: 'imagem',  label: 'Imagem',  Icon: Image     },
  { value: 'video',   label: 'Vídeo',   Icon: Film      },
  { value: 'arquivo', label: 'Arquivo', Icon: FileIcon  },
  { value: 'pasta',   label: 'Pasta',   Icon: Folder    },
]

function getLinkIcon(type: TaskLink['type']) {
  return LINK_TYPES.find(t => t.value === type)?.Icon ?? LinkIcon
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10)
}

// ── Formulário de edição de tarefa (inline no modal do membro) ───────────────

function TaskEditPanel({
  task,
  clients,
  onSave,
  onCancel,
}: {
  task: TeamTask
  clients: { id: string; company_name: string }[]
  onSave: (updates: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const [title,    setTitle]   = useState(task.title)
  const [desc,     setDesc]    = useState(task.description ?? '')
  const [dueDate,  setDueDate] = useState(task.due_date ?? '')
  const [priority, setPri]     = useState(task.priority)
  const [status,   setStatus]  = useState(task.status)
  const [clientId, setClient]  = useState<string>(task.client_id ?? '__none__')
  const [saving,   setSaving]  = useState(false)

  // Links / referências
  const [links, setLinks] = useState<TaskLink[]>(() => {
    if (!task.task_links) return []
    return Array.isArray(task.task_links) ? task.task_links : []
  })
  const [addingLink,    setAddingLink]    = useState(false)
  const [newLinkLabel,  setNewLinkLabel]  = useState('')
  const [newLinkUrl,    setNewLinkUrl]    = useState('')
  const [newLinkType,   setNewLinkType]   = useState<TaskLink['type']>('link')

  const addLink = () => {
    if (!newLinkUrl.trim()) return
    setLinks(prev => [...prev, {
      id:    nanoid(),
      label: newLinkLabel.trim() || newLinkUrl.trim(),
      url:   newLinkUrl.trim(),
      type:  newLinkType,
    }])
    setNewLinkLabel(''); setNewLinkUrl(''); setNewLinkType('link'); setAddingLink(false)
  }

  const removeLink = (id: string) => setLinks(prev => prev.filter(l => l.id !== id))

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title:       title.trim(),
        description: desc || null,
        due_date:    dueDate || null,
        priority,
        status,
        client_id:   clientId === '__none__' ? null : clientId,
        task_links:  links,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#f8fafc] rounded-xl p-3 mt-2 space-y-3 border border-[#e2e8f0]">
      {/* Título */}
      <div>
        <label className="text-[10px] font-medium text-[#64748b] block mb-1">Título</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full h-8 px-2.5 rounded-lg border border-[#e2e8f0] text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="text-[10px] font-medium text-[#64748b] block mb-1">Descrição</label>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={2}
          className="w-full px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] text-[12px] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-[#64748b] block mb-1">Prazo</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full h-8 px-2 rounded-lg border border-[#e2e8f0] text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-[#64748b] block mb-1">Prioridade</label>
          <select value={priority} onChange={e => setPri(e.target.value)}
            className="w-full h-8 px-2 rounded-lg border border-[#e2e8f0] text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="baixa">Baixa</option>
            <option value="media">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-[#64748b] block mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full h-8 px-2 rounded-lg border border-[#e2e8f0] text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="a_fazer">A fazer</option>
            <option value="em_andamento">Em andamento</option>
            <option value="revisao">Em revisão</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-[#64748b] block mb-1">Cliente</label>
          <select value={clientId} onChange={e => setClient(e.target.value)}
            className="w-full h-8 px-2 rounded-lg border border-[#e2e8f0] text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="__none__">Interno</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
      </div>

      {/* Links / referências */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-medium text-[#64748b]">
            Links e referências {links.length > 0 && `(${links.length})`}
          </label>
          <button
            onClick={() => setAddingLink(a => !a)}
            className="text-[10px] text-violet-600 hover:text-violet-800 flex items-center gap-0.5 font-medium"
          >
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>

        {/* Form de novo link */}
        {addingLink && (
          <div className="bg-white rounded-lg border border-violet-200 p-2 space-y-1.5 mb-2">
            <div className="flex gap-1.5">
              <select
                value={newLinkType}
                onChange={e => setNewLinkType(e.target.value as TaskLink['type'])}
                className="h-7 px-1.5 rounded-md border border-[#e2e8f0] text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 flex-shrink-0"
              >
                {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                value={newLinkLabel}
                onChange={e => setNewLinkLabel(e.target.value)}
                placeholder="Rótulo (opcional)"
                className="flex-1 h-7 px-2 rounded-md border border-[#e2e8f0] text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
            </div>
            <div className="flex gap-1.5">
              <input
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLink()}
                placeholder="https://..."
                className="flex-1 h-7 px-2 rounded-md border border-[#e2e8f0] text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button onClick={addLink}
                className="h-7 px-2 rounded-md bg-violet-600 text-white text-[11px] font-medium hover:bg-violet-700">
                OK
              </button>
              <button onClick={() => setAddingLink(false)}
                className="h-7 px-2 rounded-md border border-[#e2e8f0] text-[11px] text-[#64748b] hover:bg-[#f1f5f9]">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Lista de links */}
        {links.length > 0 && (
          <div className="space-y-1">
            {links.map(link => {
              const Icon = getLinkIcon(link.type)
              return (
                <div key={link.id} className="flex items-center gap-1.5 bg-white rounded-lg border border-[#e2e8f0] px-2 py-1.5 group">
                  <Icon className="w-3 h-3 text-violet-500 flex-shrink-0" />
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 min-w-0 text-[11px] text-[#0f172a] hover:text-violet-700 truncate font-medium">
                    {link.label}
                  </a>
                  <button onClick={() => removeLink(link.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c0c0c0] hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Entrega do colaborador (read-only) */}
      {(task.collaborator_note || task.delivery_url) && (
        <div className="bg-violet-50 rounded-lg p-2 space-y-1">
          <p className="text-[10px] font-semibold text-violet-700 mb-1">Entrega do colaborador</p>
          {task.collaborator_note && (
            <p className="text-[11px] text-violet-800">📝 {task.collaborator_note}</p>
          )}
          {task.delivery_url && (
            <a href={task.delivery_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-violet-700 underline hover:text-violet-900">
              <ExternalLink className="w-3 h-3" /> Ver entrega
            </a>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving || !title.trim()}
          className="flex-1 h-8 rounded-lg bg-violet-600 text-white text-[12px] font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Salvar
        </button>
        <button onClick={onCancel}
          className="flex-1 h-8 rounded-lg border border-[#e2e8f0] text-[12px] text-[#64748b] hover:bg-[#f1f5f9]">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Modal de detalhe do membro ────────────────────────────────────────────────

function MemberDetailModal({
  member,
  allTasks,
  clients,
  onClose,
  onNewTask,
}: {
  member: TeamMember
  allTasks: TeamTask[]
  clients: { id: string; company_name: string }[]
  onClose: () => void
  onNewTask: () => void
}) {
  const { toast } = useToast()
  const updateTask = useUpdateTask()
  const deleteTaskMutation = useDeleteTaskHook()
  const [expandedId, setExpanded] = useState<string | null>(null)
  const [deletingId,  setDeletingId] = useState<string | null>(null)

  // Estado local para atualização otimista (mostra mudanças imediatamente sem esperar refetch)
  const [localTasks, setLocalTasks] = useState<TeamTask[]>(
    () => allTasks.filter(t => t.assignee_id === member.id)
  )

  // Sincroniza quando o React Query recarrega os dados (ex: nova tarefa criada externamente)
  useEffect(() => {
    setLocalTasks(allTasks.filter(t => t.assignee_id === member.id))
  }, [allTasks, member.id])

  const initial = member.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  // Ordena: não concluídas primeiro, depois por prazo
  const sorted = [...localTasks].sort((a, b) => {
    if (a.status === 'concluido' && b.status !== 'concluido') return 1
    if (a.status !== 'concluido' && b.status === 'concluido') return -1
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })

  const handleSaveTask = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      await (updateTask.mutateAsync as any)({ id: taskId, ...updates })
      // Atualização otimista: aplica mudanças localmente antes do refetch
      setLocalTasks(prev => prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              ...(updates as Partial<TeamTask>),
              // Atualiza o objeto clients se client_id mudou
              clients: updates.client_id
                ? (clients.find(c => c.id === updates.client_id)
                    ? { id: updates.client_id as string, company_name: clients.find(c => c.id === updates.client_id)!.company_name }
                    : null)
                : updates.client_id === null ? null : t.clients,
            }
          : t
      ))
      toast('Tarefa atualizada!', 'success')
      setExpanded(null)
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId)
      // Atualização otimista: remove localmente imediatamente
      setLocalTasks(prev => prev.filter(t => t.id !== taskId))
      toast('Demanda removida.', 'success')
      setDeletingId(null)
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const pending   = localTasks.filter(t => t.status !== 'concluido').length
  const concluded = localTasks.filter(t => t.status === 'concluido').length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.2 }}
        className="bg-white h-full w-full max-w-md flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header do membro */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f1f5f9] flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
            style={{ backgroundColor: member.color }}
          >
            {member.avatar_url
              ? <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-full object-cover" />
              : initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[#0f172a] truncate">{member.name}</p>
            <p className="text-[11px] text-[#94a3b8]">{member.role || 'Sem cargo'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onNewTask() }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-semibold hover:bg-violet-700 transition-colors"
            >
              <Plus className="w-3 h-3" /> Demanda
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full hover:bg-[#f1f5f9] flex items-center justify-center"
            >
              <X className="w-4 h-4 text-[#94a3b8]" />
            </button>
          </div>
        </div>

        {/* Contato */}
        {(member.whatsapp || member.email) && (
          <div className="px-5 py-2 border-b border-[#f8fafc] flex gap-4 flex-shrink-0">
            {member.whatsapp && (
              <a href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-[#64748b] hover:text-green-600 transition-colors">
                <Phone className="w-3 h-3" /> {member.whatsapp}
              </a>
            )}
            {member.email && (
              <a href={`mailto:${member.email}`}
                className="flex items-center gap-1.5 text-[11px] text-[#64748b] hover:text-blue-600 transition-colors">
                <Mail className="w-3 h-3" /> {member.email}
              </a>
            )}
          </div>
        )}

        {/* Resumo de tarefas */}
        <div className="px-5 py-2.5 border-b border-[#f8fafc] flex gap-4 flex-shrink-0">
          <span className="text-[11px] text-[#94a3b8]">
            <strong className="text-[#0f172a]">{localTasks.length}</strong> total
          </span>
          <span className="text-[11px] text-amber-600">
            <strong>{pending}</strong> pendente{pending !== 1 ? 's' : ''}
          </span>
          <span className="text-[11px] text-emerald-600">
            <strong>{concluded}</strong> concluída{concluded !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Lista de tarefas */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ClipboardList className="w-9 h-9 text-[#cbd5e1]" />
              <p className="text-[13px] text-[#94a3b8] font-medium">Nenhuma demanda atribuída</p>
              <button
                onClick={() => { onClose(); onNewTask() }}
                className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[12px] font-medium hover:bg-violet-700"
              >
                Criar primeira demanda
              </button>
            </div>
          ) : (
            sorted.map(task => {
              const st  = STATUS_CONFIG[task.status]   ?? STATUS_CONFIG.a_fazer
              const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media
              const overdue = isOverdue(task.due_date, task.status)
              const isExpanded = expandedId === task.id
              const isDeleting = deletingId === task.id

              return (
                <div
                  key={task.id}
                  className={`rounded-xl border transition-all ${
                    task.status === 'concluido'
                      ? 'border-[#e2e8f0] bg-[#fafafa] opacity-70'
                      : 'border-[#e8e8e8] bg-white hover:border-[#d0d0d0]'
                  }`}
                >
                  {/* Linha principal da tarefa */}
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12.5px] font-semibold leading-snug ${
                          task.status === 'concluido' ? 'line-through text-[#94a3b8]' : 'text-[#0f172a]'
                        }`}>
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {/* Status */}
                          <span
                            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ color: st.color, backgroundColor: st.bg }}
                          >
                            {st.label}
                          </span>
                          {/* Prioridade */}
                          <span
                            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ color: pri.color, backgroundColor: `${pri.color}18` }}
                          >
                            {pri.label}
                          </span>
                          {/* Cliente */}
                          {task.clients && (
                            <span className="text-[10px] text-blue-500 truncate max-w-[100px]">
                              {task.clients.company_name}
                            </span>
                          )}
                          {/* Prazo */}
                          {task.due_date && (
                            <span className={`text-[10px] ${overdue ? 'text-red-500 font-medium' : 'text-[#94a3b8]'}`}>
                              {overdue ? '⚠️ ' : '📅 '}{formatDate(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botões ação */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : task.id)}
                          title="Editar"
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            isExpanded ? 'bg-violet-100 text-violet-600' : 'text-[#c0c0c0] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                          }`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeletingId(task.id)}
                          title="Remover"
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#d0d0d0] hover:bg-red-50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Confirmação inline de exclusão */}
                    {isDeleting && (
                      <div className="mt-2 flex items-center gap-2 bg-red-50 rounded-lg px-2.5 py-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="text-[11px] text-red-600 flex-1">Remover esta demanda?</span>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-800 px-1"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-[11px] text-[#64748b] hover:text-[#0f172a] px-1"
                        >
                          Não
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Formulário de edição */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden px-3 pb-3"
                      >
                        <TaskEditPanel
                          task={task}
                          clients={clients}
                          onSave={updates => handleSaveTask(task.id, updates)}
                          onCancel={() => setExpanded(null)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Modal de Membro ───────────────────────────────────────────────────────────

function MemberModal({
  member, onClose,
}: {
  member?: TeamMember
  onClose: () => void
}) {
  const { toast } = useToast()
  const createMember = useCreateTeamMember()
  const updateMember = useUpdateTeamMember()

  const [name,     setName]     = useState(member?.name     ?? '')
  const [role,     setRole]     = useState(member?.role     ?? '')
  const [whatsapp, setWA]       = useState(member?.whatsapp ?? '')
  const [email,    setEmail]    = useState(member?.email    ?? '')
  const [color,    setColor]    = useState(member?.color    ?? COLORS[0])

  const isEdit  = !!member
  const loading = createMember.isPending || updateMember.isPending

  const handleSave = async () => {
    if (!name.trim()) { toast('Nome obrigatório', 'error'); return }
    try {
      if (isEdit) {
        await updateMember.mutateAsync({ id: member!.id, name, role: role || null, whatsapp: whatsapp || null, email: email || null, color })
        toast('Membro atualizado!', 'success')
      } else {
        await createMember.mutateAsync({ name, role: role || null, whatsapp: whatsapp || null, email: email || null, color })
        toast('Membro adicionado!', 'success')
      }
      onClose()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[#0f172a]">
            {isEdit ? 'Editar membro' : 'Novo membro'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[#f1f5f9] flex items-center justify-center">
            <X className="w-4 h-4 text-[#94a3b8]" />
          </button>
        </div>

        {/* Cor */}
        <div>
          <label className="text-[11px] font-medium text-[#64748b] block mb-2">Cor de identificação</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-all"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>

        {/* Campos */}
        <div className="space-y-3">
          {[
            { label: 'Nome *', value: name, set: setName, placeholder: 'Ex: Bia Santos' },
            { label: 'Cargo / Função', value: role, set: setRole, placeholder: 'Ex: Social Media' },
            { label: 'WhatsApp', value: whatsapp, set: setWA, placeholder: '55 87 99999-9999' },
            { label: 'E-mail', value: email, set: setEmail, placeholder: 'bia@email.com' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="text-[11px] font-medium text-[#64748b] block mb-1">{label}</label>
              <input
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
            </div>
          ))}
        </div>

        {/* Botões */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {isEdit ? 'Salvar' : 'Adicionar'}
          </button>
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-[#e2e8f0] text-[13px] text-[#475569] hover:bg-[#f8fafc]">
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Modal: Nova Demanda ───────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'baixa',   label: 'Baixa'   },
  { value: 'media',   label: 'Normal'  },
  { value: 'alta',    label: 'Alta'    },
  { value: 'urgente', label: 'Urgente' },
]
const STATUS_OPTIONS_FORM = [
  { value: 'a_fazer',      label: 'A fazer'      },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'revisao',      label: 'Em revisão'   },
  { value: 'concluido',    label: 'Concluído'    },
]

function NewTaskModal({
  member,
  clients,
  onClose,
}: {
  member: TeamMember
  clients: { id: string; company_name: string }[]
  onClose: () => void
}) {
  const { toast } = useToast()
  const createAndDelegate = useCreateAndDelegateTask()

  const [title,       setTitle]      = useState('')
  const [description, setDesc]       = useState('')
  const [dueDate,     setDueDate]    = useState('')
  const [dueTime,     setDueTime]    = useState('')
  const [priority,    setPriority]   = useState('media')
  const [status,      setStatus]     = useState('a_fazer')
  const [clientId,    setClientId]   = useState<string | null>(null)

  const saving = createAndDelegate.isPending

  const handleSubmit = async () => {
    if (!title.trim()) { toast('Título obrigatório', 'error'); return }
    try {
      await createAndDelegate.mutateAsync({
        title:       title.trim(),
        description: description || null,
        due_date:    dueDate || null,
        due_time:    dueTime || null,
        priority,
        status,
        client_id:   clientId,
        assignee_id: member.id,
        assignee:    member.name,
      })
      toast('Demanda criada e delegada!', 'success')
      onClose()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const initial = member.name[0].toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
              style={{ backgroundColor: member.color }}
            >
              {member.avatar_url
                ? <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-full object-cover" />
                : initial}
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[#0f172a]">Nova demanda</h2>
              <p className="text-[11px] text-[#94a3b8]">Para {member.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[#f1f5f9] flex items-center justify-center">
            <X className="w-4 h-4 text-[#94a3b8]" />
          </button>
        </div>

        {/* Título */}
        <div>
          <label className="text-[11px] font-medium text-[#64748b] block mb-1">Título *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Descreva a demanda..."
            autoFocus
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="text-[11px] font-medium text-[#64748b] block mb-1">Descrição</label>
          <textarea
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Detalhes, referências, observações..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          />
        </div>

        {/* Data + Horário */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Prazo
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1">Horário</label>
            <input
              type="time"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Prioridade + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1 flex items-center gap-1">
              <Flag className="w-3 h-3" /> Prioridade
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-[#e2e8f0] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-[#e2e8f0] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {STATUS_OPTIONS_FORM.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Cliente */}
        <div>
          <label className="text-[11px] font-medium text-[#64748b] block mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Cliente (opcional)
          </label>
          <select
            value={clientId || '__none__'}
            onChange={e => setClientId(e.target.value === '__none__' ? null : e.target.value)}
            className="w-full h-9 px-2 rounded-lg border border-[#e2e8f0] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="__none__">Interno (sem cliente)</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>

        {/* Botões */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Criar demanda
          </button>
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-[#e2e8f0] text-[13px] text-[#475569] hover:bg-[#f8fafc]">
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Card de Membro ────────────────────────────────────────────────────────────

function MemberCard({
  member, taskCount, onEdit, onDelete, onNewTask, onOpenDetail,
}: {
  member: TeamMember
  taskCount: number
  onEdit: () => void
  onDelete: () => void
  onNewTask: () => void
  onOpenDetail: () => void
}) {
  const { toast } = useToast()
  const initial = member.name[0].toUpperCase()

  const copyLink = () => {
    navigator.clipboard.writeText(getPortalUrl(member.portal_token))
    toast('Link copiado!', 'success')
  }

  return (
    <div
      className="rounded-2xl border border-[#e8e8e8] bg-white p-4 flex flex-col gap-3 transition-all cursor-pointer hover:border-violet-300 hover:shadow-md hover:shadow-violet-50 group"
      onClick={onOpenDetail}
    >
      {/* Avatar + info */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
          style={{ backgroundColor: member.color }}
        >
          {member.avatar_url
            ? <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-full object-cover" />
            : initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#0f172a] truncate">{member.name}</p>
          <p className="text-[11px] text-[#94a3b8] truncate">{member.role || 'Sem cargo'}</p>
        </div>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: member.color }}
        >
          {taskCount}
        </span>
      </div>

      {/* Contatos */}
      <div className="flex flex-col gap-1">
        {member.whatsapp && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
            <Phone className="w-3 h-3" />
            <span className="truncate">{member.whatsapp}</span>
          </div>
        )}
        {member.email && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
            <Mail className="w-3 h-3" />
            <span className="truncate">{member.email}</span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-1.5 pt-1 border-t border-[#f1f5f9]" onClick={e => e.stopPropagation()}>
        {/* Nova demanda — botão principal */}
        <button
          onClick={onNewTask}
          title="Nova demanda para este membro"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors font-medium"
        >
          <Plus className="w-3 h-3" /> Demanda
        </button>
        <button
          onClick={copyLink}
          title="Copiar link do portal"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
        >
          <Copy className="w-3 h-3" /> Portal
        </button>
        <a
          href={getPortalUrl(member.portal_token)}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir portal"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
        <button onClick={onEdit} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#64748b] hover:bg-[#f1f5f9] transition-colors">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-red-400 hover:bg-red-50 transition-colors ml-auto">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Card de Tarefa ────────────────────────────────────────────────────────────

function TaskCard({
  task,
  member,
  onEdit,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: TeamTask
  member?: TeamMember
  onEdit?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
}) {
  const [open, setOpen] = useState(false)
  const st  = STATUS_CONFIG[task.status]   ?? STATUS_CONFIG.a_fazer
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl border p-3 space-y-2 transition-all select-none ${
        onDragStart ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        isDragging
          ? 'border-violet-400 shadow-lg opacity-40 scale-95'
          : 'border-[#e8e8e8] hover:border-[#d0d0d0]'
      }`}
    >
      {/* Título + prioridade + editar */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-medium text-[#0f172a] leading-snug line-clamp-2">{task.title}</p>
          {task.clients && (
            <p className="text-[10.5px] text-[#94a3b8] mt-0.5 truncate">🏢 {task.clients.company_name}</p>
          )}
          {!task.clients && (
            <p className="text-[10.5px] text-[#94a3b8] mt-0.5">📌 Interno</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ color: pri.color, backgroundColor: `${pri.color}18` }}
          >
            {pri.label}
          </span>
          {onEdit && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit() }}
              title="Editar demanda"
              className="w-5 h-5 rounded flex items-center justify-center text-[#c0c0c0] hover:text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Status + prazo */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: st.color, backgroundColor: st.bg }}
        >
          {st.label}
        </span>
        {task.due_date && (
          <span className={`text-[10px] font-medium ml-auto ${overdue ? 'text-red-500' : 'text-[#94a3b8]'}`}>
            {overdue ? '⚠️ ' : '📅 '}{formatDate(task.due_date)}
          </span>
        )}
      </div>

      {/* Nota do colaborador */}
      {(task.collaborator_note || task.delivery_url) && (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-[10.5px] text-violet-600 hover:text-violet-800 w-full"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          Ver entrega do colaborador
        </button>
      )}
      {open && (
        <div className="bg-violet-50 rounded-lg p-2 space-y-1 text-[11px]">
          {task.collaborator_note && (
            <p className="text-[#4c1d95]">📝 {task.collaborator_note}</p>
          )}
          {task.delivery_url && (
            <a
              href={task.delivery_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-violet-700 underline hover:text-violet-900"
            >
              <ExternalLink className="w-3 h-3" /> Ver entrega
            </a>
          )}
        </div>
      )}

      {/* Membro responsável (mostrado no board por status) */}
      {member && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#f8f8f8]">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: member.color }}
          >
            {member.name[0].toUpperCase()}
          </div>
          <span className="text-[10px] text-[#94a3b8] truncate">{member.name}</span>
        </div>
      )}
    </div>
  )
}

// ── Modal de edição de tarefa no board ───────────────────────────────────────

function BoardTaskEditModal({
  task,
  clients,
  onClose,
  onSaved,
}: {
  task: TeamTask
  clients: { id: string; company_name: string }[]
  onClose: () => void
  onSaved: (updates: Record<string, unknown>) => Promise<void>
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-[#0f172a]">Editar demanda</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[#f1f5f9] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-[#94a3b8]" />
          </button>
        </div>
        <TaskEditPanel
          task={task}
          clients={clients}
          onSave={onSaved}
          onCancel={onClose}
        />
      </motion.div>
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

type BoardView = 'responsavel' | 'status'

function Board({ tasks, members, clients, filteredMemberId }: {
  tasks: TeamTask[]
  members: TeamMember[]
  clients: { id: string; company_name: string }[]
  filteredMemberId: string | null
}) {
  const { toast } = useToast()
  const [view, setView] = useState<BoardView>('responsavel')
  const [dragTaskId,       setDragTaskId]       = useState<string | null>(null)
  const [dragOverMemberId, setDragOverMemberId] = useState<string | null>(null)
  const [editingTask,      setEditingTask]      = useState<TeamTask | null>(null)
  const delegateTask = useDelegateTask()
  const updateTask   = useUpdateTask()

  const filteredTasks = filteredMemberId
    ? tasks.filter(t => t.assignee_id === filteredMemberId)
    : tasks

  const memberMap = useMemo(() =>
    Object.fromEntries(members.map(m => [m.id, m])), [members])

  // ── Drag-and-drop: mudar responsável ─────────────────────────────────────
  const handleDrop = async (targetMemberId: string) => {
    if (!dragTaskId) return
    const task   = tasks.find(t => t.id === dragTaskId)
    const target = members.find(m => m.id === targetMemberId)
    if (!task || task.assignee_id === targetMemberId) {
      setDragTaskId(null); setDragOverMemberId(null); return
    }
    try {
      // Passa assignee_id (FK) + assignee (nome em texto) — ambos os campos
      // precisam ser atualizados para a aba Tarefas refletir o novo responsável
      await delegateTask.mutateAsync({
        task_id:     dragTaskId,
        assignee_id: targetMemberId,
        assignee:    target?.name ?? null,
      })
      toast(`Demanda transferida para ${target?.name ?? 'membro'}`, 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setDragTaskId(null); setDragOverMemberId(null)
    }
  }

  // ── Edição a partir do board ──────────────────────────────────────────────
  const handleSaveEdit = async (updates: Record<string, unknown>) => {
    if (!editingTask) return
    await (updateTask.mutateAsync as any)({ id: editingTask.id, ...updates })
    toast('Tarefa atualizada!', 'success')
    setEditingTask(null)
  }

  // ── View por responsável ──────────────────────────────────────────────────
  if (view === 'responsavel') {
    const visibleMembers = filteredMemberId
      ? members.filter(m => m.id === filteredMemberId)
      : members

    return (
      <div>
        <ViewTabs view={view} onChange={setView} />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleMembers.map(member => {
            const memberTasks = filteredTasks.filter(t => t.assignee_id === member.id)
            const isDragOver  = dragOverMemberId === member.id && !!dragTaskId

            return (
              <div
                key={member.id}
                className="flex-shrink-0 w-72"
                onDragOver={e => { e.preventDefault(); setDragOverMemberId(member.id) }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverMemberId(null)
                  }
                }}
                onDrop={() => handleDrop(member.id)}
              >
                {/* Cabeçalho da coluna */}
                <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-xl transition-colors ${
                  isDragOver ? 'bg-violet-50 ring-2 ring-violet-200' : ''
                }`}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0f172a] truncate">{member.name}</p>
                    {member.role && (
                      <p className="text-[10px] text-[#94a3b8] truncate">{member.role}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#94a3b8] flex-shrink-0">
                    {memberTasks.length} tarefa{memberTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Zona de drop */}
                <div className={`space-y-2 min-h-[80px] rounded-xl p-1 transition-colors ${
                  isDragOver ? 'bg-violet-50/60' : ''
                }`}>
                  {memberTasks.length === 0 ? (
                    <p className={`text-[11px] text-center py-8 border-2 border-dashed rounded-xl transition-colors ${
                      isDragOver
                        ? 'border-violet-400 text-violet-500 bg-white'
                        : 'border-[#e2e8f0] text-[#94a3b8]'
                    }`}>
                      {isDragOver ? '↓ Soltar aqui' : 'Sem tarefas'}
                    </p>
                  ) : (
                    memberTasks.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onEdit={() => setEditingTask(t)}
                        onDragStart={e => {
                          e.dataTransfer.effectAllowed = 'move'
                          setDragTaskId(t.id)
                        }}
                        onDragEnd={() => {
                          setDragTaskId(null)
                          setDragOverMemberId(null)
                        }}
                        isDragging={dragTaskId === t.id}
                      />
                    ))
                  )}
                  {/* Drop target quando a coluna já tem tarefas */}
                  {isDragOver && memberTasks.length > 0 && (
                    <div className="h-1.5 rounded-full bg-violet-400 mx-1 animate-pulse" />
                  )}
                </div>
              </div>
            )
          })}
          {visibleMembers.length === 0 && (
            <p className="text-[13px] text-[#94a3b8]">Nenhum membro encontrado</p>
          )}
        </div>

        <AnimatePresence>
          {editingTask && (
            <BoardTaskEditModal
              task={editingTask}
              clients={clients}
              onClose={() => setEditingTask(null)}
              onSaved={handleSaveEdit}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── View por status ───────────────────────────────────────────────────────
  const statuses = ['a_fazer', 'em_andamento', 'revisao', 'concluido']
  return (
    <div>
      <ViewTabs view={view} onChange={setView} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map(status => {
          const st      = STATUS_CONFIG[status]
          const stTasks = filteredTasks.filter(t => t.status === status)
          return (
            <div key={status} className="flex-shrink-0 w-64">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                <span className="text-[12px] font-semibold text-[#0f172a]">{st.label}</span>
                <span className="ml-auto text-[10px] text-[#94a3b8]">{stTasks.length}</span>
              </div>
              <div className="space-y-2">
                {stTasks.length === 0
                  ? <p className="text-[11px] text-[#94a3b8] text-center py-6 border border-dashed border-[#e2e8f0] rounded-xl">Vazio</p>
                  : stTasks.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        member={memberMap[t.assignee_id ?? '']}
                        onEdit={() => setEditingTask(t)}
                      />
                    ))}
              </div>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {editingTask && (
          <BoardTaskEditModal
            task={editingTask}
            clients={clients}
            onClose={() => setEditingTask(null)}
            onSaved={handleSaveEdit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ViewTabs({ view, onChange }: { view: BoardView; onChange: (v: BoardView) => void }) {
  return (
    <div className="flex gap-1 bg-[#f1f5f9] p-1 rounded-xl w-fit mb-4">
      {([['responsavel', 'Por responsável'], ['status', 'Por status']] as const).map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
            view === v ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Carga de trabalho ─────────────────────────────────────────────────────────

function WorkloadBar({ member, count, max }: { member: TeamMember; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  const color = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981'

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
        style={{ backgroundColor: member.color }}
      >
        {member.name[0].toUpperCase()}
      </div>
      <span className="text-[12px] text-[#0f172a] w-28 truncate">{member.name}</span>
      <div className="flex-1 h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] text-[#94a3b8] w-16 text-right">
        {count} tarefa{count !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// ── Confirmação de exclusão ───────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }: {
  name: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#0f172a]">Remover membro?</p>
            <p className="text-[12px] text-[#64748b] mt-1">
              <strong>{name}</strong> será removido da equipe. As tarefas delegadas continuarão existindo, mas sem responsável.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="flex-1 h-9 rounded-lg bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600">
            Remover
          </button>
          <button onClick={onCancel} className="flex-1 h-9 rounded-lg border border-[#e2e8f0] text-[13px] text-[#475569] hover:bg-[#f8fafc]">
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type ActiveTab = 'membros' | 'board' | 'carga'

export function TeamPage() {
  const { toast } = useToast()
  const { data: members = [], isLoading: loadingMembers } = useTeamMembers()
  const { data: tasks   = [], isLoading: loadingTasks   } = useTeamTasks()
  const { data: clients = [] } = useClients()
  const deleteMember = useDeleteTeamMember()

  const [tab,              setTab]         = useState<ActiveTab>('membros')
  const [showModal,        setShowModal]   = useState(false)
  const [editingMember,    setEditing]     = useState<TeamMember | undefined>()
  const [deletingMember,   setDeleting]    = useState<TeamMember | undefined>()
  const [filteredMemberId, setFiltered]    = useState<string | null>(null)
  const [newTaskMember,    setNewTaskMember] = useState<TeamMember | undefined>()
  const [detailMember,     setDetailMember] = useState<TeamMember | undefined>()

  const activeMembersWithCount = useMemo(() =>
    members
      .filter(m => m.is_active)
      .map(m => ({
        member: m,
        count:  tasks.filter(t => t.assignee_id === m.id).length,
      })),
    [members, tasks]
  )

  const maxCount = Math.max(...activeMembersWithCount.map(m => m.count), 1)

  const handleDelete = async () => {
    if (!deletingMember) return
    try {
      await deleteMember.mutateAsync(deletingMember.id)
      toast(`${deletingMember.name} removido da equipe`, 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setDeleting(undefined)
    }
  }

  const openEdit = (m: TeamMember) => { setEditing(m); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(undefined) }

  return (
    <div className="min-h-full bg-[#f5f5f7]">
      <Header
        title="Equipe"
        subtitle={`${activeMembersWithCount.length} membro${activeMembersWithCount.length !== 1 ? 's' : ''} · ${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''} delegada${tasks.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => { setEditing(undefined); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f0f0f] text-white text-[12px] font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Novo membro
          </button>
        }
      />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-xl w-fit border border-[#e8e8e8]">
          {([
            ['membros', Users,         'Membros'],
            ['board',   ClipboardList, 'Board de tarefas'],
            ['carga',   AlertCircle,   'Carga de trabalho'],
          ] as const).map(([t, Icon, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                tab === t ? 'bg-[#0f0f0f] text-white' : 'text-[#64748b] hover:text-[#0f0f0f]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Membros ── */}
        {tab === 'membros' && (
          <div>
            {loadingMembers ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#94a3b8]" /></div>
            ) : activeMembersWithCount.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Users className="w-10 h-10 text-[#cbd5e1]" />
                <p className="text-[14px] font-medium text-[#94a3b8]">Nenhum membro ainda</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#0f0f0f] text-white text-[13px] font-medium hover:bg-[#1a1a1a]"
                >
                  Adicionar primeiro membro
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeMembersWithCount.map(({ member, count }) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    taskCount={count}
                    onEdit={() => openEdit(member)}
                    onDelete={() => setDeleting(member)}
                    onNewTask={() => setNewTaskMember(member)}
                    onOpenDetail={() => setDetailMember(member)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Board ── */}
        {tab === 'board' && (
          <div>
            {/* Filtro por membro */}
            {activeMembersWithCount.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                <button
                  onClick={() => setFiltered(null)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                    !filteredMemberId ? 'bg-[#0f0f0f] text-white' : 'bg-white text-[#64748b] border border-[#e8e8e8] hover:border-[#d0d0d0]'
                  }`}
                >
                  Todos
                </button>
                {activeMembersWithCount.map(({ member }) => (
                  <button
                    key={member.id}
                    onClick={() => setFiltered(f => f === member.id ? null : member.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                      filteredMemberId === member.id
                        ? 'text-white'
                        : 'bg-white text-[#64748b] border border-[#e8e8e8] hover:border-[#d0d0d0]'
                    }`}
                    style={filteredMemberId === member.id ? { backgroundColor: member.color } : undefined}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    {member.name}
                  </button>
                ))}
              </div>
            )}

            {loadingTasks ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#94a3b8]" /></div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <ClipboardList className="w-10 h-10 text-[#cbd5e1]" />
                <p className="text-[14px] font-medium text-[#94a3b8]">Nenhuma tarefa delegada</p>
                <p className="text-[12px] text-[#cbd5e1]">Atribua um responsável nas tarefas para elas aparecerem aqui</p>
              </div>
            ) : (
              <Board
                tasks={tasks}
                members={members.filter(m => m.is_active)}
                clients={clients}
                filteredMemberId={filteredMemberId}
              />
            )}
          </div>
        )}

        {/* ── Tab: Carga ── */}
        {tab === 'carga' && (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6">
            <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">Carga de trabalho da equipe</h3>
            {activeMembersWithCount.length === 0 ? (
              <p className="text-[13px] text-[#94a3b8] text-center py-8">Nenhum membro cadastrado</p>
            ) : (
              <div className="space-y-4">
                {activeMembersWithCount
                  .sort((a, b) => b.count - a.count)
                  .map(({ member, count }) => (
                    <WorkloadBar key={member.id} member={member} count={count} max={maxCount} />
                  ))}
                <div className="pt-4 border-t border-[#f1f5f9] flex gap-6 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Tranquilo</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Atenção</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Sobrecarregado</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modais */}
      <AnimatePresence>
        {showModal && <MemberModal member={editingMember} onClose={closeModal} />}
        {deletingMember && (
          <DeleteConfirm
            name={deletingMember.name}
            onConfirm={handleDelete}
            onCancel={() => setDeleting(undefined)}
          />
        )}
        {newTaskMember && (
          <NewTaskModal
            member={newTaskMember}
            clients={clients}
            onClose={() => setNewTaskMember(undefined)}
          />
        )}
        {detailMember && (
          <MemberDetailModal
            member={detailMember}
            allTasks={tasks}
            clients={clients}
            onClose={() => setDetailMember(undefined)}
            onNewTask={() => { setDetailMember(undefined); setNewTaskMember(detailMember) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
