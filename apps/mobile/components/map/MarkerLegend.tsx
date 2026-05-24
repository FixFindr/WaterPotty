/**
 * components/map/MarkerLegend.tsx
 *
 * Renders all 18 marker combinations in a visual grid.
 * Used in:
 *   - Step 2 of the onboarding screen (reference card)
 *   - Settings screen (how to read the map)
 *   - Development / QA: visual regression check for all combinations
 *
 * 18 combinations = 3 status colours × 2 access symbols × 3 cleanliness badges
 * Plus grey (closed) variants = total 24 rendered (grey × 2 × 3)
 */

import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { WashroomMarker } from './WashroomMarker'
import type { WashroomForMarker } from '@water-potty/shared'

// All combinations to display
const STATUS_COMBOS: Array<{
  status: WashroomForMarker['status']
  label: string
}> = [
  { status: 'open',     label: 'Open' },
  { status: 'pinned',   label: 'En route' },
  { status: 'occupied', label: 'Occupied' },
  { status: 'closed',   label: 'Closed' },
]

const ACCESS_COMBOS: Array<{
  is_pay_to_use: boolean
  label: string
}> = [
  { is_pay_to_use: false, label: 'Free ♥' },
  { is_pay_to_use: true,  label: 'Pay 🎀' },
]

const CLEANLINESS_COMBOS: Array<{
  last_cleanliness: WashroomForMarker['last_cleanliness']
  label: string
}> = [
  { last_cleanliness: 'clean', label: 'Clean 👍' },
  { last_cleanliness: 'dirty', label: 'Dirty 👎' },
  { last_cleanliness: null,    label: 'Unknown ?' },
]

interface MarkerLegendProps {
  /** Compact mode: fewer labels, smaller grid — for onboarding embed */
  compact?: boolean
}

export function MarkerLegend({ compact = false }: MarkerLegendProps) {
  return (
    <ScrollView
      horizontal={compact}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={compact ? styles.compactContainer : styles.container}
    >
      {STATUS_COMBOS.map(({ status, label: statusLabel }) => (
        <View key={status} style={styles.statusGroup}>
          {!compact && (
            <Text style={styles.statusGroupLabel}>{statusLabel}</Text>
          )}
          <View style={styles.row}>
            {ACCESS_COMBOS.map(({ is_pay_to_use, label: accessLabel }) =>
              CLEANLINESS_COMBOS.map(({ last_cleanliness, label: cleanLabel }) => {
                const washroom: WashroomForMarker = {
                  id: `legend-${status}-${is_pay_to_use}-${last_cleanliness}`,
                  status,
                  is_pay_to_use,
                  last_cleanliness,
                }
                return (
                  <View
                    key={`${status}-${is_pay_to_use}-${last_cleanliness}`}
                    style={styles.cell}
                  >
                    <WashroomMarker
                      washroom={washroom}
                      scale={compact ? 0.7 : 0.85}
                      hidePointer={compact}
                    />
                    {!compact && (
                      <Text style={styles.cellLabel}>
                        {accessLabel}{'\n'}{cleanLabel}
                      </Text>
                    )}
                  </View>
                )
              })
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  compactContainer: { paddingHorizontal: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },

  statusGroup: { gap: 8 },
  statusGroupLabel: {
    fontSize: 12, fontWeight: '600', color: '#7BA7C2',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  cell: { alignItems: 'center', gap: 6, minWidth: 60 },
  cellLabel: {
    fontSize: 10, color: '#4A6880', textAlign: 'center', lineHeight: 13,
  },
})
