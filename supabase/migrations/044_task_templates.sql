-- ════════════════════════════════════════════════════════════════════════════
-- 044 — Modelos de Tarefas (onboarding operacional)
-- Tabelas task_templates + task_template_items, coluna tags em tasks,
-- RLS e seed dos 4 modelos do sistema. Idempotente (pode rodar de novo).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Coluna de tags nas tarefas ───────────────────────────────────────────
alter table public.tasks add column if not exists tags text[] not null default '{}';

-- ── 2. Tabela de modelos ────────────────────────────────────────────────────
create table if not exists public.task_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,  -- null = modelo do sistema
  name        text not null,
  description text,
  category    text not null default 'custom',  -- trafego | social | completo | mensal | custom
  emoji       text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── 3. Tabela de itens (tarefas) do modelo ──────────────────────────────────
create table if not exists public.task_template_items (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references public.task_templates(id) on delete cascade,
  position        int  not null default 0,
  title           text not null,
  description     text,
  priority        text not null default 'media',   -- baixa | media | alta | urgente
  tags            text[] not null default '{}',
  due_offset_days int,                              -- null = sem prazo
  is_recurring    boolean not null default false,
  squad_id        text,                             -- ponte com squad (fase 4)
  created_at      timestamptz not null default now()
);

create index if not exists idx_task_templates_user        on public.task_templates(user_id);
create index if not exists idx_task_template_items_tmpl    on public.task_template_items(template_id);

-- ── 4. RLS ──────────────────────────────────────────────────────────────────
alter table public.task_templates      enable row level security;
alter table public.task_template_items enable row level security;

-- templates: lê os do sistema + os próprios; escreve só os próprios
drop policy if exists task_templates_select on public.task_templates;
create policy task_templates_select on public.task_templates
  for select using (is_system = true or user_id = auth.uid());

drop policy if exists task_templates_insert on public.task_templates;
create policy task_templates_insert on public.task_templates
  for insert with check (user_id = auth.uid());

drop policy if exists task_templates_update on public.task_templates;
create policy task_templates_update on public.task_templates
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists task_templates_delete on public.task_templates;
create policy task_templates_delete on public.task_templates
  for delete using (user_id = auth.uid());

-- itens: seguem a permissão do template pai
drop policy if exists task_template_items_select on public.task_template_items;
create policy task_template_items_select on public.task_template_items
  for select using (exists (
    select 1 from public.task_templates t
    where t.id = template_id and (t.is_system = true or t.user_id = auth.uid())
  ));

drop policy if exists task_template_items_write on public.task_template_items;
create policy task_template_items_write on public.task_template_items
  for all using (exists (
    select 1 from public.task_templates t
    where t.id = template_id and t.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.task_templates t
    where t.id = template_id and t.user_id = auth.uid()
  ));

-- ── 5. Seed dos modelos do sistema (refaz a cada execução) ──────────────────
delete from public.task_templates where is_system = true;

insert into public.task_templates (id, user_id, name, description, category, emoji, is_system) values
  ('11111111-1111-4111-8111-111111111111', null, 'Onboarding — Tráfego Pago',  'Setup completo de campanha de anúncios em 5 dias úteis',          'trafego',  '💰', true),
  ('22222222-2222-4222-8222-222222222222', null, 'Onboarding — Social Media',  'Estruturação da gestão de redes em 5 dias úteis',                 'social',   '📱', true),
  ('33333333-3333-4333-8333-333333333333', null, 'Onboarding — Completo',      'Social + Tráfego em paralelo (prazo pode passar de 5 dias)',      'completo', '🎯', true),
  ('44444444-4444-4444-8444-444444444444', null, 'Produção de Conteúdo Mensal','Workflow de produção mensal (aplicar todo mês)',                  'mensal',   '🔁', true);

