// ── Modelos prontos de funil comercial ───────────────────────────────────────
// Servem só como ponto de partida: depois de aplicados, as colunas são normais
// e o usuário renomeia, recolore, reordena, adiciona e exclui à vontade.

import type { CrmStageType } from '@/types'

export interface CrmTemplateColumn {
  name:       string
  color:      string
  stage_type: CrmStageType
}

export interface CrmTemplate {
  id:          string
  emoji:       string
  name:        string
  description: string
  columns:     CrmTemplateColumn[]
}

// Paleta das etapas — segue o azul do sistema no meio do funil, verde no ganho
// e vermelho no perdido, para o board ser lido de relance.
const C = {
  cinza:   '#64748b',
  azul:    '#2563EB',
  azulC:   '#4F8EF7',
  roxo:    '#8B5CF6',
  ambar:   '#F5A623',
  verde:   '#22C55E',
  vermelho:'#ef4444',
}

export const CRM_TEMPLATES: CrmTemplate[] = [
  {
    id:          'padrao',
    emoji:       '🎯',
    name:        'Funil comercial padrão',
    description: 'O caminho clássico, do primeiro contato ao fechamento. Serve para quase qualquer venda.',
    columns: [
      { name: 'Novo lead',        color: C.cinza,    stage_type: 'normal'  },
      { name: 'Contato feito',    color: C.azulC,    stage_type: 'normal'  },
      { name: 'Qualificado',      color: C.azul,     stage_type: 'normal'  },
      { name: 'Proposta enviada', color: C.roxo,     stage_type: 'normal'  },
      { name: 'Negociação',       color: C.ambar,    stage_type: 'normal'  },
      { name: 'Ganho',            color: C.verde,    stage_type: 'ganho'   },
      { name: 'Perdido',          color: C.vermelho, stage_type: 'perdido' },
    ],
  },
  {
    id:          'agencia',
    emoji:       '📱',
    name:        'Agência / social media',
    description: 'Prospecção ativa com diagnóstico e reunião antes da proposta — o funil de quem vende serviço recorrente.',
    columns: [
      { name: 'Prospecção',        color: C.cinza,    stage_type: 'normal'  },
      { name: 'Primeiro contato',  color: C.azulC,    stage_type: 'normal'  },
      { name: 'Diagnóstico',       color: C.azul,     stage_type: 'normal'  },
      { name: 'Reunião marcada',   color: C.roxo,     stage_type: 'normal'  },
      { name: 'Proposta',          color: C.ambar,    stage_type: 'normal'  },
      { name: 'Follow-up',         color: C.ambar,    stage_type: 'normal'  },
      { name: 'Contrato assinado', color: C.verde,    stage_type: 'ganho'   },
      { name: 'Perdido',           color: C.vermelho, stage_type: 'perdido' },
    ],
  },
  {
    id:          'whatsapp',
    emoji:       '💬',
    name:        'Vendas por WhatsApp',
    description: 'Para quem vende na conversa: separa quem respondeu, quem se interessou e quem está só enrolando.',
    columns: [
      { name: 'Novo contato',        color: C.cinza,    stage_type: 'normal'  },
      { name: 'Respondeu',           color: C.azulC,    stage_type: 'normal'  },
      { name: 'Interessado',         color: C.azul,     stage_type: 'normal'  },
      { name: 'Orçamento enviado',   color: C.roxo,     stage_type: 'normal'  },
      { name: 'Aguardando resposta', color: C.ambar,    stage_type: 'normal'  },
      { name: 'Venda fechada',       color: C.verde,    stage_type: 'ganho'   },
      { name: 'Sem interesse',       color: C.vermelho, stage_type: 'perdido' },
    ],
  },
  {
    id:          'inbound',
    emoji:       '🧲',
    name:        'Inbound / marketing',
    description: 'Lead que chega sozinho pelo conteúdo ou anúncio, qualificado por MQL e SQL até a demonstração.',
    columns: [
      { name: 'Lead capturado', color: C.cinza,    stage_type: 'normal'  },
      { name: 'MQL',            color: C.azulC,    stage_type: 'normal'  },
      { name: 'SQL',            color: C.azul,     stage_type: 'normal'  },
      { name: 'Demonstração',   color: C.roxo,     stage_type: 'normal'  },
      { name: 'Proposta',       color: C.ambar,    stage_type: 'normal'  },
      { name: 'Cliente',        color: C.verde,    stage_type: 'ganho'   },
      { name: 'Descartado',     color: C.vermelho, stage_type: 'perdido' },
    ],
  },
  {
    id:          'onboarding',
    emoji:       '🤝',
    name:        'Pós-venda / onboarding',
    description: 'O que acontece depois do sim: boas-vindas, briefing e acessos até o cliente estar rodando.',
    columns: [
      { name: 'Contrato assinado', color: C.cinza, stage_type: 'normal' },
      { name: 'Boas-vindas',       color: C.azulC, stage_type: 'normal' },
      { name: 'Briefing',          color: C.azul,  stage_type: 'normal' },
      { name: 'Acessos',           color: C.roxo,  stage_type: 'normal' },
      { name: 'Ativo',             color: C.verde, stage_type: 'ganho'  },
    ],
  },
  {
    id:          'zero',
    emoji:       '✏️',
    name:        'Começar do zero',
    description: 'Uma coluna só. Você monta o funil do seu jeito, do nome à cor.',
    columns: [
      { name: 'Novos leads', color: C.azul, stage_type: 'normal' },
    ],
  },
]

// Cores oferecidas no seletor de cor da coluna
export const CRM_COLUMN_COLORS = [
  C.cinza, C.azulC, C.azul, C.roxo, C.ambar, C.verde, C.vermelho, '#0ea5e9', '#ec4899', '#14b8a6',
]

// Origens sugeridas no cadastro do lead (o campo aceita texto livre)
export const CRM_SOURCES = [
  'Indicação',
  'Instagram',
  'WhatsApp',
  'Prospecção ativa',
  'Tráfego pago',
  'Site',
  'Evento',
  'Outro',
]
