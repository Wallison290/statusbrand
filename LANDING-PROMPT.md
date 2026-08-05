# StatusMedia — Landing Page · Prompt 3.2 preenchido

> Cadeia executada: **1.2** (briefing) → **2.1** (seções) → **2.4** (hierarquia) → **2.5** (CTAs) → **3.2** (prompt-mestre Moderno & Vibrante).
> Fonte do briefing: código do repositório `Wallison290/statusbrand` (não houve áudio do cliente).
> Decisão do dono: **sair do visual dark, manter a paleta existente do sistema.**

---

## ⚠️ Adaptações feitas na biblioteca

A biblioteca é calibrada para **negócio local**. StatusMedia é **SaaS**. Adaptei:

| Item da biblioteca | Original | Adaptado |
|---|---|---|
| `{{CIDADE}}` | Cidade de atuação | Produto digital, Brasil inteiro (pt-BR) |
| CTA principal | `wa.me` com mensagem pré-preenchida | Rota interna `/login` → teste de 3 dias → Stripe |
| JSON-LD | `LocalBusiness` | `SoftwareApplication` + `Offer` |
| `{{ENDERECO}}` | Endereço físico | Não se aplica |
| Prova social | "10 anos no bairro", "+500 clientes" | Números do produto — **pendente de dado real** |

---

# PARTE 1 — Briefing estruturado (output do 1.2)

## 1. Identidade do negócio
- **Nome:** StatusMedia
- **Nicho:** SaaS B2B — plataforma de gestão de operação para agências e profissionais de social media
- **Cidade / região:** Não se aplica. Produto 100% digital, interface e conteúdo em pt-BR.
- **Tempo de operação:** `[FALTA: data de lançamento]` — o repo indica produto recente (v1.0.0, tela de Instagram marcada como "recurso em evolução")

## 2. O que vende
Assinatura mensal, 3 dias de teste, sem fidelidade, cobrança via Stripe.

| Plano | Preço | Clientes | Equipe | IA/mês | Storage | Instagram |
|---|---|---|---|---|---|---|
| Starter | R$ 57 | 5 | 1 | 150 créditos | 10 GB | 1 perfil |
| Pro *(Mais popular)* | R$ 97 | 20 | 3 | 600 créditos | 50 GB | 5 perfis |
| Agency *(Ilimitado)* | R$ 197 | 50 | ilimitada | 2.000 créditos | 100 GB | 20 perfis |

**Módulos entregues:** Hub do cliente (DNA da marca, briefing, onboarding com checklist) · Planejamento editorial (calendário, copy, anexos, comentários, aprovação, agendamento) · Feed do perfil (monta o grid antes de publicar) · Agendamento de Instagram via OAuth Meta · Portal de aprovação do cliente · IA Copilot (13 squads, 52 agentes, GPT-4o, busca web, geração de imagem) · Tarefas com modelos reutilizáveis · Notas · Biblioteca de conteúdo · Financeiro · Relatórios mensais com métricas do Instagram · Notificações via WhatsApp · Gestão de equipe + portal do colaborador.

## 3. Público-alvo (com as palavras do próprio produto)
Quatro perfis, extraídos das descrições de plano e dos papéis nos depoimentos:
- **Social media freelancer / solo** — "Para quem está começando a agência"
- **Social media de agência**
- **Gestor de tráfego**
- **Dono de agência** — "Para agências consolidadas"

Perfil comum: atende múltiplos clientes ao mesmo tempo, vive dentro do Instagram, já paga por 2-3 ferramentas soltas e por IA avulsa.

## 4. Diferencial competitivo
> "A IA já conhece seu cliente. Sem repetir briefing toda vez."

> "Não é só um agrupador de ferramentas."

Três eixos: **(a)** contexto persistente por cliente — DNA da marca, tom de voz e histórico ficam salvos e a IA usa isso; **(b)** fluxo fechado do briefing à aprovação, com portal próprio para o cliente; **(c)** profundidade da IA — 13 squads e 52 agentes, não um chat genérico.

## 5. Tom e personalidade da marca
Direto, coloquial-profissional, pt-BR brasileiro. Frases curtas. Segunda pessoa ("sua operação", "seu cliente", "você produz"). Usa o vocabulário real de quem trabalha na área ("gancho", "carrossel", "reel", "briefing", "feed"). Não é corporativo nem infantil. Assinatura: **"Organize. Produza. Escale."**

