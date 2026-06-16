// ── Página: Instagram Dashboard (tema dark) ───────────────────────────────────

import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Instagram, Image, Film, LayoutGrid,
  CheckCircle2, XCircle, Clock, Loader2, X,
  ExternalLink, RefreshCw, AlertCircle, Calendar,
  Users, ArrowLeft, ChevronRight, Trash2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/integrations/supabase/client'
import {
  useAllInstagramAccounts,
  useScheduledPosts,
  useCancelScheduledPost,
  useRetryScheduledPost,
  useRescheduleScheduledPost,
  type ScheduledPost,
  type InstagramAccount,
} from '@/hooks/useInstagram'

// ── Paleta dark ───────────────────────────────────────────────────────────────
// bg #0B0F14 · surface #111827 · elevated #0F172A · border #1F2937
// primary #2563EB hover #1D4ED8 · text #FFFFFF / #9CA3AF / #D1D5DB
// success #22C55E · warning #F59E0B · error #EF4444 · neutral #6B7280

// ── Constantes ────────────────────────────────────────────────────────────────

type TabType = 'all' | 'scheduled' | 'published' | 'failed' | 'cancelled'

// Mantém em sincronia com MAX_RETRIES da Edge Function instagram-publish-cron
const MAX_RETRIES = 3

const POST_TYPE_CFG = {
  IMAGE:          { label: 'Imagem',    Icon: Image      },
  CAROUSEL_ALBUM: { label: 'Carrossel', Icon: LayoutGrid },
  REELS:          { label: 'Reel',      Icon: Film       },
} as const

