import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { WashroomForMarker } from '@water-potty/shared'
import { getMarkerConfig } from '@water-potty/shared'

// STUB — to be replaced with full marker rendering (rounded-square pin,
// access symbol, cleanliness badge, etc.).

interface Props {
  washroom: WashroomForMarker
  scale: number
  selected: boolean
  onPress: (washroom: WashroomForMarker) => void
}

export function WashroomMarker({ washroom, scale, selected, onPress }: Props) {
  const config = getMarkerConfig(washroom)
  return (
    <Pressable onPress={() => onPress(washroom)} disabled={!config.interactive}>
      <View
        style={[
          styles.pin,
          {
            backgroundColor: config.bgHex,
            borderColor: config.baseHex,
            opacity: config.opacity,
            transform: [{ scale }],
          },
          selected && styles.selected,
        ]}
      >
        <Text style={[styles.label, { color: config.baseHex }]}>WC</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pin: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
})
