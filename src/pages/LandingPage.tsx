import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, BarChart3, BookOpen, Bot, CalendarDays, Check, CheckCircle2,
  ChevronDown, FolderKanban, Instagram, LayoutGrid, ListChecks, Lock, Menu,
  ShieldCheck, Sparkles, Star, StickyNote, Users, Wallet, X, Zap,
} from 'lucide-react'
import { PLANS } from '@/config/plans'

// ─── Paleta ───────────────────────────────────────────────────────────────────
// Fixa, herdada do produto. Tema claro: quem clica em "testar" cai dentro do app
// e precisa reconhecer a mesma marca.
//   dominante #2563EB · gradiente navy #29457a→#16284d · fundo #FFFFFF
//   superfície alternada #f7f7f7 · borda #e8e8e8
//   texto #0f0f0f / #475569 / #64748b · âmbar #F5A623 · verde #22C55E

const NAVY = 'linear-gradient(135deg, #29457a 0%, #16284d 100%)'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scrollTo = (id: string) => () => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const BRL = (n: number) => `R$ ${n}`

// Dispara evento do Meta Pixel sem quebrar se o pixel estiver bloqueado
const trackPixel = (event: string, params?: Record<string, unknown>) => {
  try {
    const fbq = (window as any).fbq
    if (typeof fbq === 'function') fbq('track', event, params)
  } catch {}
}

// Conversão do Google Ads.
// TODO: criar a conversão no painel do Google Ads e colar o label aqui, no
// formato "AW-18301456637/AbC-D_efGhIjKlMnOp". Enquanto estiver vazio a função
// não dispara nada — hoje o index.html só tem o gtag('config'), ou seja,
// nenhuma conversão do Ads está sendo registrada.
const ADS_CONVERSION_LABEL = ''

const trackAds = (value?: number) => {
  if (!ADS_CONVERSION_LABEL) return
  try {
    const gtag = (window as any).gtag
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', { send_to: ADS_CONVERSION_LABEL, value: value ?? 0, currency: 'BRL' })
    }
  } catch {}
}

/** Fade-in + slide-up na entrada do scroll, respeitando prefers-reduced-motion. */
function useFade() {
  const reduce = useReducedMotion()
  if (reduce) return {}
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.3, ease: 'easeOut' as const },
  }
}

