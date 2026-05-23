/**
 * components/map/MapView.tsx
 *
 * The core Water Potty map screen component.
 *
 * Responsibilities:
 *   - Renders a Mapbox GL map centred on the user's location
 *   - Loads washrooms from Supabase within a bounding box
 *   - Subscribes to Realtime changes on `pins` and `washrooms` tables
 *   - Renders a WashroomMarker for each washroom
 *   - Opens PinBottomSheet when a marker is tapped
 *   - Shows the active pin timer if the user has a pin
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { StyleSheet, View, Platform, ActivityIndicator, Text } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { WashroomMarker } from './WashroomMarker'
import { PinBottomSheet } from './PinBottomSheet'
import { PinTimer } from './PinTimer'
import type { WashroomForMarker } from '@water-potty/shared'
import { useAuth } from '../../contexts/AuthContext'

// Initialise Mapbox — token comes from env
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!)

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivePin {
  washroomId: string
  expiresAt: string // ISO string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ZOOM = 14
const VANCOUVER_COORDS: [number, number] = [-123.1207, 49.2827] // [lng, lat]
const FETCH_RADIUS_KM = 2 // load washrooms within 2km of map centre

// ─── Helpers ─────────────────────────────────────────────────────────────────

function kmToDegrees(km: number) {
  return km / 111 // rough approximation for bounding box
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WaterPottyMapView() {
  const { session, profile } = useAuth()

  const mapRef = useRef<MapboxGL.MapView>(null)
  const cameraRef = useRef<MapboxGL.Camera>(null)

  const [userCoords, setUserCoords] = useState<[number, number] | null>(null) // [lng, lat]
  const [washrooms, setWashrooms] = useState<WashroomForMarker[]>([])
  const [selectedWashroom, setSelectedWashroom] = useState<WashroomForMarker | null>(null)
  const [activePin, setActivePin] = useState<ActivePin | null>(null)
  const [locationGranted, setLocationGranted] = useState(false)
  const [loading, setLoading] = useState(true)

  // ── Location permission + initial position ────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLoading(false)
        return
      }
      setLocationGranted(true)

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const coords: [number, number] = [loc.coords.longitude, loc.coords.latitude]
      setUserCoords(coords)

      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        zoomLevel: DEFAULT_ZOOM,
        animationDuration: 800,
      })

      await loadWashrooms(coords)
      setLoading(false)
    })()
  }, [])

  // ── Load washrooms within bounding box ───────────────────────────────────
  const loadWashrooms = useCallback(async (centre: [number, number]) => {
    const [lng, lat] = centre
    const delta = kmToDegrees(FETCH_RADIUS_KM)

    const { data, error } = await supabase
      .from('washrooms')
      .select('id, name, type, status, is_pay_to_use, last_cleanliness, lat, lng')
      .neq('status', 'pending_verification')
      .gte('lat', lat - delta)
      .lte('lat', lat + delta)
      .gte('lng', lng - delta)
      .lte('lng', lng + delta)

    if (!error && data) {
      setWashrooms(data as WashroomForMarker[])
    }
  }, [])

  // ── Supabase Realtime: pins table ─────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('map-pins')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pins' },
        async (_payload) => {
          // Re-fetch washroom statuses when any pin changes
          if (userCoords) await loadWashrooms(userCoords)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userCoords, loadWashrooms])

  // ── Supabase Realtime: washrooms table (status + cleanliness) ─────────────
  useEffect(() => {
    const channel = supabase
      .channel('map-washrooms')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'washrooms',
          filter: 'status=neq.pending_verification',
        },
        (payload) => {
          // Patch the single updated washroom in state
          setWashrooms(prev =>
            prev.map(w =>
              w.id === payload.new.id
                ? { ...w, ...(payload.new as WashroomForMarker) }
                : w
            )
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Fetch user's active pin on mount ──────────────────────────────────────
  useEffect(() => {
    if (!session?.user.id) return

    supabase
      .from('pins')
      .select('washroom_id, expires_at')
      .eq('user_id', session.user.id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setActivePin({ washroomId: data.washroom_id, expiresAt: data.expires_at })
        }
      })
  }, [session?.user.id])

  // ── Marker tap ────────────────────────────────────────────────────────────
  const handleMarkerPress = useCallback((washroom: WashroomForMarker) => {
    setSelectedWashroom(washroom)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedWashroom(null)
  }, [])

  // ── Pin actions (called from PinBottomSheet) ──────────────────────────────
  const handlePinCreated = useCallback((washroomId: string, expiresAt: string) => {
    setActivePin({ washroomId, expiresAt })
  }, [])

  const handlePinReleased = useCallback(() => {
    setActivePin(null)
  }, [])

  // ── Map region change: reload washrooms for new area ─────────────────────
  const handleRegionDidChange = useCallback(async (feature: any) => {
    const [lng, lat] = feature.geometry.coordinates
    await loadWashrooms([lng, lat])
  }, [loadWashrooms])

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0D7EC4" />
        <Text style={styles.loaderText}>Finding washrooms near you…</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
        onRegionDidChange={handleRegionDidChange}
      >
        {/* Camera */}
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: userCoords || VANCOUVER_COORDS,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        {/* User location puck */}
        {locationGranted && (
          <MapboxGL.UserLocation
            visible
            showsUserHeadingIndicator
            androidRenderMode="compass"
          />
        )}

        {/* Washroom markers */}
        {washrooms.map(washroom => (
          <MapboxGL.MarkerView
            key={washroom.id}
            coordinate={[
              (washroom as any).lng,
              (washroom as any).lat,
            ]}
            anchor={{ x: 0.5, y: 1.0 }} // tip of pointer = coordinate
          >
            <WashroomMarker
              washroom={washroom}
              scale={selectedWashroom?.id === washroom.id ? 1.25 : 1.0}
              selected={selectedWashroom?.id === washroom.id}
              onPress={handleMarkerPress}
            />
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* Active pin countdown timer — floats above map */}
      {activePin && (
        <PinTimer
          washroomId={activePin.washroomId}
          expiresAt={activePin.expiresAt}
          onExpired={handlePinReleased}
          onRelease={handlePinReleased}
        />
      )}

      {/* Washroom detail bottom sheet */}
      {selectedWashroom && (
        <PinBottomSheet
          washroom={selectedWashroom}
          activePin={activePin}
          onClose={handleSheetClose}
          onPinCreated={handlePinCreated}
          onPinReleased={handlePinReleased}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1628',
    gap: 12,
  },
  loaderText: {
    color: '#7BA7C2',
    fontSize: 14,
  },
})
