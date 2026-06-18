# Notificações no WhatsApp via Evolution API

Integração que espelha **todas as notificações da agência** (as que hoje aparecem
no sininho 🔔) para o WhatsApp. Fase 1: **somente a agência** recebe.

## Como funciona (visão geral)

```
evento no sistema → INSERT em public.notifications
                          │
        trigger AFTER INSERT (pg_net)         cron a cada 5 min (rede de segurança)
                          │                            │
                          └────────► Edge Function notify-whatsapp ◄──────┘
                                          │
                       filtra role=agency + opt-in + verificado + categoria
                                          │
                              Evolution API (sendText) → 📱 agência
```

Como **todas** as notificações terminam num `INSERT` em `public.notifications`
(umas por trigger SQL, outras por código), o gancho único no INSERT cobre as 9
notificações da agência sem alterar nenhum trigger existente.

## Peças entregues

| Arquivo | O quê |
|---|---|
| `supabase/migrations/047_whatsapp_notifications.sql` | Colunas em `profiles`, tabela `notification_deliveries`, mapa tipo→categoria |
| `supabase/migrations/048_whatsapp_webhook.sql` | Trigger `pg_net` no INSERT + modelo do cron |
| `supabase/functions/notify-whatsapp/` | Fan-out: aplica os filtros e envia pela Evolution |
| `supabase/functions/whatsapp-verify/` | Envia/confirma o código de verificação do número |
| `src/hooks/useWhatsappSettings.ts` + `UserMenu.tsx` | Seção "Notificações no WhatsApp" no modal **Meu Perfil** |
| `infra/evolution/` | Esta stack (Evolution + Postgres + Redis) |

---

## Passo 1 — Subir a Evolution

Num VPS (Hetzner, DigitalOcean, Contabo…) com Docker:

```bash
cd infra/evolution
cp .env.example .env
# edite .env: gere a AUTHENTICATION_API_KEY (openssl rand -hex 24),
# defina SERVER_URL (idealmente https atrás de um proxy) e POSTGRES_PASSWORD
docker compose up -d
docker compose logs -f evolution-api   # confirme que subiu na porta 8080
```

> Produção: coloque a Evolution atrás de HTTPS (Caddy/Nginx/Traefik) e restrinja
> a porta 8080 ao proxy. O número conectado deve ser **dedicado** ao sistema.

## Passo 2 — Criar a instância e conectar o número

```bash
# Cria a instância "statusmedia"
curl -X POST "$SERVER_URL/instance/create" \
  -H "apikey: $AUTHENTICATION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"statusmedia","integration":"WHATSAPP-BAILEYS","qrcode":true}'

# Pega o QR (campo base64) e abre no navegador, ou use a rota de connect:
curl "$SERVER_URL/instance/connect/statusmedia" -H "apikey: $AUTHENTICATION_API_KEY"
```

Escaneie o QR com o WhatsApp do número dedicado (Aparelhos conectados → Conectar
aparelho). Confirme o estado:

```bash
curl "$SERVER_URL/instance/connectionState/statusmedia" -H "apikey: $AUTHENTICATION_API_KEY"
# deve retornar "state":"open"
```

Teste um envio:

```bash
curl -X POST "$SERVER_URL/message/sendText/statusmedia" \
  -H "apikey: $AUTHENTICATION_API_KEY" -H "Content-Type: application/json" \
  -d '{"number":"5511999998888","text":"StatusMedia conectado ✅"}'
```

## Passo 3 — Secrets no Supabase

```bash
supabase secrets set \
  EVOLUTION_BASE_URL="https://evo.seudominio.com.br" \
  EVOLUTION_API_KEY="<AUTHENTICATION_API_KEY>" \
  EVOLUTION_INSTANCE="statusmedia" \
  APP_PUBLIC_URL="https://statusmedia.com.br"
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem no
ambiente das functions.)

## Passo 4 — Migrations e Edge Functions

```bash
supabase db push                       # aplica 047 e 048
supabase functions deploy notify-whatsapp
supabase functions deploy whatsapp-verify
```

## Passo 5 — Webhook (trigger) e cron

No **SQL Editor** do Supabase, defina os GUC usados pelo trigger e o cron:

```sql
create extension if not exists pg_net;
create extension if not exists pg_cron;

alter database postgres set app.settings.supabase_url     = 'https://<ref>.supabase.co';
alter database postgres set app.settings.service_role_key = '<service_role_key>';

-- Cron de reprocessamento (rede de segurança), a cada 5 min:
select cron.schedule(
  'whatsapp-notif-sweep', '*/5 * * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/notify-whatsapp',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

> Alternativa sem GUC: use o painel **Database → Webhooks** do Supabase, criando
> um webhook `AFTER INSERT` em `public.notifications` apontando para a function
> `notify-whatsapp`. Nesse caso o trigger da migration 048 fica redundante e pode
> ser removido — escolha **um** dos dois caminhos.

## Passo 6 — Testar ponta a ponta

1. No app: avatar → **Meu Perfil → Notificações no WhatsApp**. Digite o número,
   clique **Verificar**, receba o código no Zap e confirme.
2. Gere uma notificação real (ex.: aprovar um conteúdo pelo portal do cliente).
3. A mensagem deve chegar no WhatsApp em segundos. Auditoria:

```sql
select n.type, d.status, d.error, d.created_at
from notification_deliveries d
join notifications n on n.id = d.notification_id
order by d.created_at desc limit 20;
```

`status` possíveis: `sent`, `failed` (o cron retenta até 3x), `skipped`
(opt-in/categoria/verificação desligados — comportamento esperado).

## Notas

- **Risco de banimento:** Evolution usa WhatsApp Web por baixo (não-oficial).
  Use número dedicado e volume comedido. Para escala/conformidade, a mesma
  `notify-whatsapp` aceita um adapter da API oficial (Cloud API) no futuro —
  basta trocar `sendText` por um provider configurável.
- **Privacidade:** o `docker-compose.yml` já desliga o salvamento de mensagens,
  contatos e chats na Evolution (só guarda a sessão da instância).
