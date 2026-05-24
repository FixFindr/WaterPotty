/**
 * components/washroom/AddWashroomModal.tsx
 *
 * Water Potty — Add Washroom Modal
 *
 * A 4-step bottom sheet that slides up from the map.
 * Triggered by long-pressing the map or tapping the "+" FAB.
 * Subscribers only — gate is enforced by useAddWashroom hook
 * and again at the Supabase RLS level.
 *
 * Step 0 — Location:    confirm the dropped pin (GPS or map press)
 * Step 1 — Details:     name, type picker, pay-to-use toggle
 * Step 2 — Condition:   optional initial cleanliness + note
 * Step 3 — Success:     confirmation, credit info, next steps
 *
 * Design: industrial utility — chunky toggle cards, monospaced
 * coordinate readout, progress track with step labels.
 * Feels like a field tool, not a consumer app.
 */

import React, { useCallback, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Animated, Dimensions, Platform,
  KeyboardAvoidingView, Switch, ActivityIndicator,
  Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAddWashroom, WashroomType } from '../../hooks/useAddWashroom'
import { useAuth } from '../../contexts/AuthContext'

const { height: SCREEN_H } = Dimensions.get('window')

// ─── Washroom type options ────────────────────────────────────────────────────

const WASHROOM_TYPES: Array<{
  key: WashroomType
  label: string
  emoji: string
  hint: string
}> = [
  { key: 'starbucks',     label: 'Starbucks',      emoji: '☕', hint: 'Customer washroom' },
  { key: 'mcdonalds',     label: "McDonald's",      emoji: '🍟', hint: 'Customer washroom' },
  { key: 'canadian_tire', label: 'Canadian Tire',   emoji: '🔧', hint: 'Customer / public' },
  { key: 'portable',      label: 'Portable Toilet', emoji: '🚧', hint: 'Job site or event' },
  { key: 'public',        label: 'Public Washroom', emoji: '🏛️', hint: 'Park, transit, plaza' },
  { key: 'other',         label: 'Other Retailer',  emoji: '🏪', hint: 'Any other business' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepTrack({ current, total }: { current: number; total: number }) {
  const steps = ['Location', 'Details', 'Condition', 'Done']
  return (
    <View style={st.track}>
      {steps.slice(0, total).map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={label}>
            <View style={st.trackStepCol}>
              <View style={[
                st.trackDot,
                done   && st.trackDotDone,
                active && st.trackDotActive,
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={10} color="#fff" />
                  : <Text style={[st.trackDotNum, active && st.trackDotNumActive]}>
                      {i + 1}
                    </Text>
                }
              </View>
              <Text style={[st.trackLabel, active && st.trackLabelActive]}>
                {label}
              </Text>
            </View>
            {i < steps.slice(0, total).length - 1 && (
              <View style={[st.trackLine, done && st.trackLineDone]} />
            )}
          </React.Fragment>
        )
      })}
    </View>
  )
}

function TypeCard({
  item, selected, onPress,
}: {
  item: typeof WASHROOM_TYPES[0]
  selected: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[st.typeCard, selected && st.typeCardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={st.typeEmoji}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[st.typeLabel, selected && st.typeLabelSelected]}>
          {item.label}
        </Text>
        <Text style={st.typeHint}>{item.hint}</Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" />
      )}
    </TouchableOpacity>
  )
}

