import type { Washroom, MarkerConfig } from './types'

/**
 * Returns the visual configuration for a washroom map marker.
 *
 * baseColor logic (per CLAUDE.md):
 *   closed          → grey    (non-interactive)
 *   open            → green
 *   pinned (1 pin)  → yellow
 *   occupied (2+)   → red
 *
 * accessSymbol:
 *   is_pay_to_use   → bowtie
 *   free            → heart
 *
 * cleanlinessSymbol:
 *   clean           → thumbs-up
 *   dirty           → thumbs-down
 *   null            → question
 */
export function getMarkerConfig(washroom: Washroom): MarkerConfig {
  const baseColor =
    washroom.status === 'closed'   ? 'grey'   :
    washroom.status === 'open'     ? 'green'  :
    washroom.status === 'pinned'   ? 'yellow' :
    /* occupied */                   'red'

  return {
    baseColor,
    accessSymbol:      washroom.is_pay_to_use ? 'bowtie' : 'heart',
    cleanlinessSymbol: washroom.last_cleanliness === 'clean'  ? 'thumbs-up'   :
                       washroom.last_cleanliness === 'dirty'  ? 'thumbs-down' :
                       'question',
    interactive: washroom.status !== 'closed',
  }
}
