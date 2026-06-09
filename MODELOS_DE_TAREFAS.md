# 📋 Modelos de Tarefas (Onboarding Operacional) — Documento de Design

> Status: **proposta para aprovação** (ainda não implementado).
> Objetivo: ao chegar um cliente novo, aplicar um **modelo pré-pronto** que cria automaticamente as tarefas certas no kanban, vinculadas ao cliente, com responsável e prazo — tudo dentro de **5 dias úteis**.

---

## 1. Objetivo

Hoje, quando entra um cliente, o gestor cria as tarefas na mão, uma a uma. A ideia é ter **modelos por tipo de serviço** (Tráfego Pago, Social Media, Completo…) que, com um clique, populam o kanban com o passo a passo operacional já organizado.

Inspiração: feature de "Modelos de Tarefas" do DGflow — adaptada ao StatusMedia e com um diferencial: **integração com a IA por contexto do cliente** (fase 2).

---

## 2. Conceito geral

- **Modelos do sistema** (pré-prontos, definidos aqui) + **modelos do usuário** (a agência cria os seus).
- Cada modelo é um **nome + lista de tarefas**, cada tarefa com: título, descrição, prioridade, tags, **dia relativo (D+1…D+5)** e marcação de **recorrente**.
- Ao aplicar: escolhe cliente, responsável, data de início e modo de criação → as tarefas caem no kanban.

---

## 3. Onde aparece (UX) — 3 pontos de entrada

### a) No cadastro do cliente
- Novo campo **"Tipo de serviço"**: 💰 Tráfego Pago · 📱 Social Media · 🎯 Completo · ⚙️ Outro.
- Serve para organizar clientes **e** pré-selecionar o modelo certo.

### b) Tela de confirmação após salvar o cliente
> ✅ Cliente "X" criado! Tipo: Tráfego Pago
> Quer já criar as primeiras tarefas?
> 📋 Modelo: Onboarding de Tráfego Pago (14 tarefas) — *já pré-selecionado pelo tipo*
> • Como criar: ◯ 1 tarefa com checklist · ◉ Tarefas separadas
> • Responsável: [Diego ▾] · Data de início: [hoje ▾]
> [ Pular ] [ Criar tarefas → ]

### c) No perfil do cliente — integrado ao onboarding existente
O botão **"Negócio fechado → Iniciar onboarding"** (que hoje só cria o checklist administrativo) passa a **também** oferecer a aplicação do modelo operacional. Um clique = burocracia + operação.
Além disso, um botão **"Aplicar modelo de tarefas"** no perfil, para usar a qualquer momento (ex.: cliente já existente, ou aplicar o modelo "Produção Mensal" todo mês).

### d) (Opcional) Botão "Modelos" na aba Tarefas
Para gerenciar/criar modelos e aplicar avulso, como no DGflow.

---

## 4. Mecânica de datas — tudo em 5 dias úteis

- Cada tarefa guarda um **offset em dias** (`due_offset_days`): D+1 a D+5.
- Na aplicação, escolhe-se a **data de início** (padrão = hoje). `due_date = data_início + offset` contando **dias úteis** (pula sábado/domingo).
- **Recorrentes** (monitoramento, publicação diária) **não entram nos 5 dias**: nascem **sem prazo**, marcadas como recorrentes — são a operação contínua que começa após o onboarding.
- **Âncora flexível**: mudou a data de início, todas as tarefas deslizam juntas.
- Depois de criadas são tarefas normais — dá pra arrastar/editar no kanban.

Exemplo (início Seg 08/06, dias úteis): D+5 cai na **Seg 15/06** (pula o fim de semana).

---

## 5. Modos de criação

| Modo | O que cria |
|---|---|
| **Tarefas separadas** (padrão) | N tarefas independentes, cada uma com prioridade, tags, prazo e responsável |
| **1 tarefa com checklist** | 1 tarefa com o nome do modelo, contendo os passos como itens de checklist |

---

## 6. Modelo de dados (proposta)

```
task_templates
  id            uuid pk
  user_id       uuid null      -- null = modelo do sistema
  name          text
  description   text
  category      text           -- 'trafego' | 'social' | 'completo' | 'mensal' | 'custom'
  emoji         text
  is_system     boolean
  created_at    timestamptz

task_template_items
  id              uuid pk
  template_id     uuid fk
  position        int           -- ordem
  title           text
  description     text
  priority        text          -- 'baixa'|'media'|'alta'|'urgente'
  tags            text[]
  due_offset_days int null      -- null = sem prazo
  is_recurring    boolean
```