const STATUS_CFG = {
  scheduled:  { label: 'Agendado',   color: 'text-[#60A5FA]', bg: 'bg-[#2563EB]/10 border-[#2563EB]/30', dot: 'bg-[#2563EB]', Icon: Clock,        spin: false },
  publishing: { label: 'Publicando', color: 'text-[#FBBF24]', bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/30', dot: 'bg-[#F59E0B]', Icon: Loader2,      spin: true  },
  published:  { label: 'Publicado',  color: 'text-[#4ADE80]', bg: 'bg-[#22C55E]/10 border-[#22C55E]/30', dot: 'bg-[#22C55E]', Icon: CheckCircle2, spin: false },
  failed:     { label: 'Falhou',     color: 'text-[#F87171]', bg: 'bg-[#EF4444]/10 border-[#EF4444]/30', dot: 'bg-[#EF4444]', Icon: XCircle,      spin: false },
  cancelled:  { label: 'Cancelado',  color: 'text-[#9CA3AF]', bg: 'bg-[#6B7280]/10 border-[#6B7280]/30', dot: 'bg-[#6B7280]', Icon: X,            spin: false },
} as const

const TABS: { value: TabType; label: string; statuses: string[] }[] = [
  { value: 'all',       label: 'Todos',      statuses: ['scheduled','publishing','published','failed','cancelled'] },
  { value: 'scheduled', label: 'Agendados',  statuses: ['scheduled', 'publishing'] },
  { value: 'published', label: 'Publicados', statuses: ['published']               },
  { value: 'failed',    label: 'Falhas',     statuses: ['failed']                  },
  { value: 'cancelled', label: 'Cancelados', statuses: ['cancelled']               },
]

// ── Account List Card (clicável) ──────────────────────────────────────────────

function AccountListCard({
  account,
  posts,
  onClick,
}: {
  account: InstagramAccount
  posts: ScheduledPost[]
  onClick: () => void
}) {
  const accountPosts   = posts.filter(p => p.ig_account_id === account.id)
  const scheduledCount = accountPosts.filter(p => ['scheduled','publishing'].includes(p.status)).length
  const publishedCount = accountPosts.filter(p => p.status === 'published').length
  const failedCount    = accountPosts.filter(p => p.status === 'failed').length
  const totalCount     = accountPosts.length

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full bg-[#111827] rounded-2xl border border-[#1F2937] p-4 flex items-center gap-3 hover:border-[#2563EB]/50 hover:bg-[#151d2e] transition-all text-left group"
    >
      {/* Avatar */}
      {account.profile_picture_url ? (
        <img
          src={account.profile_picture_url}
          alt={account.username}
          className="w-12 h-12 rounded-full object-cover border-2 border-[#E1306C]/30 flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center flex-shrink-0">
          <Instagram className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[14px] font-semibold text-white truncate">@{account.username}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0" />
        </div>
        <p className="text-[12px] text-[#9CA3AF]">
          {account.followers_count.toLocaleString('pt-BR')} seguidores
        </p>
        {/* Mini-badges */}
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {scheduledCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#2563EB]/10 text-[#60A5FA] border border-[#2563EB]/30">
                {scheduledCount} ag.
              </span>
            )}
            {publishedCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#22C55E]/10 text-[#4ADE80] border border-[#22C55E]/30">
                {publishedCount} pub.
              </span>
            )}
            {failedCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EF4444]/10 text-[#F87171] border border-[#EF4444]/30">
                {failedCount} falha{failedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Seta */}
      <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#9CA3AF] transition-colors flex-shrink-0" />
    </motion.button>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post, onCancel, onRetry, onReschedule }: { post: ScheduledPost; onCancel: (id: string) => void; onRetry: (id: string) => void; onReschedule: (id: string, scheduledAt: string) => void }) {
  const cfg        = STATUS_CFG[post.status]
  const StatusIcon = cfg.Icon
  const typeCfg    = POST_TYPE_CFG[post.post_type]
  const TypeIcon   = typeCfg?.Icon ?? Image

  // Edição de data/hora (posts ainda agendados)
  const localDateTime = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
  }
  const [editing, setEditing] = useState(false)
  const init = localDateTime(post.scheduled_at)
  const [editDate, setEditDate] = useState(init.date)
  const [editTime, setEditTime] = useState(init.time)

  const saveReschedule = () => {
    if (!editDate || !editTime) return
    onReschedule(post.id, new Date(`${editDate}T${editTime}:00`).toISOString())
    setEditing(false)
  }

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-[#9CA3AF]" />
          <span className="text-[13px] font-medium text-white">{typeCfg?.label}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Reprocessamento automático após falha transitória */}
          {(post.retry_count ?? 0) > 0 && post.status !== 'published' && post.status !== 'cancelled' && (
            <div
              title={`Falha temporária ao publicar. Tentando novamente automaticamente (tentativa ${post.retry_count}/${MAX_RETRIES}).`}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#FBBF24]"
            >
              <RefreshCw className="w-3 h-3" />
              Tentativa {post.retry_count}/{MAX_RETRIES}
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#0B0F14]/60 border border-[#1F2937] ${cfg.color}`}>
            <StatusIcon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Prévia das mídias */}
      {post.media_urls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {post.media_urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#1F2937] shadow-sm flex-shrink-0">
              {post.post_type === 'REELS'
                ? <video src={url} className="w-full h-full object-cover" />
                : <img src={url} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              }
              {i === 3 && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[11px] font-bold">
                  +{post.media_urls.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legenda */}
      {post.caption && (
        <p className="text-[13px] text-[#D1D5DB] line-clamp-2 leading-relaxed">{post.caption}</p>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between pt-0.5 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
          <Calendar className="w-3.5 h-3.5" />
          {format(parseISO(post.scheduled_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
        </div>

        <div className="flex items-center gap-3">
          {post.status === 'failed' && (
            <button
              onClick={() => onRetry(post.id)}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Tentar novamente
            </button>
          )}
          {post.status === 'scheduled' && (
            <>
              <button
                onClick={() => { setEditing(e => !e); const i = localDateTime(post.scheduled_at); setEditDate(i.date); setEditTime(i.time) }}
                className="text-[11px] text-[#60A5FA] hover:text-[#2563EB] font-medium transition-colors"
              >
                {editing ? 'Fechar' : 'Editar data'}
              </button>
              <button
                onClick={() => onCancel(post.id)}
                className="text-[11px] text-[#F87171] hover:text-[#EF4444] font-medium transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
          {post.ig_post_id && (
            <a
              href={`https://www.instagram.com/p/${post.ig_post_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#60A5FA] hover:text-[#2563EB] hover:underline font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              Ver no Instagram
            </a>
          )}
        </div>
      </div>

      {/* Editor de data/hora (post agendado) */}
      {post.status === 'scheduled' && editing && (
        <div className="flex items-end gap-2 flex-wrap pt-1 border-t border-[#1F2937] mt-1">
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wide mb-1">Data</p>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
              className="text-[12px] bg-[#0B0F14] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#2563EB]/60" />
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wide mb-1">Horário</p>
            <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
              className="text-[12px] bg-[#0B0F14] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#2563EB]/60" />
          </div>
          <button
            onClick={saveReschedule}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors"
          >
            Salvar
          </button>
        </div>
      )}

      {/* Mensagem de erro */}
      {post.error_message && (
        <div className="flex items-start gap-2 text-[11px] text-[#F87171] bg-[#EF4444]/10 rounded-xl px-3 py-2 border border-[#EF4444]/30">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="break-all">{post.error_message}</span>
        </div>
      )}
    </div>
  )
}

// ── Account Detail View ───────────────────────────────────────────────────────

function AccountDetailView({
  account,
  posts,
  onBack,
  onCancel,
  onRetry,
  onReschedule,
  onDisconnect,
}: {
  account: InstagramAccount
  posts: ScheduledPost[]
  onBack: () => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onReschedule: (id: string, scheduledAt: string) => void
  onDisconnect: (id: string) => void
}) {
  const [tab, setTab] = useState<TabType>('all')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const accountPosts = posts.filter(p => p.ig_account_id === account.id)

  const stats = {
    scheduled: accountPosts.filter(p => ['scheduled','publishing'].includes(p.status)).length,
    published: accountPosts.filter(p => p.status === 'published').length,
    failed:    accountPosts.filter(p => p.status === 'failed').length,
    cancelled: accountPosts.filter(p => p.status === 'cancelled').length,
  }

  const filteredPosts = accountPosts.filter(p =>
    TABS.find(t => t.value === tab)?.statuses.includes(p.status) ?? false
  )

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* Header da conta */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl border border-[#1F2937] bg-[#111827] flex items-center justify-center text-[#9CA3AF] hover:text-white hover:border-[#2563EB]/50 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {account.profile_picture_url ? (
          <img
            src={account.profile_picture_url}
            alt={account.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-[#E1306C]/30 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center flex-shrink-0">
            <Instagram className="w-5 h-5 text-white" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-bold text-white truncate">@{account.username}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0" />
          </div>
          <p className="text-[12px] text-[#9CA3AF]">
            {account.followers_count.toLocaleString('pt-BR')} seguidores
          </p>
        </div>

        {/* Botão desconectar */}
        {confirmDisconnect ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-[#F87171] font-medium">Desconectar?</span>
            <button
              onClick={() => { onDisconnect(account.id); onBack() }}
              className="px-2.5 py-1.5 rounded-lg bg-[#EF4444] text-white text-[11px] font-semibold hover:bg-[#dc2626] transition-colors"
            >
              Sim
            </button>
            <button
              onClick={() => setConfirmDisconnect(false)}
              className="px-2.5 py-1.5 rounded-lg border border-[#1F2937] text-[11px] text-[#9CA3AF] hover:bg-[#1F2937] transition-colors"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EF4444]/30 text-[#F87171] text-[11px] font-medium hover:bg-[#EF4444]/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Desconectar
          </button>
        )}
      </div>

      {/* Stats da conta */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Agendados',  value: stats.scheduled, color: 'text-[#60A5FA]', bg: 'bg-[#2563EB]/10 border-[#2563EB]/20'  },
          { label: 'Publicados', value: stats.published, color: 'text-[#4ADE80]', bg: 'bg-[#22C55E]/10 border-[#22C55E]/20' },
          { label: 'Falhas',     value: stats.failed,    color: 'text-[#F87171]', bg: 'bg-[#EF4444]/10 border-[#EF4444]/20'   },
          { label: 'Cancelados', value: stats.cancelled, color: 'text-[#9CA3AF]', bg: 'bg-[#6B7280]/10 border-[#6B7280]/20'  },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.bg} p-4 text-center`}>
            <div className={`text-[22px] font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#9CA3AF] mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Posts */}
      <div className="bg-[#111827] rounded-3xl border border-[#1F2937] overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[#1F2937] px-2 pt-2 overflow-x-auto">
          {TABS.map(t => {
            const count  = accountPosts.filter(p => t.statuses.includes(p.status)).length
            const active = tab === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium rounded-t-xl transition-colors ${
                  active ? 'text-white' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    active ? 'bg-[#2563EB] text-white' : 'bg-[#1F2937] text-[#9CA3AF]'
                  }`}>
                    {count}
                  </span>
                )}
                {active && (
                  <motion.div
                    layoutId="tab-underline-detail"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Lista de posts */}
        <div className="p-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-2xl bg-[#1F2937] flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-5 h-5 text-[#9CA3AF]" />
              </div>
              <p className="text-[14px] font-semibold text-white">Nenhum post aqui</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">
                Ainda não há posts nesta categoria para esta conta.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map(post => (
                <PostCard key={post.id} post={post} onCancel={onCancel} onRetry={onRetry} onReschedule={onReschedule} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function InstagramPage() {
  const [searchParams] = useSearchParams()
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null)
  const { toast }       = useToast()
  const cancelPost      = useCancelScheduledPost()
  const retryPost       = useRetryScheduledPost()
  const reschedulePost  = useRescheduleScheduledPost()

  const { data: rawAccounts = [], isLoading: loadingAccounts, refetch: refetchAccounts, isRefetching: refetchingAccounts } = useAllInstagramAccounts()
  const { data: posts       = [], isLoading: loadingPosts,    refetch: refetchPosts,    isRefetching: refetchingPosts    } = useScheduledPosts()

  // Deduplicar por ig_user_id: preferindo conta vinculada a cliente
  const accounts = Object.values(
    rawAccounts.reduce<Record<string, InstagramAccount>>((acc, a) => {
      const existing = acc[a.ig_user_id]
      if (!existing || (!existing.client_id && a.client_id)) {
        acc[a.ig_user_id] = a
      }
      return acc
    }, {})
  )

  const isRefreshing = refetchingAccounts || refetchingPosts
  const isLoading    = loadingAccounts || loadingPosts

  // Sincronizar selectedAccount com dados mais recentes (caso conta seja atualizada)
  useEffect(() => {
    if (!selectedAccount) return
    const updated = accounts.find(a => a.id === selectedAccount.id)
    if (updated && updated !== selectedAccount) setSelectedAccount(updated)
  }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toast de retorno OAuth
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error     = searchParams.get('error')
    if (connected === 'true') {
      toast('Instagram conectado com sucesso!', 'success')
      window.history.replaceState({}, '', '/instagram')
      refetchAccounts()
    }
    if (error) {
      toast('Erro ao conectar Instagram. Tente novamente no perfil do cliente.', 'error')
      window.history.replaceState({}, '', '/instagram')
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este post agendado?')) return
    await cancelPost.mutateAsync(id)
    toast('Post cancelado', 'success')
  }

  const handleRetry = async (id: string) => {
    try {
      await retryPost.mutateAsync(id)
      toast('Post recolocado na fila — será publicado em instantes.', 'success')
    } catch (err: any) {
      toast(err?.message ?? 'Não foi possível reagendar o post.', 'error')
    }
  }

  const handleReschedule = async (id: string, scheduledAt: string) => {
    try {
      await reschedulePost.mutateAsync({ id, scheduled_at: scheduledAt })
      toast('Agendamento atualizado!', 'success')
    } catch (err: any) {
      toast(err?.message ?? 'Não foi possível alterar a data.', 'error')
    }
  }

  return (
    <div className="min-h-full bg-[#0B0F14] p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header global ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              Instagram
            </h1>
            <p className="text-[13px] text-[#9CA3AF] mt-1">
              {selectedAccount
                ? 'Detalhes da conta selecionada'
                : 'Selecione uma conta para ver os detalhes'}
            </p>
          </div>
          <button
            onClick={() => { refetchAccounts(); refetchPosts() }}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 h-9 rounded-xl border border-[#1F2937] bg-[#111827] text-[13px] font-medium text-[#D1D5DB] hover:text-white hover:border-[#2563EB]/50 transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* ── Conteúdo: lista ou detalhe ───────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {selectedAccount ? (
            <AccountDetailView
              key="detail"
              account={selectedAccount}
              posts={posts}
              onBack={() => setSelectedAccount(null)}
              onCancel={handleCancel}
              onRetry={handleRetry}
              onReschedule={handleReschedule}
              onDisconnect={async (id) => {
                await (supabase as any).from('instagram_accounts').delete().eq('id', id)
                setSelectedAccount(null)
              }}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#6B7280]" />
                <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                  Contas conectadas
                </h2>
              </div>

              {isLoading ? (
                <div className="bg-[#111827] rounded-2xl border border-[#1F2937] p-8 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="bg-[#0B0F14] rounded-2xl border border-dashed border-[#1F2937] p-12 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#E1306C] to-[#833AB4] blur-2xl opacity-40" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center shadow-lg shadow-[#E1306C]/30">
                      <Instagram className="w-9 h-9 text-white" />
                    </div>
                  </div>
                  <p className="text-[16px] font-semibold text-white">Nenhuma conta conectada</p>
                  <p className="text-[13px] text-[#9CA3AF] mt-1.5 max-w-xs mx-auto">
                    Conecte o Instagram de cada cliente no perfil do cliente.
                  </p>
                  <Link
                    to="/clients"
                    className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors shadow-lg shadow-[#2563EB]/20"
                  >
                    <Users className="w-4 h-4" />
                    Ir para Clientes
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {accounts.map(acc => (
                    <AccountListCard
                      key={acc.id}
                      account={acc}
                      posts={posts}
                      onClick={() => setSelectedAccount(acc)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
