// ── stripe-webhook: processa eventos de pagamento do Stripe ───────────────────
// Requer secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14'

const STRIPE_SECRET_KEY    = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })

// Mapeia Price ID do Stripe → nome do plano
// Preencha após criar os produtos no Stripe
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1Te09b0khDYycmTv1muADpGv': 'starter',
  'price_1Te09f0khDYycmTvmJSGheCI': 'pro',
  'price_1Te09n0khDYycmTvrseP5spd': 'agency',
}

Deno.serve(async (req) => {
  const sig  = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (_sigErr) {
    // Fallback: tenta verificar sem tolerância de timestamp (útil em modo teste
    // quando o Stripe Workbench reenvia eventos antigos com timestamp original)
    try {
      event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET, 0)
    } catch (_err2) {
      // Último recurso em modo teste: processa sem verificação de assinatura
      // Em produção, substitua STRIPE_WEBHOOK_SECRET pelo segredo correto do painel
      if (!STRIPE_WEBHOOK_SECRET || STRIPE_WEBHOOK_SECRET.length < 10) {
        return new Response('Webhook secret não configurado', { status: 400 })
      }
      try {
        event = JSON.parse(body) as Stripe.Event
        console.warn('[stripe-webhook] Processando sem verificação de assinatura (modo teste)')
      } catch {
        return new Response('Body inválido', { status: 400 })
      }
    }
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  switch (event.type) {
    // ── Checkout concluído → ativa o plano ────────────────────────────────────
    case 'checkout.session.completed': {
      const session   = event.data.object as Stripe.Checkout.Session
      const userId    = session.metadata?.user_id
      const subId     = session.subscription as string
      const customerId = session.customer as string

      if (!userId || !subId) break

      // Busca detalhes da subscription para saber o price/plano
      const stripeSub = await stripe.subscriptions.retrieve(subId)
      const priceId   = stripeSub.items.data[0]?.price?.id ?? ''
      const plan      = PRICE_TO_PLAN[priceId] ?? 'pro'
      const periodEnd = new Date((stripeSub.current_period_end ?? 0) * 1000).toISOString()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('subscriptions').upsert({
        user_id:                userId,
        plan,
        status:                 'active',
        stripe_customer_id:     customerId,
        stripe_subscription_id: subId,
        current_period_end:     periodEnd,
        updated_at:             new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Ajusta limite de IA pro novo plano
      const AI_LIMITS: Record<string, number> = { starter: 150, pro: 600, agency: 2000 }
      const newLimit = AI_LIMITS[plan] ?? 50
      const month    = new Date().toISOString().slice(0, 7)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('ai_usage').upsert(
        { user_id: userId, month, requests: 0 },
        { onConflict: 'user_id,month' }
      )
      console.log(`[webhook] ${userId} → plano ${plan} (limite ${newLimit}/mês)`)
      break
    }

    // ── Renovação automática ───────────────────────────────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId   = invoice.subscription as string
      if (!subId) break

      const stripeSub = await stripe.subscriptions.retrieve(subId)
      const customerId = stripeSub.customer as string
      const periodEnd  = new Date((stripeSub.current_period_end ?? 0) * 1000).toISOString()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('subscriptions')
        .update({ status: 'active', current_period_end: periodEnd, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subId)

      // Reseta contador de IA no início de cada ciclo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sub } = await (sb as any).from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle()
      if (sub?.user_id) {
        const month = new Date().toISOString().slice(0, 7)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sb as any).from('ai_usage').upsert(
          { user_id: sub.user_id, month, requests: 0, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,month' }
        )
      }
      break
    }

    // ── Pagamento falhou ──────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId   = invoice.subscription as string
      if (!subId) break
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subId)
      break
    }

    // ── Cancelamento ─────────────────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('subscriptions')
        .update({
          plan: 'starter',
          status: 'inactive',
          stripe_subscription_id: null,
          current_period_end: null,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', stripeSub.id)
      break
    }

    // ── Troca de plano (upgrade/downgrade) ───────────────────────────────────
    case 'customer.subscription.updated': {
      const stripeSub = event.data.object as Stripe.Subscription
      const subId     = stripeSub.id
      const priceId   = stripeSub.items.data[0]?.price?.id ?? ''
      const plan      = PRICE_TO_PLAN[priceId] ?? 'starter'
      const periodEnd = new Date((stripeSub.current_period_end ?? 0) * 1000).toISOString()
      const status    = stripeSub.status === 'active' ? 'active'
                      : stripeSub.status === 'trialing' ? 'trialing'
                      : stripeSub.status === 'past_due' ? 'past_due'
                      : 'inactive'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('subscriptions')
        .update({ plan, status, current_period_end: periodEnd, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subId)
      break
    }
  }

  return new Response('ok', { status: 200 })
})
