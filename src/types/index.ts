export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  agency_name: string | null
  role: 'agency' | 'client'
  linked_client_id: string | null
  created_at: string
  updated_at: string
}

export type ClientStatus =
  | 'lead'
  | 'proposta'
  | 'fechado'
  | 'onboarding'
  | 'ativo'
  | 'pausado'
  | 'encerrado'

export type FinancialStatus = 'ativo' | 'vence_em_breve' | 'atrasado' | 'cancelado'

export interface Client {
  id: string
  user_id: string
  company_name: string
  responsible_name: string
  niche: string
  instagram: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  main_objective: string | null
  target_audience: string | null
  tone_of_voice: string | null
  communication_style: string | null
  differentials: string | null
  services_offered: string | null
  forbidden_words: string | null
  observations: string | null
  logo_url: string | null
  status: ClientStatus
  responsible_user_id: string | null
  entry_date: string
  valor_mensal: number | null
  dia_vencimento: number | null
  financial_status: FinancialStatus | null
  last_payment_date: string | null
  manual_status_override: boolean | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  client_id: string
  title: string
  completed: boolean
  created_at: string
}

export interface ClientDocument {
  id: string
  client_id: string
  user_id: string
  name: string
  file_url: string
  file_type: string
  file_size: number | null
  created_at: string
}

export interface BriefingData {
  // Empresa
  como_nasceu?: string
  servicos_mais_vende?: string
  servicos_quer_vender?: string
  diferencial_empresa?: string
  concorrentes?: string
  regiao_atendida?: string
  // Público
  quem_compra_hoje?: string
  quem_quer_atrair?: string
  maior_dor?: string
  gatilho_decisao?: string
  // Marketing
  rodou_trafego_pago?: boolean
  teve_agencia?: boolean
  o_que_funcionou?: string
  o_que_nao_funcionou?: string
  // Objetivos
  obj_mais_leads?: boolean
  obj_mais_vendas?: boolean
  obj_autoridade?: boolean
  obj_crescimento_instagram?: boolean
  obj_posicionamento_premium?: boolean
}

export interface ClientBriefing {
  id: string
  client_id: string
  data: BriefingData
  created_at: string
  updated_at: string
}

export interface BrandDNA {
  id: string
  client_id: string
  how_brand_speaks: string | null
  how_brand_not_speaks: string | null
  positioning: string | null
  ideal_language: string | null
  mental_triggers: string | null
  communication_style: string | null
  created_at: string
  updated_at: string
}

export type ContentType =
  | 'post'
  | 'carrossel'
  | 'reels'
  | 'story'
  | 'educativo'
  | 'venda'
  | 'autoridade'
  | 'engajamento'

export type ContentObjective =
  | 'atrair_atencao'
  | 'engajar'
  | 'gerar_autoridade'
  | 'gerar_leads'
  | 'vender'

export type ContentStatus =
  | 'gerado'
  | 'editado'
  | 'aprovado'
  | 'publicado'
  | 'arquivado'

export interface Content {
  id: string
  user_id: string
  client_id: string | null
  term: string
  objective: ContentObjective
  content_type: ContentType
  tone_of_voice: string
  caption_size: 'curto' | 'medio' | 'longo'
  include_emojis: boolean
  include_hashtags: boolean
  additional_notes: string | null
  title: string | null
  subtitle: string | null
  caption: string | null
  cta: string | null
  hashtags: string | null
  keywords: string | null
  visual_suggestion: string | null
  carousel_ideas: string | null
  video_script: string | null
  status: ContentStatus
  version: number
  created_at: string
  updated_at: string
  client?: Client
}

export type PlannerStatus =
  | 'ideia'
  | 'producao'
  | 'revisao'
  | 'aprovado'
  | 'publicado'

export type ApprovalStatus =
  | 'pendente_aprovacao'
  | 'aprovado'
  | 'ajuste_solicitado'
  | 'reprovado'