## 6. Concorrentes / referências citados pelo próprio site
Trello · Google Drive · ChatGPT e "IAs genéricas" · WhatsApp (como ferramenta de aprovação) · planilhas · "scheduler isolado".

## 7. Objetivo do site
Converter visitante frio em **início de teste de 3 dias**. Instrumentação já existente: Meta Pixel `1294390045461688` disparando `Lead`, `ViewContent` e `InitiateCheckout`; Google Ads `AW-18301456637` (configurado, **sem evento de conversão** — lacuna).

## 8. Material disponível
- `/logo.svg`, `/logo.png`, `/logo-icon.png` (512 KB), `/logo-video.mp4` (1,2 MB — hero atual), `/planer.png` (621 KB, não usado)
- `DESIGN.md` (design system) e `README.md`
- Paleta e biblioteca de componentes do produto em produção
- `[FALTA: screenshots reais do produto em alta resolução]` — hoje o hero mostra vídeo do **logo**, não do produto
- `[FALTA: fotos reais dos depoentes]` — o 3.2 exige foto real; hoje são só iniciais
- `[FALTA: números verificáveis de prova social]` — nº de agências ativas, contas gerenciadas, posts publicados

## 9. Restrições e "não quero"
- **Não quero o visual dark** na landing (decisão do dono, 04/08/2026)
- **Manter a paleta existente do sistema** — sem inventar cor nova
- `[FALTA: confirmar se a copy pode ser reescrita ou se é só troca visual]`

## 10. Lacunas a preencher
1. `[FALTA: WhatsApp de suporte]` — todos os planos prometem "Suporte: WhatsApp", mas não há número público no repo
2. `[FALTA: e-mail de contato público]`
3. `[FALTA: números reais de prova social]`
4. `[FALTA: depoimentos reais com nome, foto e autorização de uso]`
5. `[FALTA: screenshots do produto para o hero]`
6. `[FALTA: data de lançamento / tempo de mercado]`
7. `[FALTA: razão social e CNPJ]` — necessário para o rodapé e para o JSON-LD

## 11. Frases que viram copy
1. "Organize. Produza. Escale."
2. "Sua operação de social media em uma única plataforma."
3. "Sem pular entre Trello, Drive, ChatGPT e WhatsApp."
4. "Quando a operação depende de muitas abas, o problema deixa de ser produção e vira controle."
5. "A IA já conhece seu cliente. Sem repetir briefing toda vez."
6. "O próximo mês começa de onde o anterior parou."
7. "Não é só um agrupador de ferramentas."

---

# PARTE 2 — Mapa de seções (output do 2.1)

## Mapa de seções — SaaS de gestão para social media

| # | Seção | Prioridade | Job (pergunta que responde) | CTA presente? |
|---|---|---|---|---|
| 1 | **Hero** | ESSENCIAL | "O que é isso e por que eu deveria me importar nos primeiros 5 segundos?" | ✅ **primário (1ª aparição)** |
| 2 | **Prova de escala** | RECOMENDADA | "Isso é um produto sério ou mais um app de um cara só?" | — |
| 3 | **O problema** | ESSENCIAL | "Eles entendem como é a minha rotina de verdade?" | — |
| 4 | **Como funciona** | ESSENCIAL | "Quanto trabalho vai dar pra começar a usar?" | ✅ secundário |
| 5 | **A plataforma** | ESSENCIAL | "O que exatamente eu recebo por esse preço?" | ✅ secundário |
| 6 | **Prova social** | ESSENCIAL | "Alguém como eu já usa e deu certo?" | — |
| 7 | **Planos** | ESSENCIAL | "Quanto custa e qual eu escolho?" | ✅ **primário (repetição crítica)** |
| 8 | **FAQ + fechamento** | ESSENCIAL | "O que ainda me impede de clicar?" | ✅ **primário (última chance)** |

## Por que esta ordem
A progressão é **atenção → credibilidade → identificação → viabilidade → escopo → confiança → preço → objeção final**. O hero vende a promessa; a barra de prova impede o abandono imediato de quem duvida do tamanho do produto; o bloco de problema faz o visitante se reconhecer antes de qualquer feature. Só então mostramos *como* (baixo esforço percebido) e *o quê* (escopo). Prova social vem imediatamente antes do preço, porque é o amortecedor psicológico do número. E o FAQ existe para matar as objeções que sobram depois do preço — por isso o CTA final mora colado nele, não isolado no rodapé.