**Aplicação → tabela `tasks`** (mapeamento):
`title, description, priority, status='a_fazer', due_date = diaUtil(start, offset), assignee/assignee_id, client_id`.

> ⚠️ **Decisões de build** (a tabela `tasks` atual não tem esses 2 campos):
> 1. **Tags**: `tasks` não tem coluna `tags`. Opções: (a) adicionar `tags text[]` em `tasks` para mostrar nos cards, ou (b) manter tags só como metadado do modelo. → recomendo (a), é uma coluna simples e os cards do DGflow mostram tags.
> 2. **Recorrente**: `tasks` não tem flag de recorrência. Opções: (a) adicionar `is_recurring boolean`, ou (b) v1 cria a tarefa recorrente sem prazo com "(recorrente)" no título. → recomendo (b) para a v1 e (a) numa fase futura.

---

## 7. Os modelos do sistema

### 💰 Onboarding — Tráfego Pago
| # | Dia | Tarefa | Descrição | Prioridade | Tags |
|---|---|---|---|---|---|
| 1 | D+1 | Solicitar acessos | BM, conta de anúncios, página, Instagram e domínio | Alta | acessos, ads |
| 2 | D+1 | Briefing de tráfego | Oferta, ticket, meta, verba mensal e histórico | Alta | briefing, estratégia |
| 3 | D+1 | Mapear oferta e funil de conversão | Caminho do lead até a venda + objetivo de conversão | Alta | estratégia, ads |
| 4 | D+2 | Instalar/verificar Pixel + API de Conversões | Garantir rastreamento (Pixel + CAPI) | Alta | tracking, ads |
| 5 | D+2 | Configurar eventos + verificação de domínio | Eventos de conversão e verificação no BM | Alta | tracking, setup |
| 6 | D+2 | Criar públicos personalizados | Visitantes do site, lista de clientes, engajamento | Média | segmentação, ads |
| 7 | D+3 | Definir arquitetura de campanha + orçamento | Topo/meio/fundo de funil e distribuição de verba | Alta | estratégia, ads |
| 8 | D+3 | Criar públicos-alvo | Frios (interesses), lookalike, retargeting + exclusões | Alta | segmentação, ads |
| 9 | D+4 | Produzir criativos | Imagens e vídeos por etapa do funil | Alta | design, ads |
| 10 | D+4 | Escrever copies dos anúncios | Textos persuasivos por formato/etapa | Média | copy, ads |
| 11 | D+4 | Validar página de destino / WhatsApp / formulário | Conferir destino do anúncio e captação | Alta | landing, setup |
| 12 | D+5 | Subir campanhas + checklist de QA | Publicar e revisar tudo antes de ativar | Alta | setup, ads |
| 13 | D+5 | Definir KPIs e montar relatório | Métricas a acompanhar + dashboard do cliente | Média | relatório, ads |
| 14 | — | Monitorar e otimizar | Acompanhar métricas e ajustar continuamente | Média | otimização, ads | **(recorrente)**

### 📱 Onboarding — Social Media
| # | Dia | Tarefa | Descrição | Prioridade | Tags |
|---|---|---|---|---|---|
| 1 | D+1 | Solicitar acessos | Instagram/Facebook, ferramentas e Drive de materiais | Alta | acessos |
| 2 | D+1 | Briefing / DNA da marca | Nicho, persona, tom de voz, diferenciais, concorrentes | Alta | briefing, identidade |
| 3 | D+1 | Coletar identidade visual | Logo, cores, fontes e banco de fotos | Alta | identidade, design |
| 4 | D+2 | Diagnóstico do perfil atual | Bio, destaques, feed, frequência e engajamento | Média | diagnóstico |
| 5 | D+2 | Análise de 3 concorrentes | Formatos, frequência e o que funciona no nicho | Média | pesquisa |
| 6 | D+3 | Definir pilares de conteúdo + frequência | Linhas editoriais, proporção de formatos e ritmo | Alta | estratégia |
| 7 | D+3 | Montar calendário editorial do 1º mês | Distribuir posts/Reels/stories no mês | Alta | planejamento |
| 8 | D+4 | Escrever copies e legendas | Legendas com gancho, desenvolvimento e CTA | Alta | copy |
| 9 | D+4 | Roteiros de Reels | Scripts com hook, estrutura e CTA | Alta | roteiro |
| 10 | D+4 | Criar artes/templates do feed | Padronizar identidade visual dos posts | Média | design |
| 11 | D+5 | Roteiro de stories da semana | Sequência de stories por dia | Média | stories |
| 12 | D+5 | Enviar para aprovação do cliente | Subir o material no portal para aprovação | Alta | aprovação |
| 13 | — | Rotina de publicação e engajamento | Publicar, postar stories e interagir diariamente | Média | publicação | **(recorrente)**

