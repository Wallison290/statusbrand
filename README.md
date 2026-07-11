# StatusMedia

Plataforma SaaS para centralizar a operação de agências de social media: clientes, equipe, conteúdo, aprovações, tarefas, arquivos, comunicação, relatórios, financeiro e inteligência artificial em um único ambiente.

> **StatusMedia — Organize. Produza. Escale.**

## Visão geral

A aplicação possui áreas específicas para a agência, seus clientes, colaboradores e administradores. O acesso aos recursos é controlado por autenticação, função do usuário, assinatura e políticas de segurança no banco de dados.

## Principais funcionalidades

### Gestão da agência

- Dashboard com visão geral da operação, indicadores e pendências.
- Cadastro e gestão de clientes, incluindo DNA da marca, contatos, serviços e informações financeiras.
- Onboarding por cliente com checklist, briefing, documentos, responsáveis e acompanhamento de status.
- Organização do feed do perfil antes da publicação.
- Planejamento editorial com calendário, copy, anexos, comentários, aprovação e agendamento.
- Gestão de tarefas em visualizações semanal, linha do tempo, mensal e lista.
- Modelos reutilizáveis de tarefas para onboarding, social media, tráfego pago e produção mensal.
- Delegação de demandas para membros da equipe e portal individual do colaborador.
- Notas, solicitações, ideias, materiais e contatos de suporte organizados por cliente.
- Biblioteca de conteúdos, arquivos, ganchos, CTAs, ideias e templates.
- Controle financeiro da agência e acompanhamento de pagamentos dos clientes.
- Central de notificações dentro da plataforma.

### Portal do cliente

- Acesso próprio por convite e configuração de senha.
- Visualização do planejamento editorial.
- Aprovação total ou parcial de conteúdos e envio de ajustes.
- Acompanhamento do andamento das demandas da agência.
- Consulta de materiais, relatórios, resultados, notas, financeiro e contatos de suporte.
- Formulário semanal compartilhável e personalizável para coleta de informações.

### Instagram e relatórios

- Conexão de contas profissionais do Instagram por OAuth da Meta.
- Programação, cancelamento, reagendamento e nova tentativa de publicações.
- Publicação automática processada por função agendada.
- Relatórios mensais por cliente com métricas do Instagram, comparativos, análise, anexos e dados do planejamento.
- Disponibilização dos relatórios diretamente no portal do cliente.

> A tela de integração com Instagram está sinalizada na interface como recurso em evolução.

### WhatsApp

- Configuração da integração de WhatsApp da agência.
- Notificações de novos conteúdos para aprovação.
- Avisos relacionados a relatórios e solicitações do cliente.
- Consulta e gerenciamento de grupos conectados.
- Infraestrutura opcional da Evolution API disponível em `infra/evolution`.

### StatusIA

- Hub de especialistas de IA organizados por squads.
- Chat com histórico de sessões e respostas em streaming.
- Memória global do usuário e memória contextual por cliente.
- Contexto construído a partir do DNA da marca, planejamento, materiais e histórico.
- Análise de textos, PDFs e imagens anexadas.
- Geração de conteúdo, melhoria de textos, diagnósticos e apoio estratégico.
- Controle de créditos de IA conforme o plano contratado.
- Chamadas à OpenAI protegidas por Supabase Edge Functions.

### SaaS e administração

- Autenticação de agências e clientes com Supabase Auth.
- Assinaturas e checkout integrados ao Stripe.
- Planos Starter, Pro e Agency com limites de clientes, equipe, armazenamento, IA e perfis do Instagram.
- Período de teste, lembretes e tratamento automático de expiração.
- Controle de armazenamento por plano.
- Painel administrativo protegido para acompanhamento da plataforma.
- Landing page, página de preços, termos de uso e política de privacidade.

## Perfis de acesso

| Perfil | Área e permissões principais |
| --- | --- |
| Agência | Gestão completa da operação, clientes, equipe e integrações |
| Cliente | Portal próprio para aprovações, materiais, relatórios e acompanhamento |
| Colaborador | Portal por link seguro para consultar e atualizar tarefas delegadas |
| Administrador | Painel administrativo da plataforma, protegido por permissão específica |

## Stack

### Frontend

- React 18 e TypeScript
- Vite 6
- Tailwind CSS
- Radix UI e componentes próprios
- Framer Motion
- React Router 7
- TanStack Query
- React Hook Form e Zod
- Recharts
- dnd-kit

### Backend e serviços

