// ── Página: Instagram Dashboard (monitoramento) ───────────────────────────────

import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Instagram, Image, Film, LayoutGrid,
  CheckCircle2, XCircle, Clock, Loader2, X,
  ExternalLink, RefreshCw, AlertCircle, Calendar,
  Users, ChevronDown,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/ui/toast'
import {
  useAllInstagramAccounts,
  useScheduledPosts,
  useCancelScheduledPost,
  type ScheduledPost,
  type InstagramAccount,
} from '@/hooks/useInstagram'

// ── Constantes ────────────────────────────────────────────────────────────────

type TabType = 'all' | 'scheduled' | 'published' | 'failed' | 'cancelled'

const POST_TYPE_CFG = {
  IMAGE:          { label: 'Imagem',    Icon: Image      },
  CAROUSEL_ALBUM: { label: 'Carrossel', Icon: LayoutGrid },
  REELS:          { label: 'Reel',      Icon: Film       },
} as const

const STATUS_CFG = {
  scheduled:  { label: 'Agendado',   color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-100',   dot: 'bg-blue-400',   Icon: Clock,        spin: false },
  publishing: { label: 'Publicando', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-400',  Icon: Loader2,      spin: true  },
  published:  { label: 'Publicado',  color: 'text-green-600', bg: 'bg-green-50 border-green-100', dot: 'bg-green-400',  Icon: CheckCircle2, spin: false },
  failed:     { label: 'Falhou',     color: 'text-red-600',   bg: 'bg-red-50 border-red-100',     dot: 'bg-red-400',    Icon: XCircle,      spin: false },
  cancelled:  { label: 'Cancelado',  color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-100',   dot: 'bg-gray-300',   Icon: X,            spin: false },
} as const

const TABS: { value: TabType; label: string; statuses: string[] }[] = [
  { value: 'all',       label: 'Todos',      statuses: ['scheduled','publishing','published','failed','cancelled'] },
  { value: 'scheduled', label: 'Agendados',  statuses: ['scheduled', 'publishing'] },
  { value: 'published', label: 'Publicados', statuses: ['published']               },
  { value: 'failed',    label: 'Falhas',     statuses: ['failed']                  },
  { value: 'cancelled', label: 'Cancelados', statuses: ['cancelled']               },
]

// ── Account Card ──────────────────────────────────────────────────────────────

function AccountCard({ account, posts }: { account: InstagramAccount; posts: ScheduledPost[] }) {
  const accountPosts   = posts.filter(p => p.ig_account_id === account.id)
  const scheduledCount = accountPosts.filter(p => ['scheduled','publishing'].includes(p.status)).length
  const publishedCount = accountPosts.filter(p => p.status === 'published').length
  const failedCount    = accountPosts.filter(p => p.status === 'failed').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#e8e8e8] p-4 flex items-center gap-3"
    >
      {account.profile_picture_url ? (
        <img
          src={account.profile_picture_url}
          alt={account.username}
          className="w-11 h-11 rounded-full object-cover border-2 border-[#E1306C]/20 flex-shrink-0"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center flex-shrink-0">
          <Instagram className="w-5 h-5 text-white" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-[#0f0f0f] truncate">@{account.username}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
        </div>
        <p className="text-[11px] text-[#94a3b8] mt-0.5">
          {account.followers_count.toLocaleString('pt-BR')} seguidores
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {scheduledCount > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
            {scheduledCount} ag.
          </span>
        )}
        {publishedCount > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">
            {publishedCount} pub.
          </span>
        )}
        {failedCount > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
            {failedCount} falha
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post, onCancel }: { post: ScheduledPost; onCancel: (id: string) => void }) {
  const cfg      = STATUS_CFG[post.status]
  const StatusIcon = cfg.Icon
  const typeCfg  = POST_TYPE_CFG[post.post_type]
  const TypeIcon = typeCfg?.Icon ?? Image
  const accountUsername = (post as any).instagram_accounts?.username

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-[#64748b]" />
          <span className="text-[13px] font-medium text-[#0f0f0f]">{typeCfg?.label}</span>
          {accountUsername && (
            <span className="text-[11px] text-[#94a3b8] truncate max-w-[120px]">
              · @{accountUsername}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border ${cfg.color}`}>
          <StatusIcon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
          {cfg.label}
        </div>
      </div>

      {/* Prévia das mídias */}
      {post.media_urls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {post.media_urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white shadow-sm flex-shrink-0">
              {post.post_type === 'REELS'
                ? <video src={url} className="w-full h-full object-cover" />
                : <img src={url} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              }
              {i === 3 && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[11px] font-bold">
                  +{post.media_urls.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legenda */}
      {post.caption && (
        <p className="text-[13px] text-[#374151] line-clamp-2 leading-relaxed">{post.caption}</p>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between pt-0.5 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-[12px] text-[#64748b]">
          <Calendar className="w-3.5 h-3.5" />
          {format(parseISO(post.scheduled_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
        </div>

        <div className="flex items-center gap-3">
          {post.status === 'scheduled' && (
            <button
              onClick={() => onCancel(post.id)}
              className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Cancelar
            </button>
          )}
          {post.ig_post_id && (
            <a
              href={`https://www.instagram.com/p/${post.ig_post_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#6366f1] hover:underline font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              Ver no Instagram
            </a>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {post.error_message && (
        <div className="flex items-start gap-2 text-[11px] text-red-700 bg-white rounded-xl px-3 py-2 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="break-all">{post.error_message}</span>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function InstagramPage() {
  const [searchParams]    = useSearchParams()
  const [tab, setTab]     = useState<TabType>('all')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const { toast }         = useToast()
  const cancelPost        = useCancelScheduledPost()

  const { data: rawAccounts = [], isLoading: loadingAccounts, refetch: refetchAccounts, isRefetching: refetchingAccounts } = useAllInstagramAccounts()
  const { data: posts       = [], isLoading: loadingPosts,    refetch: refetchPosts,    isRefetching: refetchingPosts    } = useScheduledPosts()

  // Deduplicar por ig_user_id: preferindo conta vinculada a um cliente (client_id != null)
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

  // Toast de retorno OAuth (caso venha de conexão rápida)
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

  // Estatísticas globais
  const stats = {
    accounts:  accounts.length,
    scheduled: posts.filter(p => ['scheduled','publishing'].includes(p.status)).length,
    published: posts.filter(p => p.status === 'published').length,
    failed:    posts.filter(p => p.status === 'failed').length,
  }

  // Posts filtrados por tab + conta
  const filteredPosts = posts.filter(p => {
    const tabMatch     = TABS.find(t => t.value === tab)?.statuses.includes(p.status) ?? false
    const accountMatch = accountFilter === 'all' || p.ig_account_id === accountFilter
    return tabMatch && accountMatch
  })

  const isLoading = loadingAccounts || loadingPosts

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[#0f0f0f] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              Instagram
            </h1>
            <p className="text-[13px] text-[#64748b] mt-1">
              Monitore todas as contas conectadas e o status dos posts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { refetchAccounts(); refetchPosts() }}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-xl border border-[#e8e8e8] bg-white flex items-center justify-center text-[#94a3b8] hover:text-[#0f0f0f] hover:border-[#d0d0d0] transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Contas',     value: stats.accounts,  color: 'text-[#6366f1]', bg: 'bg-indigo-50'  },
            { label: 'Agendados',  value: stats.scheduled, color: 'text-blue-600',   bg: 'bg-blue-50'    },
            { label: 'Publicados', value: stats.published, color: 'text-green-600',  bg: 'bg-green-50'   },
            { label: 'Falhas',     value: stats.failed,    color: 'text-red-600',    bg: 'bg-red-50'     },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border border-[#e8e8e8] ${s.bg} p-4 text-center`}>
              <div className={`text-[22px] font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-[#64748b] mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Contas conectadas ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#94a3b8]" />
            <h2 className="text-[13px] font-semibold text-[#64748b] uppercase tracking-wider">
              Contas conectadas
            </h2>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-[#e8e8e8] p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#94a3b8]" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e8e8e8] p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center mx-auto mb-3">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <p className="text-[14px] font-semibold text-[#0f0f0f]">Nenhuma conta conectada</p>
              <p className="text-[13px] text-[#64748b] mt-1 max-w-xs mx-auto">
                Conecte o Instagram de cada cliente no perfil do cliente.
              </p>
              <Link
                to="/clients"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[#0f0f0f] text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-opacity"
              >
                <Users className="w-3.5 h-3.5" />
                Ir para Clientes
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts.map(acc => (
                <AccountCard key={acc.id} account={acc} posts={posts} />
              ))}
            </div>
          )}
        </div>

        {/* ── Posts ───────────────────────────────────────────────────────── */}
        {(accounts.length > 0 || posts.length > 0) && (
          <div className="bg-white rounded-3xl border border-[#e8e8e8] overflow-hidden">

            {/* Tabs + filtro por conta */}
            <div className="flex items-center justify-between border-b border-[#f0f0f0] px-2 pt-2 gap-2 overflow-x-auto">
              <div className="flex">
                {TABS.map(t => {
                  const count  = posts.filter(p =>
                    t.statuses.includes(p.status) &&
                    (accountFilter === 'all' || p.ig_account_id === accountFilter)
                  ).length
                  const active = tab === t.value
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTab(t.value)}
                      className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium rounded-t-xl transition-colors ${
                        active ? 'text-[#0f0f0f]' : 'text-[#94a3b8] hover:text-[#64748b]'
                      }`}
                    >
                      {t.label}
                      {count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                          active ? 'bg-[#0f0f0f] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                        }`}>
                          {count}
                        </span>
                      )}
                      {active && (
                        <motion.div
                          layoutId="tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0f0f0f] rounded-full"
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Filtro por conta */}
              {accounts.length > 1 && (
                <div className="relative flex-shrink-0 mr-2">
                  <select
                    value={accountFilter}
                    onChange={e => setAccountFilter(e.target.value)}
                    className="appearance-none text-[11px] border border-[#e8e8e8] rounded-xl px-3 py-1.5 pr-7 bg-white text-[#374151] focus:outline-none focus:border-[#6366f1] cursor-pointer"
                  >
                    <option value="all">Todas as contas</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>@{acc.username}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94a3b8] pointer-events-none" />
                </div>
              )}
            </div>

            {/* Lista de posts */}
            <div className="p-4">
              {loadingPosts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#94a3b8]" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-10 h-10 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-5 h-5 text-[#94a3b8]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0f0f0f]">Nenhum post aqui</p>
                  <p className="text-[12px] text-[#94a3b8] mt-1">
                    Posts agendados aparecem aqui após serem criados no perfil do cliente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map(post => (
                    <PostCard key={post.id} post={post} onCancel={handleCancel} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
