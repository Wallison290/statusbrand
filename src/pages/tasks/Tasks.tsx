import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, Trash2,
  User, CalendarDays, AlertCircle, Clock, Pencil,
  ExternalLink, Link2, FileText, Folder, CheckCircle2,
  MoreHorizontal, LayoutGrid, List, Calendar, Filter,
  AlignLeft, ClipboardList,
} from 'lucide-react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, addWeeks, subWeeks, isToday,
  startOfMonth, getDaysInMonth, getDay, addMonths, subMonths,
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

const PRIORITY_CFG: Record<TaskPriority, {
  label: string; color: string; pillBg: string; pillText: string
}> = {
  baixa:   { label: 'Baixa',   color: '#9ca3af', pillBg: 'bg-gray-100',   pillText: 'text-gray-600'   },
  media:   { label: 'Média',   color: '#3b82f6', pillBg: 'bg-blue-100',   pillText: 'text-blue-700'   },
  alta:    { label: 'Alta',    color: '#f97316', pillBg: 'bg-orange-100', pillText: 'text-orange-700' },
  urgente: { label: 'Urgente', color: '#ef4444', pillBg: 'bg-red-100',    pillText: 'text-red-700'    },
}

// ─── Donut progress chart ──────────────────────────────────────────────────────

function DonutProgress({ percent }: { percent: number }) {
  const r    = 15
  const circ = 2 * Math.PI * r
  const dash = (percent / 100) * circ
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" className="flex-shrink-0">
      <circle cx="21" cy="21" r={r} fill="none" stroke="#e9ecef" strokeWidth="4" />
      <circle
        cx="21" cy="21" r={r} fill="none"
        stroke="#8b5cf6" strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 21 21)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  )
}

// ─── Mini calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ weekStart }: { weekStart: Date }) {
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const today     = new Date()
  const firstDay  = startOfMonth(viewMonth)
  const totalDays = getDaysInMonth(viewMonth)
  const startDow  = getDay(firstDay) // 0=Sun
  const offset    = startDow === 0 ? 6 : startDow - 1

  const days: (Date | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
  }
  while (days.length % 7 !== 0) days.push(null)

  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="w-[176px] flex-shrink-0">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-[11px] font-bold text-gray-700 capitalize">{monthLabel}</span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <div key={i} className="text-[9px] font-bold text-gray-400 text-center py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          if (!date) return <div key={i} />
          const todayDate  = isToday(date)
          const inWeek     = date >= weekStart && date < new Date(weekStart.getTime() + 7 * 86_400_000)
          return (
            <div
              key={i}
              className={[
                'text-[10px] h-5 w-5 mx-auto flex items-center justify-center rounded-full font-medium transition-colors',
                todayDate
                  ? 'bg-blue-500 text-white font-bold'
                  : inWeek
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100 cursor-pointer',
              ].join(' ')}
            >
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
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity border ${cfg.bg} ${cfg.text} ${cfg.border}`}
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
              className="absolute bottom-full mb-1.5 left-0 z-20 w-40 bg-white border border-[#e8e8e8] rounded-xl shadow-xl overflow-hidden py-1.5"
            >
              {(Object.entries(STATUS_CFG) as [TaskStatus, typeof STATUS_CFG[TaskStatus]][]).map(([s, c]) => (
                <button
                  key={s}
                  onClick={e => { e.stopPropagation(); onChange(s); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#f5f5f5] transition-colors text-left ${s === status ? 'font-semibold' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
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

// ─── Avatar ────────────────────────────────────────────────────────────────────

function AvatarCircle({ name }: { name: string }) {
  const palette = ['bg-blue-400','bg-violet-400','bg-emerald-400','bg-amber-400','bg-pink-400','bg-indigo-400','bg-cyan-400','bg-orange-400']
  const hash    = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const color   = palette[hash % palette.length]
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${color}`}>
      {initials}
    </span>
  )
}