### 🎯 Onboarding — Completo (Social + Tráfego)
Não é só a soma — tem dependências. Estrutura:
- **Tronco comum (D+1):** Solicitar acessos · Briefing/DNA da marca · Coletar identidade visual.
- **Ramo Social (D+2→D+5):** Diagnóstico · Pilares + calendário · Produção (copies, Reels, artes) · Aprovação.
- **Ramo Tráfego (D+2→D+5):** Pixel/eventos · Públicos · Arquitetura + criativos · Subir campanha.
- **Tarefa-ponte (D+5):** "Transformar conteúdos de melhor desempenho em criativos de anúncio".

> Cabe em 5 dias **se a equipe rodar as duas trilhas em paralelo**. Para 1 pessoa só, recomenda-se estender o prazo (decisão sua).

### 🔁 Produção de Conteúdo Mensal (modelo recorrente, aplicar todo mês)
| # | Tarefa | Prioridade | Tags |
|---|---|---|---|
| 1 | Pesquisar tendências e datas do mês | Média | pesquisa |
| 2 | Definir tema/campanha do mês | Alta | estratégia |
| 3 | Montar calendário do mês | Alta | planejamento |
| 4 | Produzir copies e roteiros | Alta | copy |
| 5 | Criar artes e editar Reels | Alta | design |
| 6 | Enviar para aprovação e agendar | Alta | aprovação |

---

## 8. Relação com o onboarding administrativo existente

O sistema já tem, no perfil do cliente, um **checklist administrativo** (`client_checklist`), criado em "Negócio fechado → Iniciar onboarding". Ele é **complementar**, não conflita:

| | Onde fica | O quê | Tipo |
|---|---|---|---|
| Checklist de Onboarding (existe) | Perfil do cliente → aba Onboarding | Burocracia: contrato, pagamento, acessos, grupo WhatsApp, kickoff | Checkbox simples |
| **Modelos de tarefas (novo)** | Aba Tarefas (kanban) | Operação: tráfego/social | Tarefas reais c/ prazo, responsável e cliente |

A integração: o mesmo gatilho "Iniciar onboarding" cria o checklist administrativo **e** oferece aplicar o modelo operacional.

---

## 9. Fases de implementação sugeridas

1. **Fase 1 — Base:** tabelas `task_templates`/`task_template_items` + seed dos modelos do sistema + função de aplicação (dias úteis, vínculo cliente/responsável). Coluna `tags` em `tasks`.
2. **Fase 2 — UX:** campo "tipo de serviço" no cadastro + tela de confirmação pós-save + botão no perfil do cliente.
3. **Fase 3 — Gestão:** modal "Modelos" na aba Tarefas (criar/editar modelos próprios).
4. **Fase 4 — IA (ponte com os squads):** cada tarefa ganha um botão **"gerar com IA"** que abre o squad relevante no IA Copilot já com o cliente selecionado (ex: tarefa "Escrever copies dos anúncios" → abre o squad **Tráfego Pago**; "Roteiros de Reels" → **Fábrica de Conteúdo**). Fecha o ciclo **tarefa → produção** dentro do sistema, com custo de IA quase zero (só liga o que já existe).
   - Mapeamento tarefa→squad: cada `task_template_item` pode ter um campo opcional `squad_id` indicando qual squad abrir.
   - Evolução futura opcional: (A) criar modelo por IA a partir de uma descrição; (B) personalizar as descrições ao DNA do cliente.

---

## 10. Decisões (confirmadas)

1. ✅ **Tags nos cards:** adicionar coluna `tags text[]` em `tasks`.
2. ✅ **Recorrentes:** v1 cria sem prazo com "(recorrente)" no título; flag dedicada em fase futura.
3. ✅ **Modelo Completo em 1 pessoa:** offsets podem ultrapassar 5 dias (não trava em 5). O limite de 5 dias úteis vale para Tráfego e Social isolados; o Completo usa prazo maior.
4. ✅ **Ponto de entrada:** cadastro do cliente (principal) + perfil do cliente.
5. ✅ **IA (Fase 4):** opção **C — ponte com os squads**. Cada tarefa ganha um botão "gerar com IA" que abre o squad relevante já com o cliente selecionado. É a mais natural e barata (liga o que já existe). Opções A (criar modelo por IA) e B (personalizar) ficam como evolução futura opcional.
