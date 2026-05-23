/**
 * components/map/PinBottomSheet.tsx
 *
 * Bottom sheet that expands when a washroom marker is tapped.
 *
 * Shows:
 *   - Washroom name, type, distance
 *   - Visual status (colour + symbols, same as the marker)
 *   - Last cleanliness rating and any recent feedback note
 *   - Pin / Unpin CTA (authenticated users)
 *   - Feedback prompt (subscribers only, after pin released)
 *   - Flag button (report closed / incorrect)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, Dimensions, ActivityIndicator, Alert,
  ScrollView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { WashroomMarker } from './WashroomMarker'
import { WashroomForMarker, getMarkerConfig, FlagReason } from '@water-potty/shared'

const { height: SCREEN_H } = Dimensions.get('window')
const SHEET_MIN_H = 220
const SHEET_MAX_H = SCREEN_H * 0.65

const WASHROOM_TYPE_LABELS: Record<string, string> = {
  starbucks: 'Starbucks',
  mcdonalds: "McDonald's",
  canadian_tire: 'Canadian Tire',
  portable: 'Portable toilet',
  public: 'Public washroom',
  other: 'Other',
}

interface ActivePin {
  washroomId: string
  expiresAt: string
}

interface Props {
  washroom: WashroomForMarker & { lat?: number; lng?: number; type?: string }
  activePin: ActivePin | null
  onClose: () => void
  onPinCreated: (washroomId: string, expiresAt: string) => void
  onPinReleased: () => void
}

export function PinBottomSheet({
  washroom,
  activePin,
  onClose,
  onPinCreated,
  onPinReleased,
}: Props) {
  const { session, profile } = useAuth()
  const config = getMarkerConfig(washroom)

  const [pinLoading, setPinLoading] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [recentFeedback, setRecentFeedback] = useState<string | null>(null)

  const translateY = useRef(new Animated.Value(SCREEN_H)).current

  // Slide in on mount
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }, [])

  // Load most recent feedback note
  useEffect(() => {
    supabase
      .from('feedback')
      .select('cleanliness, note, created_at')
      .eq('washroom_id', washroom.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.note) setRecentFeedback(data.note)
      })
  }, [washroom.id])

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 220,
      useNativeDriver: true,
    }).start(onClose)
  }, [onClose])

  // Swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy)
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) {
          dismiss()
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
        }
      },
    })
  ).current

  // ── Pin this washroom ─────────────────────────────────────────────────────
  const handlePin = async () => {
    if (!session) {
      Alert.alert('Sign in required', 'You need an account to pin a washroom.')
      return
    }
    setPinLoading(true)

    // Release any existing pin first
    if (activePin) {
      await supabase.from('pins').delete().eq('user_id', session.user.id)
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const { error } = await supabase.from('pins').insert({
      user_id: session.user.id,
      washroom_id: washroom.id,
      expires_at: expiresAt,
    })

    setPinLoading(false)

    if (error) {
      Alert.alert('Could not pin washroom', error.message)
    } else {
      onPinCreated(washroom.id, expiresAt)
      dismiss()
    }
  }

  // ── Release pin ───────────────────────────────────────────────────────────
  const handleRelease = async () => {
    if (!session) return
    setPinLoading(true)

    await supabase
      .from('pins')
      .update({ released_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('washroom_id', washroom.id)

    setPinLoading(false)
    onPinReleased()

    if (profile?.tier === 'subscriber') {
      setShowFeedback(true)
    } else {
      dismiss()
    }
  }

  // ── Submit cleanliness feedback ───────────────────────────────────────────
  const handleFeedback = async (cleanliness: 'clean' | 'dirty') => {
    if (!session || profile?.tier !== 'subscriber') return
    setFeedbackSaving(true)

    await supabase.from('feedback').insert({
      user_id: session.user.id,
      washroom_id: washroom.id,
      cleanliness,
    })

    setFeedbackSaving(false)
    dismiss()
  }

  // ── Flag washroom ─────────────────────────────────────────────────────────
  const handleFlag = () => {
    Alert.alert(
      'Report washroom',
      'What would you like to report?',
      [
        { text: 'Permanently closed', onPress: () => submitFlag('closed_permanently') },
        { text: "Doesn't exist", onPress: () => submitFlag('doesnt_exist') },
        { text: 'Incorrect info', onPress: () => submitFlag('incorrect_info') },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  const submitFlag = async (reason: FlagReason) => {
    if (!session) return
    await supabase.from('flags').insert({
      washroom_id: washroom.id,
      user_id: session.user.id,
      reason,
    })
    Alert.alert('Thanks', 'Your report has been sent to our team.')
    dismiss()
  }

  const userOwnsActivePin = activePin?.washroomId === washroom.id
  const someoneElsePinned = activePin && !userOwnsActivePin
  const typeLabel = WASHROOM_TYPE_LABELS[(washroom as any).type] || 'Washroom'

  return (
    <>
      {/* Scrim */}
      <TouchableOpacity style={styles.scrim} onPress={dismiss} activeOpacity={1} />

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={styles.handle} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header row: mini marker + name + close */}
          <View style={styles.headerRow}>
            <WashroomMarker
              washroom={washroom}
              scale={0.8}
              hidePointer
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.washroomName} numberOfLines={1}>
                {washroom.name || typeLabel}
              </Text>
              <Text style={styles.washroomType}>{typeLabel}</Text>
            </View>
            <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#7BA7C2" />
            </TouchableOpacity>
          </View>

          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { borderColor: config.baseHex, backgroundColor: config.bgHex }]}>
              <Text style={[styles.statusPillText, { color: config.baseHex }]}>
                {config.statusLabel}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {washroom.is_pay_to_use ? '🎀 Pay to use' : '♥ Free'}
              </Text>
            </View>
            {washroom.last_cleanliness && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {washroom.last_cleanliness === 'clean' ? '👍 Clean' : '👎 Dirty'}
                </Text>
              </View>
            )}
          </View>

          {/* Recent feedback note */}
          {recentFeedback && (
            <View style={styles.feedbackNote}>
              <Ionicons name="chatbubble-outline" size={14} color="#7BA7C2" style={{ marginRight: 6 }} />
              <Text style={styles.feedbackNoteText} numberOfLines={2}>
                "{recentFeedback}"
              </Text>
            </View>
          )}

          {/* Feedback prompt (subscriber, after releasing pin) */}
          {showFeedback ? (
            <View style={styles.feedbackPrompt}>
              <Text style={styles.feedbackPromptTitle}>How was it?</Text>
              <View style={styles.feedbackBtns}>
                <TouchableOpacity
                  style={[styles.feedbackBtn, styles.feedbackClean]}
                  onPress={() => handleFeedback('clean')}
                  disabled={feedbackSaving}
                >
                  {feedbackSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.feedbackBtnText}>👍  Clean</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.feedbackBtn, styles.feedbackDirty]}
                  onPress={() => handleFeedback('dirty')}
                  disabled={feedbackSaving}
                >
                  <Text style={styles.feedbackBtnText}>👎  Dirty</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={dismiss} style={{ marginTop: 10 }}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Main CTA */}
              {config.interactive && (
                userOwnsActivePin ? (
                  <TouchableOpacity
                    style={[styles.ctaBtn, styles.ctaRelease]}
                    onPress={handleRelease}
                    disabled={pinLoading}
                  >
                    {pinLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <Ionicons name="flag-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.ctaBtnText}>I'm done — release pin</Text>
                        </>
                    }
                  </TouchableOpacity>
                ) : someoneElsePinned ? (
                  <View style={styles.ctaDisabled}>
                    <Ionicons name="time-outline" size={18} color="#7BA7C2" style={{ marginRight: 8 }} />
                    <Text style={styles.ctaDisabledText}>Someone is already heading here</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={handlePin}
                    disabled={pinLoading}
                  >
                    {pinLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <Ionicons name="navigate-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.ctaBtnText}>I'm heading here</Text>
                        </>
                    }
                  </TouchableOpacity>
                )
              )}

              {/* Subscriber upsell for feedback */}
              {!session && (
                <Text style={styles.upsellText}>
                  Sign in to pin washrooms and help the community.
                </Text>
              )}
              {session && profile?.tier === 'free' && (
                <Text style={styles.upsellText}>
                  Upgrade to subscriber to rate cleanliness and earn credits.
                </Text>
              )}

              {/* Flag */}
              <TouchableOpacity style={styles.flagBtn} onPress={handleFlag}>
                <Ionicons name="alert-circle-outline" size={15} color="#546E7A" style={{ marginRight: 6 }} />
                <Text style={styles.flagBtnText}>Report a problem</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    minHeight: SHEET_MIN_H,
    maxHeight: SHEET_MAX_H,
    backgroundColor: '#112240',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  content: { padding: 20, paddingTop: 8 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  washroomName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  washroomType: { fontSize: 12, color: '#7BA7C2' },

  // Status pills
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statusPillText: { fontSize: 12, color: '#A0C4D8', fontWeight: '500' },

  // Feedback note
  feedbackNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  feedbackNoteText: { flex: 1, fontSize: 12, color: '#7BA7C2', fontStyle: 'italic', lineHeight: 17 },

  // CTA buttons
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0D7EC4', borderRadius: 14, height: 50, marginBottom: 10,
  },
  ctaRelease: { backgroundColor: '#2E7D32' },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  ctaDisabled: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, height: 50, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  ctaDisabledText: { color: '#7BA7C2', fontSize: 14 },

  // Feedback prompt
  feedbackPrompt: { alignItems: 'center', paddingVertical: 8 },
  feedbackPromptTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  feedbackBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  feedbackBtn: {
    flex: 1, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  feedbackClean: { backgroundColor: '#2E7D32' },
  feedbackDirty: { backgroundColor: '#C62828' },
  feedbackBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  skipText: { color: '#4A6880', fontSize: 13 },

  // Upsell / flag
  upsellText: { fontSize: 12, color: '#4A6880', textAlign: 'center', marginBottom: 12, lineHeight: 17 },
  flagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  flagBtnText: { fontSize: 12, color: '#546E7A' },
})
