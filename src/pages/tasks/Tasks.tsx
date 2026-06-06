import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, Trash2,
  User, CalendarDays, AlertCircle, Clock, Pencil,
  ExternalLink, Link2, FileText, Folder, CheckCircle2,
  MoreHorizontal, LayoutGrid, List, Calendar, Filter,
  AlignLeft, ClipboardList, ArrowUpDown,
} from 'lucide-react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, addWeeks, subWeeks, isToday,
  startOfMonth, getDaysInMonth, getDay, addMonths, subMonths,
  isSameDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import { isOverdue } from '@/utils/formatters'
import type { Task, TaskStatus, TaskPriority } from '@/types'

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<TaskStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  a_fazer:      { label: 'A fazer',      bg: 'bg-[#f3f4f6]',   text: 'text-[#6b7280]',   dot: 'bg-[#9ca3af]',   border: 'border-[#e5e7eb]'   },
  em_andamento: { label: 'Em andamento', bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200'    },
  revisao:      { label: 'Revisão',      bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200'   },
  concluido:    { label: 'Concluído',    bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
}

// ─── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string; pillBg: string; pillText: string; accent: string }> = {
  baixa:   { label: 'Baixa',   color: '#475569', pillBg: 'bg-[#475569]', pillText: 'text-white', accent: '#64748b' },
  media:   { label: 'Média',   color: '#7c3aed', pillBg: 'bg-[#7c3aed]', pillText: 'text-white', accent: '#8b5cf6' },
  alta:    { label: 'Alta',    color: '#ea580c', pillBg: 'bg-[#ea580c]', pillText: 'text-white', accent: '#f59e0b' },
  urgente: { label: 'Urgente', color: '#dc2626', pillBg: 'bg-[#dc2626]', pillText: 'text-white', accent: '#ef4444' },
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 }

// ─── Donut chart ───────────────────────────────────────────────────────────────

function DonutProgress({ percent }: { percent: number }) {
  const r    = 15
  const circ = 2 * Math.PI * r
  const dash = (percent / 100) * circ
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" className="flex-shrink-0">
      <circle cx="21" cy="21" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle cx="21" cy="21" r={r} fill="none" stroke="#8b5cf6" strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 21 21)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
    </svg>
  )
}