// ─── Botões ───────────────────────────────────────────────────────────────────
/** Pill sólido na cor dominante, com sombra colorida. O CTA primário da página. */
function PrimaryButton({
  children, onClick, className = '', size = 'md',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  size?: 'md' | 'lg'
}) {
  const pad = size === 'lg' ? 'px-9 py-[20px] text-[16px]' : 'px-8 py-[18px] text-[15px]'
  return (
    <Link
      to="/login"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold text-white bg-[#2563EB]
        shadow-[0_10px_30px_-8px_rgba(37,99,235,0.55)] transition-all duration-200
        hover:bg-[#1D4ED8] hover:-translate-y-0.5 hover:shadow-[0_16px_38px_-8px_rgba(37,99,235,0.6)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]
        ${pad} ${className}`}
    >
      {children}
    </Link>
  )
}

/** Outline na cor de marca. Nunca compete com o primário. */
function SecondaryButton({
  children, onClick, className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-[18px] text-[15px] font-semibold
        text-[#2563EB] border-2 border-[#2563EB]/25 bg-white transition-all duration-200
        hover:border-[#2563EB] hover:bg-[#2563EB]/[0.04]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]
        ${className}`}
    >
      {children}
    </button>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false)
  const links = [
    ['Plataforma', 'plataforma'],
    ['Como funciona', 'como-funciona'],
    ['Planos', 'planos'],
    ['FAQ', 'faq'],
  ] as const

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#e8e8e8]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <picture>
            <source srcSet="/logo-icon.avif" type="image/avif" />
            <source srcSet="/logo-icon.webp" type="image/webp" />
            <img src="/logo-icon.png" alt="" width={32} height={32} className="w-8 h-8 object-contain" />
          </picture>
          <span className="font-display text-[18px] font-bold text-[#0f0f0f]">
            Status<span className="text-[#2563EB]">Media</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={scrollTo(id)}
              className="text-[15px] font-medium text-[#475569] hover:text-[#0f0f0f] transition-colors"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-flex text-[15px] font-semibold text-[#475569] hover:text-[#0f0f0f] transition-colors px-2"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            onClick={() => { trackPixel('Lead', { content_name: 'navbar_trial' }); trackAds() }}
            className="hidden sm:inline-flex items-center rounded-full bg-[#2563EB] px-5 py-2.5 text-[14px] font-semibold text-white
              shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)] hover:bg-[#1D4ED8] transition-colors"
          >
            Começar teste
          </Link>
          <button
            className="md:hidden text-[#475569] p-1"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#e8e8e8] bg-white px-5 py-4 space-y-1">
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => { setOpen(false); scrollTo(id)() }}
              className="block w-full text-left text-[16px] font-medium text-[#0f0f0f] py-2.5"
            >
              {label}
            </button>
          ))}
          <div className="pt-3 flex flex-col gap-2.5">
            <Link to="/login" className="text-[16px] font-medium text-[#475569] py-1">Entrar</Link>
            <Link
              to="/login"
              onClick={() => { trackPixel('Lead', { content_name: 'navbar_mobile_trial' }); trackAds() }}
              className="rounded-full bg-[#2563EB] px-6 py-3.5 text-[15px] font-semibold text-white text-center"
            >
              Começar teste de 3 dias
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── 1. Hero ──────────────────────────────────────────────────────────────────
// Job: "o que é isso e por que me importar em 5 segundos?"
function Hero() {
  const reduce = useReducedMotion()
  const anim = (delay: number) =>
    reduce ? {} : {
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.45, delay, ease: 'easeOut' as const },
    }

  return (
    <section className="relative pt-[120px] pb-20 sm:pt-[150px] sm:pb-28 px-5 sm:px-8 overflow-hidden">
      {/* Brilho azul + malha de pontos: o único ornamento de fundo da página. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% -5%, rgba(37,99,235,0.13), transparent 70%)' }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(#dfe5ee 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse 60% 45% at 50% 0%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 45% at 50% 0%, black, transparent 75%)',
        }}
      />

      <div className="max-w-[900px] mx-auto text-center">
        <motion.div
          {...anim(0)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#e8e8e8] shadow-sm mb-8"
        >
          <div className="flex">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#F5A623] text-[#F5A623]" />)}
          </div>
          <span className="text-[13px] font-medium text-[#475569]">
            A plataforma completa para social medias e agências
          </span>
        </motion.div>

        {/* PRIMÁRIO: H1 em display, com uma palavra na cor dominante. */}
        <motion.h1
          {...anim(0.05)}
          className="font-display text-[40px] sm:text-[68px] lg:text-[84px] font-extrabold text-[#0f0f0f] leading-[1.02]"
        >
          Sua operação de social media em{' '}
          <span className="text-[#2563EB]">um só lugar.</span>
        </motion.h1>

        <motion.p
          {...anim(0.1)}
          className="text-[17px] sm:text-[19px] text-[#475569] mt-7 leading-relaxed max-w-[620px] mx-auto"
        >
          Briefing, calendário, IA com contexto e aprovação. Cada cliente no próprio espaço —
          sem pular entre Trello, Drive, ChatGPT e WhatsApp.
        </motion.p>

        {/* SECUNDÁRIO: o CTA, acima da dobra e logo abaixo do subtítulo. */}
        <motion.div
          {...anim(0.15)}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-10"
        >
          <PrimaryButton
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => { trackPixel('Lead', { content_name: 'hero_trial' }); trackAds() }}
          >
            Começar teste de 3 dias <ArrowRight className="w-[18px] h-[18px]" />
          </PrimaryButton>
          <SecondaryButton className="w-full sm:w-auto" onClick={scrollTo('plataforma')}>
            Ver a plataforma
          </SecondaryButton>
        </motion.div>

        <motion.div
          {...anim(0.2)}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 mt-8 text-[13px] text-[#64748b]"
        >
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> 3 dias de teste</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#22C55E]" /> Sem fidelidade</span>
          <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-[#22C55E]" /> SSL criptografado</span>
        </motion.div>
      </div>

      {/* TERCIÁRIO: o produto em um frame de app. Ilustra, não compete com o H1. */}
      <motion.div
        {...(reduce ? {} : {
          initial: { opacity: 0, y: 36 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay: 0.28, ease: 'easeOut' as const },
        })}
        className="max-w-[980px] mx-auto mt-16 sm:mt-20"
      >
        <div className="rounded-[24px] border border-[#e8e8e8] bg-white overflow-hidden shadow-[0_40px_100px_-30px_rgba(37,99,235,0.4)]">
          <div className="h-11 flex items-center gap-2 px-5 border-b border-[#e8e8e8] bg-[#f7f7f7]">
            <span className="w-3 h-3 rounded-full bg-[#e0e0e0]" />
            <span className="w-3 h-3 rounded-full bg-[#e0e0e0]" />
            <span className="w-3 h-3 rounded-full bg-[#e0e0e0]" />
            <span className="ml-3 text-[12px] text-[#94a3b8] font-medium">statusmedia.com.br</span>
          </div>
          {/* WebM primeiro: o hero toca em loop e nunca busca posição, que é
              onde o VP9 rende mais (226 KB contra 312 KB do MP4). */}
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/video-poster.webp"
            className="w-full object-cover block"
          >
            <source src="/logo-video.webm" type="video/webm" />
            <source src="/logo-video.mp4" type="video/mp4" />
          </video>
        </div>
      </motion.div>
    </section>
  )
}

