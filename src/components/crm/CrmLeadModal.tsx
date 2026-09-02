// ── Modal de cadastro/edição de lead ─────────────────────────────────────────

import { useState, useEffect } from 'react'
import {
  Trash2, Loader2, UserPlus, MessageCircle, Mail, Instagram, Building2,
  CalendarClock, Wallet, Flame, Tag, StickyNote, ArrowRightLeft,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import {
  useCreateCrmLead, useUpdateCrmLead, useDeleteCrmLead, type CrmLeadInput,
} from '@/hooks/useCrm'
import { CRM_SOURCES } from '@/data/crmTemplates'
import type { CrmColumn, CrmLead, CrmTemperature } from '@/types'

interface Props {
  open:        boolean
  onClose:     () => void
  lead:        CrmLead | null      // null = criando
  columns:     CrmColumn[]
  columnId:    string              // coluna de destino ao criar
  onConvert?:  (lead: CrmLead) => void
}

const TEMPERATURES: { value: CrmTemperature; label: string; color: string }[] = [
  { value: 'frio',   label: 'Frio',   color: '#4F8EF7' },
  { value: 'morno',  label: 'Morno',  color: '#F5A623' },
  { value: 'quente', label: 'Quente', color: '#ef4444' },
]

// Campo com rótulo em caixa alta, o mesmo padrão dos outros modais do sistema
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--sm-text-3)' }}>
        {icon}{label}
      </label>
      {children}
    </div>
  )
}

const selectClass =
  'flex h-9 w-full rounded-md border border-[#1e293b] bg-[#182233] px-3 text-[13px] text-[#E2E8F0] ' +
  'focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB]/50 [color-scheme:dark]'

