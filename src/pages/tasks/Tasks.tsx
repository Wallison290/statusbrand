import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, Trash2,
  User, CalendarDays, AlertCircle, LayoutList, Clock, Pencil,
  ExternalLink, Link2, FileText, Folder, CheckCircle2,
} from 'lucide-react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, addWeeks, subWeeks, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useClients } from '@/hooks/useClients'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { formatDate, isOverdue } from '@/utils/formatters'
import type { Task, TaskStatus, TaskPriority } from '@/types'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<TaskStatus, { label: string; bg: string; text: string; dot: string }> = {
  a_fazer:      { label: 'A fazer',      bg: 'bg-[#f0f0f0]',  text: 'text-[#737373]',   dot: 'bg-[#c0c0c0]'   },
  em_andamento: { label: 'Em andamento', bg: 'bg-blue-50',    text: 'text-blue-900',    dot: 'bg-blue-400'    },
  revisao:      { label: 'Revisão',      bg: 'bg-amber-50',   text: 'text-amber-900',   dot: 'bg-amber-400'   },
  concluido:    { label: 'Concluído',    bg: 'bg-emerald-50', text: 'text-emerald-900', dot: 'bg-emerald-400' },
}

const PRIORITY_CFG: Record<TaskPriority, {
  label: string
  color: string
  borderClass: string
  pillBg: string
  pillText: string
}> = {
  baixa:   { label: 'Baixa',   color: '#9ca3af', borderClass: 'border-l-[#d1d5db]', pillBg: 'bg-[#f3f4f6]', pillText: 'text-[#6b7280]' },
  media:   { label: 'Média',   color: '#3b82f6', borderClass: 'border-l-blue-300',  pillBg: 'bg-blue-50',   pillText: 'text-blue-700'  },
  alta:    { label: 'Alta',    color: '#f59e0b', borderClass: 'border-l-amber-400', pillBg: 'bg-amber-50',  pillText: 'text-amber-700' },
  urgente: { label: 'Urgente', color: '#ef4444', borderClass: 'border-l-red-400',   pillBg: 'bg-red-50',    pillText: 'text-red-700'   },
}

// ─── Status pill with inline dropdown ────────────────────────────────────────

