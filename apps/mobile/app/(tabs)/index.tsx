/**
 * app/(tabs)/index.tsx
 *
 * Water Potty — Map Tab (root screen)
 *
 * Orchestrates all map-layer components:
 *   • WaterPottyMapView      — Mapbox map + markers + PinTimer
 *   • AddWashroomModal       — subscriber add-washroom flow (FAB / long press)
 *   • VerificationPrompt     — nearby pending washroom banner
 *   • VerificationModal      — peer verification form
 *
 * FAB (floating action button): "+" to add washroom.
 * Long-press on map: drops a pin at that coordinate and opens AddWashroomModal.
 */

import React, { useState, useCallback } from 'react'
import {
  View, StyleSheet, TouchableOpacity, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { WaterPottyMapView } from '../../components/map/MapView'
import { LocationSearchBar } from '../../components/map/LocationSearchBar'
import { AddWashroomModal } from '../../components/washroom/AddWashroomModal'
import { VerificationPrompt } from '../../components/washroom/VerificationPrompt'
import { VerificationModal } from '../../components/washroom/VerificationModal'
import { useNearbyVerifications } from '../../hooks/useNearbyVerifications'
import { useAuth } from '../../contexts/AuthContext'

export default function MapScreen() {
  const { profile } = useAuth()

  // Search / fly-to state
  const [flyToCoord, setFlyToCoord] = useState<[number, number] | null>(null)
  const [userCoord, setUserCoord] = useState<[number, number] | null>(null)

  // Add washroom state
  const [showAddModal, setShowAddModal] = useState(false)
  const [mapPressCoords, setMapPressCoords] = useState<{
    lat: number; lng: number
  } | null>(null)

  // Active pin state (passed to VerificationPrompt for positioning)
  const [hasActivePin, setHasActivePin] = useState(false)

  // Verification flow
  const {
    nearestPending,
    showPrompt,
    showModal: showVerifyModal,
    dismissPrompt,
    openModal: openVerifyModal,
    closeModal: closeVerifyModal,
    handleResolved,
  } = useNearbyVerifications()

  // ── Open Add modal ────────────────────────────────────────────────────────

  const handleFABPress = useCallback(() => {
    setMapPressCoords(null)   // use GPS
    setShowAddModal(true)
  }, [])

  const handleMapLongPress = useCallback((lat: number, lng: number) => {
    setMapPressCoords({ lat, lng })
    setShowAddModal(true)
  }, [])

  const handleAddClose = useCallback(() => {
    setShowAddModal(false)
    setMapPressCoords(null)
  }, [])

  const handleAddSuccess = useCallback((_washroomId: string) => {
    setShowAddModal(false)
    setMapPressCoords(null)
  }, [])

  return (
    <View style={styles.root}>
      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <WaterPottyMapView
        onLongPress={handleMapLongPress}
        onPinCreated={() => setHasActivePin(true)}
        onPinReleased={() => setHasActivePin(false)}
        flyToCoord={flyToCoord}
        onUserCoordReady={setUserCoord}
      />

      {/* ── Location search bar ─────────────────────────────────────────────── */}
      <LocationSearchBar
        userCoord={userCoord}
        onSelectLocation={(coord) => setFlyToCoord(coord)}
      />


      {/* ── FAB: Add Washroom ───────────────────────────────────────────────── */}
      {profile?.tier === 'subscriber' && (
        <TouchableOpacity
          style={[styles.fab, hasActivePin && styles.fabRaised]}
          onPress={handleFABPress}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Verification prompt (nearby pending washroom banner) ──────────── */}
      {showPrompt && nearestPending && !showAddModal && (
        <VerificationPrompt
          washroom={{
            id:        nearestPending.washroomId,
            name:      nearestPending.name,
            type:      nearestPending.type,
            distanceM: nearestPending.distanceM,
          }}
          hasActivePin={hasActivePin}
          onVerify={openVerifyModal}
          onSkip={dismissPrompt}
        />
      )}

      {/* ── Add Washroom modal ─────────────────────────────────────────────── */}
      {showAddModal && (
        <AddWashroomModal
          initialLat={mapPressCoords?.lat}
          initialLng={mapPressCoords?.lng}
          onClose={handleAddClose}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* ── Verification modal ─────────────────────────────────────────────── */}
      {showVerifyModal && nearestPending && (
        <VerificationModal
          verification={{
            id: nearestPending.verificationId,
            washroom: {
              id:           nearestPending.washroomId,
              name:         nearestPending.name,
              type:         nearestPending.type,
              lat:          nearestPending.lat,
              lng:          nearestPending.lng,
              is_pay_to_use: nearestPending.is_pay_to_use,
              created_at:   nearestPending.created_at,
            },
            submitter_username: nearestPending.submitterUsername,
          }}
          onClose={closeVerifyModal}
          onResolved={handleResolved}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 106 : 80, // above tab bar
    right: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#0D7EC4',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  // Push FAB up when PinTimer is visible (timer height ~62 + gap)
  fabRaised: {
    bottom: Platform.OS === 'ios' ? 178 : 152,
  },
})