-- ── 5.1 Itens: Tráfego Pago ─────────────────────────────────────────────────
insert into public.task_template_items (template_id, position, title, description, priority, tags, due_offset_days, is_recurring, squad_id) values
  ('11111111-1111-4111-8111-111111111111', 1,  'Solicitar acessos',                               'BM, conta de anúncios, página, Instagram e domínio',    'alta',  array['acessos','ads'],          1, false, null),
  ('11111111-1111-4111-8111-111111111111', 2,  'Briefing de tráfego',                             'Oferta, ticket, meta, verba mensal e histórico',        'alta',  array['briefing','estrategia'],  1, false, 'maquina-clientes'),
  ('11111111-1111-4111-8111-111111111111', 3,  'Mapear oferta e funil de conversão',              'Caminho do lead até a venda e objetivo de conversão',   'alta',  array['estrategia','ads'],       1, false, 'trafego-pago'),
  ('11111111-1111-4111-8111-111111111111', 4,  'Instalar/verificar Pixel + API de Conversões',    'Garantir rastreamento (Pixel + CAPI)',                  'alta',  array['tracking','ads'],         2, false, null),
  ('11111111-1111-4111-8111-111111111111', 5,  'Configurar eventos + verificação de domínio',     'Eventos de conversão e verificação no BM',              'alta',  array['tracking','setup'],       2, false, null),
  ('11111111-1111-4111-8111-111111111111', 6,  'Criar públicos personalizados',                   'Visitantes do site, lista de clientes, engajamento',    'media', array['segmentacao','ads'],      2, false, 'trafego-pago'),
  ('11111111-1111-4111-8111-111111111111', 7,  'Definir arquitetura de campanha + orçamento',     'Topo/meio/fundo de funil e distribuição de verba',      'alta',  array['estrategia','ads'],       3, false, 'trafego-pago'),
  ('11111111-1111-4111-8111-111111111111', 8,  'Criar públicos-alvo',                             'Frios (interesses), lookalike, retargeting + exclusões','alta',  array['segmentacao','ads'],      3, false, 'trafego-pago'),
  ('11111111-1111-4111-8111-111111111111', 9,  'Produzir criativos',                              'Imagens e vídeos por etapa do funil',                   'alta',  array['design','ads'],           4, false, 'design-criativo'),
  ('11111111-1111-4111-8111-111111111111', 10, 'Escrever copies dos anúncios',                    'Textos persuasivos por formato e etapa',                'media', array['copy','ads'],             4, false, 'trafego-pago'),
  ('11111111-1111-4111-8111-111111111111', 11, 'Validar página de destino / WhatsApp / formulário','Conferir destino do anúncio e captação',               'alta',  array['landing','setup'],        4, false, null),
  ('11111111-1111-4111-8111-111111111111', 12, 'Subir campanhas + checklist de QA',               'Publicar e revisar tudo antes de ativar',               'alta',  array['setup','ads'],            5, false, 'trafego-pago'),
  ('11111111-1111-4111-8111-111111111111', 13, 'Definir KPIs e montar relatório',                 'Métricas a acompanhar e dashboard do cliente',          'media', array['relatorio','ads'],        5, false, 'design-criativo'),
  ('11111111-1111-4111-8111-111111111111', 14, 'Monitorar e otimizar (recorrente)',               'Acompanhar métricas e ajustar continuamente',           'media', array['otimizacao','ads'],       null, true, 'trafego-pago');

-- ── 5.2 Itens: Social Media ─────────────────────────────────────────────────
insert into public.task_template_items (template_id, position, title, description, priority, tags, due_offset_days, is_recurring, squad_id) values
  ('22222222-2222-4222-8222-222222222222', 1,  'Solicitar acessos',                          'Instagram/Facebook, ferramentas e Drive de materiais', 'alta',  array['acessos'],               1, false, null),
  ('22222222-2222-4222-8222-222222222222', 2,  'Briefing / DNA da marca',                    'Nicho, persona, tom de voz, diferenciais e concorrentes','alta', array['briefing','identidade'], 1, false, 'identidade-marca'),
  ('22222222-2222-4222-8222-222222222222', 3,  'Coletar identidade visual',                  'Logo, cores, fontes e banco de fotos',                 'alta',  array['identidade','design'],   1, false, 'identidade-marca'),
  ('22222222-2222-4222-8222-222222222222', 4,  'Diagnóstico do perfil atual',                'Bio, destaques, feed, frequência e engajamento',       'media', array['diagnostico'],           2, false, 'diagnostico-perfil'),
  ('22222222-2222-4222-8222-222222222222', 5,  'Análise de 3 concorrentes',                  'Formatos, frequência e o que funciona no nicho',       'media', array['pesquisa'],              2, false, 'inteligencia-competitiva'),
  ('22222222-2222-4222-8222-222222222222', 6,  'Definir pilares de conteúdo + frequência',   'Linhas editoriais, proporção de formatos e ritmo',     'alta',  array['estrategia'],            3, false, 'fabrica-conteudo'),
  ('22222222-2222-4222-8222-222222222222', 7,  'Montar calendário editorial do 1º mês',      'Distribuir posts, Reels e stories no mês',             'alta',  array['planejamento'],          3, false, 'fabrica-conteudo'),
  ('22222222-2222-4222-8222-222222222222', 8,  'Escrever copies e legendas',                 'Legendas com gancho, desenvolvimento e CTA',           'alta',  array['copy'],                  4, false, 'fabrica-conteudo'),
  ('22222222-2222-4222-8222-222222222222', 9,  'Roteiros de Reels',                          'Scripts com hook, estrutura e CTA',                    'alta',  array['roteiro'],               4, false, 'fabrica-conteudo'),
  ('22222222-2222-4222-8222-222222222222', 10, 'Criar artes/templates do feed',              'Padronizar a identidade visual dos posts',             'media', array['design'],                4, false, 'design-criativo'),
  ('22222222-2222-4222-8222-222222222222', 11, 'Roteiro de stories da semana',               'Sequência de stories por dia',                         'media', array['stories'],               5, false, 'fabrica-conteudo'),
  ('22222222-2222-4222-8222-222222222222', 12, 'Enviar para aprovação do cliente',           'Subir o material no portal para aprovação',            'alta',  array['aprovacao'],             5, false, null),
  ('22222222-2222-4222-8222-222222222222', 13, 'Rotina de publicação e engajamento (recorrente)','Publicar, postar stories e interagir diariamente', 'media', array['publicacao'],            null, true, null);