export interface PlannerAttachment {
  id: string
  planner_id: string
  user_id: string
  file_name: string
  file_type: string
  file_url: string
  file_size: number | null
  created_at: string
}

export interface PlannerLink {
  id: string
  planner_id: string
  user_id: string
  url: string
  label: string | null
  created_at: string
}

export interface PlannerItem {
  id: string
  user_id: string
  client_id: string | null
  content_id: string | null
  title: string
  content_type: ContentType
  scheduled_date: string
  scheduled_time?: string | null
  status: PlannerStatus
  notes: string | null
  approval_status: ApprovalStatus | null
  client_feedback: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  asset_id?: string | null
  created_at: string
  updated_at: string
  client?: Client
  attachments?: PlannerAttachment[]
  links?: PlannerLink[]
}

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'revisao' | 'concluido'
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente'

export interface Task {
  id: string
  user_id: string
  client_id: string | null
  title: string
  description: string | null
  due_date: string | null
  due_time: string | null
  priority: TaskPriority
  status: TaskStatus
  assignee: string | null
  created_at: string
  updated_at: string
  client?: Client
}

export type LibraryCategory = 'ideia' | 'gancho' | 'cta' | 'template'

export interface LibraryItem {
  id: string
  user_id: string
  category: LibraryCategory
  title: string
  content: string
  niche: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

export interface ContentGeneratorForm {
  client_id: string | null
  term: string
  objective: ContentObjective
  content_type: ContentType
  tone_of_voice: string
  caption_size: 'curto' | 'medio' | 'longo'
  include_emojis: boolean
  include_hashtags: boolean
  additional_notes: string
}

export interface GeneratedContent {
  title: string
  subtitle: string
  caption: string
  cta: string
  hashtags: string
  keywords: string
  visual_suggestion: string
  carousel_ideas: string
  video_script: string
}

export interface ContentAsset {
  id: string
  user_id: string
  client_id: string | null       // null = library-only (sem cliente)
  category: string | null        // tag livre de organização
  title: string
  caption: string | null
  content_type: ContentType
  media_url: string | null
  link_url: string | null
  observations: string | null
  created_at: string
  updated_at: string
  // joined
  client?: { id: string; company_name: string }
}

export type MaterialType = 'pdf' | 'imagem' | 'video' | 'link' | 'documento' | 'outro'
export type ContactType = 'whatsapp' | 'email' | 'telefone' | 'outro'

export interface ClientMaterial {
  id: string
  user_id: string
  client_id: string
  title: string
  description: string | null
  type: MaterialType
  file_url: string | null
  link_url: string | null
  file_size: number | null
  folder_name: string | null   // organização em pastas (requer migration)
  created_at: string
  updated_at: string
}

export type ClientMaterialWithClient = ClientMaterial & {
  client?: { id: string; company_name: string }
}

export interface ClientSupportContact {
  id: string
  user_id: string
  client_id: string
  name: string
  role: string | null
  contact_type: ContactType
  contact_value: string
  direct_link: string | null
  created_at: string
}

export type ReportAttachmentType = 'imagem' | 'pdf' | 'link'

export interface ReportAttachment {
  id: string
  report_id: string
  user_id: string
  type: ReportAttachmentType
  title: string
  description: string | null
  file_url: string | null
  link_url: string | null
  file_size: number | null
  created_at: string
}

export interface ClientReport {
  id: string
  client_id: string
  user_id: string
  month: number
  year: number
  followers_start: number | null
  followers_end: number | null
  reach: number | null
  engagement: number | null
  impressions: number | null
  posts_published: number | null
  paid_investment: number | null
  paid_leads: number | null
  paid_cpl: number | null
  paid_conversions: number | null
  paid_roas: number | null
  analysis_text: string | null
  created_at: string
  updated_at: string
  attachments?: ReportAttachment[]
}

export interface DashboardStats {
  total_clients: number
  contents_this_week: number
  pending_tasks: number
  overdue_tasks: number
  contents_in_production: number
  active_clients: number
}
