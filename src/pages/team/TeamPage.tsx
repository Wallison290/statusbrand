import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, X, Check, Loader2, Copy, ExternalLink,
  Pencil, Trash2, AlertCircle, Phone, Mail,
  Users, ClipboardList, ChevronDown,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { useToast } from '@/components/ui/toast'
import {
  useTeamMembers, useTeamTasks,
  useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember,
  type TeamMember, type TeamTask,
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

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function isOverdue(date: string | null, status: string) {
  if (!date || status === 'concluido') return false
  return new Date(date) < new Date(new Date().toDateString())
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

// ── Card de Membro ────────────────────────────────────────────────────────────

function MemberCard({
  member, taskCount, onEdit, onDelete, onFilter, isFiltered,
}: {
  member: TeamMember
  taskCount: number
  onEdit: () => void
  onDelete: () => void
  onFilter: () => void
  isFiltered: boolean
}) {
  const { toast } = useToast()
  const initial = member.name[0].toUpperCase()

  const copyLink = () => {
    navigator.clipboard.writeText(getPortalUrl(member.portal_token))
    toast('Link copiado!', 'success')
  }

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all cursor-pointer ${
        isFiltered ? 'border-violet-400 bg-violet-50' : 'border-[#e8e8e8] bg-white hover:border-[#d0d0d0]'
      }`}
      onClick={onFilter}
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

function TaskCard({ task, member }: { task: TeamTask; member?: TeamMember }) {
  const [open, setOpen] = useState(false)
  const st  = STATUS_CONFIG[task.status]   ?? STATUS_CONFIG.a_fazer
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div className="bg-white rounded-xl border border-[#e8e8e8] p-3 space-y-2 hover:border-[#d0d0d0] transition-colors">
      {/* Título + prioridade */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-medium text-[#0f172a] leading-snug line-clamp-2">{task.title}</p>
          {task.clients && (
            <p className="text-[10.5px] text-[#94a3b8] mt-0.5 truncate">🏢 {task.clients.name}</p>
          )}
          {!task.clients && (
            <p className="text-[10.5px] text-[#94a3b8] mt-0.5">📌 Interno</p>
          )}
        </div>
        <span
          className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ color: pri.color, backgroundColor: `${pri.color}18` }}
        >
          {pri.label}
        </span>
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

      {/* Membro responsável (mostrado no board "todos") */}
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

// ── Board ─────────────────────────────────────────────────────────────────────

type BoardView = 'responsavel' | 'status'

function Board({ tasks, members, filteredMemberId }: {
  tasks: TeamTask[]
  members: TeamMember[]
  filteredMemberId: string | null
}) {
  const [view, setView] = useState<BoardView>('responsavel')

  const filteredTasks = filteredMemberId
    ? tasks.filter(t => t.assignee_id === filteredMemberId)
    : tasks

  const memberMap = useMemo(() =>
    Object.fromEntries(members.map(m => [m.id, m])), [members])

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
            return (
              <div key={member.id} className="flex-shrink-0 w-72">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name[0].toUpperCase()}
                  </div>
                  <span className="text-[12px] font-semibold text-[#0f172a]">{member.name}</span>
                  <span className="ml-auto text-[10px] text-[#94a3b8]">{memberTasks.length} tarefa{memberTasks.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {memberTasks.length === 0
                    ? <p className="text-[11px] text-[#94a3b8] text-center py-6 border border-dashed border-[#e2e8f0] rounded-xl">Sem tarefas</p>
                    : memberTasks.map(t => <TaskCard key={t.id} task={t} />)}
                </div>
              </div>
            )
          })}
          {visibleMembers.length === 0 && (
            <p className="text-[13px] text-[#94a3b8]">Nenhum membro encontrado</p>
          )}
        </div>
      </div>
    )
  }

  // View por status
  const statuses = ['a_fazer', 'em_andamento', 'revisao', 'concluido']
  return (
    <div>
      <ViewTabs view={view} onChange={setView} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map(status => {
          const st    = STATUS_CONFIG[status]
          const stTasks = filteredTasks.filter(t => t.status === status)
          return (
            <div key={status} className="flex-shrink-0 w-64">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: st.color }}
                />
                <span className="text-[12px] font-semibold text-[#0f172a]">{st.label}</span>
                <span className="ml-auto text-[10px] text-[#94a3b8]">{stTasks.length}</span>
              </div>
              <div className="space-y-2">
                {stTasks.length === 0
                  ? <p className="text-[11px] text-[#94a3b8] text-center py-6 border border-dashed border-[#e2e8f0] rounded-xl">Vazio</p>
                  : stTasks.map(t => <TaskCard key={t.id} task={t} member={memberMap[t.assignee_id ?? '']} />)}
              </div>
            </div>
          )
        })}
      </div>
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
  const deleteMember = useDeleteTeamMember()

  const [tab,              setTab]         = useState<ActiveTab>('membros')
  const [showModal,        setShowModal]   = useState(false)
  const [editingMember,    setEditing]     = useState<TeamMember | undefined>()
  const [deletingMember,   setDeleting]    = useState<TeamMember | undefined>()
  const [filteredMemberId, setFiltered]    = useState<string | null>(null)

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
                    onFilter={() => setFiltered(f => f === member.id ? null : member.id)}
                    isFiltered={filteredMemberId === member.id}
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
      </AnimatePresence>
    </div>
  )
}
