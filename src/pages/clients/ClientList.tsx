import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Users, Instagram, Trash2, ChevronDown, Palette, Clock, CheckCircle, FileEdit, XCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { useClients, useDeleteClient } from '@/hooks/useClients'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

// ─── Gradientes disponíveis ───────────────────────────────────────────────────

const GRADIENTS = [
  { id: 'sunset',       value: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',   preview: ['#f97316', '#fbbf24'] },
  { id: 'ocean',        value: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',   preview: ['#3b82f6', '#06b6d4'] },
  { id: 'violet',       value: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',   preview: ['#8b5cf6', '#ec4899'] },
  { id: 'emerald',      value: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',   preview: ['#10b981', '#06b6d4'] },
  { id: 'rose',         value: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',   preview: ['#f43f5e', '#fb923c'] },
  { id: 'indigo',       value: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',   preview: ['#4f46e5', '#7c3aed'] },
  { id: 'lime',         value: 'linear-gradient(135deg, #84cc16 0%, #22c55e 100%)',   preview: ['#84cc16', '#22c55e'] },
  { id: 'pink-purple',  value: 'linear-gradient(135deg, #f9a8d4 0%, #c084fc 100%)',   preview: ['#f9a8d4', '#c084fc'] },
  { id: 'amber-orange', value: 'linear-gradient(135deg, #fcd34d 0%, #fb923c 100%)',   preview: ['#fcd34d', '#fb923c'] },
  { id: 'teal-sky',     value: 'linear-gradient(135deg, #6ee7b7 0%, #38bdf8 100%)',   preview: ['#6ee7b7', '#38bdf8'] },
  { id: 'navy',         value: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',   preview: ['#1e293b', '#3b82f6'] },
  { id: 'coral',        value: 'linear-gradient(135deg, #e94560 0%, #fcd34d 100%)',   preview: ['#e94560', '#fcd34d'] },
]

const DEFAULT_GRADIENT_ID = 'sunset'

/** Converte ID → valor CSS do gradiente */
function gradientById(id: string | null | undefined): string {
  const found = GRADIENTS.find(g => g.id === id)
  return found ? found.value : GRADIENTS[0].value
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  ativo:      { label: 'Ativo',       dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  pausado:    { label: 'Pausado',     dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-800 border-amber-200'       },
  encerrado:  { label: 'Encerrado',   dot: 'bg-red-400',     badge: 'bg-red-50 text-red-800 border-red-200'             },
  lead:       { label: 'Lead',        dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-800 border-blue-200'          },
  proposta:   { label: 'Proposta',    dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-800 border-violet-200'    },
  fechado:    { label: 'Fechado',     dot: 'bg-teal-400',    badge: 'bg-teal-50 text-teal-800 border-teal-200'          },
  onboarding: { label: 'Onboarding', dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-800 border-orange-200'   },
}

const SORT_OPTIONS = [
  { value: 'nome_az', label: 'Nome (A-Z)'    },
  { value: 'nome_za', label: 'Nome (Z-A)'    },
  { value: 'recente', label: 'Mais recentes' },
  { value: 'antigo',  label: 'Mais antigos'  },
]

// ─── Tipos de stats ───────────────────────────────────────────────────────────

interface ClientStats {
  pendentes:         number
  aprovados:         number
  ajuste_solicitado: number
  reprovado:         number
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ClientList() {
  const { data: clients = [], isLoading } = useClients()
  const deleteClient = useDeleteClient()
  const { toast }    = useToast()
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'all' | 'ativo' | 'pausado' | 'encerrado'>('all')
  const [sort, setSort]             = useState('nome_az')
  const [showSort, setShowSort]     = useState(false)
  const [stats, setStats]           = useState<Record<string, ClientStats>>({})
  const [pickerOpen, setPickerOpen] = useState<string | null>(null)
  const [saving, setSaving]         = useState<string | null>(null) // clientId sendo salvo

  // ── Carrega stats do planner por cliente ──────────────────────────────────
  useEffect(() => {
    if (!clients.length) return
    async function fetchStats() {
      const { data } = await supabase
        .from('planner')
        .select('client_id, approval_status')
        .in('client_id', clients.map(c => c.id))

      if (!data) return
      const map: Record<string, ClientStats> = {}
      clients.forEach(c => {
        map[c.id] = { pendentes: 0, aprovados: 0, ajuste_solicitado: 0, reprovado: 0 }
      })
      data.forEach((row: any) => {
        if (!row.client_id || !map[row.client_id]) return
        const as = row.approval_status
        if (!as || as === 'pendente_aprovacao' || as === 'ajuste_realizado') {
          map[row.client_id].pendentes++
        } else if (as === 'aprovado') {
          map[row.client_id].aprovados++
        } else if (as === 'ajuste_solicitado') {
          map[row.client_id].ajuste_solicitado++
        } else if (as === 'reprovado') {
          map[row.client_id].reprovado++
        }
      })
      setStats(map)
    }
    fetchStats()
  }, [clients.map(c => c.id).join()])

  // ── Troca gradiente: tenta Supabase (update direto e RPC), cai em localStorage ──
  async function changeBanner(clientId: string, gradientId: string) {
    if (saving === clientId) return
    setPickerOpen(null)
    setSaving(clientId)

    // 1. Salva localmente de imediato → feedback visual instantâneo em qualquer cenário
    try { localStorage.setItem(`banner_${clientId}`, gradientId) } catch {}

    // 2. Tenta update direto (funciona após PostgREST reiniciado)
    let saved = false
    try {
      const { error } = await (supabase.from('clients') as any)
        .update({ card_gradient: gradientId, updated_at: new Date().toISOString() })
        .eq('id', clientId)
      if (!error) saved = true
    } catch {}

    // 3. Fallback: RPC (também funciona após PostgREST reiniciado)
    if (!saved) {
      try {
        const { error } = await (supabase.rpc as any)('update_client_gradient', {
          p_client_id:   clientId,
          p_gradient_id: gradientId,
        })
        if (!error) saved = true
      } catch {}
    }

    if (!saved) {
      // PostgREST ainda com schema cache antigo — localStorage garantiu o valor localmente
      console.warn('[changeBanner] banco indisponível, usando localStorage. Reinicie o PostgREST no painel do Supabase.')
    }

    // 4. Sempre atualiza a UI com o valor local
    await queryClient.invalidateQueries({ queryKey: ['clients'] })
    setSaving(null)
  }

  // ── Filtragem e ordenação ─────────────────────────────────────────────────
  const filtered = clients
    .filter(c => {
      const q = search.toLowerCase()
      const matchSearch =
        c.company_name.toLowerCase().includes(q) ||
        c.responsible_name.toLowerCase().includes(q) ||
        c.niche.toLowerCase().includes(q) ||
        (c.instagram || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      const matchFilter = filter === 'all' || c.status === filter
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      if (sort === 'nome_az') return a.company_name.localeCompare(b.company_name)
      if (sort === 'nome_za') return b.company_name.localeCompare(a.company_name)
      if (sort === 'recente') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'antigo')  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return 0
    })

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return
    await deleteClient.mutateAsync(id)
    toast('Cliente excluído.', 'success')
  }

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || 'Nome (A-Z)'

  return (
    <div className="min-h-full flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <Header
        title="Clientes"
        subtitle={`${clients.length} cliente${clients.length === 1 ? '' : 's'} cadastrado${clients.length === 1 ? '' : 's'}`}
        action={
          <Button asChild size="sm" variant="premium">
            <Link to="/clients/new">
              <Plus className="w-4 h-4" /> Novo cliente
            </Link>
          </Button>
        }
      />

      {/* ── Conteúdo ─────────────────────────────────────────────────────────── */}
      <div className="flex-1" style={{ background: '#f5f7fb' }}>
        <div className="px-4 sm:px-6 pt-6 pb-12 space-y-5">

          {/* ── Toolbar ───────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0]" />
              <input
                type="text"
                placeholder="Buscar por nome, @handle, segmento ou email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#e2e8f0] bg-white text-[13px] text-[#0f0f0f] placeholder:text-[#b0b0b0] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10 transition-all shadow-sm"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowSort(o => !o)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] bg-white text-[13px] text-[#0f0f0f] hover:border-[#c0c0c0] transition-colors shadow-sm"
              >
                {sortLabel} <ChevronDown className="w-3.5 h-3.5 text-[#a0a0a0]" />
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white border border-[#e2e8f0] rounded-xl shadow-lg overflow-hidden py-1">
                    {SORT_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        onClick={() => { setSort(o.value); setShowSort(false) }}
                        className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[#f5f7fb] transition-colors ${sort === o.value ? 'font-semibold text-[#4f46e5]' : 'text-[#0f0f0f]'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Filtros ───────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { value: 'all',       label: 'Todos'      },
              { value: 'ativo',     label: 'Ativos'     },
              { value: 'pausado',   label: 'Pausados'   },
              { value: 'encerrado', label: 'Encerrados' },
            ] as const).map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all border ${
                  filter === f.value
                    ? 'bg-[#0f0f0f] border-[#0f0f0f] shadow-sm'
                    : 'bg-white text-[#737373] border-[#e2e8f0] hover:border-[#c0c0c0] hover:text-[#0f0f0f]'
                }`}
                style={filter === f.value ? { color: '#ffffff' } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Skeleton ─────────────────────────────────────────────────────── */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-sm animate-pulse">
                  <div className="h-28 bg-gradient-to-r from-[#f0f0f0] to-[#e8e8e8]" />
                  <div className="p-5 pt-10 space-y-3">
                    <div className="h-4 bg-[#f0f0f0] rounded-lg w-3/4" />
                    <div className="h-3 bg-[#f0f0f0] rounded-lg w-1/2" />
                    <div className="h-3 bg-[#f0f0f0] rounded-full w-1/3" />
                    <div className="border-t border-[#f0f0f0] pt-3 mt-4 grid grid-cols-2 gap-2">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="h-12 bg-[#f5f5f5] rounded-xl" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────────── */}
          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#e2e8f0] flex items-center justify-center shadow-sm">
                <Users className="w-8 h-8 text-[#d0d0d0]" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold text-[#0f0f0f]">
                  {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </p>
                <p className="text-[13px] text-[#a0a0a0] mt-1">
                  {search ? 'Tente outra busca' : 'Cadastre seu primeiro cliente agora'}
                </p>
              </div>
              {!search && (
                <Button asChild size="sm" variant="premium" className="mt-2">
                  <Link to="/clients/new">
                    <Plus className="w-4 h-4" /> Novo cliente
                  </Link>
                </Button>
              )}
            </div>
          )}

          {/* ── Grid de cards ─────────────────────────────────────────────────── */}
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence>
                {filtered.map((client, i) => {
                  const cfg          = STATUS_CFG[client.status] || STATUS_CFG.ativo
                  const initials     = client.company_name.slice(0, 2).toUpperCase()
                  // Banco tem prioridade; localStorage é fallback enquanto schema cache recarrega
                  const localGradient = (() => { try { return localStorage.getItem(`banner_${client.id}`) } catch { return null } })()
                  const gradientId    = client.card_gradient || localGradient || DEFAULT_GRADIENT_ID
                  const banner       = gradientById(gradientId)
                  const clientStats  = stats[client.id] || { pendentes: 0, aprovados: 0, ajuste_solicitado: 0, reprovado: 0 }
                  const isPickerOpen = pickerOpen === client.id
                  const isSaving     = saving === client.id

                  return (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      whileHover={{ y: -4, transition: { duration: 0.18 } }}
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm hover:shadow-xl hover:border-[#d0d8e8] transition-all cursor-pointer overflow-hidden group relative"
                    >

                      {/* ── Banner gradiente ──────────────────────────────────── */}
                      <div
                        className="relative h-28 flex-shrink-0"
                        style={{ background: banner }}
                      >
                        <div className="absolute inset-0 bg-black/5 rounded-t-2xl" />

                        {/* Botão paleta */}
                        <button
                          onClick={e => { e.stopPropagation(); setPickerOpen(isPickerOpen ? null : client.id) }}
                          className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-white/25 hover:bg-white/55 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                          title="Mudar cor do banner"
                        >
                          {isSaving
                            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Palette className="w-3.5 h-3.5 text-white drop-shadow" />}
                        </button>

                        {/* Botão deletar */}
                        <button
                          onClick={e => handleDelete(e, client.id, client.company_name)}
                          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/25 hover:bg-red-500/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white drop-shadow" />
                        </button>

                        {/* ── Gradient picker ────────────────────────────────── */}
                        {isPickerOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={e => { e.stopPropagation(); setPickerOpen(null) }}
                            />
                            <div
                              className="absolute top-11 left-3 z-40 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] p-3.5"
                              onClick={e => e.stopPropagation()}
                            >
                              <p className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wider mb-2.5">
                                Cor do banner
                              </p>
                              <div className="grid grid-cols-6 gap-2">
                                {GRADIENTS.map(g => (
                                  <button
                                    key={g.id}
                                    onClick={e => { e.stopPropagation(); changeBanner(client.id, g.id) }}
                                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95 relative flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${g.preview[0]} 0%, ${g.preview[1]} 100%)` }}
                                    title={g.id}
                                  >
                                    {gradientId === g.id && (
                                      <span className="absolute inset-0 rounded-full ring-2 ring-white ring-offset-[2px] ring-offset-[#0f0f0f]" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* ── Avatar ────────────────────────────────────────── */}
                        <div className="absolute -bottom-7 left-5 z-10">
                          {client.logo_url ? (
                            <img
                              src={client.logo_url}
                              alt={client.company_name}
                              className="w-16 h-16 rounded-2xl object-cover border-[3px] border-white shadow-lg"
                            />
                          ) : (
                            <div
                              className="w-16 h-16 rounded-2xl border-[3px] border-white shadow-lg flex items-center justify-center text-white font-bold text-lg select-none"
                              style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)' }}
                            >
                              {initials}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Body ──────────────────────────────────────────────── */}
                      <div className="pt-10 px-5 pb-5">

                        {/* Nome + status */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <h3 className="text-[14px] font-semibold text-[#0f0f0f] leading-snug truncate">
                              {client.company_name}
                            </h3>
                          </div>
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Handle */}
                        {client.instagram && (
                          <div className="flex items-center gap-1.5 ml-4 mb-2.5">
                            <Instagram className="w-3 h-3 text-pink-400 flex-shrink-0" />
                            <span className="text-[12px] text-[#737373] truncate">
                              @{client.instagram.replace('@', '')}
                            </span>
                          </div>
                        )}

                        {/* Nicho */}
                        <div className="ml-4 mb-4">
                          <span className="inline-flex items-center text-[11px] font-medium text-[#555] bg-[#f1f5f9] border border-[#e2e8f0] px-2.5 py-1 rounded-full max-w-full truncate">
                            {client.niche}
                          </span>
                        </div>

                        <div className="border-t border-[#f1f5f9] mb-3" />

                        {/* ── Métricas premium 2×2 ── */}
                        <div className="grid grid-cols-2 gap-2">

                          {/* Pendentes — azul/slate suave */}
                          <div
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                            style={{ background: '#f0f4ff', borderColor: '#c7d4f5' }}
                          >
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4464c4' }} />
                            <span className="text-[11px] font-medium leading-tight flex-1 truncate" style={{ color: '#2d4494' }}>
                              Pendentes
                            </span>
                            <span className="text-[15px] font-semibold flex-shrink-0" style={{ color: '#1e3a8a' }}>
                              {clientStats.pendentes}
                            </span>
                          </div>

                          {/* Aprovados — verde suave */}
                          <div
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                            style={{ background: '#f0fdf4', borderColor: '#bbf0cc' }}
                          >
                            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#16a34a' }} />
                            <span className="text-[11px] font-medium leading-tight flex-1 truncate" style={{ color: '#166534' }}>
                              Aprovados
                            </span>
                            <span className="text-[15px] font-semibold flex-shrink-0" style={{ color: '#14532d' }}>
                              {clientStats.aprovados}
                            </span>
                          </div>

                          {/* Ajustes solicitados — azul acinzentado suave */}
                          <div
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                            style={{ background: '#f5f7ff', borderColor: '#c5cff5' }}
                          >
                            <FileEdit className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5b73e8' }} />
                            <span className="text-[11px] font-medium leading-tight flex-1 truncate" style={{ color: '#3b4fb8' }}>
                              Ajustes
                            </span>
                            <span className="text-[15px] font-semibold flex-shrink-0" style={{ color: '#2d3d99' }}>
                              {clientStats.ajuste_solicitado}
                            </span>
                          </div>

                          {/* Reprovados — vermelho rosado suave */}
                          <div
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                            style={{ background: '#fff5f5', borderColor: '#fecaca' }}
                          >
                            <XCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#dc2626' }} />
                            <span className="text-[11px] font-medium leading-tight flex-1 truncate" style={{ color: '#991b1b' }}>
                              Reprovados
                            </span>
                            <span className="text-[15px] font-semibold flex-shrink-0" style={{ color: '#7f1d1d' }}>
                              {clientStats.reprovado}
                            </span>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
