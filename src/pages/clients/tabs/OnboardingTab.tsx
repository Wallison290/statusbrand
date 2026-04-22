import { useState, useEffect, useRef } from 'react'
import {
  Check, Upload, Trash2, FileText, ImageIcon, Video, File,
  User, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateClient } from '@/hooks/useClients'
import { useToast } from '@/components/ui/toast'
import {
  useChecklist, useToggleChecklist, useUpdateClientStatus,
  useClientDocuments, useAddDocument, useDeleteDocument,
  useClientBriefing, useUpsertBriefing,
  useTeamMembers,
} from '@/hooks/useOnboarding'
import { supabase } from '@/integrations/supabase/client'
import { formatDate } from '@/utils/formatters'
import type { Client, ClientStatus, BriefingData } from '@/types'

// ─── Config de status ─────────────────────────────────────────────────────────

// 'fechado' é gatilho de transição — não aparece como pill navegável
const CLIENT_STATUSES: { value: ClientStatus; label: string; color: string; bg: string }[] = [
  { value: 'lead',        label: 'Lead',        color: 'text-zinc-400',   bg: 'bg-zinc-400/10 border-zinc-400/20' },
  { value: 'proposta',    label: 'Proposta',    color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20' },
  { value: 'onboarding',  label: 'Onboarding',  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  { value: 'ativo',       label: 'Ativo',       color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20' },
  { value: 'pausado',     label: 'Pausado',     color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
  { value: 'encerrado',   label: 'Encerrado',   color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20' },
]

function getStatusConfig(status: string) {
  return CLIENT_STATUSES.find(s => s.value === status) ?? CLIENT_STATUSES[4]
}

// ─── Ícone de tipo de arquivo ─────────────────────────────────────────────────

function DocTypeIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
  if (type.startsWith('video/')) return <Video className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
  if (type === 'application/pdf') return <FileText className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
  return <File className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ─── Seção: Status ────────────────────────────────────────────────────────────

function StatusSection({ client }: { client: Client }) {
  const updateStatus = useUpdateClientStatus()
  const { toast } = useToast()
  const current = getStatusConfig(client.status)

  const handleChange = async (status: ClientStatus) => {
    if (status === client.status) return
    try {
      await updateStatus.mutateAsync({ id: client.id, status })
      toast('Status atualizado.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleFechado = async () => {
    try {
      await updateStatus.mutateAsync({ id: client.id, status: 'fechado' })
      toast('Negócio fechado! Checklist de onboarding criado automaticamente.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleFinalizar = async () => {
    try {
      await updateStatus.mutateAsync({ id: client.id, status: 'ativo' })
      toast('Onboarding finalizado! Cliente agora está Ativo.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Status do cliente</p>
        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-normal ${current.color} ${current.bg}`}>
          {current.label}
        </span>
      </div>

      {/* Pills de navegação (exceto 'fechado') */}
      <div className="flex flex-wrap gap-1.5">
        {CLIENT_STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => handleChange(s.value)}
            disabled={updateStatus.isPending}
            className={`px-3 py-1.5 rounded-md border text-[12px] transition-colors ${
              client.status === s.value
                ? `${s.color} ${s.bg} font-medium`
                : 'text-zinc-500 bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:text-zinc-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Ação: Iniciar onboarding (apenas quando não está em onboarding/ativo) */}
      {client.status !== 'onboarding' && client.status !== 'ativo' && (
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleFechado}
            disabled={updateStatus.isPending}
            className="px-3 py-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[12px] hover:bg-purple-500/20 transition-colors disabled:opacity-50"
          >
            Negócio fechado → Iniciar onboarding
          </button>
          <p className="text-[11px] text-zinc-600">Cria checklist e inicia o processo.</p>
        </div>
      )}

      {/* CTA: Finalizar onboarding */}
      {client.status === 'onboarding' && (
        <button
          onClick={handleFinalizar}
          disabled={updateStatus.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-green-500/30 bg-green-600/10 text-green-300 text-[13px] font-medium hover:bg-green-600/20 transition-colors disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          Finalizar onboarding → Marcar como Ativo
        </button>
      )}
    </div>
  )
}

// ─── Seção: Checklist ─────────────────────────────────────────────────────────

function ChecklistSection({ clientId }: { clientId: string }) {
  const { data: items = [] } = useChecklist(clientId)
  const toggle = useToggleChecklist()

  const completed = items.filter(i => i.completed).length
  const total = items.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Checklist de Onboarding</p>
        <span className="text-[11px] text-zinc-500 tabular-nums">{completed}/{total}</span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-green-600 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => toggle.mutate({ id: item.id, completed: !item.completed, clientId })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-white/[0.04] transition-colors group text-left"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
              item.completed
                ? 'bg-green-600 border-green-600'
                : 'border-white/[0.20] group-hover:border-white/[0.35]'
            }`}>
              {item.completed && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className={`text-[13px] transition-colors ${
              item.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'
            }`}>
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Seção: Responsável ───────────────────────────────────────────────────────

function ResponsibleSection({ client }: { client: Client }) {
  const { data: members = [] } = useTeamMembers()
  const updateClient = useUpdateClient()
  const { toast } = useToast()

  const handleChange = async (userId: string) => {
    const value = userId === '__none__' ? null : userId
    try {
      await updateClient.mutateAsync({ id: client.id, responsible_user_id: value })
      toast('Responsável atualizado.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const current = members.find(m => m.id === client.responsible_user_id)

  return (
    <div>
      <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-3">Responsável Interno</p>
      <Select
        value={client.responsible_user_id ?? '__none__'}
        onValueChange={handleChange}
      >
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-zinc-500" />
            <SelectValue placeholder="Sem responsável">
              {current
                ? (current.full_name || current.email)
                : 'Sem responsável'}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Sem responsável</SelectItem>
          {members.map(m => (
            <SelectItem key={m.id} value={m.id}>
              {m.full_name || m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ─── Seção: Documentos ────────────────────────────────────────────────────────

function DocumentsSection({ clientId }: { clientId: string }) {
  const { user } = useAuth()
  const { data: docs = [] } = useClientDocuments(clientId)
  const addDoc = useAddDocument()
  const deleteDoc = useDeleteDocument()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${user.id}/${clientId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('client-documents').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('client-documents').getPublicUrl(path)
      await addDoc.mutateAsync({
        client_id: clientId,
        user_id: user.id,
        name: file.name,
        file_url: publicUrl,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
      })
      toast('Documento adicionado.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id: string, fileUrl: string) => {
    try {
      await deleteDoc.mutateAsync({ id, clientId, fileUrl })
      toast('Documento removido.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Documentos</p>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <><Upload className="w-3 h-3 animate-pulse" /> Enviando...</>
          ) : (
            <><Upload className="w-3 h-3" /> Adicionar arquivo</>
          )}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-white/[0.06] rounded-lg">
          <p className="text-[12px] text-zinc-600">Nenhum documento ainda. Faça upload de logos, manuais, fotos...</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map(doc => {
            const isImg = doc.file_type.startsWith('image/')
            return (
              <div
                key={doc.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-white/[0.06] bg-white/[0.02] group"
              >
                {isImg ? (
                  <img
                    src={doc.file_url}
                    alt={doc.name}
                    className="w-8 h-8 rounded object-cover flex-shrink-0 border border-white/[0.08]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                    <DocTypeIcon type={doc.file_type} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-zinc-200 truncate">{doc.name}</p>
                  <p className="text-[10px] text-zinc-600">{formatDate(doc.created_at)}{doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}</p>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {confirmingId === doc.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5"
                    >Não</button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.file_url)}
                      className="text-[10px] text-red-400 hover:text-red-300 px-1.5"
                    >Sim</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingId(doc.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Seção: Briefing ──────────────────────────────────────────────────────────

type BriefingBlock = {
  key: string
  title: string
  fields: Array<
    | { key: keyof BriefingData; label: string; type: 'textarea'; placeholder?: string }
    | { key: keyof BriefingData; label: string; type: 'input'; placeholder?: string }
    | { key: keyof BriefingData; label: string; type: 'toggle' }
    | { key: keyof BriefingData; label: string; type: 'checkbox' }
  >
}

const BRIEFING_BLOCKS: BriefingBlock[] = [
  {
    key: 'empresa',
    title: 'Empresa',
    fields: [
      { key: 'como_nasceu',           label: 'Como nasceu a empresa?',            type: 'textarea', placeholder: 'História de origem...' },
      { key: 'servicos_mais_vende',   label: 'Serviços / produtos que mais vende', type: 'textarea', placeholder: 'Liste os principais...' },
      { key: 'servicos_quer_vender',  label: 'O que quer vender mais?',           type: 'textarea', placeholder: 'Foco de crescimento...' },
      { key: 'diferencial_empresa',   label: 'Principal diferencial',             type: 'textarea', placeholder: 'O que te torna único...' },
      { key: 'concorrentes',          label: 'Principais concorrentes',           type: 'textarea', placeholder: 'Nomes ou perfis...' },
      { key: 'regiao_atendida',       label: 'Região atendida',                   type: 'input',    placeholder: 'Ex: São Paulo, online, nacional...' },
    ],
  },
  {
    key: 'publico',
    title: 'Público',
    fields: [
      { key: 'quem_compra_hoje',  label: 'Quem compra hoje?',               type: 'textarea', placeholder: 'Perfil atual de clientes...' },
      { key: 'quem_quer_atrair', label: 'Quem quer atrair?',               type: 'textarea', placeholder: 'Perfil desejado...' },
      { key: 'maior_dor',        label: 'Maior dor do cliente final',      type: 'textarea', placeholder: 'Principal problema que resolve...' },
      { key: 'gatilho_decisao',  label: 'Gatilho de decisão de compra',    type: 'textarea', placeholder: 'O que faz o cliente comprar...' },
    ],
  },
  {
    key: 'marketing',
    title: 'Marketing',
    fields: [
      { key: 'rodou_trafego_pago',    label: 'Já rodou tráfego pago?',  type: 'toggle' },
      { key: 'teve_agencia',          label: 'Já teve agência?',         type: 'toggle' },
      { key: 'o_que_funcionou',       label: 'O que funcionou',          type: 'textarea', placeholder: 'Estratégias que deram resultado...' },
      { key: 'o_que_nao_funcionou',   label: 'O que não funcionou',      type: 'textarea', placeholder: 'O que evitar...' },
    ],
  },
  {
    key: 'objetivos',
    title: 'Objetivos',
    fields: [
      { key: 'obj_mais_leads',              label: 'Mais leads',                  type: 'checkbox' },
      { key: 'obj_mais_vendas',             label: 'Mais vendas',                 type: 'checkbox' },
      { key: 'obj_autoridade',              label: 'Gerar autoridade',            type: 'checkbox' },
      { key: 'obj_crescimento_instagram',   label: 'Crescimento no Instagram',    type: 'checkbox' },
      { key: 'obj_posicionamento_premium',  label: 'Posicionamento premium',      type: 'checkbox' },
    ],
  },
]

function BriefingSection({ clientId }: { clientId: string }) {
  const { data: briefing } = useClientBriefing(clientId)
  const upsert = useUpsertBriefing()
  const { toast } = useToast()
  const [form, setForm] = useState<BriefingData>({})
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({
    empresa: true, publico: true, marketing: true, objetivos: true,
  })

  useEffect(() => {
    if (briefing?.data) setForm(briefing.data)
  }, [briefing])

  const setField = (key: keyof BriefingData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ clientId, data: form })
      toast('Briefing salvo!', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const toggleBlock = (key: string) => {
    setOpenBlocks(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Briefing Completo</p>
        <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? 'Salvando...' : 'Salvar briefing'}
        </Button>
      </div>

      <div className="space-y-3">
        {BRIEFING_BLOCKS.map(block => (
          <div
            key={block.key}
            className="rounded-lg border border-white/[0.06] overflow-hidden"
          >
            {/* Header do bloco */}
            <button
              type="button"
              onClick={() => toggleBlock(block.key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <p className="text-[13px] font-medium text-zinc-200">{block.title}</p>
              {openBlocks[block.key]
                ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              }
            </button>

            {/* Campos do bloco */}
            {openBlocks[block.key] && (
              <div className="p-4 space-y-3 border-t border-white/[0.06]">
                {block.fields.map(field => {
                  if (field.type === 'textarea') {
                    return (
                      <Textarea
                        key={field.key as string}
                        label={field.label}
                        value={(form[field.key] as string) || ''}
                        onChange={e => setField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                      />
                    )
                  }

                  if (field.type === 'input') {
                    return (
                      <div key={field.key as string}>
                        <label className="block text-[12px] font-normal text-zinc-500 mb-1.5">
                          {field.label}
                        </label>
                        <input
                          type="text"
                          value={(form[field.key] as string) || ''}
                          onChange={e => setField(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="flex h-8 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15 transition-colors"
                        />
                      </div>
                    )
                  }

                  if (field.type === 'toggle') {
                    const val = form[field.key] as boolean | undefined
                    return (
                      <div key={field.key as string} className="flex items-center justify-between">
                        <label className="text-[13px] text-zinc-300">{field.label}</label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setField(field.key, true)}
                            className={`px-3 py-1 rounded-md text-[12px] border transition-colors ${
                              val === true
                                ? 'bg-green-600/20 border-green-500/30 text-green-300'
                                : 'bg-white/[0.04] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                            }`}
                          >Sim</button>
                          <button
                            type="button"
                            onClick={() => setField(field.key, false)}
                            className={`px-3 py-1 rounded-md text-[12px] border transition-colors ${
                              val === false
                                ? 'bg-red-600/20 border-red-500/30 text-red-300'
                                : 'bg-white/[0.04] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                            }`}
                          >Não</button>
                        </div>
                      </div>
                    )
                  }

                  if (field.type === 'checkbox') {
                    const val = form[field.key] as boolean | undefined
                    return (
                      <button
                        key={field.key as string}
                        type="button"
                        onClick={() => setField(field.key, !val)}
                        className="flex items-center gap-2.5 w-full text-left hover:bg-white/[0.02] rounded px-1 py-1 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          val
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-white/[0.20]'
                        }`}>
                          {val && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-[13px] ${val ? 'text-zinc-200' : 'text-zinc-400'}`}>
                          {field.label}
                        </span>
                      </button>
                    )
                  }

                  return null
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function OnboardingTab({ client }: { client: Client }) {
  return (
    <div className="space-y-8">
      {/* 1. Status */}
      <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <StatusSection client={client} />
      </div>

      {/* 2. Checklist — só visível durante onboarding */}
      {client.status === 'onboarding' ? (
        <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <ChecklistSection clientId={client.id} />
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-dashed border-white/[0.06] bg-transparent">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">Checklist de Onboarding</p>
          <p className="text-[12px] text-zinc-600">
            O checklist fica disponível quando o cliente está em <span className="text-yellow-400">Onboarding</span>.
            {' '}Use o botão <span className="text-purple-400">Negócio fechado → Iniciar onboarding</span> acima para começar.
          </p>
        </div>
      )}

      {/* 3. Responsável */}
      <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <ResponsibleSection client={client} />
      </div>

      {/* 4. Documentos */}
      <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <DocumentsSection clientId={client.id} />
      </div>

      {/* 5. Briefing */}
      <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <BriefingSection clientId={client.id} />
      </div>
    </div>
  )
}