// ─── More menu ────────────────────────────────────────────────────────────────

function MoreMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 bottom-full mb-1 z-20 w-32 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden py-1"
            >
              <button
                onClick={e => { e.stopPropagation(); onEdit(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Editar
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50 transition-colors"
              >
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
  task: Task
  onStatusChange: (id: string, s: TaskStatus) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  onView: (task: Task) => void
  dragging: boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
}) {
  const dragStarted    = useRef(false)
  const overdueAndOpen = task.due_date ? isOverdue(task.due_date) && task.status !== 'concluido' : false
  const clientName     = (task.client as any)?.company_name
  const priCfg         = PRIORITY_CFG[task.priority]

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
        'w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100',
        'cursor-pointer hover:shadow-md transition-all duration-150 select-none',
        dragging ? 'opacity-40 scale-95' : '',
      ].join(' ')}
    >
      {/* Time row */}
      {(task.due_time || overdueAndOpen) && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${overdueAndOpen ? 'text-red-400' : 'text-gray-400'}`} />
          <span className={`text-[12px] font-medium ${overdueAndOpen ? 'text-red-500' : 'text-gray-500'}`}>
            {task.due_time ? task.due_time.slice(0, 5) : ''}
            {overdueAndOpen && <span className="ml-1">· Atrasada</span>}
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-[14px] font-bold text-gray-900 leading-snug mb-3 line-clamp-2">
        {task.title}
      </p>

      {/* Pills: priority + client */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${priCfg.pillBg} ${priCfg.pillText}`}>
          {priCfg.label}
        </span>
        {clientName && (
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {clientName}
          </span>
        )}
      </div>

      {/* Assignee + more menu */}
      <div className="flex items-center justify-between gap-2">
        {task.assignee ? (
          <div className="flex items-center gap-2 min-w-0">
            <AvatarCircle name={task.assignee} />
            <span className="text-[12px] text-gray-600 truncate">{task.assignee}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-gray-400">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[12px]">Sem responsável</span>
          </div>
        )}
        <div onClick={e => e.stopPropagation()}>
          <MoreMenu onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} />
        </div>
      </div>

      {/* Status badge */}
      {task.status !== 'a_fazer' && (
        <div className="mt-3 pt-2.5 border-t border-gray-50" onClick={e => e.stopPropagation()}>
          <StatusPill status={task.status} onChange={s => onStatusChange(task.id, s)} />
        </div>
      )}
    </div>
  )
}

// ─── Day column ───────────────────────────────────────────────────────────────