## CTA principal — onde aparece
- **Primeira aparição:** hero, acima da dobra
- **Repetições:** fim do "Como funciona", fim da "Plataforma", em cada card de plano, e no fechamento pós-FAQ
- **Microcopy sugerida:** "Começar teste de 3 dias" *(nunca "Saiba mais" — não move ninguém)*

## Seções que eu DEIXEI DE FORA — e por quê
- **"Por que funciona" (3 diferenciais)** — os três pontos já vivem no hero e na Plataforma. Repetir vira redundância que custa scroll.
- **Tabela comparativa "vs. ferramentas soltas"** — o job dela é matar objeção, e o FAQ já faz isso melhor ("Por que não usar só o ChatGPT?"). Uma tabela de 4 linhas não paga o espaço que ocupa antes do preço.
- **Seção "Sobre a empresa"** — ninguém assina SaaS de R$57 por causa da história da fundação.
- **Blog / conteúdo** — não tem job de conversão nesta página.
- **Integrações em logo-wall** — só valeria com logos de peso; hoje seria Meta e Stripe, o que não impressiona ninguém.

---

# PARTE 3 — Hierarquia visual (output do 2.4)

*Mood: vibrante · Ação principal: iniciar teste de 3 dias*

### Seção: Hero
- **Primário:** H1 em 5x o body, peso 800, com **uma palavra** na cor dominante
- **Secundário:** botão CTA em pill, cor dominante sólida, sombra colorida
- **Terciário:** subtítulo (1 frase), selos de segurança em cinza neutro, imagem do produto como suporte
- **CTA:** acima da dobra, imediatamente sob o subtítulo — nível **primário**

### Seção: Prova de escala
- **Primário:** os números ("13", "52") em display, 4x o body, peso 900, cor dominante
- **Secundário:** rótulo de cada número em maiúscula pequena
- **Terciário:** chips com os nomes dos squads — todos do mesmo tamanho, propositalmente planos
- **CTA:** ausente. Esta seção não vende, ela credencia.

### Seção: O problema
- **Primário:** H2, 2,5x o body, com a palavra "controle" em destaque cromático
- **Secundário:** os 6 cards de dor, todos com o mesmo peso entre si
- **Terciário:** parágrafo de contexto sob o H2
- **CTA:** ausente. Tensão sem alívio — o alívio é a próxima seção.

### Seção: Como funciona
- **Primário:** o número do passo (01/02/03) em display gigante, cor dominante a 15% de opacidade, atrás do conteúdo
- **Secundário:** título de cada passo, peso 700
- **Terciário:** descrição do passo
- **CTA:** ao fim dos 3 passos, centralizado — nível **secundário** (outline)

### Seção: A plataforma
- **Primário:** H2 da seção
- **Secundário:** título de cada card de módulo + ícone na cor dominante
- **Terciário:** bullets internos de cada card
- **CTA:** rodapé da seção — nível **secundário**
- **Nota:** 12 módulos com o mesmo peso visual achatam a seção. Promova 3 (Hub do Cliente, IA Copilot, Portal de Aprovação) a cards de largura dupla; o restante vira grade densa.

### Seção: Prova social
- **Primário:** a frase do depoimento, 1,4x o body, peso 500
- **Secundário:** foto + nome + papel do depoente
- **Terciário:** as 5 estrelas
- **CTA:** ausente

### Seção: Planos
- **Primário:** o preço, 4x o body, peso 800 — e **apenas no card Pro**, que ganha escala 1,05 e a cor dominante
- **Secundário:** botão de cada card
- **Terciário:** lista de features agrupada por categoria
- **CTA:** um por card — nível **primário** no Pro, secundário nos demais

### Seção: FAQ + fechamento
- **Primário:** o H2 do fechamento, 3x o body
- **Secundário:** botão CTA final, o maior botão da página inteira
- **Terciário:** as perguntas do accordion, todas fechadas por padrão exceto a primeira
- **CTA:** logo abaixo do H2 de fechamento — nível **primário**

## Regras globais de hierarquia
- **H1 (hero):** 5x o body — 80-96px desktop, 40px mobile
- **H2 (seção):** 2,5x o body — 48px desktop, 30px mobile
- **Body:** 18px base, 16px mobile *(a landing quebra deliberadamente a regra de 13px do `DESIGN.md`, que vale só para o app)*
- **Peso:** 800 exclusivo de H1 e números de display; 700 em H2; 600 em botões e títulos de card; 400/500 no resto
- **Cor de destaque:** o azul dominante é reservado a **CTA, uma palavra do H1, ícones e números de display**. Nunca em texto corrido, nunca em borda decorativa.

