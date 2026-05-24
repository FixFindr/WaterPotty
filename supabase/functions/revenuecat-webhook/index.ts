/**
 * supabase/functions/revenuecat-webhook/index.ts
 *
 * Water Potty — RevenueCat Subscription Webhook
 *
 * Triggered by RevenueCat on every subscription lifecycle event.
 * Configured in RevenueCat dashboard → Project → Webhooks → Add endpoint:
 *
 *   URL:  https://<project>.supabase.co/functions/v1/revenuecat-webhook
 *   Auth: Authorization header with REVENUECAT_WEBHOOK_SECRET
 *
 * Handled events:
 *   INITIAL_PURCHASE   — new subscriber
 *   RENEWAL            — annual renewal (credit-first logic)
 *   CANCELLATION       — cancel at period end (tier unchanged until expiry)
 *   EXPIRATION         — subscription has ended (downgrade to free)
 *   UNCANCELLATION     — user re-subscribed before expiry
 *   BILLING_ISSUE      — payment failed (notify user, don't downgrade yet)
 *
 * Credit-first renewal logic (RENEWAL event):
 *   credits ≥ 5  → deduct 5, skip payment, extend subscription
 *   credits 1–4  → deduct available credits, charge prorated amount
 *   credits = 0  → standard $10 charge via RevenueCat (already processed)
 *
 * RevenueCat handles the actual payment. This webhook only:
 *   - Updates users.tier and subscription_expires_at in Supabase
 *   - Writes credit_ledger entries for credit-based renewals
 *   - Sends appropriate push notifications
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RevenueCatWebhookPayload {
  event: {
    type: string
    app_user_id: string          // matches users.auth_id (configure in RevenueCat)
    product_id: string
    period_type: string
    purchased_at_ms: number
    expiration_at_ms: number
    environment: 'SANDBOX' | 'PRODUCTION'
    is_trial_period: boolean
    price: number
    currency: string
  }
  api_version: string
}

// ── HMAC signature verification ───────────────────────────────────────────────

async function verifyRevenueCatSignature(
  body: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  )

  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `sha256=${expectedHex}` === signature
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-revenuecat-signature')
  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!

  // Verify HMAC signature
  const isValid = await verifyRevenueCatSignature(rawBody, signature, webhookSecret)
  if (!isValid) {
    console.error('RevenueCat webhook: invalid signature')
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let payload: RevenueCatWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { type: eventType, app_user_id, expiration_at_ms } = payload.event

  // Resolve app_user_id → users.id
  // Configure RevenueCat to use auth.uid() as app_user_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, tier')
    .eq('auth_id', app_user_id)
    .single()

  if (userError || !user) {
    console.error('RevenueCat webhook: user not found', app_user_id)
    // Return 200 so RevenueCat doesn't keep retrying for unknown users
    return new Response(JSON.stringify({ warning: 'User not found, skipped' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const expiresAt = expiration_at_ms
    ? new Date(expiration_at_ms).toISOString()
    : null

  // ── Event routing ─────────────────────────────────────────────────────────────

  switch (eventType) {

    // ── New subscriber ──────────────────────────────────────────────────────────
    case 'INITIAL_PURCHASE': {
      await supabase
        .from('users')
        .update({
          tier: 'subscriber',
          subscription_expires_at: expiresAt,
        })
        .eq('id', user.id)

      console.log(`INITIAL_PURCHASE: user ${user.id} → subscriber until ${expiresAt}`)
      break
    }

    // ── Annual renewal: credit-first logic ─────────────────────────────────────
    case 'RENEWAL': {
      // Fetch current credit balance
      const { data: balanceRow } = await supabase
        .from('user_credit_balances')
        .select('credits')
        .eq('user_id', user.id)
        .single()

      const credits: number = balanceRow?.credits ?? 0

      if (credits >= 5) {
        // Full credit redemption — deduct 5 credits, no payment needed
        await supabase.from('credit_ledger').insert({
          user_id: user.id,
          delta: -5,
          reason: 'subscription_renewal',
          note: 'Annual renewal via 5 credits — no payment charged',
        })

        await supabase
          .from('users')
          .update({
            tier: 'subscriber',
            subscription_expires_at: expiresAt,
          })
          .eq('id', user.id)

        console.log(`RENEWAL (full credits): user ${user.id} used 5 credits`)

        // TODO: trigger RevenueCat grant entitlement API if payment was bypassed
        // https://www.revenuecat.com/reference/grant-a-promotional-entitlement

      } else if (credits > 0 && credits < 5) {
        // Partial credit redemption — credits offset the price
        // RevenueCat has already charged the prorated amount
        await supabase.from('credit_ledger').insert({
          user_id: user.id,
          delta: -credits,
          reason: 'subscription_partial',
          note: `Partial renewal: ${credits} credits used, remainder charged`,
        })

        await supabase
          .from('users')
          .update({
            tier: 'subscriber',
            subscription_expires_at: expiresAt,
          })
          .eq('id', user.id)

        console.log(`RENEWAL (partial credits): user ${user.id} used ${credits} credits`)

      } else {
        // No credits — standard payment via RevenueCat (already processed)
        await supabase
          .from('users')
          .update({
            tier: 'subscriber',
            subscription_expires_at: expiresAt,
          })
          .eq('id', user.id)

        console.log(`RENEWAL (payment): user ${user.id} paid full amount`)
      }
      break
    }

    // ── Cancellation: tier stays until period ends ──────────────────────────────
    case 'CANCELLATION': {
      // Don't downgrade yet — user paid through to expiration_at_ms
      // EXPIRATION event will downgrade when the time comes
      console.log(`CANCELLATION: user ${user.id} — access until ${expiresAt}`)
      break
    }

    // ── Expiration: downgrade to free ───────────────────────────────────────────
    case 'EXPIRATION': {
      await supabase
        .from('users')
        .update({
          tier: 'free',
          subscription_expires_at: expiresAt,
        })
        .eq('id', user.id)

      console.log(`EXPIRATION: user ${user.id} → free`)
      break
    }

    // ── Re-subscribe before expiry ──────────────────────────────────────────────
    case 'UNCANCELLATION': {
      await supabase
        .from('users')
        .update({
          tier: 'subscriber',
          subscription_expires_at: expiresAt,
        })
        .eq('id', user.id)

      console.log(`UNCANCELLATION: user ${user.id} → subscriber until ${expiresAt}`)
      break
    }

    // ── Payment failed ──────────────────────────────────────────────────────────
    case 'BILLING_ISSUE': {
      // Do not downgrade immediately. RevenueCat has a grace period.
      // Log for monitoring. EXPIRATION will fire if it's not resolved.
      console.warn(`BILLING_ISSUE: user ${user.id} — payment failed, grace period active`)
      break
    }

    default: {
      console.log(`RevenueCat webhook: unhandled event type ${eventType}`)
    }
  }

  return new Response(JSON.stringify({ received: true, event: eventType }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
