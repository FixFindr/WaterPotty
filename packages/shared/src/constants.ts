import type { WashroomType } from './types'

// ─── App identity ────────────────────────────────────────────────────────────
export const APP_NAME = 'Water Potty'
export const APP_BUNDLE_ID = 'com.waterpotty.app'

// ─── Mapbox ──────────────────────────────────────────────────────────────────
// Default center: Metro Vancouver, BC (launch market)
export const MAPBOX_DEFAULT_CENTER: [number, number] = [-123.1207, 49.2827]
export const MAPBOX_DEFAULT_ZOOM = 13
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12'

// Washrooms within this distance of the route polyline are shown
export const ROUTE_PROXIMITY_METERS = 500

// ─── Pin timer ───────────────────────────────────────────────────────────────
export const PIN_DURATION_MINUTES = 30
export const PIN_EXPIRY_NOTIFICATION_MINUTES_BEFORE = 5

// ─── Washroom types (display names) ─────────────────────────────────────────
export const WASHROOM_TYPE_LABELS: Record<WashroomType, string> = {
  starbucks:    "Starbucks",
  mcdonalds:    "McDonald's",
  canadian_tire: "Canadian Tire",
  portable:     "Portable Toilet",
  public:       "Public Washroom",
  other:        "Other",
}

// ─── RevenueCat ──────────────────────────────────────────────────────────────
export const REVENUECAT_ENTITLEMENT_SUBSCRIBER = 'subscriber'
export const REVENUECAT_PRODUCT_ID = 'wp_annual_subscription'

// ─── Subscription pricing ────────────────────────────────────────────────────
// Note: SUBSCRIPTION_PRICE_CAD is defined in credits.ts (single source of truth)
export const SUBSCRIPTION_PERIOD = 'annual'

// ─── Supabase table names ────────────────────────────────────────────────────
export const TABLES = {
  users:         'users',
  washrooms:     'washrooms',
  pins:          'pins',
  feedback:      'feedback',
  verifications: 'verifications',
  creditLedger:  'credit_ledger',
  flags:         'flags',
} as const