// ─── 2. Prova de escala ───────────────────────────────────────────────────────
// Job: "isso é sério ou é mais um app de um cara só?" — credencia, não vende.
function ScaleProof() {
  const fade = useFade()
  const squads = [
    ['🔥', 'Fábrica de Conteúdo'], ['🔍', 'Diagnóstico de Perfil'], ['💼', 'Máquina de Clientes'],
    ['📊', 'Auditoria de Marketing'], ['🧠', 'Psicologia de Vendas'], ['🕵️', 'Inteligência Competitiva'],
    ['🎨', 'Identidade de Marca'], ['💰', 'Tráfego Pago'], ['🌐', 'Presença Multiplataforma'],
    ['⚡', 'Mineração de Anúncios'], ['🔎', 'Motor de Conteúdo SEO'], ['🌱', 'Comunidade e Retenção'],
    ['🖌️', 'Design Criativo'],
  ]

  return (
    <section className="bg-[#f7f7f7] border-y border-[#e8e8e8] py-20 sm:py-28 px-5 sm:px-8">
      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[380px_1fr] gap-12 lg:gap-16 items-center">
        {/* Pôster da marca: os módulos orbitando a plataforma. */}
        <motion.div {...fade} className="mx-auto w-full max-w-[380px]">
          {/* AVIF 16 KB → WebP 22 KB → PNG 138 KB. O PNG segue existindo porque
              é o og:image e o painel do Login. */}
          <picture>
            <source srcSet="/planer.avif" type="image/avif" />
            <source srcSet="/planer.webp" type="image/webp" />
            <img
              src="/planer.png"
              alt="Ecossistema StatusMedia: relatórios, equipe, calendário, conteúdo e comunicação orbitando a plataforma"
              loading="lazy"
              width={760}
              height={950}
              className="w-full rounded-[24px] shadow-[0_30px_70px_-25px_rgba(22,40,77,0.55)]"
            />
          </picture>
        </motion.div>

        <motion.div {...fade}>
          {/* PRIMÁRIO: os números em display. */}
          <div className="flex flex-wrap gap-10 sm:gap-14">
            <div>
              <p className="font-display text-[64px] sm:text-[80px] font-extrabold leading-[0.9] text-[#2563EB]">13</p>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#64748b] mt-2">Squads de IA</p>
            </div>
            <div>
              <p className="font-display text-[64px] sm:text-[80px] font-extrabold leading-[0.9] text-[#2563EB]">52</p>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#64748b] mt-2">Agentes especializados</p>
            </div>
          </div>

          <h2 className="font-display text-[26px] sm:text-[32px] font-bold text-[#0f0f0f] mt-10 leading-tight max-w-[520px]">
            Um time de IA por área da operação
          </h2>
          <p className="text-[16px] text-[#475569] mt-3 max-w-[520px] leading-relaxed">
            Do conteúdo ao tráfego, da venda à retenção. Cada squad é focado numa parte real do trabalho.
          </p>

          {/* TERCIÁRIO: chips todos iguais, propositalmente planos. */}
          <div className="flex flex-wrap gap-2 mt-8">
            {squads.map(([emoji, name]) => (
              <span
                key={name}
                className="px-3.5 py-2 rounded-full bg-white border border-[#e8e8e8] text-[13px] text-[#475569] font-medium flex items-center gap-1.5"
              >
                <span aria-hidden>{emoji}</span> {name}
              </span>
            ))}
          </div>

          <p className="text-[13px] text-[#64748b] mt-7">
            Movidos por GPT-4o, com busca na web em tempo real e geração de imagem por IA.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// ─── 3. O problema ────────────────────────────────────────────────────────────
// Job: "eles entendem a minha rotina de verdade?" — tensão sem alívio, sem CTA.
function Problem() {
  const fade = useFade()
  const pains = [
    'Aprovação de conteúdo espalhada entre WhatsApp e Instagram',
    'Calendário editorial vivendo numa planilha separada',
    'Briefing repetido toda vez que abre o ChatGPT',
    'Tarefas sem dono claro e sem visibilidade de status',
    'Financeiro desconectado da operação',
    'Cliente pedindo ajuste fora do fluxo',
  ]

  return (
    <section className="py-20 sm:py-28 px-5 sm:px-8">
      <div className="max-w-[1200px] mx-auto">
        <motion.div {...fade} className="text-center mb-14 max-w-[760px] mx-auto">
          <h2 className="font-display text-[30px] sm:text-[48px] font-bold text-[#0f0f0f] leading-[1.1]">
            Quando a operação depende de muitas abas, o problema deixa de ser produção e vira{' '}
            <span className="text-[#2563EB]">controle.</span>
          </h2>
          <p className="text-[17px] text-[#475569] mt-6 leading-relaxed">
            O maior custo da desorganização não é só tempo. É retrabalho, atraso, desalinhamento com o
            cliente e perda de margem. A equipe passa mais tempo coordenando do que executando.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pains.map(p => (
            <motion.div
              key={p}
              {...fade}
              className="flex items-start gap-3.5 bg-white border border-[#e8e8e8] rounded-[20px] p-5"
            >
              <div className="w-8 h-8 rounded-xl bg-[#ef4444]/[0.08] flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-[#ef4444]" />
              </div>
              <p className="text-[15px] text-[#475569] leading-relaxed pt-1">{p}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 4. Como funciona ─────────────────────────────────────────────────────────
// Job: "quanto trabalho dá pra começar?"
function HowItWorks() {
  const fade = useFade()
  const steps = [
    { n: '01', icon: FolderKanban, title: 'Cadastra seu cliente', desc: 'Joga briefing, persona, tom de voz, arquivos e referências. Tudo num lugar só. Cada cliente com a própria pasta inteligente.' },
    { n: '02', icon: Sparkles, title: 'Cria com a IA', desc: 'Pede uma legenda, um carrossel ou um calendário. A IA já conhece seu cliente. Sem repetir briefing toda vez.' },
    { n: '03', icon: CheckCircle2, title: 'Entrega e aprova', desc: 'Calendário organizado, aprovação registrada, histórico salvo. O próximo mês começa de onde o anterior parou.' },
  ]

  return (
    <section id="como-funciona" className="bg-[#f7f7f7] border-y border-[#e8e8e8] py-20 sm:py-28 px-5 sm:px-8">
      <div className="max-w-[1200px] mx-auto">
        <motion.div {...fade} className="text-center mb-14">
          <h2 className="font-display text-[30px] sm:text-[48px] font-bold text-[#0f0f0f]">Como funciona</h2>
          <p className="text-[17px] text-[#475569] mt-4">Sua operação organizada em 3 passos simples.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map(s => (
            <motion.div
              key={s.n}
              {...fade}
              className="relative overflow-hidden bg-white border border-[#e8e8e8] rounded-[24px] p-7 pt-8
                transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(37,99,235,0.4)]"
            >
              {/* PRIMÁRIO: o numeral gigante, atrás do conteúdo. */}
              <span
                className="font-display absolute -top-4 right-3 text-[120px] font-extrabold leading-none select-none pointer-events-none"
                style={{ color: 'rgba(37,99,235,0.10)' }}
                aria-hidden
              >
                {s.n}
              </span>
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/[0.08] flex items-center justify-center mb-5">
                  <s.icon className="w-[22px] h-[22px] text-[#2563EB]" strokeWidth={1.8} />
                </div>
                <h3 className="font-display text-[20px] font-bold text-[#0f0f0f] mb-2.5">{s.title}</h3>
                <p className="text-[15px] text-[#475569] leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div {...fade} className="flex justify-center mt-12">
          <SecondaryButton onClick={scrollTo('planos')}>
            Ver planos <ArrowRight className="w-[18px] h-[18px]" />
          </SecondaryButton>
        </motion.div>
      </div>
    </section>
  )
}

// ─── 5. A plataforma ──────────────────────────────────────────────────────────
// Job: "o que exatamente eu recebo por esse preço?"
// 12 módulos com peso idêntico achatam a seção: 3 sobem para cards grandes,
// os outros 9 viram grade densa.
function Platform() {
  const fade = useFade()

  const featured = [
    { icon: FolderKanban, title: 'Hub do Cliente', subtitle: 'Cada cliente com o próprio espaço', bullets: ['Briefing estruturado e versionado', 'Arquivos, referências e links organizados', 'Tom de voz e persona memorizados pela IA'] },
    { icon: Bot, title: 'IA Copilot', subtitle: '13 squads, 52 agentes', bullets: ['Focada em social media e marketing', 'Busca na web e geração de imagem', 'Já conhece o contexto de cada cliente'] },
    { icon: CheckCircle2, title: 'Portal de Aprovação', subtitle: 'O cliente acompanha e aprova', bullets: ['Acesso próprio para cada cliente', 'Aprova arte e legenda ou pede ajuste', 'Vê o carrossel completo, sem cortes'] },
  ]

  const rest = [
    { icon: CalendarDays, title: 'Planejamento Editorial', subtitle: 'O calendário que substitui a planilha' },
    { icon: LayoutGrid, title: 'Feed do Perfil', subtitle: 'Monte o grid antes de publicar' },
    { icon: Instagram, title: 'Agendamento Instagram', subtitle: 'Publique direto da plataforma' },
    { icon: ListChecks, title: 'Tarefas & Produção', subtitle: 'O fluxo do time num só lugar' },
    { icon: StickyNote, title: 'Notas Rápidas', subtitle: 'Nada se perde entre reuniões' },
    { icon: BookOpen, title: 'Biblioteca de Conteúdo', subtitle: 'Seu acervo reaproveitável' },
    { icon: Wallet, title: 'Financeiro', subtitle: 'O caixa da operação sob controle' },
    { icon: Users, title: 'Gestão de Equipe', subtitle: 'Escale com o time junto' },
    { icon: BarChart3, title: 'Visão Geral', subtitle: 'O dashboard que centraliza tudo' },
  ]

  return (
    <section id="plataforma" className="py-20 sm:py-28 px-5 sm:px-8">
      <div className="max-w-[1200px] mx-auto">
        <motion.div {...fade} className="text-center mb-14">
          <h2 className="font-display text-[30px] sm:text-[48px] font-bold text-[#0f0f0f]">Explore a plataforma</h2>
          <p className="text-[17px] text-[#475569] mt-4 max-w-[620px] mx-auto">
            Tudo que a rotina de quem atende cliente precisa — do briefing ao financeiro, num só lugar.
          </p>
        </motion.div>

        {/* Os 3 promovidos */}
        <div className="grid md:grid-cols-3 gap-5">
          {featured.map(f => (
            <motion.div
              key={f.title}
              {...fade}
              className="bg-white border border-[#e8e8e8] rounded-[24px] p-7 transition-all duration-200
                hover:-translate-y-1 hover:border-[#2563EB]/30 hover:shadow-[0_24px_50px_-24px_rgba(37,99,235,0.4)]"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: NAVY }}>
                <f.icon className="w-[22px] h-[22px] text-white" strokeWidth={1.8} />
              </div>
              <h3 className="font-display text-[20px] font-bold text-[#0f0f0f] leading-tight">{f.title}</h3>
              <p className="text-[14px] text-[#64748b] mt-1">{f.subtitle}</p>
              <ul className="space-y-2.5 mt-5">
                {f.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2.5 text-[14.5px] text-[#475569]">
                    <Check className="w-[18px] h-[18px] text-[#2563EB] flex-shrink-0 mt-0.5" /> {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Os 9 restantes, em grade densa */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
          {rest.map(f => (
            <motion.div
              key={f.title}
              {...fade}
              className="flex items-center gap-3.5 bg-[#f7f7f7] border border-[#e8e8e8] rounded-[18px] p-4
                transition-colors duration-200 hover:border-[#2563EB]/30 hover:bg-white"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-[#e8e8e8] flex items-center justify-center flex-shrink-0">
                <f.icon className="w-[19px] h-[19px] text-[#2563EB]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[#0f0f0f] leading-tight">{f.title}</h3>
                <p className="text-[13px] text-[#64748b] mt-0.5">{f.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div {...fade} className="flex justify-center mt-12">
          <SecondaryButton onClick={scrollTo('planos')}>
            Ver planos <ArrowRight className="w-[18px] h-[18px]" />
          </SecondaryButton>
        </motion.div>
      </div>
    </section>
  )
}

// ─── 6. Prova social ──────────────────────────────────────────────────────────
// ⚠️ PENDENTE ANTES DE PUBLICAR: estes 6 depoimentos vieram da landing anterior
// e não têm foto, empresa nem comprovação. Substituir por depoimentos reais com
// nome, papel, FOTO e autorização de uso — ou trocar a seção por prova de
// produto (screenshots das telas). O layout já aceita foto: basta preencher o
// campo `photo` que o avatar de iniciais é substituído.
function SocialProof() {
  const fade = useFade()
  const items: { name: string; role: string; text: string; photo?: string }[] = [
    { name: 'Bruna Cardoso', role: 'Social media freelancer', text: 'Passei de 4 para 7 clientes sem trabalhar mais. Cada cliente tem o próprio espaço e a IA já sabe o tom de cada um.' },
    { name: 'Lucas Almeida', role: 'Gestor de tráfego', text: 'O calendário sozinho já economiza umas 2 horas por semana. Acabou a bagunça de planilha.' },
    { name: 'Carolina Mendonça', role: 'Social media de agência', text: 'Parei de pagar 3 IAs separadas. Está tudo aqui, e ainda com contexto do cliente.' },
    { name: 'Fernando Vieira', role: 'Dono de agência', text: 'Consegui organizar todo o time numa plataforma só. Cada um sabe o que fazer e o cliente acompanha.' },
    { name: 'Isabela Ramos', role: 'Social media', text: 'Organizei todos os meus clientes em uma semana. O onboarding é simples e a IA puxa o contexto.' },
    { name: 'Rafael Torres', role: 'Estrategista de conteúdo', text: 'Acabou o ciclo de 10 abas abertas. Briefing, IA e aprovação no mesmo fluxo.' },
  ]

  return (
    <section className="bg-[#f7f7f7] border-y border-[#e8e8e8] py-20 sm:py-28 px-5 sm:px-8">
      <div className="max-w-[1200px] mx-auto">
        <motion.div {...fade} className="text-center mb-14">
          <h2 className="font-display text-[30px] sm:text-[48px] font-bold text-[#0f0f0f]">
            Não acredite só na nossa palavra
          </h2>
          <p className="text-[17px] text-[#475569] mt-4">Veja o que social media e agência estão dizendo.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(t => {
            const initials = t.name.split(' ').map(w => w[0]).slice(0, 2).join('')
            return (
              <motion.div
                key={t.name}
                {...fade}
                className="bg-white border border-[#e8e8e8] rounded-[24px] p-6 flex flex-col
                  transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(37,99,235,0.3)]"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#F5A623] text-[#F5A623]" />)}
                </div>
                {/* PRIMÁRIO do card: a frase. */}
                <p className="text-[16px] text-[#0f0f0f] leading-relaxed font-medium flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-6">
                  {t.photo ? (
                    <img src={t.photo} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                      style={{ background: NAVY }}
                    >
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-semibold text-[#0f0f0f]">{t.name}</p>
                    <p className="text-[12.5px] text-[#64748b]">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── 7. Planos ────────────────────────────────────────────────────────────────
// Preços e features vêm de @/config/plans — fonte única compartilhada com o app
// e com o Stripe. Nunca hardcode aqui.
function Pricing() {
  const fade = useFade()
  const order: ('starter' | 'pro' | 'agency')[] = ['starter', 'pro', 'agency']
  const sectionRef = useRef<HTMLElement>(null)

  // Dispara ViewContent uma única vez ao visualizar a seção de planos
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackPixel('ViewContent', { content_name: 'pricing_section', content_type: 'product' })
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="planos" className="py-20 sm:py-28 px-5 sm:px-8">
      <div className="max-w-[1200px] mx-auto">
        <motion.div {...fade} className="text-center mb-16">
          <h2 className="font-display text-[30px] sm:text-[48px] font-bold text-[#0f0f0f]">Planos</h2>
          <p className="text-[17px] text-[#475569] mt-4">
            Escolha o tamanho da sua operação. Sem fidelidade. 3 dias pra testar.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {order.map(id => {
            const p = PLANS[id]
            const isPro = id === 'pro'
            return (
              <motion.div
                key={id}
                {...fade}
                className={`relative rounded-[24px] p-7 flex flex-col bg-white transition-all duration-200
                  ${isPro
                    ? 'border-2 border-[#2563EB] shadow-[0_30px_70px_-30px_rgba(37,99,235,0.55)] lg:scale-[1.04] z-10'
                    : 'border border-[#e8e8e8] hover:border-[#2563EB]/30'}`}
              >
                {p.badge && (
                  <span
                    className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap
                      ${isPro ? 'text-white' : 'text-[#475569] bg-[#f7f7f7] border border-[#e8e8e8]'}`}
                    style={isPro ? { background: NAVY } : {}}
                  >
                    {p.badge}
                  </span>
                )}

                <h3 className="font-display text-[20px] font-bold text-[#0f0f0f] mt-2">{p.name}</h3>
                <p className="text-[14px] text-[#64748b] mt-1.5 min-h-[40px]">{p.description}</p>

                {/* PRIMÁRIO: o preço. */}
                <div className="mt-5 mb-6 flex items-baseline gap-1.5">
                  <span className={`font-display text-[52px] font-extrabold leading-none ${isPro ? 'text-[#2563EB]' : 'text-[#0f0f0f]'}`}>
                    {BRL(p.price)}
                  </span>
                  <span className="text-[15px] text-[#64748b]">/mês</span>
                </div>

                <Link
                  to="/login"
                  onClick={() => {
                    trackPixel('InitiateCheckout', {
                      content_name: p.name,
                      content_ids: [id],
                      value: p.price,
                      currency: 'BRL',
                      num_items: 1,
                    })
                    trackAds(p.price)
                  }}
                  className={`w-full py-3.5 rounded-full text-[15px] font-semibold text-center transition-all duration-200
                    ${isPro
                      ? 'bg-[#2563EB] text-white shadow-[0_10px_28px_-8px_rgba(37,99,235,0.6)] hover:bg-[#1D4ED8]'
                      : 'text-[#2563EB] border-2 border-[#2563EB]/25 hover:border-[#2563EB] hover:bg-[#2563EB]/[0.04]'}`}
                >
                  Começar com o {p.name}
                </Link>

                <div className="mt-7 space-y-5">
                  {p.featureGroups.map(g => (
                    <div key={g.title}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8] mb-2.5">{g.title}</p>
                      <ul className="space-y-2">
                        {g.items.map(f => (
                          <li key={f} className="flex items-start gap-2.5 text-[14.5px] text-[#475569]">
                            <Check className="w-[18px] h-[18px] text-[#2563EB] flex-shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        <p className="text-center text-[14px] text-[#64748b] mt-10">
          Todos os planos têm 3 dias de teste. Cancele quando quiser. Sem fidelidade.
        </p>
      </div>
    </section>
  )
}

// ─── 8. FAQ + fechamento ──────────────────────────────────────────────────────
// Job: "o que ainda me impede de clicar?" — o CTA final fica colado no FAQ,
// não solto no rodapé.
function FaqAndClose() {
  const fade = useFade()
  const faqs = [
    ['A StatusMedia substitui quais ferramentas?', 'Substitui a combinação de Trello/planilha (calendário), Drive (arquivos do cliente), ChatGPT e outras IAs pagas, e a bagunça de WhatsApp para aprovação. Tudo num fluxo só.'],
    ['A StatusMedia é só uma IA?', 'Não. A IA é uma parte. Você tem hub por cliente, calendário editorial, agendamento de Instagram, organizador de feed, tarefas, financeiro, portal de aprovação e gestão de equipe — tudo integrado.'],
    ['Como funciona a IA da StatusMedia?', 'São 13 squads e 52 agentes especializados, movidos por GPT-4o. O Copilot faz busca na web em tempo real, gera imagens e usa o contexto de cada cliente para produzir do seu jeito.'],
    ['Por que não usar só o ChatGPT?', 'Porque o ChatGPT não conhece o contexto de cada cliente, não organiza calendário, não agenda no Instagram, não tem aprovação nem histórico. Aqui a IA já sabe o tom de voz e o DNA de cada cliente.'],
    ['Serve pra quem tá começando?', 'Sim. O plano Starter é feito pra social media solo organizar os primeiros clientes. E são 3 dias de teste.'],
    ['Serve pra agência?', 'Sim. O plano Agency tem clientes e equipe ilimitados, portal do cliente e suporte prioritário.'],
    ['Posso editar o que a IA gera?', 'Claro. Tudo que a IA cria é editável. Ela acelera o trabalho, você dá o toque final.'],
    ['Tem fidelidade?', 'Não. Sem fidelidade, cancela quando quiser, e os 3 primeiros dias são para testar.'],
    ['Posso usar para vários clientes ao mesmo tempo?', 'Sim. O conceito central é justamente organizar um hub por cliente, cada um com briefing, calendário, arquivos e aprovações no próprio espaço.'],
    ['O sistema inclui financeiro?', 'Sim. Você acompanha pagamentos e recebimentos por cliente e vê a saúde do caixa sem sair da plataforma.'],
  ]
  const [open, setOpen] = useState<number | null>(0)

  return (
    <>
      <section id="faq" className="bg-[#f7f7f7] border-t border-[#e8e8e8] py-20 sm:py-28 px-5 sm:px-8">
        <div className="max-w-[760px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <h2 className="font-display text-[30px] sm:text-[48px] font-bold text-[#0f0f0f]">Perguntas frequentes</h2>
            <p className="text-[17px] text-[#475569] mt-4">O que normalmente perguntam antes de assinar.</p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map(([q, a], i) => (
              <div key={i} className="bg-white border border-[#e8e8e8] rounded-[18px] overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-[16px] font-semibold text-[#0f0f0f]">{q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#64748b] flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {open === i && (
                  <p className="px-6 pb-5 text-[15px] text-[#475569] leading-relaxed">{a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fechamento: a única faixa escura da página, e o segundo (e último) uso
          permitido do gradiente navy. */}
      <section className="px-5 sm:px-8 py-16 sm:py-20 bg-[#f7f7f7]">
        <motion.div
          {...fade}
          className="max-w-[1000px] mx-auto rounded-[32px] px-6 py-16 sm:px-16 sm:py-20 text-center relative overflow-hidden"
          style={{ background: NAVY }}
        >
          <div
            className="absolute inset-0 opacity-[0.14] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
            aria-hidden
          />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-7 flex items-center justify-center bg-white/10 border border-white/20">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h2 className="font-display text-[30px] sm:text-[44px] font-extrabold text-white leading-[1.1]">
              Sua operação de conteúdo em um só lugar.
            </h2>
            <p className="text-[17px] text-[#c9d6ea] mt-5 max-w-[560px] mx-auto leading-relaxed">
              Cadastre um cliente, gere ideias com IA, organize o calendário e aprove conteúdos sem
              trocar de ferramenta toda hora.
            </p>

            {/* O maior botão da página. */}
            <Link
              to="/login"
              onClick={() => { trackPixel('Lead', { content_name: 'final_cta' }); trackAds() }}
              className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-white px-10 py-[22px]
                text-[17px] font-bold text-[#16284d] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]
                transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-12px_rgba(0,0,0,0.55)]
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Testar 3 dias grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-[13px] text-[#9bb6dd] mt-5">3 dias de teste. Sem fidelidade. Cancela quando quiser.</p>
          </div>
        </motion.div>
      </section>
    </>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-[#e8e8e8] bg-white px-5 sm:px-8 py-14">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-3.5">
            <picture>
              <source srcSet="/logo-icon.avif" type="image/avif" />
              <source srcSet="/logo-icon.webp" type="image/webp" />
              <img src="/logo-icon.png" alt="" width={28} height={28} className="w-7 h-7 object-contain" />
            </picture>
            <span className="font-display text-[17px] font-bold text-[#0f0f0f]">
              Status<span className="text-[#2563EB]">Media</span>
            </span>
          </div>
          <p className="text-[14px] text-[#64748b] max-w-[280px] leading-relaxed">
            Organize. Produza. Escale. Toda a operação de social media num só lugar.
          </p>
        </div>

        <div className="flex flex-wrap gap-12 sm:gap-16">
          <div className="space-y-2.5">
            <p className="text-[12px] uppercase tracking-[0.12em] text-[#94a3b8] font-bold">Produto</p>
            <button onClick={scrollTo('plataforma')} className="block text-[14px] text-[#475569] hover:text-[#2563EB] transition-colors">Plataforma</button>
            <button onClick={scrollTo('como-funciona')} className="block text-[14px] text-[#475569] hover:text-[#2563EB] transition-colors">Como funciona</button>
            <button onClick={scrollTo('planos')} className="block text-[14px] text-[#475569] hover:text-[#2563EB] transition-colors">Planos</button>
            <button onClick={scrollTo('faq')} className="block text-[14px] text-[#475569] hover:text-[#2563EB] transition-colors">FAQ</button>
          </div>
          <div className="space-y-2.5">
            <p className="text-[12px] uppercase tracking-[0.12em] text-[#94a3b8] font-bold">Acesso</p>
            <Link to="/login" className="block text-[14px] text-[#475569] hover:text-[#2563EB] transition-colors">Entrar</Link>
            <Link to="/privacy" className="block text-[14px] text-[#475569] hover:text-[#2563EB] transition-colors">Privacidade</Link>
            <Link to="/terms" className="block text-[14px] text-[#475569] hover:text-[#2563EB] transition-colors">Termos de uso</Link>
          </div>
        </div>
      </div>
      <p className="text-center text-[12.5px] text-[#94a3b8] mt-12">
        © {new Date().getFullYear()} StatusMedia — Organize. Produza. Escale.
      </p>
    </footer>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0f0f0f]">
      <Navbar />
      <Hero />
      <ScaleProof />
      <Problem />
      <HowItWorks />
      <Platform />
      <SocialProof />
      <Pricing />
      <FaqAndClose />
      <Footer />
    </div>
  )
}