- Supabase: PostgreSQL, Auth, Storage, Row Level Security, RPC e Edge Functions
- OpenAI via proxy seguro nas Edge Functions
- Meta Graph API para Instagram
- Stripe para assinaturas e pagamentos
- Integração de WhatsApp por UAZAPI e/ou Evolution API
- Resend para envio de e-mails transacionais
- Vercel para hospedagem do frontend SPA

## Estrutura do projeto

```text
src/
├── components/          # Componentes visuais, layout e módulos compartilhados
├── config/              # Planos e limites comerciais
├── contexts/            # Contextos globais, como tema
├── data/                # Configuração dos squads da StatusIA
├── hooks/               # Acesso aos dados e regras dos módulos
├── integrations/        # Cliente e tipos gerados do Supabase
├── lib/                 # Comunicação com serviços internos
├── pages/               # Áreas da agência, cliente, colaborador e administrador
├── services/            # Serviços auxiliares
├── types/               # Tipos de domínio
└── utils/               # Formatação, arquivos, prompts e regras auxiliares

supabase/
├── functions/           # Edge Functions e integrações de backend
└── migrations/          # Estrutura, políticas e evolução do banco de dados

infra/evolution/         # Infraestrutura opcional para Evolution API
public/                  # Logos e arquivos públicos da marca
```

## Configuração local

### Pré-requisitos

- Node.js 20 ou superior
- npm
- Projeto Supabase configurado
- Supabase CLI para migrations e Edge Functions

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure o frontend

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
VITE_META_APP_ID=SEU_META_APP_ID
```

Não coloque chaves privadas da OpenAI, Stripe, Meta, WhatsApp ou do Supabase no frontend.

### 3. Configure o Supabase

Vincule o projeto e aplique as migrations na ordem correspondente ao ambiente:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Os arquivos SQL estão em `supabase/migrations`. Antes de aplicar em produção, revise o histórico do banco já existente para evitar executar novamente migrations antigas.

### 4. Configure os secrets das Edge Functions

As integrações utilizam secrets no ambiente do Supabase. Configure somente os serviços usados no ambiente:

```bash
supabase secrets set OPENAI_API_KEY=...
supabase secrets set STRIPE_SECRET_KEY=...
supabase secrets set STRIPE_WEBHOOK_SECRET=...
supabase secrets set META_APP_ID=...
supabase secrets set META_APP_SECRET=...
supabase secrets set RESEND_API_KEY=...
supabase secrets set APP_URL=...
```

As funções de WhatsApp também podem utilizar `UAZAPI_URL`, `UAZAPI_TOKEN`, `UAZAPI_INSTANCE`, `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE`, conforme o provedor configurado.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizadas pelo ambiente das Edge Functions do Supabase.

### 5. Publique as Edge Functions necessárias

As funções estão em `supabase/functions`. Exemplo:

```bash
supabase functions deploy ai-proxy
supabase functions deploy ai-chat
```

Também existem funções para Instagram, WhatsApp, Stripe, convites, portais, armazenamento e rotinas de assinatura. Publique as funções exigidas pelo ambiente e configure seus webhooks e tarefas agendadas.

### 6. Execute o projeto

```bash
npm run dev
```

A aplicação ficará disponível, por padrão, em `http://localhost:5173`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o ambiente local com Vite |
| `npm run build` | Valida o TypeScript e gera a versão de produção |
| `npm run lint` | Executa o ESLint no projeto |
| `npm run preview` | Abre localmente o build de produção |

## Deploy

O arquivo `vercel.json` mantém o fallback das rotas da SPA para `index.html`. No ambiente de hospedagem, configure pelo menos:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_META_APP_ID=...
```

O deploy do frontend não publica automaticamente as migrations nem as Edge Functions do Supabase.

## Segurança

- O acesso aos dados é protegido por Row Level Security no Supabase.
- Operações administrativas e integrações sensíveis são executadas no backend.
- Chaves privadas devem permanecer nos secrets das Edge Functions ou do provedor de hospedagem adequado.
- O frontend utiliza apenas variáveis públicas prefixadas com `VITE_`.
- As permissões visuais das rotas complementam, mas não substituem, as políticas do banco.

## Observações

- Este repositório contém a aplicação web, migrations, Edge Functions e arquivos de infraestrutura da StatusMedia.
- Algumas integrações dependem de configuração externa na Meta, Stripe, Supabase, provedor de WhatsApp e serviço de e-mail.
- Funcionalidades disponíveis e limites de uso podem variar conforme o plano contratado.
