/**
 * lib/revenuecat.ts
 *
 * Water Potty — RevenueCat Initialization
 *
 * Call initRevenueCat() once at app startup (in _layout.tsx AuthProvider useEffect).
 * Links the RevenueCat customer to the Supabase auth.uid() so the webhook can
 * resolve the user in Supabase when subscription events fire.
 *
 * Product IDs match what is configured in:
 *   - App Store Connect → In-App Purchases
 *   - Google Play Console → Products → Subscriptions
 *   - RevenueCat dashboard → Products + Entitlements
 */

import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

// ── Product / Entitlement IDs ─────────────────────────────────────────────────
// Must match exactly what is configured in RevenueCat dashboard.

export const PRODUCT_ID = 'wp_annual_subscription'    // $10 CAD/yr
export const ENTITLEMENT_ID = 'subscriber'             // maps to users.tier = 'subscriber'

// ── Initialize RevenueCat ─────────────────────────────────────────────────────

export async function initRevenueCat(supabaseUserId?: string) {
  const apiKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS!
    : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID!

  if (!apiKey) {
    console.warn('[RevenueCat] API key not set. In-app purchases will not work.')
    return
  }

  // Debug logging in non-production builds
  const appEnv = Constants.expoConfig?.extra?.appEnv
  if (appEnv !== 'production') {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  }

  Purchases.configure({ apiKey })

  // Link RevenueCat customer to Supabase auth user.
  // This is the app_user_id that RevenueCat sends in webhook payloads,
  // allowing the webhook Edge Function to find the correct user in Supabase.
  if (supabaseUserId) {
    try {
      await Purchases.logIn(supabaseUserId)
    } catch (err) {
      console.warn('[RevenueCat] logIn failed:', err)
    }
  }
}

// ── Link user after sign-in ───────────────────────────────────────────────────
// Call after Supabase auth session is established (e.g. in AuthProvider).

export async function linkRevenueCatUser(supabaseUserId: string) {
  try {
    const { customerInfo } = await Purchases.logIn(supabaseUserId)
    return customerInfo
  } catch (err) {
    console.warn('[RevenueCat] linkUser failed:', err)
    return null
  }
}

// ── Unlink on sign-out ────────────────────────────────────────────────────────

export async function unlinkRevenueCatUser() {
  try {
    await Purchases.logOut()
  } catch {
    // logOut throws if the user was anonymous — safe to ignore
  }
}

// ── Check active entitlement ──────────────────────────────────────────────────
// Use this for client-side UI gating (not a security gate — RLS handles that).

export async function isSubscriber(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo()
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
  } catch {
    return false
  }
}

// ── Get available packages ────────────────────────────────────────────────────

export async function getOfferings(): Promise<PurchasesPackage | null> {
  try {
    const offerings = await Purchases.getOfferings()
    return offerings.current?.availablePackages.find(
      p => p.product.identifier === PRODUCT_ID
    ) ?? null
  } catch (err) {
    console.warn('[RevenueCat] getOfferings failed:', err)
    return null
  }
}

// ── Purchase ──────────────────────────────────────────────────────────────────

export async function purchaseSubscription(pkg: PurchasesPackage): Promise<{
  success: boolean
  customerInfo?: CustomerInfo
  cancelled?: boolean
  error?: string
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    const active = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
    return { success: active, customerInfo }
  } catch (err: unknown) {
    // userCancelled is a runtime property set by react-native-purchases, not typed in d.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.userCancelled) {
      return { success: false, cancelled: true }
    }
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Restore purchases ─────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<{
  success: boolean
  customerInfo?: CustomerInfo
  error?: string
}> {
  try {
    const customerInfo = await Purchases.restorePurchases()
    const active = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
    return { success: active, customerInfo }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
