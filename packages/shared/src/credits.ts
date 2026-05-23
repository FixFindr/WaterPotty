import type { CreditReason } from './types'

// ─── Credit economy (per CLAUDE.md) ─────────────────────────────────────────
//
// | Event                             | Delta | Triggered by                    |
// |-----------------------------------|-------|---------------------------------|
// | Washroom verified by peer         | +2    | verifications update trigger    |
// | Annual subscription via credits   | −5    | RevenueCat webhook Edge Function |
// | Manual admin adjustment           | ±n    | Admin dashboard server action   |

export const CREDIT_DELTAS: Record<CreditReason, number> = {
  washroom_verified:       +2,
  subscription_renewal:    -5,
  manual_admin_adjustment:  0,  // amount set dynamically by admin
} as const

/**
 * Returns the credit delta for a standard credit event.
 * Returns 0 for manual_admin_adjustment — the admin sets the delta explicitly.
 */
export function getCreditDelta(reason: CreditReason): number {
  return CREDIT_DELTAS[reason]
}

// ─── Subscription credit logic (per CLAUDE.md) ───────────────────────────────
//
// If balance ≥ 5: deduct 5 credits, skip payment, extend subscription_expires_at
// If balance 1–4: prorate ($10 − credits × $2), charge remainder, use credits
// If balance 0:   standard $10 charge

export const SUBSCRIPTION_PRICE_CAD = 10
export const CREDIT_VALUE_CAD = 2
export const CREDITS_FOR_FREE_RENEWAL = 5

/**
 * Returns how many credits to deduct and the dollar amount to charge
 * for a subscription renewal based on the user's current credit balance.
 */
export function calculateRenewalCharge(creditBalance: number): {
  creditsToDeduct: number
  amountToChargeCad: number
} {
  if (creditBalance >= CREDITS_FOR_FREE_RENEWAL) {
    return { creditsToDeduct: CREDITS_FOR_FREE_RENEWAL, amountToChargeCad: 0 }
  }
  const creditsToDeduct = creditBalance
  const amountToChargeCad = SUBSCRIPTION_PRICE_CAD - creditsToDeduct * CREDIT_VALUE_CAD
  return { creditsToDeduct, amountToChargeCad }
}
