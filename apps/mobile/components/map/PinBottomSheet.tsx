import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { WashroomForMarker } from '@water-potty/shared'

// STUB — placeholder sheet so MapView typechecks. Replace with full sheet
// (drag-to-dismiss, pin action, cleanliness rating, directions, etc.).

interface ActivePin {
  washroomId: string
  expiresAt: string
}

interface Props {
  washroom: WashroomForMarker
  activePin: ActivePin | null
  onClose: () => void
  onPinCreated: (washroomId: string, expiresAt: string) => void
  onPinReleased: () => void
}

export function PinBottomSheet({ washroom, onClose }: Props) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{washroom.name ?? 'Washroom'}</Text>
      <Text style={styles.meta}>Status: {washroom.status}</Text>
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0A1628' },
  meta: { color: '#546E7A' },
  closeBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#ECEFF1',
    borderRadius: 999,
  },
  closeText: { color: '#0A1628', fontWeight: '600' },
})
