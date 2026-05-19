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
  'price_1TYsFlP29s2RNZxUOJJW67IL': 'starter',
  'price_1TYsFpP29s2RNZxUNzOUbAPr': 'pro',
  'price_1TYsFqP29s2RNZxUpqsRsVEw': 'agency',
}

Deno.serve(async (req) => {
  const sig  = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`Webhook Error: ${err}`, { status: 400 })
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
      const AI_LIMITS: Record<string, number> = { starter: 100, pro: 400, agency: 1500 }
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
        .update({ plan: 'free', status: 'active', stripe_subscription_id: null, current_period_end: null, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', stripeSub.id)
      break
    }
  }

  return new Response('ok', { status: 200 })
})
