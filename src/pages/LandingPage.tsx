import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Star, ArrowRight, ShieldCheck, Lock, CheckCircle2, Check,
  Users, Sparkles, CalendarDays, Bot, FolderKanban, Workflow,
  ChevronDown, Zap, Instagram, BarChart3, Menu, X,
  LayoutGrid, ListChecks, StickyNote, BookOpen, Wallet,
} from 'lucide-react'
import { PLANS } from '@/config/plans'

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
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0B1020]/85 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo-icon.png" alt="StatusMedia" className="w-8 h-8 object-contain" />
          <span className="text-[16px] font-bold text-white">Status<span className="text-[#6f93c9]">Media</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-7">
          {links.map(([label, id]) => (
            <button key={id} onClick={scrollTo(id)} className="text-[13px] text-[#94a3b8] hover:text-white transition-colors">{label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
            style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}>
            Entrar
          </Link>
          <button className="md:hidden text-[#94a3b8]" onClick={() => setOpen(o => !o)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-[#1e293b] bg-[#0B1020] px-4 py-3 space-y-2">
          {links.map(([label, id]) => (
            <button key={id} onClick={() => { setOpen(false); scrollTo(id)() }} className="block w-full text-left text-[14px] text-[#CBD5E1] py-1.5">{label}</button>
          ))}
        </div>
      )}
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(41,69,122,0.25), transparent)' }} />
      <div className="max-w-3xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827] border border-[#1e293b] mb-6">
          <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#fbbf24] text-[#fbbf24]" />)}</div>
          <span className="text-[12px] text-[#CBD5E1]">A plataforma completa para social medias e agências</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="text-[34px] sm:text-[48px] font-bold text-white leading-[1.1] tracking-tight">
          Sua operação de social media em <span className="text-[#6f93c9]">uma única plataforma.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-[15px] sm:text-[17px] text-[#94a3b8] mt-5 leading-relaxed max-w-2xl mx-auto">
          Briefing, calendário, IA com contexto e aprovação. Cada cliente no próprio espaço.
          Sem pular entre Trello, Drive, ChatGPT e WhatsApp.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <button
            onClick={() => { scrollTo('planos')(); trackPixel('Lead', { content_name: 'hero_ver_planos' }) }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-lg shadow-[#29457a]/30"
            style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}>
            Ver planos <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={scrollTo('plataforma')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-[14px] font-semibold text-[#CBD5E1] border border-[#1e293b] bg-[#111827] hover:border-[#334155] transition-colors">
            Ver a plataforma
          </button>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-7 text-[12px] text-[#64748b]">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" /> Plataforma segura</span>
          <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#4ade80]" /> SSL criptografado</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" /> Sem fidelidade</span>
        </div>
      </div>

      {/* Vídeo do produto */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="max-w-4xl mx-auto mt-14 rounded-2xl border border-[#1e293b] overflow-hidden shadow-2xl shadow-black/40">
        <video
          src="/logo-video.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full object-cover block"
        />
      </motion.div>
    </section>
  )
}

// ─── Squads de IA ─────────────────────────────────────────────────────────────
function SquadsBar() {
  const squads = [
    ['🔥', 'Fábrica de Conteúdo'], ['🔍', 'Diagnóstico de Perfil'], ['💼', 'Máquina de Clientes'],
    ['📊', 'Auditoria de Marketing'], ['🧠', 'Psicologia de Vendas'], ['🕵️', 'Inteligência Competitiva'],
    ['🎨', 'Identidade de Marca'], ['💰', 'Tráfego Pago'], ['🌐', 'Presença Multiplataforma'],
    ['⚡', 'Mineração de Anúncios'], ['🔎', 'Motor de Conteúdo SEO'], ['🌱', 'Comunidade e Retenção'],
    ['🖌️', 'Design Criativo'],
  ]
  return (
    <section className="py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-[20px] font-bold text-[#0B1020]">13 squads de IA, 52 agentes especializados</h2>
        <p className="text-[13px] text-[#475569] mt-1.5">Um time de IA por área da operação — do conteúdo ao tráfego, da venda à retenção</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
          {squads.map(([emoji, name]) => (
            <span key={name} className="px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[12.5px] text-[#16284d] font-medium flex items-center gap-1.5 hover:border-[#29457a]/40 transition-colors">
              <span>{emoji}</span> {name}
            </span>
          ))}
        </div>
        <p className="text-[12px] text-[#94a3b8] mt-6">Movidos por GPT-4o, com busca na web em tempo real e geração de imagem por IA</p>
      </div>
    </section>
  )
}

// ─── Problema ─────────────────────────────────────────────────────────────────
function Problem() {
  const pains = [
    'Aprovação de conteúdo espalhada entre WhatsApp e Instagram',
    'Calendário editorial vivendo numa planilha separada',
    'Briefing repetido toda vez que abre o ChatGPT',
    'Tarefas sem dono claro e sem visibilidade de status',
    'Financeiro desconectado da operação',
    'Cliente pedindo ajuste fora do fluxo',
  ]
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-white max-w-2xl mx-auto leading-tight">
            Quando a operação depende de muitas abas, o problema deixa de ser produção e vira controle.
          </h2>
          <p className="text-[15px] text-[#94a3b8] mt-4 max-w-2xl mx-auto">
            O maior custo da desorganização não é só tempo. É retrabalho, atraso, desalinhamento com o
            cliente e perda de margem. A equipe passa mais tempo coordenando do que executando.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pains.map(p => (
            <div key={p} className="flex items-start gap-3 bg-[#111827] border border-[#1e293b] rounded-2xl p-4">
              <div className="w-7 h-7 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-[#f87171]" />
              </div>
              <p className="text-[13.5px] text-[#CBD5E1] leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Como funciona ────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: 1, icon: FolderKanban, title: 'Cadastra seu cliente', desc: 'Joga briefing, persona, tom de voz, arquivos e referências. Tudo num lugar só. Cada cliente com a própria pasta inteligente.' },
    { n: 2, icon: Sparkles, title: 'Cria com a IA', desc: 'Pede uma legenda, um carrossel ou um calendário. A IA já conhece seu cliente. Sem repetir briefing toda vez.' },
    { n: 3, icon: CheckCircle2, title: 'Entrega e aprova', desc: 'Calendário organizado, aprovação registrada, histórico salvo. O próximo mês começa de onde o anterior parou.' },
  ]
  return (
    <section id="como-funciona" className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#0B1020]">Como funciona</h2>
          <p className="text-[15px] text-[#475569] mt-2">Sua operação organizada em 3 passos simples.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map(s => (
            <div key={s.n} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 hover:border-[#29457a]/40 hover:shadow-lg hover:shadow-[#0B1020]/5 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#29457a]/10 border border-[#29457a]/25 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-[#29457a]" />
                </div>
                <span className="text-[13px] font-bold text-[#94a3b8]">Passo {s.n}</span>
              </div>
              <h3 className="text-[16px] font-semibold text-[#0B1020] mb-2">{s.title}</h3>
              <p className="text-[13.5px] text-[#475569] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Por que funciona ─────────────────────────────────────────────────────────
function WhyItWorks() {
  const diffs = [
    { icon: Bot, title: 'Time de IA especializado', desc: '13 squads e 52 agentes para conteúdo, diagnóstico, tráfego, vendas, SEO, retenção e mais — cada um focado numa parte do trabalho.' },
    { icon: BarChart3, title: 'IA que conhece seu cliente', desc: 'O DNA da marca, o tom de voz e o histórico de cada cliente ficam salvos. A IA usa esse contexto pra produzir do seu jeito.' },
    { icon: Workflow, title: 'Do briefing à aprovação', desc: 'Tudo no mesmo lugar. Seu cliente acompanha pelo portal, você produz com clareza e o histórico fica salvo.' },
  ]
  return (
    <section className="py-20 px-4 sm:px-6 bg-[#0B1020]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-white">Por que a StatusMedia funciona?</h2>
          <p className="text-[15px] text-[#94a3b8] mt-2 max-w-2xl mx-auto">Não é só um agrupador de ferramentas. A gente resolveu os problemas que você enfrenta todo dia.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {diffs.map(d => (
            <div key={d.title} className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6">
              <div className="w-11 h-11 rounded-xl bg-[#29457a]/20 border border-[#29457a]/40 flex items-center justify-center mb-4">
                <d.icon className="w-5 h-5 text-[#6f93c9]" />
              </div>
              <h3 className="text-[16px] font-semibold text-white mb-2">{d.title}</h3>
              <p className="text-[13.5px] text-[#94a3b8] leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Explorar a plataforma ────────────────────────────────────────────────────
function Platform() {
  const features = [
    { icon: FolderKanban, title: 'Hub do Cliente', subtitle: 'Cada cliente com o próprio espaço', bullets: ['Briefing estruturado e versionado', 'Arquivos, referências e links organizados', 'Tom de voz e persona memorizados pela IA'] },
    { icon: CalendarDays, title: 'Planejamento Editorial', subtitle: 'O calendário que substitui a planilha', bullets: ['Visão mensal e semanal num só painel', 'Status de ideia, produção, revisão e aprovação', 'Carrossel, reel e imagem com a ordem certa'] },
    { icon: LayoutGrid, title: 'Feed do Perfil', subtitle: 'Monte o grid antes de publicar', bullets: ['Prévia real de como o feed vai ficar', 'Arraste e reorganize os posts', 'Puxe mídias do planejamento sem reenviar'] },
    { icon: Instagram, title: 'Agendamento Instagram', subtitle: 'Publique direto da plataforma', bullets: ['Conecte a conta de cada cliente', 'Agende posts, carrosséis e reels', 'Agendou? O conteúdo já sobe como aprovado'] },
    { icon: CheckCircle2, title: 'Portal de Aprovação', subtitle: 'O cliente acompanha e aprova', bullets: ['Acesso próprio para cada cliente', 'Aprova arte e legenda ou pede ajuste', 'Vê o carrossel completo, sem cortes'] },
    { icon: Bot, title: 'IA Copilot', subtitle: '13 squads, 52 agentes', bullets: ['Focada em social media e marketing', 'Busca na web e geração de imagem', 'Já conhece o contexto de cada cliente'] },
    { icon: ListChecks, title: 'Tarefas & Produção', subtitle: 'O fluxo do time num só lugar', bullets: ['Quadro de tarefas por cliente e etapa', 'Prazos e responsáveis definidos', 'Acompanhe o que está em produção'] },
    { icon: StickyNote, title: 'Notas Rápidas', subtitle: 'Nada se perde entre reuniões', bullets: ['Anotações soltas ou vinculadas ao cliente', 'Ideias de pauta sempre à mão', 'Tudo pesquisável depois'] },
    { icon: BookOpen, title: 'Biblioteca de Conteúdo', subtitle: 'Seu acervo reaproveitável', bullets: ['Modelos, referências e materiais salvos', 'Reaproveite o que já funcionou', 'Padronize a entrega entre clientes'] },
    { icon: Wallet, title: 'Financeiro', subtitle: 'O caixa da operação sob controle', bullets: ['Pagamentos e recebimentos por cliente', 'Status financeiro de cada conta', 'Saúde do negócio numa olhada'] },
    { icon: Users, title: 'Gestão de Equipe', subtitle: 'Escale com o time junto', bullets: ['Convide e organize seu time', 'Cada um sabe o que fazer', 'Trabalho dividido por cliente'] },
    { icon: BarChart3, title: 'Visão Geral', subtitle: 'O dashboard que centraliza tudo', bullets: ['Resumo de clientes, conteúdo e prazos', 'O que precisa da sua atenção hoje', 'Comece o dia sabendo por onde ir'] },
  ]
  return (
    <section id="plataforma" className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#0B1020]">Explore a plataforma</h2>
          <p className="text-[15px] text-[#475569] mt-2">Tudo que a rotina de quem atende cliente precisa — do briefing ao financeiro, num só lugar.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <div key={f.title} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5 transition-all hover:border-[#29457a]/40 hover:shadow-lg hover:shadow-[#0B1020]/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#29457a]/10 border border-[#29457a]/25 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-[#29457a]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#0B1020] leading-tight">{f.title}</h3>
                  <p className="text-[12px] text-[#94a3b8]">{f.subtitle}</p>
                </div>
              </div>
              <ul className="space-y-2 mt-4">
                {f.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-[13px] text-[#334155]">
                    <Check className="w-4 h-4 text-[#29457a] flex-shrink-0 mt-0.5" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Depoimentos ──────────────────────────────────────────────────────────────
function Testimonials() {
  const items = [
    { name: 'Bruna Cardoso', role: 'Social media freelancer', text: 'Passei de 4 para 7 clientes sem trabalhar mais. Cada cliente tem o próprio espaço e a IA já sabe o tom de cada um.' },
    { name: 'Lucas Almeida', role: 'Gestor de tráfego', text: 'O calendário sozinho já economiza umas 2 horas por semana. Acabou a bagunça de planilha.' },
    { name: 'Carolina Mendonça', role: 'Social media de agência', text: 'Parei de pagar 3 IAs separadas. Está tudo aqui, e ainda com contexto do cliente.' },
    { name: 'Fernando Vieira', role: 'Dono de agência', text: 'Consegui organizar todo o time numa plataforma só. Cada um sabe o que fazer e o cliente acompanha.' },
    { name: 'Isabela Ramos', role: 'Social media', text: 'Organizei todos os meus clientes em uma semana. O onboarding é simples e a IA puxa o contexto.' },
    { name: 'Rafael Torres', role: 'Estrategista de conteúdo', text: 'Acabou o ciclo de 10 abas abertas. Briefing, IA e aprovação no mesmo fluxo.' },
  ]
  return (
    <section className="py-20 px-4 sm:px-6 bg-[#0B1020]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-white">Não acredite só na nossa palavra</h2>
          <p className="text-[15px] text-[#94a3b8] mt-2">Veja o que social media e agência estão dizendo.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(t => {
            const initials = t.name.split(' ').map(w => w[0]).slice(0, 2).join('')
            return (
              <div key={t.name} className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5">
                <div className="flex mb-3">{[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#fbbf24] text-[#fbbf24]" />)}</div>
                <p className="text-[13.5px] text-[#CBD5E1] leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #29457a, #16284d)' }}>{initials}</div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-[#64748b]">{t.role}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Comparação ───────────────────────────────────────────────────────────────
function Comparison() {
  const rows = [
    ['WhatsApp + planilhas + apps soltos', 'Aprovação e rotina espalhadas', 'Fluxo único para produção e validação'],
    ['ChatGPT e IAs genéricas', 'Não conhecem o contexto de cada cliente', 'IA com o DNA, tom de voz e histórico salvos'],
    ['Scheduler isolado', 'Publica, mas não organiza a operação', 'Une calendário, aprovação, equipe e financeiro'],
    ['Processo manual', 'Depende demais de pessoas e memória', 'Cria padrão repetível para escalar'],
  ]
  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#0B1020] max-w-2xl mx-auto leading-tight">
            Centralizar a operação muda o jogo em relação ao modelo fragmentado.
          </h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-lg shadow-[#0B1020]/5">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="px-5 py-4 text-[13px] font-semibold text-[#64748b]">Abordagem</th>
                <th className="px-5 py-4 text-[13px] font-semibold text-[#64748b]">Limitação</th>
                <th className="px-5 py-4 text-[13px] font-semibold text-[#29457a]">Com a StatusMedia</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([approach, limitation, advantage]) => (
                <tr key={approach} className="border-b border-[#e2e8f0] last:border-b-0">
                  <td className="px-5 py-4 text-[13.5px] text-[#0B1020] font-medium align-top">{approach}</td>
                  <td className="px-5 py-4 text-[13.5px] text-[#64748b] align-top">{limitation}</td>
                  <td className="px-5 py-4 text-[13.5px] text-[#334155] align-top">
                    <span className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#29457a] flex-shrink-0 mt-0.5" /> {advantage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ─── Planos ───────────────────────────────────────────────────────────────────
function Pricing() {
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
    <section ref={sectionRef} id="planos" className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-white">Planos</h2>
          <p className="text-[15px] text-[#94a3b8] mt-2">Escolha o tamanho da sua operação. Sem fidelidade. 3 dias pra testar.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {order.map(id => {
            const p = PLANS[id]
            const featured = id === 'pro'
            return (
              <div key={id} className={`relative rounded-2xl border p-6 flex flex-col ${featured ? 'border-[#29457a] bg-[#111827] shadow-xl shadow-[#29457a]/10 md:-mt-3 md:mb-3' : 'border-[#1e293b] bg-[#111827]'}`}>
                {p.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold ${featured ? 'text-white' : 'text-[#9bb6dd] bg-[#182233] border border-[#1e293b]'}`}
                    style={featured ? { background: 'linear-gradient(135deg, #29457a, #16284d)' } : {}}>
                    {p.badge}
                  </span>
                )}
                <h3 className="text-[18px] font-bold text-white">{p.name}</h3>
                <p className="text-[12.5px] text-[#94a3b8] mt-1 min-h-[34px]">{p.description}</p>
                <div className="mt-4 mb-5">
                  <span className="text-[34px] font-bold text-white">{BRL(p.price)}</span>
                  <span className="text-[13px] text-[#64748b]">/mês</span>
                </div>
                <Link
                  to="/login"
                  onClick={() => trackPixel('InitiateCheckout', {
                    content_name: p.name,
                    content_ids: [id],
                    value: p.price,
                    currency: 'BRL',
                    num_items: 1,
                  })}
                  className={`w-full py-3 rounded-xl text-[13px] font-semibold text-center transition-colors ${featured ? 'text-white hover:opacity-95' : 'text-[#CBD5E1] border border-[#1e293b] bg-[#182233] hover:border-[#334155]'}`}
                  style={featured ? { background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' } : {}}>
                  Começar teste de 3 dias
                </Link>
                <ul className="space-y-2.5 mt-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-[#CBD5E1]">
                      <Check className="w-4 h-4 text-[#6f93c9] flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        <p className="text-center text-[12px] text-[#64748b] mt-8">Todos os planos têm 3 dias de teste. Cancele quando quiser. Sem fidelidade.</p>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
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
    <section id="faq" className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#0B1020]">Perguntas frequentes</h2>
          <p className="text-[15px] text-[#475569] mt-2">O que normalmente perguntam antes de assinar.</p>
        </div>
        <div className="space-y-3">
          {faqs.map(([q, a], i) => (
            <div key={i} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl overflow-hidden transition-colors hover:border-[#29457a]/30">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                <span className="text-[14px] font-semibold text-[#0B1020]">{q}</span>
                <ChevronDown className={`w-4 h-4 text-[#64748b] flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="px-5 pb-4 text-[13.5px] text-[#475569] leading-relaxed">{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA final ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #29457a, #16284d)' }}>
          <Zap className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-bold text-white leading-tight">Sua operação de conteúdo em um só lugar.</h2>
        <p className="text-[15px] text-[#94a3b8] mt-4 max-w-xl mx-auto">
          Cadastre um cliente, gere ideias com IA, organize o calendário e aprove conteúdos sem trocar de ferramenta toda hora.
        </p>
        <button
          onClick={() => { scrollTo('planos')(); trackPixel('Lead', { content_name: 'final_cta_conhecer_planos' }) }}
          className="mt-8 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white inline-flex items-center gap-2 hover:opacity-95 transition-opacity shadow-lg shadow-[#29457a]/30"
          style={{ background: 'linear-gradient(135deg, #29457a 0%, #16284d 100%)' }}>
          Conhecer planos <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[12px] text-[#64748b] mt-4">3 dias de teste. Sem fidelidade. Cancela quando quiser.</p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-[#1e293b] bg-[#0B1020] px-4 sm:px-6 py-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <img src="/logo-icon.png" alt="StatusMedia" className="w-7 h-7 object-contain" />
            <span className="text-[15px] font-bold text-white">Status<span className="text-[#6f93c9]">Media</span></span>
          </div>
          <p className="text-[12px] text-[#64748b] max-w-xs">Organize. Produza. Escale. Toda a operação de social media num só lugar.</p>
        </div>
        <div className="flex flex-wrap gap-10">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-[#64748b] font-semibold">Produto</p>
            <button onClick={scrollTo('plataforma')} className="block text-[13px] text-[#94a3b8] hover:text-white">Plataforma</button>
            <button onClick={scrollTo('como-funciona')} className="block text-[13px] text-[#94a3b8] hover:text-white">Como funciona</button>
            <button onClick={scrollTo('planos')} className="block text-[13px] text-[#94a3b8] hover:text-white">Planos</button>
            <button onClick={scrollTo('faq')} className="block text-[13px] text-[#94a3b8] hover:text-white">FAQ</button>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-[#64748b] font-semibold">Acesso</p>
            <Link to="/login" className="block text-[13px] text-[#94a3b8] hover:text-white">Entrar</Link>
            <Link to="/privacy" className="block text-[13px] text-[#94a3b8] hover:text-white">Privacidade</Link>
            <Link to="/terms" className="block text-[13px] text-[#94a3b8] hover:text-white">Termos de uso</Link>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-[#475569] mt-10">© {new Date().getFullYear()} StatusMedia — Organize. Produza. Escale.</p>
    </footer>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <Navbar />
      <Hero />
      <SquadsBar />
      <Problem />
      <HowItWorks />
      <WhyItWorks />
      <Platform />
      <Testimonials />
      <Comparison />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