// ─── Mini calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ weekStart }: { weekStart: Date }) {
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const firstDay  = startOfMonth(viewMonth)
  const totalDays = getDaysInMonth(viewMonth)
  const startDow  = getDay(firstDay)
  const offset    = startDow === 0 ? 6 : startDow - 1

  const days: (Date | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= totalDays; d++)
    days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
  while (days.length % 7 !== 0) days.push(null)

  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000)

  return (
    <div className="w-[180px] flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="w-5 h-5 rounded flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#1e293b]">
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-[11px] font-bold text-[#CBD5E1] capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="w-5 h-5 rounded flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#1e293b]">
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <div key={i} className="text-[9px] font-bold text-[#64748b] text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((date, i) => {
          if (!date) return <div key={i} />
          const isT   = isToday(date)
          const inWk  = date >= weekStart && date < weekEnd
          return (
            <div key={i} className={[
              'text-[10px] h-5 w-5 mx-auto flex items-center justify-center rounded-full font-medium',
              isT ? 'bg-[#2563EB] text-white font-bold' : inWk ? 'bg-[#2563EB]/20 text-[#60A5FA]' : 'text-[#94a3b8]',
            ].join(' ')}>
              {format(date, 'd')}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status, onChange }: { status: TaskStatus; onChange: (s: TaskStatus) => void }) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CFG[status]
  return (
    <div className="relative flex-shrink-0">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full mb-1.5 left-0 z-20 w-40 bg-[#182233] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden py-1.5">
              {(Object.entries(STATUS_CFG) as [TaskStatus, typeof STATUS_CFG[TaskStatus]][]).map(([s, c]) => (
                <button key={s} onClick={e => { e.stopPropagation(); onChange(s); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#1e293b] text-left ${s === status ? 'font-semibold' : ''}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className="text-[#CBD5E1]">{c.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function AvatarCircle({ name }: { name: string }) {
  const palette  = ['bg-blue-400','bg-violet-400','bg-emerald-400','bg-amber-400','bg-pink-400','bg-indigo-400','bg-cyan-400','bg-orange-400']
  const hash     = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${palette[hash % palette.length]}`}>
      {initials}
    </span>
  )
}

// ─── More menu ────────────────────────────────────────────────────────────────

function MoreMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-shrink-0">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }} transition={{ duration: 0.1 }}
              className="absolute right-0 bottom-full mb-1 z-20 w-32 bg-[#182233] rounded-xl border border-[#1e293b] shadow-xl overflow-hidden py-1">
              <button onClick={e => { e.stopPropagation(); onEdit(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#CBD5E1] hover:bg-[#1e293b]">
                <Pencil className="w-3 h-3" /> Editar
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#f87171] hover:bg-[#ef4444]/10">
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, onStatusChange, onDelete, onEdit, onView, dragging, onDragStart, onDragEnd,
}: {
  task: Task; onStatusChange: (id: string, s: TaskStatus) => void
  onDelete: (id: string) => void; onEdit: (task: Task) => void; onView: (task: Task) => void
  dragging: boolean; onDragStart: (id: string) => void; onDragEnd: () => void
}) {
  const dragStarted    = useRef(false)
  const overdueAndOpen = task.due_date ? isOverdue(task.due_date) && task.status !== 'concluido' : false
  const clientName     = (task.client as any)?.company_name
  const priCfg         = PRIORITY_CFG[task.priority]

  return (
    <div draggable
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        dragStarted.current = true; e.dataTransfer.setData('taskId', task.id); onDragStart(task.id)
      }}
      onDragEnd={() => { setTimeout(() => { dragStarted.current = false }, 50); onDragEnd() }}
      onClick={() => { if (!dragStarted.current) onView(task) }}
      className={['w-full min-w-0 bg-white rounded-xl p-2.5 shadow-sm border border-gray-100',
        'cursor-pointer hover:shadow-md transition-all duration-150 select-none',
        dragging ? 'opacity-40 scale-95' : ''].join(' ')}
      style={{ borderLeftWidth: 4, borderLeftColor: priCfg.accent }}>
      {(task.due_time || overdueAndOpen) && (
        <div className="flex items-center gap-1 mb-1.5">
          <Clock className={`w-3 h-3 flex-shrink-0 ${overdueAndOpen ? 'text-red-400' : 'text-gray-400'}`} />
          <span className={`text-[11px] font-medium ${overdueAndOpen ? 'text-red-500' : 'text-gray-500'}`}>
            {task.due_time ? task.due_time.slice(0, 5) : ''}
            {overdueAndOpen && <span className="ml-1">· Atrasada</span>}
          </span>
        </div>
      )}
      <p className="text-[12.5px] font-bold text-gray-900 leading-snug mb-2 line-clamp-3 break-words">{task.title}</p>
      <div className="flex items-center gap-1 flex-wrap mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priCfg.pillBg} ${priCfg.pillText}`}>{priCfg.label}</span>
        {clientName && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 max-w-full truncate">{clientName}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 min-w-0">
        {task.assignee ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <AvatarCircle name={task.assignee} />
            <span className="text-[11px] text-gray-600 truncate">{task.assignee}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-400 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="text-[11px] truncate">Sem responsável</span>
          </div>
        )}
        <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
          <MoreMenu onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} />
        </div>
      </div>
      {task.status !== 'a_fazer' && (
        <div className="mt-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
          <StatusPill status={task.status} onChange={s => onStatusChange(task.id, s)} />
        </div>
      )}
    </div>
  )
}

// ─── Day column ───────────────────────────────────────────────────────────────

function DayColumn({
  day, tasks, draggingId, onDrop, onDragStart, onDragEnd,
  onStatusChange, onDelete, onEdit, onView, onAddTask,
}: {
  day: Date; tasks: Task[]; draggingId: string | null
  onDrop: (taskId: string, day: Date) => void; onDragStart: (id: string) => void; onDragEnd: () => void
  onStatusChange: (id: string, s: TaskStatus) => void; onDelete: (id: string) => void
  onEdit: (task: Task) => void; onView: (task: Task) => void; onAddTask: (day: Date) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const today    = isToday(day)
  const fullLabel = format(day, 'EEEE', { locale: ptBR })
  const dayName  = fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1).split('-')[0]
  const dayNum   = format(day, 'd')
  const monthAbbr = format(day, 'MMM', { locale: ptBR }).replace('.', '')

  return (
    <div
      className={['w-full min-w-0 self-start flex flex-col rounded-2xl border p-2.5 transition-colors min-h-[440px]',
        isDragOver ? 'border-[#2563EB]/50 bg-[#2563EB]/5' : 'border-[#1e293b] bg-[#0d1424]'].join(' ')}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
      onDrop={e => { e.preventDefault(); setIsDragOver(false); const id = e.dataTransfer.getData('taskId'); if (id) onDrop(id, day) }}
    >
      {/* Header do dia */}
      <div className="flex items-center justify-between gap-1 px-0.5 pb-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[13px] font-bold text-[#F8FAFC] truncate">{dayName}</p>
            {today && <span className="text-[7px] font-black px-1 py-0.5 bg-[#2563EB] text-white rounded-full uppercase tracking-wide leading-none flex-shrink-0">Hoje</span>}
          </div>
          <p className="text-[11px] text-[#64748b] mt-0.5">{dayNum} {monthAbbr}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {tasks.length > 0 && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-violet-600 text-white">{tasks.length}</span>
          )}
          <button onClick={() => onAddTask(day)}
            className="w-6 h-6 rounded-full text-[#94a3b8] hover:text-white flex items-center justify-center transition-all border border-[#1e293b] bg-[#182233] hover:bg-[#1e293b]"
            title={`Nova tarefa — ${format(day, 'dd/MM')}`}>
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Corpo — cresce com o conteúdo (sem scroll interno) */}
      <div className="flex-1 flex flex-col space-y-2.5">
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div key={task.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.14 }}>
              <TaskCard task={task} dragging={draggingId === task.id} onStatusChange={onStatusChange} onDelete={onDelete} onEdit={onEdit} onView={onView} onDragStart={onDragStart} onDragEnd={onDragEnd} />
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && !isDragOver && (
          <button onClick={() => onAddTask(day)}
            className="w-full flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors group hover:bg-white/[0.02]">
            <span className="w-11 h-11 rounded-full border border-dashed border-[#334155] flex items-center justify-center group-hover:border-[#2563EB]/60 transition-colors">
              <Plus className="w-5 h-5 text-[#64748b] group-hover:text-[#60A5FA]" />
            </span>
            <p className="text-[12px] text-[#64748b] group-hover:text-[#94a3b8]">Adicionar tarefa</p>
          </button>
        )}

        {isDragOver && (
          <div className="h-16 rounded-2xl border-2 border-dashed border-[#2563EB]/50 bg-[#2563EB]/5 flex items-center justify-center">
            <p className="text-[11px] text-[#60A5FA] font-semibold">Soltar aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── View: Semanal (kanban) ───────────────────────────────────────────────────

function WeeklyView({ tasks, days, draggingId, onDrop, onDragStart, onDragEnd, onStatusChange, onDelete, onEdit, onView, onAddTask }: {
  tasks: Task[]; days: Date[]; draggingId: string | null
  onDrop: (id: string, day: Date) => void; onDragStart: (id: string) => void; onDragEnd: () => void
  onStatusChange: (id: string, s: TaskStatus) => void; onDelete: (id: string) => void
  onEdit: (t: Task) => void; onView: (t: Task) => void; onAddTask: (d: Date) => void
}) {
  const tasksByDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return tasks.filter(t => t.due_date?.startsWith(dayStr))
      .sort((a, b) => {
        if (!a.due_time && !b.due_time) return 0
        if (!a.due_time) return 1
        if (!b.due_time) return -1
        return a.due_time.localeCompare(b.due_time)
      })
  }

  const thisWeekTotal = days.reduce((acc, d) => acc + tasksByDay(d).length, 0)

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      {thisWeekTotal === 0 && tasks.length > 0 && (
        <div className="mx-4 mb-2 px-4 py-2 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-xl text-[12px] text-[#F5A623] flex-shrink-0">
          ⚠ Nenhuma tarefa nesta semana — você tem <strong>{tasks.length}</strong> tarefa{tasks.length !== 1 ? 's' : ''} em outras semanas. Navegue com as setas ou use a aba <strong>Lista</strong> para ver todas.
        </div>
      )}
      <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 px-4 md:px-5">
        <div className="grid grid-cols-7 gap-2.5 items-start pb-4">
          {days.map(day => (
            <DayColumn key={day.toISOString()} day={day} tasks={tasksByDay(day)} draggingId={draggingId}
              onDrop={onDrop} onDragStart={onDragStart} onDragEnd={onDragEnd}
              onStatusChange={onStatusChange} onDelete={onDelete} onEdit={onEdit} onView={onView} onAddTask={onAddTask} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── View: Linha do tempo ─────────────────────────────────────────────────────

function TimelineView({ tasks, days, onView, onEdit, onDelete, onStatusChange, onAddTask }: {
  tasks: Task[]; days: Date[]
  onView: (t: Task) => void; onEdit: (t: Task) => void; onDelete: (id: string) => void
  onStatusChange: (id: string, s: TaskStatus) => void; onAddTask: (d: Date) => void
}) {
  // Show ALL tasks sorted by date, rows = tasks, columns = days of current week
  const sorted = [...tasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    const dc = a.due_date.localeCompare(b.due_date)
    if (dc !== 0) return dc
    if (!a.due_time && !b.due_time) return 0
    if (!a.due_time) return 1
    if (!b.due_time) return -1
    return a.due_time.localeCompare(b.due_time)
  })

  const weekStart = days[0]
  const weekEnd   = days[6]

  return (
    <div className="flex-1 overflow-auto px-4 pb-4">
      {/* Grid header */}
      <div className="flex sticky top-0 bg-[#0B1020] z-10 border-b border-[#1e293b] mb-1">
        <div className="w-72 flex-shrink-0 px-3 py-2.5">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wide">Tarefa</span>
        </div>
        {days.map((day, di) => (
          <div key={di} className={`flex-1 min-w-0 text-center py-2.5 border-l border-[#1e293b] ${isToday(day) ? 'bg-[#2563EB]/10' : ''}`}>
            <p className={`text-[10px] font-bold capitalize ${isToday(day) ? 'text-[#60A5FA]' : 'text-[#64748b]'}`}>
              {format(day, 'EEE', { locale: ptBR })}
            </p>
            <p className={`text-[14px] font-bold ${isToday(day) ? 'text-[#60A5FA]' : 'text-[#CBD5E1]'}`}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Task rows */}
      {sorted.map(task => {
        const priCfg  = PRIORITY_CFG[task.priority]
        const overdue = isOverdue(task.due_date) && task.status !== 'concluido'
        const sCfg    = STATUS_CFG[task.status]
        const clientName = (task.client as any)?.company_name

        // Find which day index this task falls on (within current week view)
        const dueDayIdx = task.due_date
          ? days.findIndex(d => format(d, 'yyyy-MM-dd') === task.due_date)
          : -1

        // Is task outside current week?
        const beforeWeek = task.due_date ? task.due_date < format(weekStart, 'yyyy-MM-dd') : false
        const afterWeek  = task.due_date ? task.due_date > format(weekEnd, 'yyyy-MM-dd') : false
        const outsideWeek = beforeWeek || afterWeek

        return (
          <div key={task.id} className="flex items-stretch border-b border-[#1e293b] hover:bg-white/[0.02] transition-colors group min-h-[56px]">
            {/* Task info */}
            <div className="w-72 flex-shrink-0 px-3 py-2 cursor-pointer flex flex-col justify-center" onClick={() => onView(task)}>
              <p className="text-[13px] font-semibold text-[#F8FAFC] truncate">{task.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priCfg.pillBg} ${priCfg.pillText}`}>{priCfg.label}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                {clientName && <span className="text-[10px] text-[#64748b] truncate">{clientName}</span>}
                {overdue && <span className="text-[10px] text-[#f87171] font-semibold">⚠ Atrasada</span>}
              </div>
            </div>

            {/* Day columns */}
            {days.map((day, di) => (
              <div key={di} className={`flex-1 min-w-0 border-l border-[#1e293b] px-1 py-2 flex items-center justify-center ${isToday(day) ? 'bg-[#2563EB]/5' : ''}`}>
                {dueDayIdx === di && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={`w-full rounded-lg px-2 py-1.5 cursor-pointer ${overdue ? 'bg-[#ef4444]/15 text-[#f87171]' : `${priCfg.pillBg} ${priCfg.pillText}`}`}
                    onClick={() => onView(task)}>
                    <p className="text-[11px] font-semibold truncate">{task.due_time ? task.due_time.slice(0, 5) : '✓'}</p>
                  </motion.div>
                )}
                {/* Show indicator for tasks outside this week */}
                {outsideWeek && di === (beforeWeek ? 0 : 6) && (
                  <div className="text-center">
                    <span className="text-[9px] text-[#475569]">{beforeWeek ? '◀' : '▶'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-[#64748b]">
          <ClipboardList className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-[13px]">Nenhuma tarefa encontrada</p>
        </div>
      )}
    </div>
  )
}

// ─── Day tasks modal ──────────────────────────────────────────────────────────

function DayTasksModal({
  date, tasks, open, onClose, onView, onEdit, onDelete, onStatusChange, onAddTask,
}: {
  date: Date | null; tasks: Task[]; open: boolean; onClose: () => void
  onView: (t: Task) => void; onEdit: (t: Task) => void; onDelete: (id: string) => void
  onStatusChange: (id: string, s: TaskStatus) => void; onAddTask: (d: Date) => void
}) {
  if (!date) return null

  const rawLabel  = format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  // Sort tasks by time then title
  const sorted = [...tasks].sort((a, b) => {
    if (!a.due_time && !b.due_time) return a.title.localeCompare(b.title)
    if (!a.due_time) return 1
    if (!b.due_time) return -1
    return a.due_time.localeCompare(b.due_time)
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-white">{dateLabel}</DialogTitle>
          <p className="text-[12px] text-[#64748b] mt-0.5">
            {sorted.length} tarefa{sorted.length !== 1 ? 's' : ''} neste dia
          </p>
        </DialogHeader>

        <div className="space-y-2 mt-1 max-h-[52vh] overflow-y-auto pr-0.5">
          {sorted.map(task => {
            const pc      = PRIORITY_CFG[task.priority]
            const sc      = STATUS_CFG[task.status]
            const overdue = isOverdue(task.due_date) && task.status !== 'concluido'
            const clientName = (task.client as any)?.company_name

            return (
              <div key={task.id}
                className="group flex items-start gap-3 bg-[#182233] rounded-xl border border-[#1e293b] p-3 hover:border-[#2563EB]/40 transition-all">

                {/* Task info — click to view detail */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onClose(); onView(task) }}>
                  <p className="text-[13px] font-semibold text-[#F8FAFC] leading-snug mb-1.5">{task.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pc.pillBg} ${pc.pillText}`}>{pc.label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>{sc.label}</span>
                    {clientName && <span className="text-[10px] text-[#64748b]">{clientName}</span>}
                    {overdue && <span className="text-[10px] text-[#f87171] font-semibold">⚠ Atrasada</span>}
                  </div>
                  {(task.due_time || task.assignee) && (
                    <div className="flex items-center gap-3 mt-1.5">
                      {task.due_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#64748b]" />
                          <span className="text-[11px] text-[#94a3b8]">{task.due_time.slice(0, 5)}</span>
                        </div>
                      )}
                      {task.assignee && (
                        <div className="flex items-center gap-1.5">
                          <AvatarCircle name={task.assignee} />
                          <span className="text-[11px] text-[#94a3b8]">{task.assignee}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status pill — inline change */}
                <div onClick={e => e.stopPropagation()} className="flex-shrink-0 pt-0.5">
                  <StatusPill status={task.status} onChange={s => onStatusChange(task.id, s)} />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { onClose(); onEdit(task) }}
                    title="Editar"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#60A5FA] hover:bg-[#2563EB]/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    title="Excluir"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#f87171] hover:bg-[#ef4444]/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}

          {sorted.length === 0 && (
            <div className="flex flex-col items-center py-8 text-[#64748b]">
              <ClipboardList className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-[13px]">Nenhuma tarefa neste dia</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#1e293b] pt-3 gap-2 flex-row">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-shrink-0">
            Fechar
          </Button>
          <Button size="sm" onClick={() => { onClose(); onAddTask(date) }}
            className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova tarefa neste dia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── View: Calendário mensal ──────────────────────────────────────────────────

function MonthView({ tasks, onView, onEdit, onDelete, onStatusChange, onAddTask }: {
  tasks: Task[]
  onView: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, s: TaskStatus) => void
  onAddTask: (d: Date) => void
}) {
  const [monthBase, setMonthBase]   = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [dayModalOpen, setDayModalOpen] = useState(false)

  const firstDay  = new Date(monthBase.getFullYear(), monthBase.getMonth(), 1)
  const totalDays = getDaysInMonth(monthBase)
  const startDow  = getDay(firstDay)
  const offset    = startDow === 0 ? 6 : startDow - 1

  const days: (Date | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= totalDays; d++)
    days.push(new Date(monthBase.getFullYear(), monthBase.getMonth(), d))
  while (days.length % 7 !== 0) days.push(null)

  const monthLabel = format(monthBase, 'MMMM yyyy', { locale: ptBR })

  const tasksByDate = (date: Date) =>
    tasks.filter(t => t.due_date === format(date, 'yyyy-MM-dd'))

  const handleDayClick = (date: Date) => {
    const dayTasks = tasksByDate(date)
    if (dayTasks.length > 0) {
      // Has tasks → open day modal
      setSelectedDay(date)
      setDayModalOpen(true)
    } else {
      // Empty → open new task form directly
      onAddTask(date)
    }
  }

  const selectedDayTasks = selectedDay ? tasksByDate(selectedDay) : []

  return (
    <>
      <div className="flex-1 overflow-auto px-4 pb-4">
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonthBase(m => subMonths(m, 1))}
            className="w-9 h-9 rounded-xl border border-[#1e293b] bg-[#182233] flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[16px] font-bold text-[#F8FAFC] capitalize">{monthLabel}</h2>
          <button onClick={() => setMonthBase(m => addMonths(m, 1))}
            className="w-9 h-9 rounded-xl border border-[#1e293b] bg-[#182233] flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day header */}
        <div className="grid grid-cols-7 mb-1">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-[#64748b] py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => {
            if (!date) return <div key={i} className="h-28 rounded-xl bg-white/[0.02]" />
            const dayTasks = tasksByDate(date)
            const today    = isToday(date)
            const hasTasks = dayTasks.length > 0
            return (
              <div key={i}
                onClick={() => handleDayClick(date)}
                className={[
                  'h-28 rounded-xl border p-2 cursor-pointer transition-all',
                  today
                    ? 'border-[#2563EB]/50 bg-[#2563EB]/10 hover:border-[#2563EB]'
                    : hasTasks
                      ? 'border-[#1e293b] bg-[#182233] hover:border-[#2563EB]/40'
                      : 'border-[#1e293b] bg-[#0d1424] hover:border-[#334155]',
                ].join(' ')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold mb-1 ${today ? 'bg-[#2563EB] text-white' : 'text-[#CBD5E1]'}`}>
                  {format(date, 'd')}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, 3).map(task => {
                    const priCfg = PRIORITY_CFG[task.priority]
                    return (
                      <div key={task.id}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate ${priCfg.pillBg} ${priCfg.pillText}`}>
                        {task.title}
                      </div>
                    )
                  })}
                  {dayTasks.length > 3 && (
                    <p className="text-[9px] text-[#64748b] font-medium pl-0.5">+{dayTasks.length - 3} mais</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day tasks modal */}
      <DayTasksModal
        date={selectedDay}
        tasks={selectedDayTasks}
        open={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        onAddTask={onAddTask}
      />
    </>
  )
}

// ─── View: Lista ──────────────────────────────────────────────────────────────

type SortKey = 'due_date' | 'priority' | 'status' | 'title'

function ListView({ tasks, onView, onEdit, onDelete, onStatusChange, onNewTask }: {
  tasks: Task[]; onView: (t: Task) => void; onEdit: (t: Task) => void
  onDelete: (id: string) => void; onStatusChange: (id: string, s: TaskStatus) => void
  onNewTask: () => void
}) {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [sortKey, setSortKey]           = useState<SortKey>('due_date')
  const [sortAsc, setSortAsc]           = useState(true)

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(true) }
  }

  const filtered = tasks.filter(t => filterStatus === 'all' || t.status === filterStatus)
  const sorted   = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'due_date') {
      if (!a.due_date && !b.due_date) cmp = 0
      else if (!a.due_date) cmp = 1
      else if (!b.due_date) cmp = -1
      else cmp = a.due_date.localeCompare(b.due_date)
    } else if (sortKey === 'priority') {
      cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    } else if (sortKey === 'status') {
      cmp = a.status.localeCompare(b.status)
    } else if (sortKey === 'title') {
      cmp = a.title.localeCompare(b.title)
    }
    return sortAsc ? cmp : -cmp
  })

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => handleSort(k)} className="flex items-center gap-1 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide hover:text-white transition-colors">
      {label}
      {sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : <ArrowUpDown className="w-3 h-3 opacity-40" />}
    </button>
  )

  return (
    <div className="flex-1 overflow-hidden flex flex-col px-4">
      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[12px] font-semibold text-[#94a3b8]">Status:</span>
        {(['all', 'a_fazer', 'em_andamento', 'revisao', 'concluido'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${filterStatus === s ? 'bg-[#2563EB] text-white' : 'bg-[#182233] text-[#CBD5E1] hover:bg-[#1e293b]'}`}>
            {s === 'all' ? 'Todos' : STATUS_CFG[s].label}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-[#64748b]">{sorted.length} tarefa{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-[#1e293b]">
        <table className="w-full">
          <thead className="bg-[#182233] sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-3 border-b border-[#1e293b]"><SortBtn k="title" label="Tarefa" /></th>
              <th className="text-left px-4 py-3 border-b border-[#1e293b]"><SortBtn k="due_date" label="Prazo" /></th>
              <th className="text-left px-4 py-3 border-b border-[#1e293b]"><SortBtn k="priority" label="Prioridade" /></th>
              <th className="text-left px-4 py-3 border-b border-[#1e293b]"><SortBtn k="status" label="Status" /></th>
              <th className="text-left px-4 py-3 border-b border-[#1e293b]">
                <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">Cliente</span>
              </th>
              <th className="text-left px-4 py-3 border-b border-[#1e293b]">
                <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">Responsável</span>
              </th>
              <th className="px-4 py-3 border-b border-[#1e293b]" />
            </tr>
          </thead>
          <tbody className="bg-[#0d1424] divide-y divide-[#1e293b]">
            {sorted.map(task => {
              const priCfg     = PRIORITY_CFG[task.priority]
              const sCfg       = STATUS_CFG[task.status]
              const overdue    = isOverdue(task.due_date) && task.status !== 'concluido'
              const clientName = (task.client as any)?.company_name
              return (
                <tr key={task.id} onClick={() => onView(task)}
                  className="cursor-pointer hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-semibold text-[#F8FAFC] max-w-[280px] truncate">{task.title}</p>
                    {task.description && <p className="text-[11px] text-[#64748b] truncate max-w-[280px] mt-0.5">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {task.due_date ? (
                      <div>
                        <p className={`text-[12px] font-medium ${overdue ? 'text-[#f87171]' : 'text-[#CBD5E1]'}`}>
                          {format(new Date(task.due_date + 'T00:00:00'), "d MMM yyyy", { locale: ptBR })}
                        </p>
                        {task.due_time && <p className="text-[11px] text-[#64748b]">{task.due_time.slice(0, 5)}</p>}
                        {overdue && <p className="text-[10px] text-[#f87171] font-semibold">Atrasada</p>}
                      </div>
                    ) : <span className="text-[12px] text-[#475569]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${priCfg.pillBg} ${priCfg.pillText}`}>
                      {priCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <StatusPill status={task.status} onChange={s => onStatusChange(task.id, s)} />
                  </td>
                  <td className="px-4 py-3">
                    {clientName ? (
                      <span className="text-[12px] font-medium text-[#CBD5E1]">{clientName}</span>
                    ) : <span className="text-[12px] text-[#475569]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <AvatarCircle name={task.assignee} />
                        <span className="text-[12px] text-[#CBD5E1]">{task.assignee}</span>
                      </div>
                    ) : <span className="text-[12px] text-[#475569]">—</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <MoreMenu onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} />
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-[#64748b] text-[13px]">
                  {tasks.length === 0 ? 'Nenhuma tarefa criada ainda.' : 'Nenhuma tarefa com esse filtro.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── No-date pills ────────────────────────────────────────────────────────────

function NoDatePills({ tasks, onView, onDelete, onEdit }: {
  tasks: Task[]; onView: (t: Task) => void; onDelete: (id: string) => void; onEdit: (t: Task) => void
}) {
  if (tasks.length === 0) return null
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#CBD5E1]">Tarefas sem data</span>
          <span className="text-[10px] font-bold text-[#94a3b8] bg-[#1e293b] px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {tasks.map(task => {
          const priCfg = PRIORITY_CFG[task.priority]
          return (
            <div key={task.id} onClick={() => onView(task)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#182233] border border-[#1e293b] rounded-xl cursor-pointer hover:border-[#2563EB]/50 transition-all">
              <span className="text-[12px] font-medium text-[#CBD5E1] max-w-[160px] truncate">{task.title}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priCfg.pillBg} ${priCfg.pillText}`}>{priCfg.label}</span>
              <div onClick={e => e.stopPropagation()}>
                <MoreMenu onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Task view modal ──────────────────────────────────────────────────────────

function TaskViewModal({ task, members, open, onClose, onEdit, onDelete }: {
  task: Task | null; members: { id: string; name: string; color: string }[]
  open: boolean; onClose: () => void; onEdit: (t: Task) => void; onDelete: (id: string) => void
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
            <DialogTitle className="text-[16px] font-semibold text-[#F8FAFC] leading-snug">{task.title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 mt-1 overflow-y-auto max-h-[60vh] pr-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ color: pCfg.color, backgroundColor: `${pCfg.color}22` }}>
              {task.priority === 'urgente' && <AlertCircle className="w-3 h-3" />}{pCfg.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${sCfg.bg} ${sCfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />{sCfg.label}
            </span>
            {overdue && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30">⚠ Atrasada</span>}
            {clientName && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#2563EB]/15 text-[#60A5FA]">{clientName}</span>}
          </div>
          {task.description && (
            <div className="bg-[#182233] rounded-xl p-3.5 border border-[#1e293b]">
              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Descrição</p>
              <p className="text-[13px] text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#182233] rounded-xl p-3 border border-[#1e293b]">
              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Prazo</p>
              {task.due_date ? (
                <>
                  <p className={`text-[13px] font-medium ${overdue ? 'text-[#f87171]' : 'text-[#F8FAFC]'}`}>
                    {format(new Date(task.due_date + 'T00:00:00'), "d 'de' MMMM yyyy", { locale: ptBR })}
                  </p>
                  {task.due_time && <p className="text-[12px] text-[#94a3b8] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {task.due_time.slice(0, 5)}</p>}
                </>
              ) : <p className="text-[13px] text-[#64748b]">Sem prazo</p>}
            </div>
            <div className="bg-[#182233] rounded-xl p-3 border border-[#1e293b]">
              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5 flex items-center gap-1"><User className="w-3 h-3" /> Responsável</p>
              {member ? (
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: member.color }}>{member.name.charAt(0).toUpperCase()}</span>
                  <span className="text-[13px] font-medium text-[#F8FAFC]">{member.name}</span>
                </div>
              ) : task.assignee ? <p className="text-[13px] text-[#CBD5E1]">{task.assignee}</p>
                : <p className="text-[13px] text-[#64748b]">Sem responsável</p>}
            </div>
          </div>
          {links.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">Referências ({links.length})</p>
              <div className="space-y-2">
                {links.map(link => {
                  if (link.type === 'imagem') return (
                    <div key={link.id} className="rounded-xl overflow-hidden border border-[#1e293b]">
                      <img src={link.url} alt={link.label} className="w-full max-h-48 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <div className="flex items-center justify-between px-3 py-2 bg-[#182233]">
                        <span className="text-[11px] font-medium text-[#CBD5E1] truncate flex-1">{link.label}</span>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[#64748b] hover:text-white ml-2"><ExternalLink className="w-3 h-3" /></a>
                      </div>
                    </div>
                  )
                  const iconMap: Record<string, typeof Link2> = { link: Link2, arquivo: FileText, pasta: Folder }
                  const Icon = iconMap[link.type] ?? Link2
                  return (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#1e293b] bg-[#182233] hover:border-[#2563EB]/50 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-[#2563EB]/15 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-[#60A5FA]" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#CBD5E1] truncate group-hover:text-white">{link.label}</p>
                        <p className="text-[10px] text-[#64748b] truncate">{link.url}</p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-[#475569] group-hover:text-[#60A5FA] flex-shrink-0" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}
          {((task as any).collaborator_note || (task as any).delivery_url) && (
            <div className="bg-[#8B5CF6]/10 rounded-xl p-3.5 border border-[#8B5CF6]/30 space-y-1.5">
              <p className="text-[10px] font-semibold text-[#a78bfa] uppercase tracking-wider">Entrega do colaborador</p>
              {(task as any).collaborator_note && <p className="text-[12px] text-[#c4b5fd] leading-relaxed">📝 {(task as any).collaborator_note}</p>}
              {(task as any).delivery_url && (
                <a href={(task as any).delivery_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-[#a78bfa] hover:text-[#c4b5fd] font-medium">
                  <ExternalLink className="w-3 h-3" /> Ver entrega enviada
                </a>
              )}
            </div>
          )}
          <p className="text-[11px] text-[#64748b]">Criada em {format(new Date(task.created_at), "d 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
        <DialogFooter className="gap-2 border-t border-[#1e293b] pt-3">
          <Button variant="outline" size="sm" className="text-[#f87171] border-[#ef4444]/30 hover:bg-[#ef4444]/10 hover:border-[#ef4444]/50"
            onClick={() => { onClose(); onDelete(task.id) }}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          <Button size="sm" onClick={() => { onClose(); onEdit(task) }}><Pencil className="w-3.5 h-3.5 mr-1" /> Editar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Task dialog ──────────────────────────────────────────────────────────────

const blankForm = {
  title: '', description: '', due_date: '', due_time: '',
  priority: 'media' as TaskPriority, status: 'a_fazer' as TaskStatus,
  assignee: '', assignee_id: null as string | null, client_id: null as string | null,
}
type TaskForm = typeof blankForm

function TaskDialog({ open, onClose, prefillDate, clients, members, editingTask, onCreate, onUpdate }: {
  open: boolean; onClose: () => void; prefillDate: string
  clients: { id: string; company_name: string }[]; members: { id: string; name: string; color: string }[]
  editingTask: Task | null; onCreate: (f: TaskForm) => Promise<void>; onUpdate: (id: string, f: TaskForm) => Promise<void>
}) {
  const [form, setForm] = useState<TaskForm>(blankForm)
  const [saving, setSaving] = useState(false)
  const isEdit = !!editingTask
  const set = (k: keyof TaskForm, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (editingTask) {
      setForm({
        title: editingTask.title, description: editingTask.description || '',
        due_date: editingTask.due_date || '', due_time: editingTask.due_time || '',
        priority: editingTask.priority, status: editingTask.status,
        assignee: editingTask.assignee || '', assignee_id: (editingTask as any).assignee_id || null,
        client_id: editingTask.client_id,
      })
    } else { setForm({ ...blankForm, due_date: prefillDate }) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTask?.id])

  const handleClose = () => { onClose(); setForm(blankForm) }
  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (isEdit && editingTask) await onUpdate(editingTask.id, form)
      else await onCreate(form)
      setForm(blankForm); onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-1">
          <Input label="Título *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Descrição da tarefa..." />
          <Textarea label="Descrição" value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Detalhes opcionais..." />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Prioridade</label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Status</label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_fazer">A fazer</SelectItem><SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="revisao">Revisão</SelectItem><SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Horário</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c0c0c0] pointer-events-none" />
                <input type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#e0e0e0] bg-white text-[13px] text-[#0f0f0f] focus:outline-none focus:border-[#b0b0b0] tabular-nums" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Responsável</label>
              <Select value={form.assignee_id || '__none__'} onValueChange={v => {
                if (v === '__none__') { set('assignee_id', null); set('assignee', '') }
                else { const m = members.find(m => m.id === v); set('assignee_id', v); set('assignee', m?.name || '') }
              }}>
                <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />{m.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Cliente (opcional)</label>
              <Select value={form.client_id || '__none__'} onValueChange={v => set('client_id', v === '__none__' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cliente</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !form.title.trim()}>
            {saving ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar alterações' : 'Criar tarefa')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ViewTab = 'semanal' | 'timeline' | 'calendario' | 'lista'

export function Tasks() {
  const { user } = useAuth()
  const { data: tasks = [] } = useTasks()
  const { data: clients = [] } = useClients()
  const { data: allMembers = [] } = useTeamMembers()
  const activeMembers = allMembers.filter(m => m.is_active)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { toast } = useToast()

  const [weekBase, setWeekBase]   = useState(() => new Date())
  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(weekBase,   { weekStartsOn: 1 })
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const [activeTab, setActiveTab]     = useState<ViewTab>('semanal')
  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [prefillDate, setPrefillDate] = useState('')
  const [viewingTask, setViewingTask] = useState<Task | null>(null)

  const weekLabel = (() => {
    const startDay = format(weekStart, 'd', { locale: ptBR })
    const endFull  = format(weekEnd, "d 'de' MMMM', 'yyyy", { locale: ptBR })
    return `${startDay} – ${endFull.charAt(0).toUpperCase() + endFull.slice(1)}`
  })()

  const totalCount   = tasks.length
  const doneCount    = tasks.filter(t => t.status === 'concluido').length
  const overdueCount = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'concluido').length
  const progressPct  = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const tasksWithoutDate = tasks.filter(t => !t.due_date)

  const handleDropOnDay = async (taskId: string, day: Date) => {
    const task    = tasks.find(t => t.id === taskId)
    const dateStr = format(day, 'yyyy-MM-dd')
    if (!task || task.due_date?.startsWith(dateStr)) return
    try { await updateTask.mutateAsync({ id: taskId, due_date: dateStr }) }
    catch (err: any) { toast(err.message, 'error') }
  }

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try { await updateTask.mutateAsync({ id: taskId, status }) }
    catch (err: any) { toast(err.message, 'error') }
  }

  const handleDelete = async (taskId: string) => {
    try { await deleteTask.mutateAsync(taskId); toast('Tarefa removida.', 'success') }
    catch (err: any) { toast(err.message, 'error') }
  }

  const handleAddTask  = (day: Date) => { setEditingTask(null); setPrefillDate(format(day, 'yyyy-MM-dd')); setDialogOpen(true) }
  const handleNewTask  = () => { setEditingTask(null); setPrefillDate(''); setDialogOpen(true) }
  const handleEditTask = (task: Task) => { setEditingTask(task); setDialogOpen(true) }

  const handleCreate = async (form: TaskForm) => {
    if (!form.title.trim() || !user) return
    try {
      await (createTask.mutateAsync as any)({
        user_id: user.id, title: form.title.trim(), description: form.description || null,
        due_date: form.due_date || null, due_time: form.due_time || null,
        priority: form.priority, status: form.status, assignee: form.assignee || null,
        assignee_id: form.assignee_id || null, client_id: form.client_id || null,
      })
      toast('Tarefa criada!', 'success')
    } catch (err: any) { toast(err.message, 'error'); throw err }
  }

  const handleUpdate = async (taskId: string, form: TaskForm) => {
    try {
      await updateTask.mutateAsync({
        id: taskId, title: form.title.trim(), description: form.description || null,
        due_date: form.due_date || null, due_time: form.due_time || null,
        priority: form.priority, status: form.status, assignee: form.assignee || null,
        ...(form.assignee_id !== undefined && { assignee_id: form.assignee_id } as any),
        client_id: form.client_id || null,
      })
      toast('Tarefa atualizada!', 'success')
    } catch (err: any) { toast(err.message, 'error'); throw err }
  }

  const TABS: { id: ViewTab; label: string; Icon: React.ElementType }[] = [
    { id: 'semanal',    label: 'Visão semanal',  Icon: LayoutGrid },
    { id: 'timeline',   label: 'Linha do tempo', Icon: AlignLeft  },
    { id: 'calendario', label: 'Calendário',     Icon: Calendar   },
    { id: 'lista',      label: 'Lista',          Icon: List       },
  ]

  const showBottom = (activeTab === 'semanal' || activeTab === 'timeline') && tasksWithoutDate.length > 0

  return (
    <div className="flex flex-col h-full bg-[#0B1020]">

      {/* ── Local header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 md:px-6 pt-5 pb-3 flex-shrink-0 border-b border-[#1e293b] bg-[#0B1020]">
        <div>
          <h1 className="text-[20px] font-bold text-[#F8FAFC]">Tarefas</h1>
          <p className="text-[12px] text-[#64748b] mt-0.5">Gerencie e acompanhe todas as tarefas</p>
        </div>
        <button onClick={handleNewTask}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:scale-95 transition-all shadow-lg shadow-[#2563EB]/20">
          <Plus className="w-4 h-4" /> Nova tarefa
        </button>
      </div>

      {/* ── Stats + date nav ─────────────────────────────────────────────── */}
      <div className="px-5 md:px-6 pt-3 pb-3 flex-shrink-0 bg-[#0B1020] border-b border-[#1e293b]">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Week navigator */}
          <div className="flex items-center bg-[#182233] border border-[#1e293b] rounded-xl overflow-hidden">
            <button onClick={() => setWeekBase(d => subWeeks(d, 1))}
              className="w-9 h-9 flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-all border-r border-[#1e293b]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-4">
              <CalendarDays className="w-3.5 h-3.5 text-[#64748b]" />
              <span className="text-[13px] font-bold text-[#F8FAFC] whitespace-nowrap">{weekLabel}</span>
            </div>
            <button onClick={() => setWeekBase(d => addWeeks(d, 1))}
              className="w-9 h-9 flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-all border-l border-[#1e293b]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => setWeekBase(new Date())}
            className="px-4 py-2 text-[12px] font-semibold rounded-xl border border-[#1e293b] bg-[#182233] text-[#CBD5E1] hover:border-[#2563EB]/50 hover:text-white transition-colors">
            Hoje
          </button>

          {/* Metric cards */}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-[#182233] border border-[#1e293b] rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB]/15 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4 h-4 text-[#60A5FA]" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#F8FAFC] leading-none">{totalCount}</p>
                <p className="text-[10px] text-[#64748b] mt-0.5">Total de tarefas</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2 bg-[#182233] border border-[#1e293b] rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[#22C55E]/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#F8FAFC] leading-none">{doneCount}</p>
                <p className="text-[10px] text-[#64748b] mt-0.5">Concluídas</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2 bg-[#182233] border border-[#1e293b] rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[#F5A623]/15 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#F5A623]" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#F8FAFC] leading-none">{overdueCount}</p>
                <p className="text-[10px] text-[#64748b] mt-0.5">Atrasada{overdueCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2 bg-[#182233] border border-[#1e293b] rounded-xl">
              <DonutProgress percent={progressPct} />
              <div>
                <p className="text-[18px] font-bold text-[#F8FAFC] leading-none">{progressPct}%</p>
                <p className="text-[10px] text-[#64748b] mt-0.5">Progresso semanal</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── View tabs ───────────────────────────────────────────────────── */}
      <div className="px-5 md:px-6 mt-0 border-b border-[#1e293b] flex-shrink-0 bg-[#0B1020]">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={['flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-all border-b-2',
                  activeTab === id ? 'text-[#60A5FA] border-[#2563EB]' : 'text-[#64748b] border-transparent hover:text-[#CBD5E1]'].join(' ')}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#94a3b8] border border-[#1e293b] rounded-lg hover:border-[#2563EB]/50 hover:text-white transition-all mb-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar
          </button>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 pt-3">

        {activeTab === 'semanal' && (
          <WeeklyView tasks={tasks} days={days} draggingId={draggingId}
            onDrop={handleDropOnDay} onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
            onStatusChange={handleStatusChange} onDelete={handleDelete}
            onEdit={handleEditTask} onView={setViewingTask} onAddTask={handleAddTask} />
        )}

        {activeTab === 'timeline' && (
          <TimelineView tasks={tasks} days={days}
            onView={setViewingTask} onEdit={handleEditTask} onDelete={handleDelete}
            onStatusChange={handleStatusChange} onAddTask={handleAddTask} />
        )}

        {activeTab === 'calendario' && (
          <MonthView tasks={tasks} onView={setViewingTask} onEdit={handleEditTask}
            onDelete={handleDelete} onStatusChange={handleStatusChange} onAddTask={handleAddTask} />
        )}

        {activeTab === 'lista' && (
          <ListView tasks={tasks} onView={setViewingTask} onEdit={handleEditTask}
            onDelete={handleDelete} onStatusChange={handleStatusChange} onNewTask={handleNewTask} />
        )}
      </div>

      {/* ── Bottom: mini calendar + no-date tasks ───────────────────────── */}
      {showBottom && (
        <div className="flex-shrink-0 px-5 md:px-6 py-3 border-t border-[#1e293b] bg-[#0B1020] flex items-start gap-5">
          <MiniCalendar weekStart={weekStart} />
          <div className="w-px self-stretch bg-[#1e293b] flex-shrink-0" />
          <NoDatePills tasks={tasksWithoutDate} onView={setViewingTask} onDelete={handleDelete} onEdit={handleEditTask} />
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <TaskDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingTask(null) }}
        prefillDate={prefillDate} clients={clients} members={activeMembers}
        editingTask={editingTask} onCreate={handleCreate} onUpdate={handleUpdate} />

      <TaskViewModal task={viewingTask} members={activeMembers} open={!!viewingTask}
        onClose={() => setViewingTask(null)}
        onEdit={task => { setViewingTask(null); handleEditTask(task) }}
        onDelete={id => { setViewingTask(null); handleDelete(id) }} />
    </div>
  )
}