## Anti-padrões a evitar
1. Doze cards de módulo idênticos em tamanho — o olho desiste na terceira linha
2. Três CTAs concorrentes na mesma dobra do hero
3. Preço no mesmo tamanho do nome do plano — o preço tem que ganhar
4. Texto cinza-claro sobre fundo branco em corpo de texto (reprova em AA)
5. H2 e título de card com o mesmo peso, dando sensação de página plana

---

# PARTE 4 — Mapa de CTAs (output do 2.5)

## Hierarquia de CTAs
1. **Primário:** botão para `/login` — *"Começar teste de 3 dias"*
2. **Secundário:** scroll âncora para `#plataforma` / `#planos` — *"Ver a plataforma"*
3. **Fallback:** WhatsApp de suporte no rodapé — *"Falar com a gente"* `[FALTA: número]`

## Links prontos para colar

### CTA primário — hero
- **Destino:** `<Link to="/login">` (rota interna, SPA — **sem** `target="_blank"`)
- **Microcopy:** `Começar teste de 3 dias`
- **Apoio sob o botão:** `3 dias grátis · sem cartão na primeira etapa · cancela quando quiser` — `[VALIDAR: o teste realmente não pede cartão?]`
- **Tracking:** `fbq('track','Lead',{content_name:'hero_trial'})` + `gtag('event','conversion',{send_to:'AW-18301456637/[FALTA: label]'})`

### CTA primário — cards de plano
- **Destino:** `<Link to="/login">`
- **Microcopy:** `Começar com o {nome do plano}`
- **Tracking:** `fbq('track','InitiateCheckout',{content_name, content_ids, value, currency:'BRL', num_items:1})` — *já implementado, preservar*

### CTA primário — fechamento pós-FAQ
- **Destino:** `<Link to="/login">`
- **Microcopy:** `Testar 3 dias grátis`
- **Tracking:** `fbq('track','Lead',{content_name:'final_cta'})`

### CTA secundário — hero e fim de seção
- **Destino:** âncora `#plataforma` (hero) e `#planos` (fim de "Como funciona" e "Plataforma")
- **Microcopy:** `Ver a plataforma` / `Ver planos`
- **Estilo:** outline pill, mesma cor de marca

### Fallback — WhatsApp de suporte (rodapé)
- **URL:** `https://wa.me/{{FALTA_WHATSAPP}}?text=Vim%20pelo%20site%20da%20StatusMedia%20e%20queria%20tirar%20uma%20d%C3%BAvida%20antes%20de%20testar.`
- **Mensagem decodificada:** "Vim pelo site da StatusMedia e queria tirar uma dúvida antes de testar."
- **Microcopy:** `Falar com a gente`
- **Atributos:** `target="_blank" rel="noopener noreferrer"`
- **⚠️ Não publicar até ter o número real.** Se não houver, omitir o bloco inteiro — link quebrado converte pior que link ausente.

### E-mail (rodapé)
- **URL:** `mailto:{{FALTA_EMAIL}}?subject=D%C3%BAvida%20sobre%20a%20StatusMedia`

### Login (navbar)
- **Destino:** `<Link to="/login">` · Microcopy: `Entrar` · **sem tracking** (é usuário existente, não lead)

## Mapa de CTAs por seção
| Seção | CTA primário | CTA secundário |
|---|---|---|
| Navbar | — | Entrar |
| Hero | Começar teste de 3 dias | Ver a plataforma |
| Prova de escala | — | — |
| O problema | — | — |
| Como funciona | — | Ver planos |
| A plataforma | — | Ver planos |
| Prova social | — | — |
| Planos | Começar com o {plano} (×3) | — |
| FAQ + fechamento | Testar 3 dias grátis | — |
| Rodapé | — | Falar com a gente / Entrar |

## Notas de implementação
- `target="_blank"` **apenas** no WhatsApp. Rotas internas usam `<Link>` do react-router — abrir em aba nova quebra a SPA.
- `rel="noopener noreferrer"` obrigatório no wa.me.
- Sem UTM em rota interna. UTM só no wa.me: `utm_source=site&utm_medium=botao&utm_campaign=rodape`.
- **Corrigir a lacuna do Google Ads:** hoje só existe o `gtag('config')`. Criar a conversão no painel e disparar `gtag('event','conversion')` nos mesmos 3 pontos do Pixel.
- Manter o `IntersectionObserver` que dispara `ViewContent` na seção de planos.

