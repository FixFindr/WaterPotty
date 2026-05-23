/**
 * components/map/PinTimer.tsx
 *
 * Floating pill that appears at the bottom of the map when the user
 * has an active pin. Shows a live countdown and a "Release" button.
 *
 * Behaviour:
 *   - Counts down from expiry time in real time (updates every second)
 *   - Progress bar drains from full → empty over 30 minutes
 *   - Pulses amber when < 5 minutes remain
 *   - Calls onExpired when the timer hits zero (Edge Function will have
 *     already cleaned up the pin; this just updates local UI state)
 *   - "I'm done" button calls onRelease immediately
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const THIRTY_MINUTES_MS = 30 * 60 * 1000

interface Props {
  washroomId: string
  expiresAt: string // ISO string
  onExpired: () => void
  onRelease: () => void
}

function formatMMSS(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function PinTimer({ washroomId, expiresAt, onExpired, onRelease }: Props) {
  const { profile } = useAuth()
  const [msRemaining, setMsRemaining] = useState<number>(0)
  const [releasing, setReleasing] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Countdown tick ────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now()
      if (remaining <= 0) {
        setMsRemaining(0)
        if (intervalRef.current) clearInterval(intervalRef.current)
        onExpired()
      } else {
        setMsRemaining(remaining)
      }
    }

    tick() // immediate first tick
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [expiresAt, onExpired])

  // ── Pulse animation when < 5 min ─────────────────────────────────────────
  useEffect(() => {
    if (msRemaining > 0 && msRemaining < 5 * 60 * 1000) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [msRemaining < 5 * 60 * 1000])

  // ── Release pin ───────────────────────────────────────────────────────────
  const handleRelease = useCallback(async () => {
    if (!profile || releasing) return
    setReleasing(true)

    await supabase
      .from('pins')
      .update({ released_at: new Date().toISOString() })
      .eq('user_id', profile.id)      // profile.id = public.users.id (internal UUID)
      .eq('washroom_id', washroomId)
      .is('released_at', null)        // only update active pins

    setReleasing(false)
    onRelease()
  }, [profile, releasing, washroomId, onRelease])

  const progressFraction = Math.max(0, Math.min(1, msRemaining / THIRTY_MINUTES_MS))
  const isUrgent = msRemaining > 0 && msRemaining < 5 * 60 * 1000
  const barColor = isUrgent ? '#E65100' : '#0D7EC4'

  return (
    <Animated.View style={[styles.container, { opacity: pulseAnim }]}>
      {/* Left: icon + label */}
      <View style={styles.left}>
        <View style={[styles.iconCircle, { backgroundColor: isUrgent ? '#E65100' : '#0D7EC4' }]}>
          <Ionicons name="navigate" size={14} color="#fff" />
        </View>
        <View>
          <Text style={styles.label}>Pinned washroom</Text>
          <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
            {formatMMSS(msRemaining)} remaining
          </Text>
        </View>
      </View>

      {/* Right: release button */}
      <TouchableOpacity
        style={styles.releaseBtn}
        onPress={handleRelease}
        disabled={releasing}
        activeOpacity={0.8}
      >
        <Text style={styles.releaseBtnText}>
          {releasing ? 'Releasing…' : "I'm done"}
        </Text>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            { width: `${progressFraction * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 106 : 80, // above tab bar
    left: 16,
    right: 16,
    backgroundColor: '#112240',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: 'hidden',
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 11, color: '#7BA7C2', marginBottom: 1 },
  countdown: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  countdownUrgent: { color: '#FF8F00' },
  releaseBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  releaseBtnText: { fontSize: 12, fontWeight: '600', color: '#A0C4D8' },

  // Progress bar
  progressTrack: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressBar: { height: 3, borderRadius: 3 },
})
