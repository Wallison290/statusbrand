# Edge Functions — StatusBrand

## Funções disponíveis

| Função     | Descrição                                                              |
|------------|------------------------------------------------------------------------|
| `ai-proxy` | Chamadas não-streaming: greeting, generate-content, improve-text, memory-extract |
| `ai-chat`  | Streaming SSE: chat com gpt-4o e busca web com gpt-4o-search-preview   |

## Pré-requisitos

Instale a CLI do Supabase (se ainda não tiver):
```bash
npm install -g supabase
```

## Deploy das funções

```bash
# Na pasta raiz do projeto
supabase login
supabase link --project-ref SEU_PROJECT_REF

# Deploy de ambas as funções
supabase functions deploy ai-proxy
supabase functions deploy ai-chat
```

## Configurar secrets (OBRIGATÓRIO)

A chave da OpenAI fica protegida como secret no Supabase — nunca no frontend:

```bash
supabase secrets set OPENAI_API_KEY=sk-sua-chave-openai
supabase secrets set AI_MONTHLY_LIMIT=500
```

> **Nota:** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente pelo runtime do Supabase — não precisa setar.

## Variáveis de ambiente das funções

| Variável                 | Como setar              | Valor padrão |
|--------------------------|-------------------------|--------------|
| `OPENAI_API_KEY`         | `supabase secrets set`  | —            |
| `AI_MONTHLY_LIMIT`       | `supabase secrets set`  | `500`        |
| `SUPABASE_URL`           | Automático              | —            |
| `SUPABASE_SERVICE_ROLE_KEY` | Automático           | —            |

## Migration de uso da IA

Execute no SQL Editor do Supabase:
```
supabase/migrations/023_ai_usage.sql
```

## Verificar deploy

Após o deploy, teste:
```bash
curl -X POST https://SEU_PROJETO.supabase.co/functions/v1/ai-proxy \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"greeting","payload":{"stats":{"active_clients":5,"total_clients":7,"period_pending_approval":2,"period_approved":1,"pending_tasks":3,"overdue_tasks":0},"hour":14,"dayName":"segunda-feira"}}'
```