function StatusPill({
  status, onChange,
}: {
  status: TaskStatus
  onChange: (s: TaskStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CFG[status]

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer hover:opacity-80 transition-opacity ${cfg.bg} ${cfg.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full mb-1.5 left-0 z-20 w-36 bg-white border border-[#e8e8e8] rounded-xl shadow-xl overflow-hidden py-1"
            >
              {(Object.entries(STATUS_CFG) as [TaskStatus, typeof STATUS_CFG[TaskStatus]][]).map(([s, c]) => (
                <button
                  key={s}
                  onClick={e => { e.stopPropagation(); onChange(s); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#f5f5f5] transition-colors text-left ${s === status ? 'font-bold' : ''}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className={c.text}>{c.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Priority accent colors ───────────────────────────────────────────────────

const PRIORITY_ACCENT: Record<TaskPriority, string> = {
  urgente: '#ef4444',
  alta:    '#f59e0b',
  media:   '#3b82f6',
  baixa:   '#d1d5db',
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onEdit,
  onView,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task
  onStatusChange: (id: string, s: TaskStatus) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  onView: (task: Task) => void
  dragging: boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
}) {
  const dragStarted = useRef(false)

  const overdueAndOpen = task.due_date
    ? isOverdue(task.due_date) && task.status !== 'concluido'
    : false

  const clientName = (task.client as any)?.company_name
  const priCfg  = PRIORITY_CFG[task.priority]
  const accent  = overdueAndOpen ? '#ef4444' : PRIORITY_ACCENT[task.priority]

  const timeClient = [
    task.due_time ? task.due_time.slice(0, 5) : null,
    clientName || null,
  ].filter(Boolean).join(' · ')

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        dragStarted.current = true
        e.dataTransfer.setData('taskId', task.id)
        onDragStart(task.id)
      }}
      onDragEnd={() => {
        setTimeout(() => { dragStarted.current = false }, 50)
        onDragEnd()
      }}
      onClick={() => { if (!dragStarted.current) onView(task) }}
      className={[
        'relative w-full text-left rounded-xl border border-[#e2e8f0] bg-white',
        'hover:bg-[#f8fafc] hover:border-[#d0d8e8] transition-all overflow-hidden shadow-sm',
        'cursor-pointer select-none group',
        dragging ? 'opacity-40' : '',
      ].join(' ')}
    >
      <div className="flex">
        {/* Left accent bar — same pattern as Planner */}
        <div
          className="w-[4px] flex-shrink-0 rounded-l-xl"
          style={{ backgroundColor: accent }}
        />

        {/* Card content */}
        <div className="flex-1 min-w-0 p-3">

          {/* Time + client (muted row) */}
          {timeClient && (
            <p className="text-[10px] text-[#9ca3af] mb-1 font-medium tracking-wide">
              {timeClient}
            </p>
          )}

          {/* Title */}
          <p className="text-[12px] font-semibold text-[#0f0f0f] leading-snug mb-2 line-clamp-2">
            {task.title}
          </p>

          {/* Description */}
          {task.description && (
            <p className="text-[11px] text-[#9ca3af] line-clamp-2 leading-relaxed mb-2">
              {task.description}
            </p>
          )}

          {/* Bottom row: priority + assignee + status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md flex-shrink-0 ${priCfg.pillBg} ${priCfg.pillText}`}>
              {priCfg.label}
            </span>
            {task.assignee && (
              <span className="text-[10px] text-[#9ca3af] truncate flex-1 min-w-0">
                {task.assignee}
              </span>
            )}
            <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
              <StatusPill status={task.status} onChange={s => onStatusChange(task.id, s)} />
            </div>
          </div>

          {/* Overdue row */}
          {overdueAndOpen && (
            <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-red-50">
              <AlertCircle className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
              <span className="text-[9px] text-red-500 font-bold">
                {task.due_date ? formatDate(task.due_date) : 'Atrasada'}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons — top-right, visible on hover */}
        <div
          className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(task)}
            className="w-5 h-5 flex items-center justify-center rounded-md text-[#c0c0c0] hover:text-[#374151] hover:bg-white/90 transition-colors"
            title="Editar"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="w-5 h-5 flex items-center justify-center rounded-md text-[#c0c0c0] hover:text-red-400 hover:bg-white/90 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day column ───────────────────────────────────────────────────────────────

function DayColumn({
  day, tasks, draggingId, isLast,
  onDrop, onDragStart, onDragEnd,
  onStatusChange, onDelete, onEdit, onView, onAddTask,
}: {
  day: Date
  tasks: Task[]
  draggingId: string | null
  isLast: boolean
  onDrop: (taskId: string, day: Date) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onStatusChange: (id: string, s: TaskStatus) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  onView: (task: Task) => void
  onAddTask: (day: Date) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const today     = isToday(day)
  const dayOfWeek = day.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  // "Quarta" — capitalize first word only
  const fullLabel = format(day, 'EEEE', { locale: ptBR })
  const dayName   = fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1).split('-')[0]
  const dayNum    = format(day, 'd')
  const monthAbbr = format(day, 'MMM', { locale: ptBR })

  return (
    <div
      className={`flex-shrink-0 w-[252px] px-3 transition-colors duration-100 ${
        !isLast ? 'border-r border-[#e8edf5]' : ''
      } ${isDragOver ? 'bg-blue-50/30' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
      }}
      onDrop={e => {
        e.preventDefault()
        setIsDragOver(false)
        const id = e.dataTransfer.getData('taskId')
        if (id) onDrop(id, day)
      }}
    >
      {/* Column header — Planner style */}
      <div className="flex items-start justify-between pb-3 mb-3 border-b border-[#f0f4f8]">
        <div>
          <div className="flex items-center gap-1.5">
            <p className={`text-[13px] font-bold ${isWeekend ? 'text-[#9ca3af]' : 'text-[#0f0f0f]'}`}>
              {dayName}
            </p>
            {today && (
              <span className="text-[9px] font-black px-1.5 py-0.5 bg-[#0f0f0f] text-white rounded-full uppercase tracking-wide">
                Hoje
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#9ca3af] mt-0.5 capitalize">
            {dayNum} {monthAbbr}
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          {tasks.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#f0f4f8] text-[#6b7280] tabular-nums">
              {tasks.length}
            </span>
          )}
          <button
            onClick={() => onAddTask(day)}
            className="w-5 h-5 rounded-full bg-[#f0f4f8] hover:bg-[#e2e8f0] text-[#9ca3af] hover:text-[#374151] flex items-center justify-center transition-colors"
            title={`Nova tarefa — ${format(day, 'dd/MM')}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2 min-h-[420px]">
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.14 }}
            >
              <TaskCard
                task={task}
                dragging={draggingId === task.id}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onEdit={onEdit}
                onView={onView}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && !isDragOver && (
          <button
            onClick={() => onAddTask(day)}
            className="w-full text-center py-5 text-[11px] text-[#d1d5db] hover:text-[#94a3b8] transition-colors"
          >
            + Adicionar tarefa
          </button>
        )}

        {isDragOver && (
          <div className="h-14 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 flex items-center justify-center">
            <p className="text-[11px] text-blue-500 font-semibold">Soltar aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── No-date section ──────────────────────────────────────────────────────────

function NoDateSection({
  tasks, draggingId,
  onStatusChange, onDelete, onEdit, onView, onDragStart, onDragEnd,
}: {
  tasks: Task[]
  draggingId: string | null
  onStatusChange: (id: string, s: TaskStatus) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  onView: (task: Task) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
}) {
  const [open, setOpen] = useState(true)
  if (tasks.length === 0) return null

  return (
    <div className="mt-5 pt-4 border-t border-[#e8edf5] flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 group"
      >
        <LayoutList className="w-3.5 h-3.5 text-[#9ca3af]" />
        <p className="text-[13px] font-bold text-[#4b5563] group-hover:text-[#0f0f0f] transition-colors">
          Sem data definida
        </p>
        <span className="text-[10px] font-bold text-[#9ca3af] bg-[#f3f4f6] px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
        <ChevronLeft className={`w-3 h-3 text-[#c0c0c0] transition-transform ${open ? '-rotate-90' : 'rotate-0'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {tasks.map(task => (
                <div key={task.id} className="flex-shrink-0 w-[252px]">
                  <TaskCard
                    task={task}
                    dragging={draggingId === task.id}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onView={onView}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Task view modal ──────────────────────────────────────────────────────────

function TaskViewModal({
  task, members, open, onClose, onEdit, onDelete,
}: {
  task:     Task | null
  members:  { id: string; name: string; color: string }[]
  open:     boolean
  onClose:  () => void
  onEdit:   (t: Task) => void
  onDelete: (id: string) => void
}) {
  if (!task) return null

  const pCfg    = PRIORITY_CFG[task.priority]
  const sCfg    = STATUS_CFG[task.status]
  const member  = members.find(m => m.id === (task as any).assignee_id)
  const overdue = isOverdue(task.due_date) && task.status !== 'concluido'
  const clientName = (task.client as any)?.company_name
  const links: { id: string; label: string; url: string; type: string }[] =
    Array.isArray((task as any).task_links) ? (task as any).task_links : []

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="pr-6">
            <DialogTitle className="text-[16px] font-semibold text-[#0f0f0f] leading-snug">
              {task.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1 overflow-y-auto max-h-[60vh] pr-1">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold`}
              style={{ color: pCfg.color, backgroundColor: `${pCfg.color}18` }}>
              {task.priority === 'urgente' && <AlertCircle className="w-3 h-3" />}
              {pCfg.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${sCfg.bg} ${sCfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
              {sCfg.label}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                ⚠ Atrasada
              </span>
            )}
            {clientName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                {clientName}
              </span>
            )}
          </div>

          {/* Descrição */}
          {task.description && (
            <div className="bg-[#f8fafc] rounded-xl p-3.5 border border-[#e8e8e8]">
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Descrição</p>
              <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Grid: prazo + responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f8fafc] rounded-xl p-3 border border-[#e8e8e8]">
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Prazo
              </p>
              {task.due_date ? (
                <>
                  <p className={`text-[13px] font-medium ${overdue ? 'text-red-600' : 'text-[#0f0f0f]'}`}>
                    {format(new Date(task.due_date + 'T00:00:00'), "d 'de' MMMM yyyy", { locale: ptBR })}
                  </p>
                  {task.due_time && (
                    <p className="text-[12px] text-[#64748b] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {task.due_time.slice(0, 5)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[#94a3b8]">Sem prazo</p>
              )}
            </div>
            <div className="bg-[#f8fafc] rounded-xl p-3 border border-[#e8e8e8]">
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" /> Responsável
              </p>
              {member ? (
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ backgroundColor: member.color }}>
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[13px] font-medium text-[#0f0f0f]">{member.name}</span>
                </div>
              ) : task.assignee ? (
                <p className="text-[13px] text-[#374151]">{task.assignee}</p>
              ) : (
                <p className="text-[13px] text-[#94a3b8]">Sem responsável</p>
              )}
            </div>
          </div>

          {/* Referências / links */}
          {links.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
                Referências ({links.length})
              </p>
              <div className="space-y-2">
                {links.map(link => {
                  if (link.type === 'imagem') {
                    return (
                      <div key={link.id} className="rounded-xl overflow-hidden border border-[#e2e8f0]">
                        <img src={link.url} alt={link.label} className="w-full max-h-48 object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <div className="flex items-center justify-between px-3 py-2 bg-white">
                          <span className="text-[11px] font-medium text-[#334155] truncate flex-1">{link.label}</span>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[#94a3b8] hover:text-[#0f0f0f] ml-2">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )
                  }
                  const iconMap: Record<string, typeof Link2> = { link: Link2, arquivo: FileText, pasta: Folder }
                  const Icon = iconMap[link.type] ?? Link2
                  return (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#e2e8f0] hover:border-blue-300 hover:bg-blue-50/50 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#334155] truncate group-hover:text-blue-700">{link.label}</p>
                        <p className="text-[10px] text-[#94a3b8] truncate">{link.url}</p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-[#c0c0c0] group-hover:text-blue-400 flex-shrink-0" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Entrega do colaborador */}
          {((task as any).collaborator_note || (task as any).delivery_url) && (
            <div className="bg-violet-50 rounded-xl p-3.5 border border-violet-100 space-y-1.5">
              <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">Entrega do colaborador</p>
              {(task as any).collaborator_note && (
                <p className="text-[12px] text-violet-800 leading-relaxed">📝 {(task as any).collaborator_note}</p>
              )}
              {(task as any).delivery_url && (
                <a href={(task as any).delivery_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-violet-600 hover:text-violet-800 font-medium">
                  <ExternalLink className="w-3 h-3" /> Ver entrega enviada
                </a>
              )}
            </div>
          )}

          {/* Criada em */}
          <p className="text-[11px] text-[#94a3b8]">
            Criada em {format(new Date(task.created_at), "d 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        <DialogFooter className="gap-2 border-t border-[#f1f5f9] pt-3">
          <Button variant="outline" size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={() => { onClose(); onDelete(task.id) }}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          <Button size="sm" onClick={() => { onClose(); onEdit(task) }}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Task dialog (create + edit) ──────────────────────────────────────────────

const blankForm = {
  title:        '',
  description:  '',
  due_date:     '',
  due_time:     '',
  priority:     'media' as TaskPriority,
  status:       'a_fazer' as TaskStatus,
  assignee:     '',
  assignee_id:  null as string | null,
  client_id:    null as string | null,
}

type TaskForm = typeof blankForm

function TaskDialog({
  open, onClose, prefillDate, clients, members, editingTask, onCreate, onUpdate,
}: {
  open: boolean
  onClose: () => void
  prefillDate: string
  clients: { id: string; company_name: string }[]
  members: { id: string; name: string; color: string }[]
  editingTask: Task | null
  onCreate: (form: TaskForm) => Promise<void>
  onUpdate: (id: string, form: TaskForm) => Promise<void>
}) {
  const [form, setForm] = useState<TaskForm>(blankForm)
  const [saving, setSaving] = useState(false)
  const isEdit = !!editingTask

  const set = (k: keyof TaskForm, v: unknown) =>
    setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (editingTask) {
      setForm({
        title:        editingTask.title,
        description:  editingTask.description || '',
        due_date:     editingTask.due_date    || '',
        due_time:     editingTask.due_time    || '',
        priority:     editingTask.priority,
        status:       editingTask.status,
        assignee:     editingTask.assignee    || '',
        assignee_id:  (editingTask as any).assignee_id || null,
        client_id:    editingTask.client_id,
      })
    } else {
      setForm({ ...blankForm, due_date: prefillDate })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTask?.id])

  const handleClose = () => {
    onClose()
    setForm(blankForm)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (isEdit && editingTask) {
        await onUpdate(editingTask.id, form)
      } else {
        await onCreate(form)
      }
      setForm(blankForm)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <Input
            label="Título *"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Descrição da tarefa..."
          />

          <Textarea
            label="Descrição"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={2}
            placeholder="Detalhes opcionais..."
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Prioridade
              </label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Status
              </label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_fazer">A fazer</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="revisao">Revisão</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data"
              type="date"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
            />
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Horário
              </label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c0c0c0] pointer-events-none" />
                <input
                  type="time"
                  value={form.due_time}
                  onChange={e => set('due_time', e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#e0e0e0] bg-white text-[13px] text-[#0f0f0f] focus:outline-none focus:border-[#b0b0b0] tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Responsável
              </label>
              <Select
                value={form.assignee_id || '__none__'}
                onValueChange={v => {
                  if (v === '__none__') {
                    set('assignee_id', null)
                    set('assignee', '')
                  } else {
                    const m = members.find(m => m.id === v)
                    set('assignee_id', v)
                    set('assignee', m?.name || '')
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: m.color }}
                        />
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Cliente (opcional)
              </label>
              <Select
                value={form.client_id || '__none__'}
                onValueChange={v => set('client_id', v === '__none__' ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cliente</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || !form.title.trim()}
          >
            {saving
              ? (isEdit ? 'Salvando...' : 'Criando...')
              : (isEdit ? 'Salvar alterações' : 'Criar tarefa')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Tasks() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()
  const { data: clients = [] } = useClients()
  const { data: allMembers = [] } = useTeamMembers()
  const activeMembers = allMembers.filter(m => m.is_active)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { toast } = useToast()

  // Week navigation
  const [weekBase, setWeekBase] = useState(() => new Date())
  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(weekBase,   { weekStartsOn: 1 })
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [prefillDate, setPrefillDate] = useState('')

  // View modal state
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const handleViewTask = (task: Task) => setViewingTask(task)

  const weekLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} – ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`

  // Metrics
  const doneCount       = tasks.filter(t => t.status === 'concluido').length
  const inProgressCount = tasks.filter(t => t.status === 'em_andamento').length
  const overdueCount    = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'concluido').length
  const progressPct     = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  // Tasks by day — sorted by due_time (nulls last)
  const tasksByDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return tasks
      .filter(t => t.due_date?.startsWith(dayStr))
      .sort((a, b) => {
        if (!a.due_time && !b.due_time) return 0
        if (!a.due_time) return 1
        if (!b.due_time) return -1
        return a.due_time.localeCompare(b.due_time)
      })
  }

  const tasksWithoutDate = tasks.filter(t => !t.due_date)

  // Drag and drop
  const handleDropOnDay = async (taskId: string, day: Date) => {
    const task = tasks.find(t => t.id === taskId)
    const dateStr = format(day, 'yyyy-MM-dd')
    if (!task || task.due_date?.startsWith(dateStr)) return
    try {
      await updateTask.mutateAsync({ id: taskId, due_date: dateStr })
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: taskId, status })
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId)
      toast('Tarefa removida.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleAddTask = (day: Date) => {
    setEditingTask(null)
    setPrefillDate(format(day, 'yyyy-MM-dd'))
    setDialogOpen(true)
  }

  const handleNewTask = () => {
    setEditingTask(null)
    setPrefillDate('')
    setDialogOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleCreate = async (form: TaskForm) => {
    if (!form.title.trim() || !user) return
    try {
      await (createTask.mutateAsync as any)({
        user_id:     user.id,
        title:       form.title.trim(),
        description: form.description || null,
        due_date:    form.due_date || null,
        due_time:    form.due_time || null,
        priority:    form.priority,
        status:      form.status,
        assignee:    form.assignee || null,
        assignee_id: form.assignee_id || null,
        client_id:   form.client_id || null,
      })
      toast('Tarefa criada!', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
      throw err
    }
  }

  const handleUpdate = async (taskId: string, form: TaskForm) => {
    try {
      await updateTask.mutateAsync({
        id:          taskId,
        title:       form.title.trim(),
        description: form.description || null,
        due_date:    form.due_date || null,
        due_time:    form.due_time || null,
        priority:    form.priority,
        status:      form.status,
        assignee:    form.assignee || null,
        ...(form.assignee_id !== undefined && { assignee_id: form.assignee_id } as any),
        client_id:   form.client_id || null,
      })
      toast('Tarefa atualizada!', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
      throw err
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f5f7fb]">
      <Header
        title="Tarefas"
        subtitle="Calendário semanal"
        dark={false}
        action={
          <button
            onClick={handleNewTask}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all hover:opacity-85 active:scale-95 shadow-sm"
            style={{ background: '#0f0f0f', color: '#ffffff' }}
          >
            <Plus className="w-3.5 h-3.5" /> Nova tarefa
          </button>
        }
      />

      <div className="p-4 md:p-6 flex-1 overflow-hidden flex flex-col min-h-0">

        {/* ── Week navigation + metrics ───────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5 flex-shrink-0 flex-wrap">

          {/* Week nav pill */}
          <div className="flex items-center bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setWeekBase(d => subWeeks(d, 1))}
              className="w-8 h-8 flex items-center justify-center text-[#9ca3af] hover:text-[#0f0f0f] hover:bg-[#f5f7fb] transition-all border-r border-[#f0f4f8]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-4">
              <CalendarDays className="w-3.5 h-3.5 text-[#9ca3af]" />
              <span className="text-[13px] font-bold text-[#0f0f0f] capitalize whitespace-nowrap">
                {weekLabel}
              </span>
            </div>
            <button
              onClick={() => setWeekBase(d => addWeeks(d, 1))}
              className="w-8 h-8 flex items-center justify-center text-[#9ca3af] hover:text-[#0f0f0f] hover:bg-[#f5f7fb] transition-all border-l border-[#f0f4f8]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!days.some(d => isToday(d)) && (
            <button
              onClick={() => setWeekBase(new Date())}
              className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-[#e2e8f0] bg-white text-[#374151] hover:border-[#0f0f0f] hover:text-[#0f0f0f] transition-colors shadow-sm"
            >
              Hoje
            </button>
          )}

          {/* Metrics */}
          <div className="ml-auto flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-[12px]">
              <span className="text-[#6b7280]">
                <span className="font-bold text-[#0f0f0f]">{tasks.length}</span>
                {' '}tarefa{tasks.length !== 1 ? 's' : ''}
              </span>

              {inProgressCount > 0 && (
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  {inProgressCount} em andamento
                </span>
              )}

              {doneCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {doneCount} concluída{doneCount !== 1 ? 's' : ''}
                </span>
              )}

              {overdueCount > 0 && (
                <span className="flex items-center gap-1 text-red-500 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {overdueCount} atrasada{overdueCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {tasks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-[#e8edf3] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 tabular-nums">
                  {progressPct}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Weekly columns ──────────────────────────────────────────────── */}
        <div className="overflow-x-auto flex-1 min-h-0">
          <div className="flex h-full" style={{ minWidth: `${7 * 252}px` }}>
            {days.map((day, di) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                tasks={tasksByDay(day)}
                draggingId={draggingId}
                isLast={di === 6}
                onDrop={handleDropOnDay}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onEdit={handleEditTask}
                onView={handleViewTask}
                onAddTask={handleAddTask}
              />
            ))}
          </div>
        </div>

        {/* ── Tasks without date ──────────────────────────────────────────── */}
        <NoDateSection
          tasks={tasksWithoutDate}
          draggingId={draggingId}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEdit={handleEditTask}
          onView={handleViewTask}
          onDragStart={setDraggingId}
          onDragEnd={() => setDraggingId(null)}
        />
      </div>

      {/* Unified create/edit dialog */}
      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(null) }}
        prefillDate={prefillDate}
        clients={clients}
        members={activeMembers}
        editingTask={editingTask}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      {/* Task view modal */}
      <TaskViewModal
        task={viewingTask}
        members={activeMembers}
        open={!!viewingTask}
        onClose={() => setViewingTask(null)}
        onEdit={task => { setViewingTask(null); handleEditTask(task) }}
        onDelete={id => { setViewingTask(null); handleDelete(id) }}
      />
    </div>
  )
}