---

---

# PARTE 5 — 🎯 PROMPT FINAL (copiar daqui para baixo)

```
Você é um designer e desenvolvedor full-stack que cria sites de uma página em estilo MODERNO & VIBRANTE. Sua especialidade: transmitir energia e personalidade sem cair no exagero — cor forte usada com critério, movimento sutil que premia o scroll.

═══════════════════════════════════════════
NEGÓCIO
═══════════════════════════════════════════
- Nome: StatusMedia
- Nicho: SaaS B2B — plataforma que centraliza a operação de agências e profissionais de social media (clientes, conteúdo, aprovação, IA, tarefas, financeiro)
- Cidade: não se aplica — produto 100% digital, atende todo o Brasil, interface em pt-BR
- Público: social media freelancer/solo, social media de agência, gestor de tráfego e dono de agência. Atendem vários clientes ao mesmo tempo, vivem dentro do Instagram, já pagam por 2-3 ferramentas soltas mais IA avulsa, e perdem mais tempo coordenando do que produzindo.
- Diferencial: a IA guarda o DNA da marca, o tom de voz e o histórico de cada cliente — não precisa repetir briefing. E o fluxo é fechado, do briefing à aprovação do cliente, com portal próprio. São 13 squads e 52 agentes de IA, não um chat genérico.
- Ação principal: iniciar o teste gratuito de 3 dias (rota interna /login → assinatura Stripe)
- WhatsApp: [FALTA: número de suporte — não publicar o bloco de WhatsApp enquanto não houver número real]

═══════════════════════════════════════════
INPUT ESTRUTURAL
═══════════════════════════════════════════

── SEÇÕES (2.1) — 8 seções, nesta ordem exata ──
1. HERO — job: "o que é isso e por que me importar em 5 segundos?" — CTA primário, 1ª aparição
2. PROVA DE ESCALA — job: "isso é sério ou é mais um app de um cara só?" — sem CTA
3. O PROBLEMA — job: "eles entendem a minha rotina de verdade?" — sem CTA
4. COMO FUNCIONA — job: "quanto trabalho dá pra começar?" — CTA secundário
5. A PLATAFORMA — job: "o que exatamente eu recebo por esse preço?" — CTA secundário
6. PROVA SOCIAL — job: "alguém como eu já usa e deu certo?" — sem CTA
7. PLANOS — job: "quanto custa e qual eu escolho?" — CTA primário, repetição crítica
8. FAQ + FECHAMENTO — job: "o que ainda me impede de clicar?" — CTA primário, última chance
(+ rodapé)

NÃO adicione seções além destas 8. Foram deliberadamente cortadas: "por que funciona" (redundante com hero + plataforma), tabela comparativa (o FAQ já mata a objeção), "sobre a empresa" e logo-wall de integrações.

── HIERARQUIA (2.4) ──
Regra inegociável: UM único elemento primário por seção.

- HERO — primário: H1 (5x o body, peso 800, UMA palavra na cor dominante). Secundário: botão CTA pill com sombra colorida. Terciário: subtítulo de 1 frase, selos de confiança, imagem do produto como suporte. CTA acima da dobra.
- PROVA DE ESCALA — primário: os números "13" e "52" em display 4x o body, peso 900, cor dominante. Secundário: rótulos em maiúscula pequena. Terciário: chips dos squads, todos iguais e propositalmente planos.
- O PROBLEMA — primário: H2 (2,5x o body) com a palavra "controle" em destaque cromático. Secundário: 6 cards de dor com peso igual entre si. Terciário: parágrafo de contexto. Tensão sem alívio — sem CTA aqui.
- COMO FUNCIONA — primário: numeral do passo (01/02/03) em display gigante, cor dominante a 15%, ATRÁS do conteúdo. Secundário: título do passo (700). Terciário: descrição. CTA secundário ao fim dos 3.
- A PLATAFORMA — primário: H2. Secundário: título + ícone de cada módulo. Terciário: bullets. IMPORTANTE: 12 módulos com peso idêntico achatam a seção — promova Hub do Cliente, IA Copilot e Portal de Aprovação a cards de largura dupla; os outros 9 viram grade densa.
- PROVA SOCIAL — primário: a frase do depoimento (1,4x o body, peso 500). Secundário: foto + nome + papel. Terciário: estrelas.
- PLANOS — primário: o preço (4x o body, peso 800) e SOMENTE no card Pro, que recebe escala 1,05 e a cor dominante. Secundário: botão de cada card. Terciário: features agrupadas por categoria.
- FAQ + FECHAMENTO — primário: H2 do fechamento (3x o body). Secundário: o CTA final, que é o maior botão da página. Terciário: accordion, tudo fechado exceto a primeira pergunta.

Escalas globais: H1 = 5x body (80-96px desktop / 40px mobile) · H2 = 2,5x body (48px / 30px) · body = 18px (16px mobile) · peso 800 só em H1 e números de display, 700 em H2, 600 em botões e títulos de card, 400/500 no resto.
Cor dominante reservada a: CTA, uma palavra do H1, ícones e números de display. NUNCA em texto corrido nem em borda decorativa.

Anti-padrões proibidos: 12 cards idênticos em tamanho · 3 CTAs concorrentes na mesma dobra · preço do mesmo tamanho do nome do plano · cinza-claro sobre branco em corpo de texto · H2 e título de card com o mesmo peso.

── CTAs (2.5) ──
PRIMÁRIO — "Começar teste de 3 dias" → <Link to="/login"> (rota interna react-router, SEM target="_blank")
  · hero: "Começar teste de 3 dias" + apoio "3 dias grátis · cancela quando quiser"
  · cards de plano: "Começar com o {nome do plano}"
  · fechamento: "Testar 3 dias grátis" (maior botão da página)
SECUNDÁRIO — outline pill, mesma cor de marca
  · hero: "Ver a plataforma" → âncora #plataforma
  · fim de "Como funciona" e de "A plataforma": "Ver planos" → âncora #planos
NAVBAR — "Entrar" → /login, sem tracking (usuário existente não é lead)
FALLBACK — WhatsApp no rodapé, "Falar com a gente" → https://wa.me/{NUMERO}?text=... com target="_blank" rel="noopener noreferrer". OMITIR o bloco inteiro enquanto o número não existir.

Tracking a preservar e completar:
  · fbq('track','Lead',{content_name:'hero_trial'}) no CTA do hero
  · fbq('track','Lead',{content_name:'final_cta'}) no fechamento
  · fbq('track','InitiateCheckout',{content_name, content_ids, value, currency:'BRL', num_items:1}) em cada card de plano
  · fbq('track','ViewContent',{content_name:'pricing_section'}) via IntersectionObserver, uma única vez, threshold 0.25
  · gtag('event','conversion') nos mesmos 3 pontos — hoje só existe o gtag('config'), essa lacuna precisa ser fechada
  · o helper trackPixel deve continuar em try/catch, para não quebrar se o pixel estiver bloqueado

── BRIEFING (1.2) ──
Tom da marca: direto, coloquial-profissional, pt-BR brasileiro, frases curtas, segunda pessoa ("sua operação", "seu cliente"). Usa o vocabulário real da área: gancho, carrossel, reel, briefing, feed, DNA da marca. Não é corporativo nem infantil. Assinatura: "Organize. Produza. Escale."

Frases da marca que podem virar copy (reaproveite, não invente promessa nova):
  · "Sua operação de social media em uma única plataforma."
  · "Sem pular entre Trello, Drive, ChatGPT e WhatsApp."
  · "Quando a operação depende de muitas abas, o problema deixa de ser produção e vira controle."
  · "A IA já conhece seu cliente. Sem repetir briefing toda vez."
  · "O próximo mês começa de onde o anterior parou."
  · "Não é só um agrupador de ferramentas."

As 6 dores do público (seção 3): aprovação espalhada entre WhatsApp e Instagram · calendário editorial numa planilha separada · briefing repetido toda vez que abre o ChatGPT · tarefas sem dono claro · financeiro desconectado da operação · cliente pedindo ajuste fora do fluxo.

Concorrência que o site cita nominalmente: Trello, Google Drive, ChatGPT e IAs genéricas, WhatsApp como ferramenta de aprovação, planilhas, scheduler isolado.

Os 12 módulos da plataforma (seção 5): Hub do Cliente · Planejamento Editorial · Feed do Perfil · Agendamento Instagram · Portal de Aprovação · IA Copilot · Tarefas & Produção · Notas Rápidas · Biblioteca de Conteúdo · Financeiro · Gestão de Equipe · Visão Geral.

Os 13 squads de IA (seção 2): Fábrica de Conteúdo · Diagnóstico de Perfil · Máquina de Clientes · Auditoria de Marketing · Psicologia de Vendas · Inteligência Competitiva · Identidade de Marca · Tráfego Pago · Presença Multiplataforma · Mineração de Anúncios · Motor de Conteúdo SEO · Comunidade e Retenção · Design Criativo.

═══════════════════════════════════════════
DESIGN SYSTEM — MODERNO & VIBRANTE
═══════════════════════════════════════════

⚠️ SOBRESCRITA OBRIGATÓRIA DA PALETA
Este projeto NÃO escolhe cor nova. A landing tem que usar a paleta que já existe no produto, porque quem clica em "testar" cai dentro do app e precisa reconhecer a mesma marca. A landing atual é dark; o produto é claro. Estamos invertendo a landing para o claro, alinhando com o produto.

PALETA (fixa, extraída do código em produção):
- Cor dominante: #2563EB (azul de ação do sistema — 218 usos no app)
- Secundária: gradiente navy #29457a → #16284d (gradiente da marca: sidebar ativa e botões de destaque)
- Azul claro de apoio: #6f93c9
- Background: #FFFFFF puro. NUNCA cinza médio. NUNCA dark.
- Superfície alternada de seção: #f7f7f7 (usar para criar ritmo entre seções, sem virar cinza médio)
- Borda: #e8e8e8
- Texto principal: #0f0f0f · Texto secundário: #475569 · Texto terciário: #64748b
- Acento (parcimônia máxima, só microelementos): #F5A623 âmbar. Verde #22C55E apenas em selos de confiança.
- Gradiente permitido: UM só, o navy #29457a → #16284d, e no MÁXIMO em 2 lugares (hero e card Pro dos planos).
- Texto sobre cor: branco puro, sempre AA+.
NÃO introduza magenta, coral, lima, roxo ou neon. As sugestões por nicho do template original (salão = magenta, academia = lima) NÃO se aplicam aqui.

TIPOGRAFIA:
- Títulos: Sora (fallback: Space Grotesk). Corpo: Inter.
- ATENÇÃO: hoje o index.css declara 'Inter' mas a fonte NUNCA é carregada — não há link do Google Fonts, @font-face nem pacote npm. A página está renderizando em Segoe UI. Carregue Sora e Inter de verdade, com display=swap e preconnect.
- Tamanhos: H1 80-96px desktop / 40px mobile · H2 48px / 30px · body 18px / 16px mobile
- Pesos: 800 em H1 e números de display, 700 em H2, 600 em botões, 400/500 no corpo
- Permitido: 1 palavra do H1 na cor dominante. Letter-spacing -0.03em nos displays.

ESPAÇAMENTO:
- Padding vertical de seção: 96-160px desktop, 64-80px mobile
- Containers: alterne full-bleed (fundo #f7f7f7 invadindo as bordas) e contido (max-w 1200px), para criar ritmo
- Grid 12 colunas, gap 32px

COMPONENTES:
- Botão primário: #2563EB sólido, texto branco, border-radius 999px, padding 18px 36px, peso 600, sombra colorida (azul a 30%)
- Botão secundário: outline #2563EB, mesmo pill
- Cards: border-radius 20-24px, sombra suave COLORIDA (azul a baixa opacidade, não preto), hover com translateY -4px
- Imagens: border-radius 16-24px
- Ícones: lucide-react, line-style 1.5-2px, monocromáticos em #2563EB

ANIMAÇÕES (framer-motion, sutis):
- Fade-in + slide-up no scroll, 300ms ease-out, com viewport={{ once: true }}
- Hover de card: scale 1.03 + sombra cresce
- Hero: gradient mesh estático OU um blob navy em loop lento de 20s+. Escolha UM.
- ZERO carrossel automático, ZERO confetti, ZERO marquee.
- Respeitar prefers-reduced-motion.

═══════════════════════════════════════════
REGRAS GLOBAIS DE CONTEÚDO
═══════════════════════════════════════════

COPY:
- Tom direto e energético, frases curtas, pode começar com verbo no imperativo
- Hero headline: 4-8 palavras, 1 palavra em destaque cromático
- Subtítulo: 1 frase de 12-20 palavras
- No máximo 1 emoji por seção (os squads já usam emoji — nesse caso, nenhum emoji adicional na seção)
- NÃO invente número, percentual, prêmio ou promessa de resultado que não esteja no briefing

CTA:
- Microcopy energética, primeira pessoa permitida
- O verbo é sempre "testar" ou "começar" — nunca "saiba mais"

PROVA:
- ⚠️ RESTRIÇÃO CRÍTICA: os 6 depoimentos que existem hoje na landing não têm foto, empresa nem comprovação, e aparentam ser fictícios. NÃO gere depoimentos inventados. Monte a seção de prova social preparada para receber nome real, papel real e FOTO real, e deixe marcado [FALTA: depoimento real + autorização de uso]. Se não houver depoimento real disponível, substitua a seção por prova de produto (screenshots reais das telas) em vez de fabricar pessoa que não existe.
- Números grandes só com dado verificável. Os únicos números confirmados hoje são: 13 squads, 52 agentes, 3 dias de teste, 3 planos. Qualquer outro fica [FALTA: dado real].

═══════════════════════════════════════════
ENTREGA TÉCNICA
═══════════════════════════════════════════
- Formato: React 18 + TypeScript + Tailwind CSS 3 + framer-motion 11 + lucide-react, no padrão do projeto existente.
- Substituir integralmente src/pages/LandingPage.tsx, mantendo o export nomeado `export function LandingPage()` (App.tsx faz lazy import de `m.LandingPage` — quebrar isso quebra a rota "/").
- Os planos DEVEM vir de `import { PLANS } from '@/config/plans'`. Não hardcode preço nem feature: esse arquivo é fonte única compartilhada com o app e com o Stripe.
- Navegação interna com `<Link>` do react-router-dom v7. Âncoras com scrollIntoView({behavior:'smooth'}), ids: plataforma, como-funciona, planos, faq.
- Mobile-first, responsivo até 320px.
- Acessibilidade AA: contraste reforçado, foco visível, aria-expanded no accordion do FAQ, alt descritivo nas imagens.
- Performance: lazy-load de imagens, fontes com display=swap + preconnect, animações respeitando prefers-reduced-motion.
  · O hero hoje usa /logo-video.mp4 (1,2 MB) e /logo-icon.png (512 KB renderizado a 32×32). Otimize: sirva o ícone em WebP no tamanho real e troque o vídeo do logo por screenshot real do produto, ou por vídeo comprimido com poster.
- SEO: title, meta description, canonical, og:image e twitter:image (faltam hoje), + JSON-LD de SoftwareApplication com applicationCategory "BusinessApplication", offers em BRL e os 3 planos. NÃO use LocalBusiness — não é negócio local.
- Corrigir o flash branco: o LoadingScreen do Suspense em App.tsx usa fundo #f8fafc claro; com a landing agora clara, isso deixa de ser problema — confirme que a transição ficou contínua.

ENTREGÁVEIS:
1. Código completo de src/pages/LandingPage.tsx, comentado em pt-BR no estilo do projeto (comentários de seção com ─── separadores).
2. As alterações necessárias em index.html (fontes, canonical, og:image, twitter:image, JSON-LD).
3. Lista das imagens necessárias, com descrição de cada uma (estilo: screenshot real de tela do produto, alta nitidez, sem mockup genérico de banco de imagem).
4. Bloco de SEO pronto para colar.
5. Checklist de revisão, incluindo a lista de [FALTA: ...] que precisa ser resolvida antes de publicar.

═══════════════════════════════════════════

Agora execute. Vibrante NÃO é desorganizado. Use a cor com critério, o movimento como recompensa, a tipografia como personalidade. E lembre: a paleta é fixa e já existe — sua liberdade está na composição, na escala e no ritmo, não na escolha de cor.
```

---

## Decisões que precisam do seu OK antes de rodar

1. **Cor dominante = `#2563EB`.** O navy `#29457a` da marca é escuro demais para ser a cor vibrante dominante sobre branco; ele fica no gradiente. Se você preferir o navy como dominante, o resultado será mais sóbrio e menos "vibrante".
2. **Sora nos títulos.** O sistema só usa Inter. Como a Inter nem está sendo carregada hoje, é o momento de resolver as duas coisas. Se quiser Inter em tudo, é só dizer — perde um pouco de personalidade.
3. **8 seções em vez de 12.** Cortei "Por que funciona" e a tabela comparativa. Se quiser manter as duas, viram 10 e a página fica mais longa.
4. **Depoimentos.** Instruí o prompt a *não* gerar depoimento fictício. Isso significa que a seção vai sair marcada como pendente até você ter nome, papel e foto reais.
5. **`[FALTA: ...]` em aberto:** WhatsApp de suporte, e-mail público, screenshots do produto, números de prova social, CNPJ para o rodapé, label de conversão do Google Ads, e confirmar se o teste de 3 dias pede cartão.