export function CrmLeadModal({ open, onClose, lead, columns, columnId, onConvert }: Props) {
  const { toast } = useToast()
  const { data: members = [] } = useTeamMembers()
  const activeMembers = members.filter(m => m.is_active)

  const createLead = useCreateCrmLead()
  const updateLead = useUpdateCrmLead()
  const deleteLead = useDeleteCrmLead()
  const saving = createLead.isPending || updateLead.isPending

  const [form, setForm] = useState<CrmLeadInput>({ name: '', column_id: columnId })
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Recarrega o formulário sempre que o modal abre — abrir outro lead não pode
  // herdar o que estava digitado no anterior.
  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    setForm(lead
      ? {
          name:                lead.name,
          column_id:           lead.column_id,
          company:             lead.company,
          whatsapp:            lead.whatsapp,
          email:               lead.email,
          instagram:           lead.instagram,
          source:              lead.source,
          estimated_value:     lead.estimated_value,
          temperature:         lead.temperature ?? 'morno',
          responsible_user_id: lead.responsible_user_id,
          next_contact_at:     lead.next_contact_at,
          notes:               lead.notes,
        }
      : { name: '', column_id: columnId, temperature: 'morno' })
  }, [open, lead, columnId])

  function set<K extends keyof CrmLeadInput>(key: K, value: CrmLeadInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const name = (form.name ?? '').trim()
    if (!name) { toast('Dê um nome ao lead', 'warning'); return }

    // Campos de texto vazios viram null para não poluir o card com string vazia
    const payload = {
      ...form,
      name,
      company:   form.company?.trim()   || null,
      whatsapp:  form.whatsapp?.trim()  || null,
      email:     form.email?.trim()     || null,
      instagram: form.instagram?.trim() || null,
      source:    form.source?.trim()    || null,
      notes:     form.notes?.trim()     || null,
      next_contact_at: form.next_contact_at || null,
      responsible_user_id: form.responsible_user_id || null,
      estimated_value: form.estimated_value ?? null,
    }

    try {
      if (lead) {
        await updateLead.mutateAsync({ id: lead.id, ...payload })
        toast('Lead atualizado', 'success')
      } else {
        await createLead.mutateAsync(payload as CrmLeadInput)
        toast('Lead cadastrado', 'success')
      }
      onClose()
    } catch (err: any) {
      toast(err.message ?? 'Erro ao salvar o lead', 'error')
    }
  }

  async function handleDelete() {
    if (!lead) return
    try {
      await deleteLead.mutateAsync(lead.id)
      toast('Lead excluído', 'success')
      onClose()
    } catch (err: any) {
      toast(err.message ?? 'Erro ao excluir', 'error')
    }
  }

  const currentColumn = columns.find(c => c.id === form.column_id)
  const isWonColumn   = currentColumn?.stage_type === 'ganho'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" style={{ color: '#4F8EF7' }} />
            {lead ? 'Editar lead' : 'Novo lead'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome do contato">
              <Input
                autoFocus
                value={form.name ?? ''}
                onChange={e => set('name', e.target.value)}
                placeholder="Ex: Marina Souza"
              />
            </Field>
            <Field label="Empresa" icon={<Building2 className="w-3 h-3" />}>
              <Input
                value={form.company ?? ''}
                onChange={e => set('company', e.target.value)}
                placeholder="Ex: Clínica Vida"
              />
            </Field>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="WhatsApp" icon={<MessageCircle className="w-3 h-3" />}>
              <Input
                value={form.whatsapp ?? ''}
                onChange={e => set('whatsapp', e.target.value)}
                placeholder="(87) 90000-0000"
              />
            </Field>
            <Field label="E-mail" icon={<Mail className="w-3 h-3" />}>
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={e => set('email', e.target.value)}
                placeholder="contato@empresa.com"
              />
            </Field>
            <Field label="Instagram" icon={<Instagram className="w-3 h-3" />}>
              <Input
                value={form.instagram ?? ''}
                onChange={e => set('instagram', e.target.value)}
                placeholder="@perfil"
              />
            </Field>
          </div>

          {/* Negócio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Origem" icon={<Tag className="w-3 h-3" />}>
              <input
                list="crm-sources"
                className={selectClass}
                value={form.source ?? ''}
                onChange={e => set('source', e.target.value)}
                placeholder="De onde veio"
              />
              <datalist id="crm-sources">
                {CRM_SOURCES.map(s => <option key={s} value={s} />)}
              </datalist>
            </Field>
            <Field label="Valor estimado" icon={<Wallet className="w-3 h-3" />}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.estimated_value ?? ''}
                onChange={e => set('estimated_value', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="0,00"
              />
            </Field>
            <Field label="Próximo contato" icon={<CalendarClock className="w-3 h-3" />}>
              <Input
                type="date"
                value={form.next_contact_at ?? ''}
                onChange={e => set('next_contact_at', e.target.value || null)}
              />
            </Field>
          </div>

          {/* Temperatura */}
          <Field label="Temperatura" icon={<Flame className="w-3 h-3" />}>
            <div className="grid grid-cols-3 gap-2">
              {TEMPERATURES.map(t => {
                const active = (form.temperature ?? 'morno') === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('temperature', t.value)}
                    className="h-9 rounded-md border text-[12px] font-medium transition-all"
                    style={{
                      borderColor: active ? t.color : 'var(--sm-border)',
                      background:  active ? `${t.color}1f` : 'var(--sm-bg-input)',
                      color:       active ? t.color : 'var(--sm-text-3)',
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Responsável + coluna */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Responsável">
              <select
                className={selectClass}
                value={form.responsible_user_id ?? ''}
                onChange={e => set('responsible_user_id', e.target.value || null)}
              >
                <option value="">Sem responsável</option>
                {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Etapa do funil" icon={<ArrowRightLeft className="w-3 h-3" />}>
              <select
                className={selectClass}
                value={form.column_id}
                onChange={e => set('column_id', e.target.value)}
              >
                {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Observações — o campo mais usado no dia a dia, por isso é o maior */}
          <Field label="Observações" icon={<StickyNote className="w-3 h-3" />}>
            <Textarea
              rows={5}
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="O que foi conversado, objeções, o que ficou combinado, quando retornar..."
            />
          </Field>

          {/* Converter em cliente — só faz sentido em coluna de ganho */}
          {lead && isWonColumn && !lead.converted_client_id && onConvert && (
            <button
              type="button"
              onClick={() => onConvert(lead)}
              className="w-full h-9 rounded-md text-[12.5px] font-medium transition-colors"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              Converter este lead em cliente →
            </button>
          )}
          {lead?.converted_client_id && (
            <p className="text-[11.5px] text-center" style={{ color: '#22C55E' }}>
              Este lead já virou cliente.
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {lead && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px]" style={{ color: 'var(--sm-text-3)' }}>Excluir?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteLead.isPending}>
                    {deleteLead.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Não</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </Button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {lead ? 'Salvar' : 'Cadastrar lead'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
