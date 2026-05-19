import { useState, useEffect, useRef, useCallback } from 'react'
import OpenAI from 'openai'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface HeroPill {
  icon: string
  label: string
  variant: 'default' | 'warning' | 'success'
}

export interface DashboardStats {
  total_clients: number
  active_clients: number
  pending_tasks: number
  overdue_tasks: number
  period_pending_approval: number
  period_approved: number
}

export interface GreetingResult {
  greeting: string
  message: string
  pills: HeroPill[]
  isLoading: boolean
  refresh: () => void
}

// ── OpenAI client ──────────────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
})

// ── Cache TTL: 30 minutos ──────────────────────────────────────────────────────

const CACHE_TTL = 30 * 60 * 1000

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGreetingText(name: string): string {
  const hour = new Date().getHours()
  const dow  = new Date().getDay() // 5 = sexta

  if (dow === 5) return `Sextou, ${name}! 🍻`
  if (hour < 12) return `Bom dia, ${name}.`
  if (hour < 18) return `Boa tarde, ${name}.`
  return `Boa noite, ${name}.`
}

function getFallbackPills(stats: DashboardStats): HeroPill[] {
  const pills: HeroPill[] = []

  if (stats.period_approved > 0)
    pills.push({
      icon: '✅',
      label: `${stats.period_approved} aprovação${stats.period_approved > 1 ? 'ões' : ''} no período`,
      variant: 'success',
    })

  if (stats.period_pending_approval > 0)
    pills.push({
      icon: '📅',
      label: `${stats.period_pending_approval} aguardando aprovação`,
      variant: 'default',
    })

  if (stats.overdue_tasks > 0)
    pills.push({
      icon: '⚠️',
      label: `${stats.overdue_tasks} tarefa${stats.overdue_tasks > 1 ? 's' : ''} atrasada${stats.overdue_tasks > 1 ? 's' : ''}`,
      variant: 'warning',
    })

  if (stats.active_clients > 0 && pills.length < 3)
    pills.push({
      icon: '📈',
      label: `${stats.active_clients} clientes ativos`,
      variant: 'default',
    })

  return pills.slice(0, 4)
}

function getFallbackMessage(stats: DashboardStats): string {
  if (stats.overdue_tasks > 0)
    return `${stats.overdue_tasks} tarefa${stats.overdue_tasks > 1 ? 's atrasadas' : ' atrasada'}. Vale dar uma olhada hoje.`
  if (stats.period_approved > 0)
    return `${stats.period_approved} aprovação${stats.period_approved > 1 ? 'ões' : ''} no período. Ótimo ritmo!`
  if (stats.period_pending_approval > 0)
    return `${stats.period_pending_approval} conteúdo${stats.period_pending_approval > 1 ? 's aguardam' : ' aguarda'} aprovação do cliente.`
  return 'Sua operação está organizada. Bom trabalho!'
}

// ── Hook principal ─────────────────────────────────────────────────────────────

export function useDashboardGreeting(
  userId: string | undefined,
  userName: string,
  stats: DashboardStats,
  statsReady: boolean,
): GreetingResult {
  const [message, setMessage]     = useState('Carregando resumo da sua operação…')
  const [pills, setPills]         = useState<HeroPill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasFetched                = useRef(false)

  const cacheKey = userId ? `dash_greeting_v2_${userId}` : null

  // ── Fetch (com cache localStorage) ──────────────────────────────────────────
  const fetchGreeting = useCallback(async (forceRefresh = false) => {
    if (!userId || !cacheKey) return

    // Lê cache (se não for refresh forçado)
    if (!forceRefresh) {
      try {
        const raw = localStorage.getItem(cacheKey)
        if (raw) {
          const { msg, pills: cachedPills, ts } = JSON.parse(raw)
          if (Date.now() - ts < CACHE_TTL && typeof msg === 'string') {
            setMessage(msg)
            setPills(cachedPills ?? [])
            setIsLoading(false)
            return
          }
        }
      } catch { /* cache corrompido — regenera */ }
    }

    setIsLoading(true)

    const hour    = new Date().getHours()
    const dayName = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente de dashboard para uma agência de social media. ' +
              'Responda APENAS com JSON válido, sem markdown, sem code block.',
          },
          {
            role: 'user',
            content: `Situação atual da agência (${dayName}, ${hour}h):
- Clientes ativos: ${stats.active_clients} de ${stats.total_clients}
- Conteúdos aguardando aprovação: ${stats.period_pending_approval}
- Aprovados no período: ${stats.period_approved}
- Tarefas pendentes: ${stats.pending_tasks}
- Tarefas atrasadas: ${stats.overdue_tasks}

Retorne APENAS este JSON:
{
  "message": "frase curta e inteligente (máx. 12 palavras) sobre o momento atual da agência",
  "pills": [
    { "icon": "emoji", "label": "texto curto", "variant": "success|warning|default" }
  ]
}

Regras:
- 2 a 4 pills, mostrando os dados mais relevantes
- "warning" APENAS se há atrasos ou problemas reais
- "success" para conquistas positivas
- Tom profissional, direto e encorajador
- NÃO repita o mesmo dado em frase e pill`,
          },
        ],
        max_tokens: 220,
      })

      const raw  = res.choices[0].message.content?.trim() ?? '{}'
      const json = JSON.parse(raw)

      const newMsg   = typeof json.message === 'string' ? json.message : getFallbackMessage(stats)
      const newPills = Array.isArray(json.pills) ? (json.pills as HeroPill[]).slice(0, 4) : getFallbackPills(stats)

      try {
        localStorage.setItem(cacheKey, JSON.stringify({ msg: newMsg, pills: newPills, ts: Date.now() }))
      } catch { /* storage cheio — ignora */ }

      setMessage(newMsg)
      setPills(newPills)
    } catch {
      // Fallback sem IA
      setMessage(getFallbackMessage(stats))
      setPills(getFallbackPills(stats))
    } finally {
      setIsLoading(false)
    }
  }, [userId, cacheKey, stats.active_clients, stats.period_approved, stats.overdue_tasks, stats.period_pending_approval, stats.pending_tasks, stats.total_clients])

  // ── Executa apenas uma vez, após dados carregados ──────────────────────────
  useEffect(() => {
    if (!statsReady || !userId || hasFetched.current) return
    hasFetched.current = true
    fetchGreeting(false)
  }, [statsReady, userId, fetchGreeting])

  return {
    greeting: getGreetingText(userName),
    message,
    pills,
    isLoading,
    refresh: () => {
      hasFetched.current = false
      fetchGreeting(true)
    },
  }
}
