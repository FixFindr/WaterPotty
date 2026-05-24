/**
 * hooks/useWashrooms.ts
 *
 * Fetches washrooms within a lat/lng bounding box and subscribes to
 * Supabase Realtime for live status and cleanliness updates.
 *
 * Used by MapView.tsx — but extracted here so it can also be used by
 * route-mode views or list views without duplicating the Realtime logic.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { WashroomForMarker } from '@water-potty/shared'

interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

interface UseWashroomsResult {
  washrooms: WashroomForMarker[]
  loading: boolean
  error: string | null
  refetch: (bbox: BoundingBox) => Promise<void>
}

const KM_PER_DEGREE = 111

export function kmToBBoxDelta(km: number) {
  return km / KM_PER_DEGREE
}

export function coordsToBBox(
  lat: number,
  lng: number,
  radiusKm = 2
): BoundingBox {
  const delta = kmToBBoxDelta(radiusKm)
  return {
    minLat: lat - delta,
    maxLat: lat + delta,
    minLng: lng - delta,
    maxLng: lng + delta,
  }
}

export function useWashrooms(initialBBox?: BoundingBox): UseWashroomsResult {
  const [washrooms, setWashrooms] = useState<WashroomForMarker[]>([])
  const [loading, setLoading] = useState(!!initialBBox)
  const [error, setError] = useState<string | null>(null)
  const currentBBox = useRef<BoundingBox | undefined>(initialBBox)

  const fetchWashrooms = useCallback(async (bbox: BoundingBox) => {
    currentBBox.current = bbox
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('washrooms')
      .select('id, name, type, status, is_pay_to_use, last_cleanliness, lat, lng')
      .neq('status', 'pending_verification')
      .gte('lat', bbox.minLat)
      .lte('lat', bbox.maxLat)
      .gte('lng', bbox.minLng)
      .lte('lng', bbox.maxLng)

    setLoading(false)

    if (err) {
      setError(err.message)
    } else if (data) {
      setWashrooms(data as WashroomForMarker[])
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (initialBBox) fetchWashrooms(initialBBox)
  }, [])

  // Realtime: patch individual washroom on UPDATE
  useEffect(() => {
    const washroomChannel = supabase
      .channel('washrooms-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'washrooms' },
        (payload) => {
          const updated = payload.new as WashroomForMarker & { lat: number; lng: number }

          // Only update if it's within our current bounding box
          const bbox = currentBBox.current
          if (
            bbox &&
            updated.lat >= bbox.minLat && updated.lat <= bbox.maxLat &&
            updated.lng >= bbox.minLng && updated.lng <= bbox.maxLng
          ) {
            setWashrooms(prev =>
              prev.map(w => w.id === updated.id ? { ...w, ...updated } : w)
            )
          }
        }
      )
      .subscribe()

    // Realtime: on pin INSERT/DELETE, refetch the full list (status may have changed)
    const pinChannel = supabase
      .channel('pins-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pins' },
        async () => {
          if (currentBBox.current) {
            await fetchWashrooms(currentBBox.current)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(washroomChannel)
      supabase.removeChannel(pinChannel)
    }
  }, [fetchWashrooms])

  return {
    washrooms,
    loading,
    error,
    refetch: fetchWashrooms,
  }
}