function DayColumn({
  day, tasks, draggingId,
  onDrop, onDragStart, onDragEnd,
  onStatusChange, onDelete, onEdit, onView, onAddTask,
}: {
  day: Date
  tasks: Task[]
  draggingId: string | null
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
  const today = isToday(day)

  const fullLabel = format(day, 'EEEE', { locale: ptBR })
  const dayName   = fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1).split('-')[0]
  const dayNum    = format(day, 'd')
  const monthAbbr = format(day, 'MMM', { locale: ptBR }).replace('.', '')

  return (
    <div
      className={[
        'flex-shrink-0 w-[260px] flex flex-col rounded-2xl border transition-colors duration-100 overflow-hidden bg-white',
        isDragOver ? 'border-blue-300 ring-2 ring-blue-200 ring-offset-1' : 'border-gray-100',
      ].join(' ')}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
      onDrop={e => {
        e.preventDefault()
        setIsDragOver(false)
        const id = e.dataTransfer.getData('taskId')
        if (id) onDrop(id, day)
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-50">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-bold text-gray-800">{dayName}</p>
            {today && (
              <span className="text-[8px] font-black px-1.5 py-0.5 bg-gray-900 text-white rounded-full uppercase tracking-wider leading-none">
                Hoje
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{dayNum} {monthAbbr}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {tasks.length > 0 && (
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold bg-orange-400 text-white">
              {tasks.length}
            </span>
          )}
          <button
            onClick={() => onAddTask(day)}
            className="w-7 h-7 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all border border-gray-200"
            title={`Nova tarefa — ${format(day, 'dd/MM')}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div
        className="flex-1 px-3 py-3 space-y-2.5 min-h-[340px] overflow-y-auto"
        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
      >
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
          <div className="flex flex-col items-center justify-center h-[280px]">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <Plus className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-[12px] text-gray-400">Nenhuma tarefa</p>
          </div>
        )}

        {isDragOver && (
          <div className="h-16 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 flex items-center justify-center">
            <p className="text-[11px] text-blue-500 font-semibold">Soltar aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── No-date pills (bottom section) ───────────────────────────────────────────

function NoDatePills({
  tasks, onView, onDelete, onEdit,
}: {
  tasks: Task[]
  onView: (task: Task) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}) {
  if (tasks.length === 0) return null
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-gray-700">Tarefas sem data</span>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <button className="text-[12px] text-violet-600 font-semibold hover:underline flex items-center gap-0.5">
          Ver todas <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {tasks.map(task => {
          const priCfg = PRIORITY_CFG[task.priority]
          return (
            <div
              key={task.id}
              onClick={() => onView(task)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <span className="text-[12px] font-medium text-gray-800 max-w-[160px] truncate">{task.title}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priCfg.pillBg} ${priCfg.pillText}`}>
                {priCfg.label}
              </span>
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

function TaskViewModal({
  task, members, open, onClose, onEdit, onDelete,
}: {
  task: Task | null
  members: { id: string; name: string; color: string }[]
  open: boolean
  onClose: () => void
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
}) {
  if (!task) return null

  const pCfg       = PRIORITY_CFG[task.priority]
  const sCfg       = STATUS_CFG[task.status]
  const member     = members.find(m => m.id === (task as any).assignee_id)
  const overdue    = isOverdue(task.due_date) && task.status !== 'concluido'
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
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

          {task.description && (
            <div className="bg-[#f8fafc] rounded-xl p-3.5 border border-[#e8e8e8]">
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Descrição</p>
              <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

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

// ─── Task dialog ──────────────────────────────────────────────────────────────

const blankForm = {
  title:       '',
  description: '',
  due_date:    '',
  due_time:    '',
  priority:    'media' as TaskPriority,
  status:      'a_fazer' as TaskStatus,
  assignee:    '',
  assignee_id: null as string | null,
  client_id:   null as string | null,
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

  const set = (k: keyof TaskForm, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (editingTask) {
      setForm({
        title:       editingTask.title,
        description: editingTask.description || '',
        due_date:    editingTask.due_date    || '',
        due_time:    editingTask.due_time    || '',
        priority:    editingTask.priority,
        status:      editingTask.status,
        assignee:    editingTask.assignee    || '',
        assignee_id: (editingTask as any).assignee_id || null,
        client_id:   editingTask.client_id,
      })
    } else {
      setForm({ ...blankForm, due_date: prefillDate })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTask?.id])

  const handleClose = () => { onClose(); setForm(blankForm) }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (isEdit && editingTask) { await onUpdate(editingTask.id, form) }
      else { await onCreate(form) }
      setForm(blankForm)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <Input label="Título *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Descrição da tarefa..." />
          <Textarea label="Descrição" value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Detalhes opcionais..." />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Prioridade</label>
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
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Status</label>
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
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                        {m.name}
                      </span>
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

  const [activeTab, setActiveTab]       = useState<ViewTab>('semanal')
  const [draggingId, setDraggingId]     = useState<string | null>(null)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editingTask, setEditingTask]   = useState<Task | null>(null)
  const [prefillDate, setPrefillDate]   = useState('')
  const [viewingTask, setViewingTask]   = useState<Task | null>(null)

  // Week label: "1 – 7 de Junho, 2026"
  const weekLabel = (() => {
    const startDay = format(weekStart, 'd', { locale: ptBR })
    const endFull  = format(weekEnd, "d 'de' MMMM', 'yyyy", { locale: ptBR })
    const endCap   = endFull.charAt(0).toUpperCase() + endFull.slice(1)
    return `${startDay} – ${endCap}`
  })()

  const totalCount    = tasks.length
  const doneCount     = tasks.filter(t => t.status === 'concluido').length
  const overdueCount  = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'concluido').length
  const progressPct   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

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

  const handleDropOnDay = async (taskId: string, day: Date) => {
    const task   = tasks.find(t => t.id === taskId)
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
    { id: 'semanal',    label: 'Visão semanal',  Icon: LayoutGrid  },
    { id: 'timeline',   label: 'Linha do tempo', Icon: AlignLeft   },
    { id: 'calendario', label: 'Calendário',     Icon: Calendar    },
    { id: 'lista',      label: 'Lista',          Icon: List        },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      <Header
        title="Tarefas"
        subtitle="Calendário semanal"
        action={
          <button
            onClick={handleNewTask}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all hover:opacity-90 active:scale-95 shadow-md"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#ffffff' }}
          >
            <Plus className="w-4 h-4" /> Nova tarefa
          </button>
        }
      />

      {/* ── Stats + week navigation ──────────────────────────────────────── */}
      <div className="px-5 md:px-7 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Date navigator */}
          <div className="flex items-center bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setWeekBase(d => subWeeks(d, 1))}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all border-r border-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-4">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[13px] font-bold text-gray-900 whitespace-nowrap">{weekLabel}</span>
            </div>
            <button
              onClick={() => setWeekBase(d => addWeeks(d, 1))}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all border-l border-gray-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!days.some(d => isToday(d)) && (
            <button
              onClick={() => setWeekBase(new Date())}
              className="px-3 py-2 text-[12px] font-semibold rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors shadow-sm"
            >
              Hoje
            </button>
          )}

          {/* Metric cards */}
          <div className="ml-auto flex items-center gap-2 flex-wrap">

            {/* Total */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-gray-900 leading-none">{totalCount}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Total de tarefas</p>
              </div>
            </div>

            {/* Concluídas */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-gray-900 leading-none">{doneCount}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Concluídas</p>
              </div>
            </div>

            {/* Atrasadas */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-gray-900 leading-none">{overdueCount}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Atrasada{overdueCount !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Progresso */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <DonutProgress percent={progressPct} />
              <div>
                <p className="text-[18px] font-bold text-gray-900 leading-none">{progressPct}%</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Progresso semanal</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── View tabs ───────────────────────────────────────────────────── */}
      <div className="px-5 md:px-7 mt-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  'flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-all border-b-2',
                  activeTab === id
                    ? 'text-violet-600 border-violet-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700',
                ].join(' ')}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all mb-1">
            <Filter className="w-3.5 h-3.5" />
            Filtrar
          </button>
        </div>
      </div>

      {/* ── Weekly board ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-gray-50/60 px-5 md:px-7 pt-4">
        <div className="overflow-x-auto flex-1 min-h-0">
          <div className="flex gap-3 h-full pb-3" style={{ minWidth: `${7 * 272}px` }}>
            {days.map(day => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                tasks={tasksByDay(day)}
                draggingId={draggingId}
                onDrop={handleDropOnDay}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onEdit={handleEditTask}
                onView={setViewingTask}
                onAddTask={handleAddTask}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: mini calendar + tasks without date ───────────────────── */}
      <div className="flex-shrink-0 px-5 md:px-7 py-4 border-t border-gray-100 bg-white flex items-start gap-6">
        <MiniCalendar weekStart={weekStart} />
        <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />
        <NoDatePills
          tasks={tasksWithoutDate}
          onView={setViewingTask}
          onDelete={handleDelete}
          onEdit={handleEditTask}
        />
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
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
