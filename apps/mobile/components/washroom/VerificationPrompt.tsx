/**
 * components/washroom/VerificationPrompt.tsx
 *
 * Water Potty — Verification Prompt Card
 *
 * A non-intrusive banner that appears at the bottom of the map
 * when the user is within 200m of a washroom awaiting peer verification.
 *
 * Behaviour:
 *   - Appears automatically (pushed from useNearbyVerifications hook)
 *   - Tapping "Verify it" opens the VerificationModal
 *   - Tapping "Skip" dismisses for this session
 *   - The verification modal handles photo, confirm fields, and submit
 *
 * Positioned above the PinTimer if one is active.
 */

import React, { useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface PendingWashroom {
  id: string
  name: string
  type: string
  distanceM: number
}

interface Props {
  washroom: PendingWashroom
  hasActivePin: boolean     // push up above timer if true
  onVerify: () => void
  onSkip: () => void
}

export function VerificationPrompt({
  washroom,
  hasActivePin,
  onVerify,
  onSkip,
}: Props) {
  const slideAnim = useRef(new Animated.Value(120)).current

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 60,
      friction: 12,
      useNativeDriver: true,
    }).start()
  }, [])

  const dismiss = (cb: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 120,
      duration: 200,
      useNativeDriver: true,
    }).start(cb)
  }

  const distanceLabel =
    washroom.distanceM < 100
      ? `${washroom.distanceM}m away`
      : `${(washroom.distanceM / 1000).toFixed(1)}km away`

  // Stack above PinTimer (height ~62) + tab bar if pin is active
  const bottomOffset = Platform.OS === 'ios'
    ? hasActivePin ? 178 : 106
    : hasActivePin ? 152 : 80

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Left accent bar */}
      <View style={styles.accentBar} />

      <View style={styles.body}>
        {/* Icon + distance */}
        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 16 }}>✅</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.title} numberOfLines={1}>
              Verify nearby washroom
            </Text>
            <Text style={styles.distanceLabel}>
              {washroom.name} · {distanceLabel}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          A subscriber added a new washroom near you. Can you confirm it exists?
          You'll help the community and keep the map accurate.
        </Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => dismiss(onVerify)}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.verifyBtnText}>Verify it</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => dismiss(onSkip)}
          >
            <Text style={styles.skipBtnText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16, right: 16,
    flexDirection: 'row',
    backgroundColor: '#0D1F35',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.2)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  accentBar: {
    width: 4,
    backgroundColor: '#4FC3F7',
  },
  body: { flex: 1, padding: 14 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(79,195,247,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  metaCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  distanceLabel: { fontSize: 11, color: '#4A6880', marginTop: 1 },
  description: {
    fontSize: 12, color: '#7BA7C2', lineHeight: 17, marginBottom: 12,
  },
  actions: { flexDirection: 'row', gap: 10 },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  verifyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  skipBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  skipBtnText: { color: '#4A6880', fontSize: 13 },
})
