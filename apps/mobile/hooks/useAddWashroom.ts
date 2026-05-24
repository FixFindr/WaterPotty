/**
 * hooks/useAddWashroom.ts
 *
 * Manages all state and side effects for the Add Washroom flow.
 * Keeps AddWashroomModal clean — it only renders, this hook thinks.
 *
 * Flow:
 *   Step 0 — Location: confirm map pin position (auto-filled from GPS or map press)
 *   Step 1 — Details:  name, type, pay-to-use toggle
 *   Step 2 — Extras:   initial cleanliness rating, optional note
 *   Step 3 — Submit:   insert to Supabase, show success
 */

import { useState, useCallback } from 'react'
import * as Location from 'expo-location'
import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type WashroomType =
  | 'starbucks'
  | 'mcdonalds'
  | 'canadian_tire'
  | 'portable'
  | 'public'
  | 'other'

export interface AddWashroomForm {
  // Step 0
  lat: number | null
  lng: number | null
  locationSource: 'gps' | 'map_press' | null

  // Step 1
  name: string
  type: WashroomType | null
  isPayToUse: boolean

  // Step 2
  cleanliness: 'clean' | 'dirty' | null
  note: string
}

export interface UseAddWashroomResult {
  step: number
  form: AddWashroomForm
  loading: boolean
  submitting: boolean
  submittedId: string | null

  // Actions
  setLat: (lat: number) => void
  setLng: (lng: number) => void
  useCurrentLocation: () => Promise<void>
  setName: (name: string) => void
  setType: (type: WashroomType) => void
  setIsPayToUse: (v: boolean) => void
  setCleanliness: (v: 'clean' | 'dirty' | null) => void
  setNote: (v: string) => void
  goToStep: (step: number) => void
  canAdvance: () => boolean
  submit: () => Promise<void>
  reset: () => void
}

const INITIAL_FORM: AddWashroomForm = {
  lat: null,
  lng: null,
  locationSource: null,
  name: '',
  type: null,
  isPayToUse: false,
  cleanliness: null,
  note: '',
}

export function useAddWashroom(): UseAddWashroomResult {
  const { user, profile } = useAuth()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<AddWashroomForm>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const updateForm = useCallback(
    (patch: Partial<AddWashroomForm>) => setForm(prev => ({ ...prev, ...patch })),
    []
  )

  // ── Location ──────────────────────────────────────────────────────────────

  const useCurrentLocation = useCallback(async () => {
    setLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Location required',
          'Enable location access in Settings to pin a new washroom at your current position.'
        )
        return
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      updateForm({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        locationSource: 'gps',
      })
    } catch {
      Alert.alert('Location error', 'Could not get your current location. Try again.')
    } finally {
      setLoading(false)
    }
  }, [updateForm])

  // ── Step validation ───────────────────────────────────────────────────────

  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case 0: return form.lat !== null && form.lng !== null
      case 1: return form.name.trim().length >= 2 && form.type !== null
      case 2: return true // cleanliness and note are optional
      default: return false
    }
  }, [step, form])

  // ── Submit ────────────────────────────────────────────────────────────────

  const submit = useCallback(async () => {
    if (!user || !profile) return
    if (profile.tier !== 'subscriber') {
      Alert.alert(
        'Subscribers only',
        'Upgrade to a subscriber account to add new washrooms and earn credits.'
      )
      return
    }

    setSubmitting(true)

    try {
      // 1. Insert washroom (enters pending_verification)
      const { data: washroom, error: washroomError } = await supabase
        .from('washrooms')
        .insert({
          name: form.name.trim(),
          type: form.type!,
          lat: form.lat!,
          lng: form.lng!,
          is_pay_to_use: form.isPayToUse,
          status: 'pending_verification',
          last_cleanliness: form.cleanliness,
          verified: false,
          created_by: profile.id,
        })
        .select('id')
        .single()

      if (washroomError || !washroom) {
        throw new Error(washroomError?.message || 'Failed to create washroom')
      }

      // 2. Create verification record (submitter_id = self, verifier_id = null initially)
      const { error: verificationError } = await supabase
        .from('verifications')
        .insert({
          washroom_id: washroom.id,
          submitter_id: profile.id,
          status: 'pending',
        })

      if (verificationError) {
        // Don't fail hard — washroom is created, verification can be retried
        console.warn('Verification record creation failed:', verificationError.message)
      }

      // 3. Submit initial feedback note if provided
      if (form.note.trim() && form.cleanliness) {
        await supabase.from('feedback').insert({
          user_id: profile.id,
          washroom_id: washroom.id,
          cleanliness: form.cleanliness,
          note: form.note.trim(),
        })
      }

      setSubmittedId(washroom.id)
      setStep(3) // success step
    } catch (err: unknown) {
      Alert.alert(
        'Submission failed',
        err instanceof Error ? err.message : 'Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }, [user, profile, form])

  // ── Navigation ────────────────────────────────────────────────────────────

  const goToStep = useCallback((next: number) => {
    setStep(next)
  }, [])

  const reset = useCallback(() => {
    setStep(0)
    setForm(INITIAL_FORM)
    setSubmittedId(null)
    setSubmitting(false)
  }, [])

  return {
    step,
    form,
    loading,
    submitting,
    submittedId,
    setLat: (lat) => updateForm({ lat }),
    setLng: (lng) => updateForm({ lng }),
    useCurrentLocation,
    setName: (name) => updateForm({ name }),
    setType: (type) => updateForm({ type }),
    setIsPayToUse: (isPayToUse) => updateForm({ isPayToUse }),
    setCleanliness: (cleanliness) => updateForm({ cleanliness }),
    setNote: (note) => updateForm({ note }),
    goToStep,
    canAdvance,
    submit,
    reset,
  }
}