-- ── 5.3 Itens: Completo (Social + Tráfego em paralelo) ──────────────────────
insert into public.task_template_items (template_id, position, title, description, priority, tags, due_offset_days, is_recurring, squad_id) values
  ('33333333-3333-4333-8333-333333333333', 1,  'Solicitar acessos (todos)',                       'IG/FB, BM, conta de anúncios, página, domínio e Drive', 'alta',  array['acessos','ads'],                       1, false, null),
  ('33333333-3333-4333-8333-333333333333', 2,  'Briefing completo + DNA da marca',                'Negócio, oferta, persona, tom de voz, metas e verba',   'alta',  array['briefing','identidade'],               1, false, 'maquina-clientes'),
  ('33333333-3333-4333-8333-333333333333', 3,  'Coletar identidade visual',                       'Logo, cores, fontes e banco de fotos',                  'alta',  array['identidade','design'],                 1, false, 'identidade-marca'),
  ('33333333-3333-4333-8333-333333333333', 4,  'Diagnóstico do perfil + 3 concorrentes',          'Estado atual e benchmark do nicho',                     'media', array['diagnostico','pesquisa'],              2, false, 'diagnostico-perfil'),
  ('33333333-3333-4333-8333-333333333333', 5,  'Social: pilares + calendário do 1º mês',          'Estratégia editorial e distribuição',                   'alta',  array['estrategia','planejamento'],           3, false, 'fabrica-conteudo'),
  ('33333333-3333-4333-8333-333333333333', 6,  'Tráfego: Pixel + eventos + domínio',              'Rastreamento completo',                                 'alta',  array['tracking','setup'],                    3, false, null),
  ('33333333-3333-4333-8333-333333333333', 7,  'Social: produção (copies, Reels, artes)',         'Peças do primeiro ciclo de conteúdo',                   'alta',  array['copy','roteiro','design'],             4, false, 'fabrica-conteudo'),
  ('33333333-3333-4333-8333-333333333333', 8,  'Tráfego: públicos + arquitetura de campanha',     'Segmentação e estrutura de verba',                      'alta',  array['segmentacao','estrategia','ads'],      4, false, 'trafego-pago'),
  ('33333333-3333-4333-8333-333333333333', 9,  'Social: enviar conteúdo para aprovação',          'Subir no portal do cliente',                            'alta',  array['aprovacao'],                           5, false, null),
  ('33333333-3333-4333-8333-333333333333', 10, 'Tráfego: criativos + copies de anúncio',          'Peças de mídia paga por etapa do funil',                'alta',  array['design','copy','ads'],                 6, false, 'trafego-pago'),
  ('33333333-3333-4333-8333-333333333333', 11, 'Tráfego: subir campanhas + QA',                   'Lançar a mídia paga',                                   'alta',  array['setup','ads'],                         7, false, 'trafego-pago'),
  ('33333333-3333-4333-8333-333333333333', 12, 'Transformar melhores conteúdos em criativos',     'Reaproveitar o orgânico que performou em ads',          'media', array['ponte','ads'],                         8, false, 'mineracao-anuncios'),
  ('33333333-3333-4333-8333-333333333333', 13, 'Rotina de publicação, engajamento e otimização (recorrente)','Operação contínua de social + tráfego',       'media', array['publicacao','otimizacao'],             null, true, null);

-- ── 5.4 Itens: Produção de Conteúdo Mensal ─────────────────────────────────
insert into public.task_template_items (template_id, position, title, description, priority, tags, due_offset_days, is_recurring, squad_id) values
  ('44444444-4444-4444-8444-444444444444', 1, 'Pesquisar tendências e datas do mês', 'Trends e datas comemorativas do nicho', 'media', array['pesquisa'],          1, false, 'fabrica-conteudo'),
  ('44444444-4444-4444-8444-444444444444', 2, 'Definir tema/campanha do mês',        'Foco editorial do mês',                 'alta',  array['estrategia'],        1, false, 'fabrica-conteudo'),
  ('44444444-4444-4444-8444-444444444444', 3, 'Montar calendário do mês',            'Distribuir posts, Reels e stories',     'alta',  array['planejamento'],      2, false, 'fabrica-conteudo'),
  ('44444444-4444-4444-8444-444444444444', 4, 'Produzir copies e roteiros',          'Legendas e scripts',                    'alta',  array['copy','roteiro'],    3, false, 'fabrica-conteudo'),
  ('44444444-4444-4444-8444-444444444444', 5, 'Criar artes e editar Reels',          'Peças visuais',                         'alta',  array['design'],            4, false, 'design-criativo'),
  ('44444444-4444-4444-8444-444444444444', 6, 'Enviar para aprovação e agendar',     'Aprovação no portal e agendamento',     'alta',  array['aprovacao'],         5, false, null);
