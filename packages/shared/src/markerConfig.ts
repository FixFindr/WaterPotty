/**
 * lib/markerConfig.ts
 *
 * Core utility for Water Potty map markers.
 * Converts a Washroom database record into a deterministic visual config
 * used by WashroomMarker and the Mapbox symbol layer.
 *
 * Colour  = availability status
 * Symbol  = free (heart) vs pay-to-use (bowtie)
 * Badge   = last cleanliness rating (thumbs-up / thumbs-down / question)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type WashroomStatus =
  | 'open'
  | 'pinned'
  | 'occupied'
  | 'closed'
  | 'pending_verification'

export type CleanlinessRating = 'clean' | 'dirty' | null

export type BaseColor = 'green' | 'yellow' | 'red' | 'grey'
export type AccessSymbol = 'heart' | 'bowtie'
export type CleanlinessSymbol = 'thumbs-up' | 'thumbs-down' | 'question'

export interface WashroomForMarker {
  id: string
  status: WashroomStatus
  is_pay_to_use: boolean
  last_cleanliness: CleanlinessRating
  name?: string
  type?: string
}

export interface MarkerConfig {
  /** Background fill colour of the rounded-square pin */
  baseColor: BaseColor
  /** Hex value corresponding to baseColor — use for tinting SVG paths */
  baseHex: string
  /** Light fill hex for the pin background area */
  bgHex: string
  /** Heart = free, Bowtie = pay-to-use */
  accessSymbol: AccessSymbol
  /** Cleanliness badge bottom-right of the pin */
  cleanlinessSymbol: CleanlinessSymbol
  /** Closed/pending washrooms should not respond to tap */
  interactive: boolean
  /** Opacity for the entire marker — closed markers are dimmed */
  opacity: number
  /** Human-readable status label for accessibility */
  statusLabel: string
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const COLOR_MAP: Record<BaseColor, { hex: string; bg: string }> = {
  green:  { hex: '#2E7D32', bg: '#E8F5E9' },
  yellow: { hex: '#E65100', bg: '#FFF3E0' }, // amber-orange reads better than pure yellow on maps
  red:    { hex: '#C62828', bg: '#FFEBEE' },
  grey:   { hex: '#546E7A', bg: '#ECEFF1' },
}

// ─── Core utility ─────────────────────────────────────────────────────────────

export function getMarkerConfig(washroom: WashroomForMarker): MarkerConfig {
  const baseColor: BaseColor =
    washroom.status === 'closed' || washroom.status === 'pending_verification'
      ? 'grey'
      : washroom.status === 'open'
      ? 'green'
      : washroom.status === 'pinned'
      ? 'yellow'
      : 'red' // occupied

  const { hex: baseHex, bg: bgHex } = COLOR_MAP[baseColor]

  const accessSymbol: AccessSymbol = washroom.is_pay_to_use ? 'bowtie' : 'heart'

  const cleanlinessSymbol: CleanlinessSymbol =
    washroom.last_cleanliness === 'clean' ? 'thumbs-up' :
    washroom.last_cleanliness === 'dirty' ? 'thumbs-down' :
    'question'

  const interactive =
    washroom.status !== 'closed' && washroom.status !== 'pending_verification'

  const opacity = washroom.status === 'closed' ? 0.45 : 1

  const statusLabel =
    washroom.status === 'open'     ? 'Open' :
    washroom.status === 'pinned'   ? 'Someone is on their way' :
    washroom.status === 'occupied' ? 'Currently occupied' :
    washroom.status === 'closed'   ? 'Closed or unavailable' :
    'Pending verification'

  return {
    baseColor,
    baseHex,
    bgHex,
    accessSymbol,
    cleanlinessSymbol,
    interactive,
    opacity,
    statusLabel,
  }
}

// ─── Unique marker image key ──────────────────────────────────────────────────
// Used as the Mapbox image ID when registering markers in the symbol layer.
// Encodes the full visual state so each combination gets its own cached image.

export function getMarkerImageKey(config: MarkerConfig): string {
  return `wp-${config.baseColor}-${config.accessSymbol}-${config.cleanlinessSymbol}`
}

// All 18 possible combinations (3 colours × 2 access × 3 cleanliness + grey variants)
export function getAllMarkerCombinations(): MarkerConfig[] {
  const statuses: WashroomStatus[] = ['open', 'pinned', 'occupied', 'closed']
  const combos: MarkerConfig[] = []

  for (const status of statuses) {
    for (const is_pay_to_use of [false, true]) {
      for (const last_cleanliness of [null, 'clean', 'dirty'] as CleanlinessRating[]) {
        combos.push(
          getMarkerConfig({ id: '', status, is_pay_to_use, last_cleanliness })
        )
      }
    }
  }

  // Deduplicate by image key
  const seen = new Set<string>()
  return combos.filter(c => {
    const key = getMarkerImageKey(c)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
