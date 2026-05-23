import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

// STUB — minimal countdown timer for an active pin.
// Replace with full design (location of UI, release confirmation, etc.).

interface Props {
  washroomId: string
  expiresAt: string // ISO
  onExpired: () => void
  onRelease: () => void
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function PinTimer({ expiresAt, onExpired, onRelease }: Props) {
  const [remaining, setRemaining] = useState(
    new Date(expiresAt).getTime() - Date.now()
  )

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date(expiresAt).getTime() - Date.now()
      setRemaining(next)
      if (next <= 0) {
        clearInterval(id)
        onExpired()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpired])

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your pin: {formatRemaining(remaining)}</Text>
      <Pressable onPress={onRelease} style={styles.releaseBtn}>
        <Text style={styles.releaseText}>Release</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#0A1628',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: { color: '#fff', fontWeight: '600' },
  releaseBtn: {
    backgroundColor: '#C62828',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  releaseText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})
