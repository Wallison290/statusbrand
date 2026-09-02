// ── Seletor de modelo de funil ───────────────────────────────────────────────
// Aparece na primeira vez que o CRM abre (board vazio) e também pelo botão
// "Modelos" do topo, para quem quiser acrescentar as etapas de outro processo.

import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useApplyCrmTemplate } from '@/hooks/useCrm'
import { CRM_TEMPLATES, type CrmTemplate } from '@/data/crmTemplates'

interface Props {
  open:    boolean
  onClose: () => void
  /** true quando o board ainda não tem nenhuma coluna — muda o texto de apoio */
  empty:   boolean
  /** quantas colunas já existem, para o modelo entrar no fim do funil */
  offset:  number
}

export function CrmTemplatePicker({ open, onClose, empty, offset }: Props) {
  const { toast } = useToast()
  const apply = useApplyCrmTemplate()
  const [selected, setSelected] = useState<CrmTemplate | null>(null)

  async function handleApply() {
    if (!selected) return
    try {
      await apply.mutateAsync({ template: selected, offset })
      toast(`Funil "${selected.name}" criado`, 'success')
      setSelected(null)
      onClose()
    } catch (err: any) {
      toast(err.message ?? 'Erro ao criar o funil', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setSelected(null); onClose() } }}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha um modelo de funil</DialogTitle>
        </DialogHeader>

        <p className="text-[12px] -mt-1" style={{ color: 'var(--sm-text-3)' }}>
          {empty
            ? 'Comece por um processo comercial pronto. Depois é tudo seu: renomeie, troque as cores, reordene ou crie colunas novas.'
            : 'As colunas do modelo entram no fim do seu funil atual. Nada do que já existe é apagado.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {CRM_TEMPLATES.map(t => {
            const active = selected?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="text-left p-3.5 rounded-xl border transition-all"
                style={{
                  borderColor: active ? '#2563EB' : 'var(--sm-border)',
                  background:  active ? 'rgba(37,99,235,0.08)' : 'var(--sm-bg-card2)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[15px]">{t.emoji}</span>
                  <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--sm-text-1)' }}>{t.name}</span>
                  {active && <Check className="w-3.5 h-3.5" style={{ color: '#2563EB' }} />}
                </div>
                <p className="text-[11.5px] leading-snug mb-2.5" style={{ color: 'var(--sm-text-3)' }}>
                  {t.description}
                </p>

                {/* Prévia das colunas — o usuário vê o funil antes de aplicar */}
                <div className="flex flex-wrap gap-1">
                  {t.columns.map(c => (
                    <span
                      key={c.name}
                      className="text-[10px] px-1.5 py-0.5 rounded-full leading-none border"
                      style={{ color: c.color, borderColor: `${c.color}55`, background: `${c.color}14` }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {!empty && <Button variant="outline" onClick={onClose}>Cancelar</Button>}
          <Button onClick={handleApply} disabled={!selected || apply.isPending}>
            {apply.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {selected ? `Usar "${selected.name}"` : 'Selecione um modelo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
