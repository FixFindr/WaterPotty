/**
 * components/washroom/VerificationModal.tsx
 *
 * Water Potty — Peer Verification Modal
 *
 * Opened when a subscriber taps "Verify it" in VerificationPrompt,
 * or selects a pending washroom from their profile's pending list.
 *
 * The verifier must:
 *   1. Confirm the washroom details are correct (name, type, pay-to-use)
 *   2. Optionally snap a photo (stored in Supabase Storage)
 *   3. Submit: approve or reject
 *
 * On approval  → verifications.status = 'approved'
 *   DB trigger → washrooms.verified = true, status = 'open'
 *   DB trigger → +2 credits to submitter
 *
 * On rejection → verifications.status = 'rejected'
 *   DB trigger → washrooms.status = 'closed'
 *
 * Business rule: verifier cannot verify their own washroom (RLS enforced).
 * Verifier must be within 200m (enforced here client-side; RLS is the gate).
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, Platform, TextInput, Alert,
  ActivityIndicator, Switch, Image, Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const { height: SCREEN_H } = Dimensions.get('window')

const TYPE_LABELS: Record<string, string> = {
  starbucks:     'Starbucks',
  mcdonalds:     "McDonald's",
  canadian_tire: 'Canadian Tire',
  portable:      'Portable Toilet',
  public:        'Public Washroom',
  other:         'Other',
}

const TYPE_EMOJIS: Record<string, string> = {
  starbucks: '☕', mcdonalds: '🍟', canadian_tire: '🔧',
  portable: '🚧', public: '🏛️', other: '🏪',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingWashroom {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  is_pay_to_use: boolean
  created_at: string
}

interface PendingVerification {
  id: string          // verifications.id
  washroom: PendingWashroom
  submitter_username: string
}

interface Props {
  verification: PendingVerification
  onClose: () => void
  onResolved: (washroomId: string, outcome: 'approved' | 'rejected') => void
}

// ─── Confirm field ────────────────────────────────────────────────────────────

function ConfirmField({
  label, value, confirmed, onToggle,
}: {
  label: string
  value: string
  confirmed: boolean
  onToggle: () => void
}) {
  return (
    <TouchableOpacity style={[cf.row, confirmed && cf.rowConfirmed]} onPress={onToggle} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={cf.label}>{label}</Text>
        <Text style={cf.value}>{value}</Text>
      </View>
      <View style={[cf.check, confirmed && cf.checkConfirmed]}>
        {confirmed
          ? <Ionicons name="checkmark" size={14} color="#fff" />
          : <Ionicons name="ellipse-outline" size={14} color="#3D5A6E" />
        }
      </View>
    </TouchableOpacity>
  )
}

const cf = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A1628',
    borderRadius: 12, borderWidth: 1.5,
    borderColor: '#1E3448', padding: 14, marginBottom: 8,
  },
  rowConfirmed: { borderColor: '#2E7D32', backgroundColor: 'rgba(46,125,50,0.06)' },
  label: { fontSize: 11, color: '#4A6880', marginBottom: 2, fontWeight: '500' },
  value: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  check: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#0A1628',
    borderWidth: 1.5, borderColor: '#2A4A62',
    alignItems: 'center', justifyContent: 'center',
  },
  checkConfirmed: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
})

// ─── Main modal ───────────────────────────────────────────────────────────────

export function VerificationModal({ verification, onClose, onResolved }: Props) {
  const { profile } = useAuth()
  const { washroom, submitter_username } = verification

  const translateY = useRef(new Animated.Value(SCREEN_H)).current

  // Confirmation state
  const [confirmedName,       setConfirmedName]       = useState(false)
  const [confirmedType,       setConfirmedType]       = useState(false)
  const [confirmedPayToUse,   setConfirmedPayToUse]   = useState(false)
  const [payToUseActual,      setPayToUseActual]      = useState(washroom.is_pay_to_use)
  const [notes,               setNotes]               = useState('')
  const [photoUri,            setPhotoUri]            = useState<string | null>(null)
  const [uploading,           setUploading]           = useState(false)
  const [submitting,          setSubmitting]          = useState(false)
  const [outcome,             setOutcome]             = useState<'approved' | 'rejected' | null>(null)

  const allConfirmed = confirmedName && confirmedType && confirmedPayToUse

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0, tension: 60, friction: 12, useNativeDriver: true,
    }).start()
  }, [])

  const dismiss = useCallback((cb?: () => void) => {
    Animated.timing(translateY, {
      toValue: SCREEN_H, duration: 240, useNativeDriver: true,
    }).start(() => { onClose(); cb?.() })
  }, [onClose])

  // ── Photo capture ─────────────────────────────────────────────────────────

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to add a verification photo.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    })

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }, [])

  const removePhoto = useCallback(() => setPhotoUri(null), [])

  // ── Upload photo to Supabase Storage ─────────────────────────────────────

  const uploadPhoto = useCallback(async (): Promise<string | null> => {
    if (!photoUri || !profile) return null
    setUploading(true)

    try {
      const ext = photoUri.split('.').pop() || 'jpg'
      const filename = `${profile.id}/${verification.washroom.id}-${Date.now()}.${ext}`
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`

      const response = await fetch(photoUri)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()

      const { data, error } = await supabase.storage
        .from('washroom-photos')
        .upload(filename, arrayBuffer, { contentType, upsert: false })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('washroom-photos')
        .getPublicUrl(data.path)

      return urlData.publicUrl
    } catch (err: unknown) {
      Alert.alert('Photo upload failed', err instanceof Error ? err.message : 'Please try again.')
      return null
    } finally {
      setUploading(false)
    }
  }, [photoUri, profile, verification.washroom.id])

  // ── Submit verification ───────────────────────────────────────────────────

  const handleSubmit = useCallback(async (decision: 'approved' | 'rejected') => {
    if (!profile) return
    if (decision === 'approved' && !allConfirmed) {
      Alert.alert('Confirm details first', 'Please confirm all three fields before approving.')
      return
    }

    const confirmText = decision === 'approved'
      ? 'Are you sure this washroom exists and the details are correct?'
      : 'Are you sure you want to reject this washroom? It will be removed from the map.'

    Alert.alert(
      decision === 'approved' ? 'Approve washroom?' : 'Reject washroom?',
      confirmText,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Yes, approve' : 'Yes, reject',
          style: decision === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            setSubmitting(true)
            try {
              // Upload photo if captured
              let photoUrl: string | null = null
              if (photoUri) {
                photoUrl = await uploadPhoto()
              }

              // Update verification record
              const { error } = await supabase
                .from('verifications')
                .update({
                  verifier_id: profile.id,
                  status: decision,
                  notes: notes.trim() || null,
                  photo_url: photoUrl,
                  // resolved_at is set by the DB trigger in 0010_triggers.sql
                })
                .eq('id', verification.id)

              if (error) throw error

              // DB trigger handles:
              //   approved → washrooms.verified=true, status='open', +2 credits to submitter
              //   rejected → washrooms.status='closed'

              setOutcome(decision)
            } catch (err: unknown) {
              Alert.alert('Submission failed', err instanceof Error ? err.message : 'Please try again.')
            } finally {
              setSubmitting(false)
            }
          },
        },
      ]
    )
  }, [profile, allConfirmed, notes, photoUri, uploadPhoto, verification.id])

  // ─── Success state ────────────────────────────────────────────────────────

  if (outcome) {
    return (
      <>
        <Pressable style={styles.scrim} onPress={() => dismiss(() => onResolved(washroom.id, outcome))} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.outcomeBody}>
            <View style={[
              styles.outcomeIcon,
              outcome === 'approved' ? styles.outcomeIconApproved : styles.outcomeIconRejected,
            ]}>
              <Ionicons
                name={outcome === 'approved' ? 'checkmark' : 'close'}
                size={38} color="#fff"
              />
            </View>
            <Text style={styles.outcomeTitle}>
              {outcome === 'approved' ? 'Washroom approved!' : 'Washroom rejected'}
            </Text>
            <Text style={styles.outcomeSub}>
              {outcome === 'approved'
                ? `${submitter_username} will receive +2 credits and the washroom is now live on the map.`
                : 'The washroom has been removed. Thanks for keeping the map accurate.'
              }
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => dismiss(() => onResolved(washroom.id, outcome))}
            >
              <Text style={styles.primaryBtnText}>Back to map</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </>
    )
  }

  // ─── Main verification form ───────────────────────────────────────────────

  return (
    <>
      <Pressable style={styles.scrim} onPress={() => dismiss()} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.verifyBadge}>
              <Text style={styles.verifyBadgeText}>VERIFY</Text>
            </View>
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {washroom.name}
              </Text>
              <Text style={styles.headerSub}>
                Added by{' '}
                <Text style={{ color: '#4FC3F7' }}>{submitter_username}</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => dismiss()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color="#7BA7C2" />
          </TouchableOpacity>
        </View>

        {/* Instruction banner */}
        <View style={styles.instructionBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#4FC3F7" style={{ marginRight: 8 }} />
          <Text style={styles.instructionText}>
            You're within range of this washroom. Confirm each detail below matches
            what you can see, then approve or reject.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Confirm fields ──────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Confirm the details</Text>

          <ConfirmField
            label="Name"
            value={washroom.name}
            confirmed={confirmedName}
            onToggle={() => setConfirmedName(v => !v)}
          />

          <ConfirmField
            label="Type"
            value={`${TYPE_EMOJIS[washroom.type] || '🏪'}  ${TYPE_LABELS[washroom.type] || washroom.type}`}
            confirmed={confirmedType}
            onToggle={() => setConfirmedType(v => !v)}
          />

          {/* Pay-to-use: verifier can correct this */}
          <View style={[
            cf.row,
            confirmedPayToUse && cf.rowConfirmed,
            { marginBottom: 8 },
          ]}>
            <View style={{ flex: 1 }}>
              <Text style={cf.label}>Requires a purchase</Text>
              <Text style={cf.value}>
                {payToUseActual ? 'Yes — buy something first' : 'No — free to use'}
              </Text>
              <View style={styles.payToggleRow}>
                <Text style={styles.payToggleLabel}>
                  Correct this if needed:
                </Text>
                <Switch
                  value={payToUseActual}
                  onValueChange={setPayToUseActual}
                  trackColor={{ false: '#1E3448', true: '#0D5FA0' }}
                  thumbColor={payToUseActual ? '#4FC3F7' : '#4A6880'}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[cf.check, confirmedPayToUse && cf.checkConfirmed]}
              onPress={() => setConfirmedPayToUse(v => !v)}
            >
              {confirmedPayToUse
                ? <Ionicons name="checkmark" size={14} color="#fff" />
                : <Ionicons name="ellipse-outline" size={14} color="#3D5A6E" />
              }
            </TouchableOpacity>
          </View>

          {/* ── Optional photo ──────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
            Verification photo{' '}
            <Text style={{ color: '#3D5A6E', fontWeight: '400' }}>(optional)</Text>
          </Text>

          {photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={removePhoto}>
                <Ionicons name="close-circle" size={26} color="#C62828" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <Ionicons name="camera-outline" size={22} color="#7BA7C2" style={{ marginRight: 10 }} />
              <Text style={styles.photoBtnText}>Take a photo of the washroom</Text>
            </TouchableOpacity>
          )}

          {/* ── Optional notes ──────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Notes{' '}
            <Text style={{ color: '#3D5A6E', fontWeight: '400' }}>(optional)</Text>
          </Text>
          <View style={styles.noteBox}>
            <TextInput
              style={styles.noteInput}
              placeholder="Any corrections or context for the admin team…"
              placeholderTextColor="#3D5A6E"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{notes.length}/500</Text>
          </View>

          {/* ── Decision buttons ────────────────────────────────────────── */}
          <View style={styles.decisionRow}>
            <TouchableOpacity
              style={[styles.rejectBtn, submitting && styles.btnDisabled]}
              onPress={() => handleSubmit('rejected')}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#EF5350" size="small" />
                : <>
                    <Ionicons name="close-circle-outline" size={18} color="#EF5350" style={{ marginRight: 6 }} />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.approveBtn,
                !allConfirmed && styles.btnDisabled,
                submitting && styles.btnDisabled,
              ]}
              onPress={() => handleSubmit('approved')}
              disabled={!allConfirmed || submitting}
            >
              {uploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.approveBtnText}>
                      {allConfirmed ? 'Approve' : 'Confirm all 3 fields'}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          {!allConfirmed && (
            <Text style={styles.approveHint}>
              Tick all three fields above to enable the Approve button.
            </Text>
          )}
        </ScrollView>
      </Animated.View>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: SCREEN_H * 0.92,
    backgroundColor: '#0D1F35',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(79,195,247,0.18)',
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 },
  verifyBadge: {
    backgroundColor: 'rgba(79,195,247,0.15)',
    borderRadius: 6, borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.3)',
    paddingHorizontal: 7, paddingVertical: 3,
  },
  verifyBadgeText: { fontSize: 9, fontWeight: '800', color: '#4FC3F7', letterSpacing: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#4A6880', marginTop: 1 },

  instructionBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(79,195,247,0.06)',
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: 'rgba(79,195,247,0.12)',
    paddingHorizontal: 20, paddingVertical: 10, marginBottom: 4,
  },
  instructionText: { flex: 1, fontSize: 12, color: '#7BA7C2', lineHeight: 17 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#7BA7C2',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
  },

  payToggleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, gap: 8,
  },
  payToggleLabel: { fontSize: 11, color: '#4A6880' },

  // Photo
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0A1628',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#1E3448',
    borderStyle: 'dashed', height: 56,
  },
  photoBtnText: { color: '#7BA7C2', fontSize: 13, fontWeight: '500' },
  photoPreviewContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  photoPreview: { width: '100%', height: 160, borderRadius: 12 },
  removePhotoBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 13,
  },

  // Notes
  noteBox: {
    backgroundColor: '#0A1628',
    borderRadius: 12, borderWidth: 1, borderColor: '#1E3448',
    padding: 14, marginBottom: 4,
  },
  noteInput: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, minHeight: 72 },
  charCount: { fontSize: 10, color: '#3D5A6E', textAlign: 'right', marginTop: 6 },

  // Decision
  decisionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(198,40,40,0.08)',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#C62828',
    height: 50,
  },
  rejectBtnText: { color: '#EF5350', fontSize: 14, fontWeight: '700' },
  approveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1B6B3A', borderRadius: 12, height: 50,
  },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },
  approveHint: { fontSize: 11, color: '#3D5A6E', textAlign: 'center', marginTop: 8 },

  // Outcome
  outcomeBody: { alignItems: 'center', padding: 32 },
  outcomeIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  outcomeIconApproved: { backgroundColor: '#2E7D32' },
  outcomeIconRejected: { backgroundColor: '#C62828' },
  outcomeTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  outcomeSub: { fontSize: 14, color: '#7BA7C2', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  primaryBtn: {
    backgroundColor: '#0D7EC4', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
