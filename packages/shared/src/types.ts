import type { Database } from '@water-potty/db'

// ─── Row types derived from Database ────────────────────────────────────────

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']

export type Washroom = Database['public']['Tables']['washrooms']['Row']
export type WashroomInsert = Database['public']['Tables']['washrooms']['Insert']

export type Pin = Database['public']['Tables']['pins']['Row']
export type PinInsert = Database['public']['Tables']['pins']['Insert']

export type Feedback = Database['public']['Tables']['feedback']['Row']
export type FeedbackInsert = Database['public']['Tables']['feedback']['Insert']

export type Verification = Database['public']['Tables']['verifications']['Row']
export type VerificationInsert = Database['public']['Tables']['verifications']['Insert']

export type CreditLedgerEntry = Database['public']['Tables']['credit_ledger']['Row']
export type CreditLedgerInsert = Database['public']['Tables']['credit_ledger']['Insert']

export type Flag = Database['public']['Tables']['flags']['Row']
export type FlagInsert = Database['public']['Tables']['flags']['Insert']

// ─── Enum types ─────────────────────────────────────────────────────────────

export type WashroomType = Database['public']['Enums']['washroom_type']
export type UserRole = Database['public']['Enums']['user_role']
export type UserTier = Database['public']['Enums']['user_tier']
export type Cleanliness = Database['public']['Enums']['cleanliness']
export type VerificationStatus = Database['public']['Enums']['verification_status']
export type FlagReason = Database['public']['Enums']['flag_reason']
export type CreditReason = Database['public']['Enums']['credit_reason']

// Marker types (MarkerConfig, BaseColor, WashroomStatus, etc.) are owned by
// ./markerConfig and re-exported via the package index.

// ─── Enriched types ──────────────────────────────────────────────────────────

export interface WashroomWithDistance extends Washroom {
  distance_meters: number
}

export interface PinWithWashroom extends Pin {
  washroom: Washroom
}
