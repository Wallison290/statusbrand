// ── Página: WhatsApp ───────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  MessageCircle, Users, CheckCircle2, XCircle, Loader2,
  Plus, Trash2, ChevronDown, ChevronUp, Search, X, Phone,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useWhatsappSettings, WHATSAPP_CATEGORIES } from '@/hooks/useWhatsappSettings'
import {
  useWhatsappGroups,
  useAddWhatsappGroup,
  useUpdateWhatsappGroup,
  useDeleteWhatsappGroup,
  useFetchEvolutionGroups,
  type WhatsappGroup,
  type EvolutionGroup,
} from '@/hooks/useWhatsappGroups'
import type { WhatsappPrefs } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_CATS: WhatsappPrefs = {
  aprovacoes: true, tarefas: true, instagram: true, solicitacoes: true,
}

// ── Category toggles (reutilizável) ──────────────────────────────────────────

function CategoryToggles({
  value,
  onChange,
  disabled,
}: {
  value: WhatsappPrefs
  onChange: (k: keyof WhatsappPrefs, v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      {WHATSAPP_CATEGORIES.map(cat => (
        <label
          key={cat.key}
          className={`flex items-center justify-between gap-3 cursor-pointer rounded-xl px-3 py-2.5 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1F2937]/40'}`}
          style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)' }}
        >
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--sm-text-1)' }}>{cat.label}</p>
            <p className="text-[11px]" style={{ color: 'var(--sm-text-2)' }}>{cat.hint}</p>
          </div>
          <div
            onClick={() => !disabled && onChange(cat.key, !value[cat.key])}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${value[cat.key] ? 'bg-[#22C55E]' : 'bg-[#374151]'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value[cat.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </label>
      ))}
    </div>
  )
}

// ── Modal: adicionar grupo ────────────────────────────────────────────────────

function AddGroupModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const fetchGroups  = useFetchEvolutionGroups()
  const addGroup     = useAddWhatsappGroup()
  const [groups, setGroups]     = useState<EvolutionGroup[]>([])
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<EvolutionGroup | null>(null)
  const [cats, setCats]         = useState<WhatsappPrefs>(DEFAULT_CATS)
  const [step, setStep]         = useState<'pick' | 'config'>('pick')
  const [loaded, setLoaded]     = useState(false)

  async function load() {
    try {
      const result = await fetchGroups.mutateAsync(undefined)
      setGroups(result)
      setLoaded(true)
    } catch (err: any) {
      toast(err?.message ?? 'Não foi possível carregar os grupos', 'error')
    }
  }

  async function save() {
    if (!selected) return
    try {
      await addGroup.mutateAsync({
        group_jid:  selected.jid,
        group_name: selected.name,
        categories: cats,
      })
      toast(`Grupo "${selected.name}" adicionado!`, 'success')
      onClose()
    } catch (err: any) {
      toast(err?.message ?? 'Erro ao salvar grupo', 'error')
    }
  }

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--sm-bg)', border: '1px solid var(--sm-border)', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--sm-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#22C55E20' }}>
              <Users className="w-4 h-4 text-[#22C55E]" />
            </div>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>
              {step === 'pick' ? 'Escolher grupo' : 'Configurar notificações'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1F2937] transition-colors">
            <X className="w-4 h-4" style={{ color: 'var(--sm-text-2)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'pick' ? (
            <>
              <p className="text-[13px]" style={{ color: 'var(--sm-text-2)' }}>
                O número do WhatsApp conectado precisa ser participante do grupo para poder enviar mensagens.
              </p>

              {!loaded ? (
                <button
                  onClick={load}
                  disabled={fetchGroups.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium text-white transition-colors"
                  style={{ background: '#25D366' }}
                >
                  {fetchGroups.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Carregando grupos...</>
                    : <><MessageCircle className="w-4 h-4" /> Carregar grupos disponíveis</>
                  }
                </button>
              ) : (
                <>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)' }}
                  >
                    <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--sm-text-2)' }} />
                    <input
                      type="text"
                      placeholder="Buscar grupo..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-[13px] outline-none"
                      style={{ color: 'var(--sm-text-1)' }}
                    />
                  </div>

                  {filtered.length === 0 ? (
                    <p className="text-center text-[13px] py-4" style={{ color: 'var(--sm-text-2)' }}>
                      Nenhum grupo encontrado.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {filtered.map(g => (
                        <button
                          key={g.jid}
                          onClick={() => setSelected(g)}
                          className="w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5"
                          style={{
                            background: selected?.jid === g.jid ? '#22C55E20' : 'var(--sm-bg-alt)',
                            border: `1px solid ${selected?.jid === g.jid ? '#22C55E60' : 'var(--sm-border)'}`,
                            color: 'var(--sm-text-1)',
                          }}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: selected?.jid === g.jid ? '#22C55E30' : 'var(--sm-border)' }}>
                            <Users className="w-4 h-4" style={{ color: selected?.jid === g.jid ? '#22C55E' : 'var(--sm-text-2)' }} />
                          </div>
                          <span className="text-[13px] font-medium truncate">{g.name}</span>
                          {selected?.jid === g.jid && (
                            <CheckCircle2 className="w-4 h-4 text-[#22C55E] ml-auto flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: '#22C55E15', border: '1px solid #22C55E30' }}
              >
                <Users className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>{selected?.name}</span>
              </div>
              <p className="text-[13px]" style={{ color: 'var(--sm-text-2)' }}>
                Escolha quais tipos de notificação serão enviadas para este grupo:
              </p>
              <CategoryToggles
                value={cats}
                onChange={(k, v) => setCats(prev => ({ ...prev, [k]: v }))}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--sm-border)' }}>
          {step === 'config' && (
            <button
              onClick={() => setStep('pick')}
              className="px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
              style={{ background: 'var(--sm-bg-alt)', color: 'var(--sm-text-2)', border: '1px solid var(--sm-border)' }}
            >
              Voltar
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
            style={{ background: 'var(--sm-bg-alt)', color: 'var(--sm-text-2)', border: '1px solid var(--sm-border)' }}
          >
            Cancelar
          </button>
          {step === 'pick' ? (
            <button
              onClick={() => selected && setStep('config')}
              disabled={!selected}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
              style={{ background: '#25D366' }}
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={save}
              disabled={addGroup.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: '#25D366' }}
            >
              {addGroup.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Salvar grupo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({ group }: { group: WhatsappGroup }) {
  const { toast }    = useToast()
  const updateGroup  = useUpdateWhatsappGroup()
  const deleteGroup  = useDeleteWhatsappGroup()
  const [expanded, setExpanded] = useState(false)
  const [cats, setCats] = useState<WhatsappPrefs>(group.categories)

  async function handleToggle(k: keyof WhatsappPrefs, v: boolean) {
    const next = { ...cats, [k]: v }
    setCats(next)
    await updateGroup.mutateAsync({ id: group.id, categories: next }).catch(() => {
      setCats(cats)
      toast('Erro ao salvar preferência', 'error')
    })
  }

  async function handleDelete() {
    if (!confirm(`Remover grupo "${group.group_name}"?`)) return
    await deleteGroup.mutateAsync(group.id)
    toast(`Grupo "${group.group_name}" removido`, 'success')
  }

  const activeCount = Object.values(cats).filter(Boolean).length

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)' }}
    >
      {/* Header do card */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#25D36620', border: '1px solid #25D36640' }}>
          <Users className="w-4.5 h-4.5 text-[#25D366]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--sm-text-1)' }}>
            {group.group_name}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--sm-text-2)' }}>
            {activeCount === 4 ? 'Todas as categorias ativas' : `${activeCount} categoria${activeCount !== 1 ? 's' : ''} ativa${activeCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleteGroup.isPending}
          className="p-1.5 rounded-lg hover:bg-[#EF444420] hover:text-[#EF4444] transition-colors mr-1"
          style={{ color: 'var(--sm-text-2)' }}
          title="Remover grupo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--sm-text-2)' }}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Categorias expandíveis */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--sm-border)' }}>
          <p className="text-[11px] pt-3 pb-2 font-medium" style={{ color: 'var(--sm-text-2)' }}>
            NOTIFICAÇÕES DESTE GRUPO
          </p>
          <CategoryToggles
            value={cats}
            onChange={handleToggle}
            disabled={updateGroup.isPending}
          />
        </div>
      )}
    </div>
  )
}

// ── Seção com título ──────────────────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>{title}</h2>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--sm-text-2)' }}>{description}</p>
      </div>
      {children}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function WhatsAppPage() {
  const { toast } = useToast()
  const {
    whatsapp, optIn, verified, prefs, notifyClient, busy,
    setOptIn, savePrefs, saveNotifyClient, sendCode, confirmCode,
  } = useWhatsappSettings()

  const { data: groups = [], isLoading: loadingGroups } = useWhatsappGroups()
  const [showAddModal, setShowAddModal] = useState(false)
  const [localPrefs, setLocalPrefs]     = useState<WhatsappPrefs | null>(null)
  const [phone, setPhone]               = useState(whatsapp)
  const [code, setCode]                 = useState('')
  const [stage, setStage]               = useState<'idle' | 'code'>('idle')

  const currentPrefs = localPrefs ?? prefs
  const isConnected  = !!whatsapp && verified

  async function handleSend() {
    try {
      await sendCode(phone)
      setStage('code')
      toast('Código enviado pelo WhatsApp!', 'success')
    } catch (err: any) { toast(err.message, 'error') }
  }

  async function handleConfirm() {
    try {
      await confirmCode(code)
      setStage('idle')
      setCode('')
      toast('WhatsApp verificado! Você já recebe as notificações.', 'success')
    } catch (err: any) { toast(err.message, 'error') }
  }

  async function handlePrefToggle(k: keyof WhatsappPrefs, v: boolean) {
    const next = { ...currentPrefs, [k]: v }
    setLocalPrefs(next)
    await savePrefs(next).catch(() => {
      setLocalPrefs(null)
      toast('Erro ao salvar preferência', 'error')
    })
  }

  return (
    <div className="min-h-full p-6" style={{ background: 'var(--sm-bg)' }}>
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#25D36620', border: '1px solid #25D36640' }}>
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold" style={{ color: 'var(--sm-text-1)' }}>WhatsApp</h1>
            <p className="text-[13px]" style={{ color: 'var(--sm-text-2)' }}>
              Notificações automáticas via WhatsApp para a agência e clientes
            </p>
          </div>
        </div>

        {/* ── Bloco 1: Conexão ───────────────────────────────────────────────── */}
        <Section
          title="Conexão"
          description="Número do WhatsApp que receberá as notificações do sistema."
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)' }}
          >
            {/* Status atual */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: isConnected ? '#22C55E20' : '#F59E0B20' }}
              >
                {isConnected
                  ? <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                  : <Phone className="w-5 h-5 text-[#F59E0B]" />
                }
              </div>
              <div className="flex-1 min-w-0">
                {isConnected ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>{whatsapp}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#22C55E20] text-[#22C55E]">Verificado</span>
                    </div>
                    <p className="text-[12px] text-[#22C55E] mt-0.5">Número conectado e ativo</p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>Nenhum número verificado</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--sm-text-2)' }}>
                      Insira seu número abaixo para começar a receber notificações
                    </p>
                  </>
                )}
              </div>
              {isConnected && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[12px]" style={{ color: 'var(--sm-text-2)' }}>
                    {optIn ? 'Ativo' : 'Pausado'}
                  </span>
                  <div
                    onClick={() => setOptIn(!optIn)}
                    className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${optIn ? 'bg-[#22C55E]' : 'bg-[#374151]'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${optIn ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Formulário de verificação */}
            <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--sm-border)' }}>
              <p className="text-[11px] pt-3 font-medium" style={{ color: 'var(--sm-text-2)' }}>
                {isConnected ? 'ALTERAR NÚMERO' : 'VERIFICAR NÚMERO'}
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="DDD + número (ex: 11999998888)"
                  className="flex-1 h-9 px-3 rounded-xl text-[13px] outline-none transition-colors"
                  style={{
                    background: 'var(--sm-bg)',
                    border: '1px solid var(--sm-border)',
                    color: 'var(--sm-text-1)',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={busy || phone.replace(/\D/g, '').length < 10}
                  className="h-9 px-4 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                  style={{ background: '#25D366' }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isConnected ? 'Reverificar' : 'Verificar'}
                </button>
              </div>

              {stage === 'code' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Código de 6 dígitos recebido no WhatsApp"
                    className="flex-1 h-9 px-3 rounded-xl text-[13px] tracking-widest outline-none"
                    style={{
                      background: 'var(--sm-bg)',
                      border: '1px solid #25D36660',
                      color: 'var(--sm-text-1)',
                    }}
                  />
                  <button
                    onClick={handleConfirm}
                    disabled={busy || code.length !== 6}
                    className="h-9 px-4 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: '#25D366' }}
                  >
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Bloco 2: Notificações para a agência ──────────────────────────── */}
        <Section
          title="Notificações para você"
          description="Receba uma mensagem neste número quando esses eventos acontecerem no sistema."
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)' }}
          >
            <div className="p-4">
              <CategoryToggles
                value={currentPrefs}
                onChange={handlePrefToggle}
                disabled={busy || !isConnected || !optIn}
              />
            </div>
            {(!isConnected || !optIn) && (
              <div className="px-4 pb-4">
                <p className="text-[11px] text-center py-2 rounded-xl" style={{ background: '#F59E0B15', color: '#FBBF24', border: '1px solid #F59E0B20' }}>
                  {!isConnected ? 'Configure o número para ativar as notificações' : 'Ative o toggle acima para receber notificações'}
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* ── Bloco 3: Notificações para clientes ───────────────────────────── */}
        <Section
          title="Notificações para clientes"
          description="Quando um conteúdo for enviado para aprovação ou ajuste concluído, o cliente recebe uma mensagem no WhatsApp dele."
        >
          <label
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-colors"
            style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)' }}
          >
            <div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--sm-text-1)' }}>
                Enviar mensagem para o cliente
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--sm-text-2)' }}>
                O número do WhatsApp deve estar cadastrado no perfil de cada cliente
              </p>
            </div>
            <div
              onClick={() => saveNotifyClient(!notifyClient)}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${notifyClient ? 'bg-[#22C55E]' : 'bg-[#374151]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifyClient ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </label>
        </Section>

        {/* ── Bloco 4: Grupos ────────────────────────────────────────────────── */}
        <Section
          title="Grupos"
          description="Envie as mesmas notificações para grupos do WhatsApp. Útil para grupos de equipe ou grupos com o cliente."
        >
          {!isConnected && (
            <div
              className="text-center py-6 rounded-2xl text-[13px]"
              style={{ background: 'var(--sm-bg-alt)', border: '1px solid var(--sm-border)', color: 'var(--sm-text-2)' }}
            >
              Configure e verifique o número para poder adicionar grupos.
            </div>
          )}

          {isConnected && (
            <>
              {loadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--sm-text-2)' }} />
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.length === 0 ? (
                    <div
                      className="text-center py-8 rounded-2xl space-y-3"
                      style={{ background: 'var(--sm-bg-alt)', border: '1px dashed var(--sm-border)' }}
                    >
                      <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center"
                        style={{ background: '#25D36615', border: '1px solid #25D36630' }}>
                        <Users className="w-5 h-5 text-[#25D366]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--sm-text-1)' }}>
                          Nenhum grupo configurado
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: 'var(--sm-text-2)' }}>
                          Adicione um grupo para receber notificações por lá também
                        </p>
                      </div>
                    </div>
                  ) : (
                    groups.map(g => <GroupCard key={g.id} group={g} />)
                  )}

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold transition-colors"
                    style={{
                      background: '#25D36615',
                      border: '1px dashed #25D36640',
                      color: '#25D366',
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar grupo
                  </button>
                </div>
              )}
            </>
          )}
        </Section>

      </div>

      {showAddModal && <AddGroupModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