function CleanlinessCard({
  value, selected, onPress,
}: {
  value: 'clean' | 'dirty'
  selected: boolean
  onPress: () => void
}) {
  const isClean = value === 'clean'
  return (
    <TouchableOpacity
      style={[
        st.cleanCard,
        selected && (isClean ? st.cleanCardClean : st.cleanCardDirty),
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={st.cleanEmoji}>{isClean ? '👍' : '👎'}</Text>
      <Text style={[st.cleanLabel, selected && st.cleanLabelSelected]}>
        {isClean ? 'Clean' : 'Dirty'}
      </Text>
      <Text style={st.cleanSub}>
        {isClean ? 'Looks good' : 'Needs attention'}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  /** Pre-filled coordinates from map long-press. Null = use GPS. */
  initialLat?: number
  initialLng?: number
  onClose: () => void
  onSuccess?: (washroomId: string) => void
}

export function AddWashroomModal({
  initialLat,
  initialLng,
  onClose,
  onSuccess,
}: Props) {
  const { profile } = useAuth()
  const wh = useAddWashroom()
  const translateY = useRef(new Animated.Value(SCREEN_H)).current

  // Pre-fill coordinates from map press
  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      wh.setLat(initialLat)
      wh.setLng(initialLng)
    }
  }, [initialLat, initialLng])

  // Auto-use GPS if no map-press coordinates
  useEffect(() => {
    if (initialLat == null && initialLng == null) {
      wh.useCurrentLocation()
    }
  }, [])

  // Slide in
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      tension: 60,
      friction: 12,
      useNativeDriver: true,
    }).start()
  }, [])

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      wh.reset()
      onClose()
    })
  }, [onClose])

  const handleSuccess = useCallback(() => {
    if (wh.submittedId && onSuccess) onSuccess(wh.submittedId)
    dismiss()
  }, [wh.submittedId, onSuccess, dismiss])

  // Subscriber gate
  if (profile?.tier !== 'subscriber') {
    return (
      <>
        <Pressable style={st.scrim} onPress={dismiss} />
        <Animated.View style={[st.sheet, { transform: [{ translateY }] }]}>
          <View style={st.handle} />
          <View style={st.gateContent}>
            <View style={st.gateIcon}>
              <Text style={{ fontSize: 36 }}>🔒</Text>
            </View>
            <Text style={st.gateTitle}>Subscribers only</Text>
            <Text style={st.gateSub}>
              Adding new washrooms is a subscriber feature. Upgrade for $10/year
              — or earn your way in by verifying 5 washrooms.
            </Text>
            <TouchableOpacity style={st.gateBtn} onPress={dismiss}>
              <Text style={st.gateBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </>
    )
  }

  // ── Step renderers ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (wh.step) {

      // ── Step 0: Location ────────────────────────────────────────────────────
      case 0: return (
        <View style={st.stepBody}>
          <Text style={st.stepTitle}>Pin the location</Text>
          <Text style={st.stepSub}>
            We've dropped a pin at your current position. Move it on the map
            or type coordinates manually.
          </Text>

          {/* Coordinate display */}
          <View style={st.coordBox}>
            <Ionicons name="location" size={16} color="#4FC3F7" style={{ marginRight: 8 }} />
            {wh.form.lat != null && wh.form.lng != null ? (
              <Text style={st.coordText}>
                {wh.form.lat.toFixed(5)}°N{'  '}{Math.abs(wh.form.lng).toFixed(5)}°W
              </Text>
            ) : (
              <Text style={st.coordPlaceholder}>No location set</Text>
            )}
            {wh.form.locationSource === 'gps' && (
              <View style={st.gpsBadge}>
                <Text style={st.gpsBadgeText}>GPS</Text>
              </View>
            )}
          </View>

          {/* GPS button */}
          <TouchableOpacity
            style={st.secondaryBtn}
            onPress={wh.useCurrentLocation}
            disabled={wh.loading}
          >
            {wh.loading
              ? <ActivityIndicator size="small" color="#4FC3F7" />
              : <>
                  <Ionicons name="navigate-outline" size={16} color="#4FC3F7" style={{ marginRight: 8 }} />
                  <Text style={st.secondaryBtnText}>Use my current location</Text>
                </>
            }
          </TouchableOpacity>

          {/* Map pin instruction */}
          <View style={st.hintBanner}>
            <Ionicons name="finger-print-outline" size={16} color="#7BA7C2" style={{ marginRight: 8 }} />
            <Text style={st.hintText}>
              You can also long-press anywhere on the map behind this sheet to move the pin.
            </Text>
          </View>
        </View>
      )

      // ── Step 1: Details ─────────────────────────────────────────────────────
      case 1: return (
        <View style={st.stepBody}>
          <Text style={st.stepTitle}>Washroom details</Text>
          <Text style={st.stepSub}>
            Give it a name the community will recognise.
          </Text>

          {/* Name input */}
          <Text style={st.fieldLabel}>Name</Text>
          <View style={st.inputRow}>
            <Ionicons name="business-outline" size={17} color="#7BA7C2" style={{ marginRight: 10 }} />
            <TextInput
              style={st.input}
              placeholder="e.g. Starbucks Gastown, Kits Beach WC"
              placeholderTextColor="#3D5A6E"
              value={wh.form.name}
              onChangeText={wh.setName}
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={60}
            />
          </View>
          {wh.form.name.length > 0 && wh.form.name.trim().length < 2 && (
            <Text style={st.fieldError}>Name must be at least 2 characters</Text>
          )}

          {/* Type picker */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Type</Text>
          <View style={st.typeGrid}>
            {WASHROOM_TYPES.map(item => (
              <TypeCard
                key={item.key}
                item={item}
                selected={wh.form.type === item.key}
                onPress={() => wh.setType(item.key)}
              />
            ))}
          </View>

          {/* Pay-to-use toggle */}
          <View style={st.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.toggleLabel}>Requires a purchase</Text>
              <Text style={st.toggleSub}>
                Must buy something to access the washroom
              </Text>
            </View>
            <Switch
              value={wh.form.isPayToUse}
              onValueChange={wh.setIsPayToUse}
              trackColor={{ false: '#1E3448', true: '#0D5FA0' }}
              thumbColor={wh.form.isPayToUse ? '#4FC3F7' : '#4A6880'}
            />
          </View>
        </View>
      )

      // ── Step 2: Condition ───────────────────────────────────────────────────
      case 2: return (
        <View style={st.stepBody}>
          <Text style={st.stepTitle}>Current condition</Text>
          <Text style={st.stepSub}>
            Optional — but your first rating helps future users immediately.
          </Text>

          <Text style={st.fieldLabel}>Cleanliness right now</Text>
          <View style={st.cleanRow}>
            <CleanlinessCard
              value="clean"
              selected={wh.form.cleanliness === 'clean'}
              onPress={() =>
                wh.setCleanliness(wh.form.cleanliness === 'clean' ? null : 'clean')
              }
            />
            <CleanlinessCard
              value="dirty"
              selected={wh.form.cleanliness === 'dirty'}
              onPress={() =>
                wh.setCleanliness(wh.form.cleanliness === 'dirty' ? null : 'dirty')
              }
            />
          </View>

          {/* Optional note */}
          <Text style={[st.fieldLabel, { marginTop: 20 }]}>
            Community tip{' '}
            <Text style={st.fieldLabelOptional}>(optional)</Text>
          </Text>
          <View style={st.noteBox}>
            <TextInput
              style={st.noteInput}
              placeholder="e.g. Code is 1234, use side entrance, always stocked with paper…"
              placeholderTextColor="#3D5A6E"
              value={wh.form.note}
              onChangeText={wh.setNote}
              multiline
              numberOfLines={3}
              maxLength={280}
              textAlignVertical="top"
            />
            <Text style={st.charCount}>{wh.form.note.length}/280</Text>
          </View>

          <View style={st.creditTeaser}>
            <Ionicons name="star" size={14} color="#FFB300" style={{ marginRight: 8 }} />
            <Text style={st.creditTeaserText}>
              Once a neighbour verifies this washroom, you'll earn{' '}
              <Text style={{ color: '#FFB300', fontWeight: '700' }}>+2 credits</Text>.
            </Text>
          </View>
        </View>
      )

      // ── Step 3: Success ─────────────────────────────────────────────────────
      case 3: return (
        <View style={[st.stepBody, st.successBody]}>
          <View style={st.successRing}>
            <View style={st.successIconCircle}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
          </View>
          <Text style={st.successTitle}>Washroom added!</Text>
          <Text style={st.successSub}>
            It's now waiting for peer verification. Once a nearby subscriber
            confirms it, your washroom goes live on the map and you earn{' '}
            <Text style={{ color: '#FFB300', fontWeight: '700' }}>+2 credits</Text>.
          </Text>

          <View style={st.successCards}>
            <View style={st.successCard}>
              <Ionicons name="eye-outline" size={18} color="#4FC3F7" style={{ marginBottom: 6 }} />
              <Text style={st.successCardTitle}>Visible to you</Text>
              <Text style={st.successCardSub}>
                The washroom appears on your map while awaiting verification.
              </Text>
            </View>
            <View style={st.successCard}>
              <Ionicons name="people-outline" size={18} color="#FFB300" style={{ marginBottom: 6 }} />
              <Text style={st.successCardTitle}>Goes live after 1 verify</Text>
              <Text style={st.successCardSub}>
                One nearby subscriber confirms it — then the community sees it.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={st.primaryBtn} onPress={handleSuccess}>
            <Text style={st.primaryBtnText}>Back to map</Text>
          </TouchableOpacity>
        </View>
      )

      default: return null
    }
  }

  const TOTAL_STEPS = 3 // steps 0–2 (step 3 is success, no track shown)

  return (
    <>
      <Pressable style={st.scrim} onPress={dismiss} />
      <Animated.View style={[st.sheet, { transform: [{ translateY }] }]}>
        <View style={st.handle} />

        {/* Header */}
        <View style={st.header}>
          <View>
            <Text style={st.headerTitle}>
              {wh.step === 3 ? 'Submitted' : 'Add a washroom'}
            </Text>
            {wh.step < 3 && (
              <Text style={st.headerSub}>Step {wh.step + 1} of {TOTAL_STEPS + 1}</Text>
            )}
          </View>
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#7BA7C2" />
          </TouchableOpacity>
        </View>

        {/* Step track */}
        {wh.step < 3 && (
          <StepTrack current={wh.step} total={TOTAL_STEPS + 1} />
        )}

        {/* Step content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer nav */}
        {wh.step < 3 && (
          <View style={st.footer}>
            {wh.step > 0 && (
              <TouchableOpacity
                style={st.backBtn}
                onPress={() => wh.goToStep(wh.step - 1)}
              >
                <Ionicons name="chevron-back" size={18} color="#7BA7C2" />
                <Text style={st.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            {wh.step < 2 ? (
              <TouchableOpacity
                style={[st.primaryBtn, !wh.canAdvance() && st.btnDisabled]}
                disabled={!wh.canAdvance()}
                onPress={() => wh.goToStep(wh.step + 1)}
              >
                <Text style={st.primaryBtnText}>Next</Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[st.primaryBtn, st.submitBtn, wh.submitting && st.btnDisabled]}
                disabled={wh.submitting}
                onPress={wh.submit}
              >
                {wh.submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="cloud-upload-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={st.primaryBtnText}>Submit washroom</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },

  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: SCREEN_H * 0.92,
    backgroundColor: '#0D1F35',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(79,195,247,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 10,
  },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#4A6880', marginTop: 2 },

  // Step track
  track: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  trackStepCol: { alignItems: 'center', gap: 4 },
  trackDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#1E3448',
    borderWidth: 1.5, borderColor: '#2A4A62',
    alignItems: 'center', justifyContent: 'center',
  },
  trackDotActive: { borderColor: '#4FC3F7', backgroundColor: '#0D5FA0' },
  trackDotDone: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  trackDotNum: { fontSize: 10, color: '#4A6880', fontWeight: '600' },
  trackDotNumActive: { color: '#4FC3F7' },
  trackLine: { flex: 1, height: 1.5, backgroundColor: '#1E3448', marginTop: 10, marginHorizontal: 4 },
  trackLineDone: { backgroundColor: '#2E7D32' },
  trackLabel: { fontSize: 9, color: '#3D5A6E', fontWeight: '500', letterSpacing: 0.3 },
  trackLabelActive: { color: '#4FC3F7' },

  // Step content
  stepBody: { paddingHorizontal: 20, paddingTop: 4 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  stepSub: { fontSize: 13, color: '#7BA7C2', lineHeight: 19, marginBottom: 20 },

  // Coordinate box
  coordBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A1628',
    borderRadius: 10, borderWidth: 1, borderColor: '#1E3448',
    padding: 14, marginBottom: 12,
  },
  coordText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 14, color: '#4FC3F7', letterSpacing: 0.5,
  },
  coordPlaceholder: {
    flex: 1, fontSize: 13, color: '#3D5A6E', fontStyle: 'italic',
  },
  gpsBadge: {
    backgroundColor: '#0D5FA0', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  gpsBadgeText: { fontSize: 10, fontWeight: '700', color: '#4FC3F7' },

  // Hint banner
  hintBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(79,195,247,0.06)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.12)',
    padding: 12, marginTop: 8,
  },
  hintText: { flex: 1, fontSize: 12, color: '#7BA7C2', lineHeight: 17 },

  // Inputs
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#7BA7C2', letterSpacing: 0.5, marginBottom: 8 },
  fieldLabelOptional: { fontWeight: '400', color: '#3D5A6E' },
  fieldError: { fontSize: 11, color: '#EF5350', marginTop: -4, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A1628',
    borderRadius: 12, borderWidth: 1, borderColor: '#1E3448',
    paddingHorizontal: 14, marginBottom: 4,
  },
  input: { flex: 1, height: 48, color: '#FFFFFF', fontSize: 14 },

  // Type grid
  typeGrid: { gap: 8, marginBottom: 16 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A1628',
    borderRadius: 12, borderWidth: 1, borderColor: '#1E3448',
    padding: 12, gap: 12,
  },
  typeCardSelected: { borderColor: '#4FC3F7', backgroundColor: 'rgba(79,195,247,0.07)' },
  typeEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  typeLabel: { fontSize: 14, fontWeight: '600', color: '#A0C4D8', marginBottom: 1 },
  typeLabelSelected: { color: '#4FC3F7' },
  typeHint: { fontSize: 11, color: '#3D5A6E' },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A1628',
    borderRadius: 12, borderWidth: 1, borderColor: '#1E3448',
    padding: 14, gap: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#A0C4D8', marginBottom: 2 },
  toggleSub: { fontSize: 11, color: '#3D5A6E' },

  // Cleanliness
  cleanRow: { flexDirection: 'row', gap: 10 },
  cleanCard: {
    flex: 1, alignItems: 'center', padding: 16,
    backgroundColor: '#0A1628',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#1E3448',
  },
  cleanCardClean: { borderColor: '#2E7D32', backgroundColor: 'rgba(46,125,50,0.08)' },
  cleanCardDirty: { borderColor: '#C62828', backgroundColor: 'rgba(198,40,40,0.08)' },
  cleanEmoji: { fontSize: 28, marginBottom: 6 },
  cleanLabel: { fontSize: 15, fontWeight: '700', color: '#A0C4D8', marginBottom: 2 },
  cleanLabelSelected: { color: '#FFFFFF' },
  cleanSub: { fontSize: 11, color: '#3D5A6E' },

  // Note
  noteBox: {
    backgroundColor: '#0A1628',
    borderRadius: 12, borderWidth: 1, borderColor: '#1E3448',
    padding: 14, marginBottom: 4,
  },
  noteInput: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, minHeight: 72 },
  charCount: { fontSize: 10, color: '#3D5A6E', textAlign: 'right', marginTop: 6 },

  // Credit teaser
  creditTeaser: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(255,179,0,0.07)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,179,0,0.18)',
    padding: 12, marginTop: 16,
  },
  creditTeaserText: { flex: 1, fontSize: 12, color: '#A0C4D8', lineHeight: 17 },

  // Success
  successBody: { alignItems: 'center', paddingTop: 16 },
  successRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, borderColor: 'rgba(46,125,50,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successIconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#2E7D32',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#7BA7C2', textAlign: 'center', lineHeight: 21, marginBottom: 24, paddingHorizontal: 8 },
  successCards: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 24 },
  successCard: {
    flex: 1, backgroundColor: '#0A1628',
    borderRadius: 12, borderWidth: 1, borderColor: '#1E3448',
    padding: 14,
  },
  successCardTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  successCardSub: { fontSize: 11, color: '#4A6880', lineHeight: 15 },

  // Buttons
  footer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderColor: '#1A2E42',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backBtnText: { color: '#7BA7C2', fontSize: 14, marginLeft: 2 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(79,195,247,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(79,195,247,0.2)',
    height: 46, marginBottom: 12,
  },
  secondaryBtnText: { color: '#4FC3F7', fontSize: 14, fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0D7EC4', borderRadius: 12, height: 46,
    paddingHorizontal: 20,
  },
  submitBtn: { backgroundColor: '#1B6B3A' },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Subscriber gate
  gateContent: { alignItems: 'center', padding: 28, paddingTop: 16 },
  gateIcon: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: 'rgba(79,195,247,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  gateTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  gateSub: { fontSize: 13, color: '#7BA7C2', textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  gateBtn: {
    backgroundColor: '#0D7EC4', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  gateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
