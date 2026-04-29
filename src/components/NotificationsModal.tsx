import { useEffect } from 'react'
import {
  Bell, CheckCircle2, XCircle, MessageSquare,
  Clock, FileText, Check, Wrench,
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications'
import type { Notification } from '@/hooks/useNotifications'

// ─── Tipo → visual ────────────────────────────────────────────────────────────

const typeConfig: Record<
  Notification['type'],
  { Icon: React.ElementType; color: string; bg: string }
> = {
  NEW_CONTENT:      { Icon: FileText,      color: 'text-purple-600', bg: 'bg-purple-50'  },
  APPROVAL_REQUEST: { Icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50'   },
  APPROVED:         { Icon: CheckCircle2,  color: 'text-emerald-600',bg: 'bg-emerald-50' },
  REJECTED:         { Icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50'     },
  COMMENT:          { Icon: MessageSquare, color: 'text-blue-600',   bg: 'bg-blue-50'    },
  ADJUSTMENT_DONE:  { Icon: Wrench,        color: 'text-blue-600',   bg: 'bg-blue-50'    },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationsModalProps {
  open: boolean
  onClose: () => void
  /** Chamado ao clicar "Ver" numa notificação. Recebe o link (planner item id). */
  onView: (notification: Notification) => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function NotificationsModal({ open, onClose, onView }: NotificationsModalProps) {
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead    = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Fechar com Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleView = async (notification: Notification) => {
    if (!notification.is_read) {
      await markRead.mutateAsync(notification.id)
    }
    onView(notification)
  }

  const handleMarkAll = () => markAllRead.mutate()

  return (
    /* Backdrop invisível — fecha ao clicar fora */
    <div className="fixed inset-0 z-50" onClick={onClose}>

      {/* Painel */}
      <div
        className="absolute top-14 right-4 w-[380px] max-w-[calc(100vw-32px)] bg-white rounded-2xl border border-[#e8e8e8] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Cabeçalho ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8] bg-white">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-[#737373]" />
            <span className="text-[13px] font-semibold text-[#0f0f0f]">Notificações</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 leading-none"
                style={{ color: '#ffffff' }}>
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* ── Lista ────────────────────────────────────────────────── */}
        <div className="overflow-y-auto max-h-[420px]">

          {isLoading && (
            <div className="px-4 py-10 text-center text-[12px] text-[#a0a0a0]">
              Carregando...
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="px-4 py-14 text-center">
              <div className="w-10 h-10 rounded-2xl bg-[#f5f5f5] border border-[#e8e8e8] flex items-center justify-center mx-auto mb-3">
                <Bell className="w-4.5 h-4.5 text-[#c0c0c0]" />
              </div>
              <p className="text-[13px] font-medium text-[#737373]">Nenhuma notificação</p>
              <p className="text-[11px] text-[#a0a0a0] mt-0.5">Você está em dia!</p>
            </div>
          )}

          {!isLoading && notifications.map((notification, idx) => {
            const cfg = typeConfig[notification.type] ?? typeConfig.COMMENT
            const { Icon } = cfg
            const isLast = idx === notifications.length - 1

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  notification.is_read ? 'bg-white' : 'bg-blue-50/40'
                } ${!isLast ? 'border-b border-[#f0f0f0]' : ''}`}
              >
                {/* Ícone do tipo */}
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[#0f0f0f] leading-snug">
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                    )}
                  </div>

                  <p className="text-[11px] text-[#737373] leading-snug mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>

                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className="text-[10px] text-[#a0a0a0]">
                      {formatDistanceToNow(parseISO(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>

                    {notification.link && (
                      <button
                        onClick={() => handleView(notification)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0"
                      >
                        Ver →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Rodapé ───────────────────────────────────────────────── */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[#f0f0f0] bg-[#f9f9f9]">
            <p className="text-[10px] text-[#a0a0a0] text-center">
              Últimas {notifications.length} notificações
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
