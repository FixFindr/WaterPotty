/**
 * hooks/useNearbyVerifications.ts
 *
 * Detects pending washrooms within 200m of the user's current position
 * and manages the verification prompt / modal state for the map screen.
 *
 * Polling: checks every 60 seconds and on significant location change (>50m).
 * This is intentionally NOT Realtime — push notification handles the
 * initial discovery; this hook confirms the user is still within range.
 *
 * Returns the nearest unverified washroom (if any) and controls to
 * show/dismiss the VerificationPrompt and open the VerificationModal.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const VERIFY_RADIUS_M = 200   // must be within 200m to verify
const POLL_INTERVAL_MS = 60_000
const LOCATION_THRESHOLD_M = 50  // re-check if user moves > 50m

// ── Haversine distance (metres) ───────────────────────────────────────────────
function distanceM(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface NearbyPendingWashroom {
  verificationId: string
  washroomId: string
  name: string
  type: string
  lat: number
  lng: number
  is_pay_to_use: boolean
  submitterId: string
  submitterUsername: string
  distanceM: number
  created_at: string
}

interface UseNearbyVerificationsResult {
  nearestPending: NearbyPendingWashroom | null
  showPrompt: boolean
  showModal: boolean
  dismissPrompt: () => void
  openModal: () => void
  closeModal: () => void
  handleResolved: (washroomId: string, outcome: 'approved' | 'rejected') => void
}

export function useNearbyVerifications(): UseNearbyVerificationsResult {
  const { profile } = useAuth()
  const [nearestPending, setNearestPending] = useState<NearbyPendingWashroom | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const lastPosition = useRef<{ lat: number; lng: number } | null>(null)
  const dismissedIds = useRef<Set<string>>(new Set()) // session-level dismiss memory
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Check for pending washrooms near current position ─────────────────────

  const checkNearby = useCallback(async (lat: number, lng: number) => {
    if (!profile || profile.tier !== 'subscriber') return

    // Fetch pending verifications where user is NOT the submitter
    // Include washroom location and submitter username
    const { data, error } = await supabase
      .from('verifications')
      .select(`
        id,
        washroom_id,
        submitter_id,
        washrooms (
          id, name, type, lat, lng, is_pay_to_use, created_at
        ),
        submitter:users!verifications_submitter_id_fkey (
          id, anonymous_username
        )
      `)
      .eq('status', 'pending')
      .neq('submitter_id', profile.id) // can't verify own washroom

    if (error || !data) return

    // Filter by distance and not previously dismissed this session
    const nearby: NearbyPendingWashroom[] = data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => {
        const w = row.washrooms
        if (!w) return null
        const d = distanceM(lat, lng, w.lat, w.lng)
        if (d > VERIFY_RADIUS_M) return null
        if (dismissedIds.current.has(row.id)) return null
        return {
          verificationId: row.id,
          washroomId: w.id,
          name: w.name,
          type: w.type,
          lat: w.lat,
          lng: w.lng,
          is_pay_to_use: w.is_pay_to_use,
          submitterId: row.submitter_id,
          submitterUsername: row.submitter?.anonymous_username || 'someone',
          distanceM: Math.round(d),
          created_at: w.created_at,
        } as NearbyPendingWashroom
      })
      .filter(Boolean) as NearbyPendingWashroom[]

    // Sort by distance — nearest first
    nearby.sort((a, b) => a.distanceM - b.distanceM)

    const nearest = nearby[0] ?? null

    // Only surface the prompt if we found something new
    if (nearest && nearest.verificationId !== nearestPending?.verificationId) {
      setNearestPending(nearest)
      setShowPrompt(true)
    } else if (!nearest) {
      setNearestPending(null)
      setShowPrompt(false)
    }
  }, [profile, nearestPending?.verificationId])

  // ── Location watcher ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!profile || profile.tier !== 'subscriber') return

    let locationSub: Location.LocationSubscription | null = null

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: LOCATION_THRESHOLD_M },
        (loc) => {
          const { latitude: lat, longitude: lng } = loc.coords
          lastPosition.current = { lat, lng }
          checkNearby(lat, lng)
        }
      )

      // Initial check
      const loc = await Location.getCurrentPositionAsync({})
      const { latitude: lat, longitude: lng } = loc.coords
      lastPosition.current = { lat, lng }
      checkNearby(lat, lng)
    })()

    // Polling fallback (catches newly added washrooms without a location move)
    pollRef.current = setInterval(() => {
      if (lastPosition.current) {
        checkNearby(lastPosition.current.lat, lastPosition.current.lng)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      locationSub?.remove()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [profile?.tier, checkNearby])

  // ── Controls ──────────────────────────────────────────────────────────────

  const dismissPrompt = useCallback(() => {
    if (nearestPending) {
      dismissedIds.current.add(nearestPending.verificationId)
    }
    setShowPrompt(false)
  }, [nearestPending])

  const openModal = useCallback(() => {
    setShowPrompt(false)
    setShowModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const handleResolved = useCallback((
    washroomId: string,
    outcome: 'approved' | 'rejected',
  ) => {
    setShowModal(false)
    setShowPrompt(false)
    // Remove from future checks this session
    if (nearestPending) {
      dismissedIds.current.add(nearestPending.verificationId)
    }
    setNearestPending(null)
    // Re-check position for next nearby pending washroom
    if (lastPosition.current) {
      setTimeout(() => {
        if (lastPosition.current) {
          checkNearby(lastPosition.current.lat, lastPosition.current.lng)
        }
      }, 1000)
    }
  }, [nearestPending, checkNearby])

  return {
    nearestPending,
    showPrompt,
    showModal,
    dismissPrompt,
    openModal,
    closeModal,
    handleResolved,
  }
}
