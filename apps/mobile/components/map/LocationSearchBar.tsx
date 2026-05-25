/**
 * components/map/LocationSearchBar.tsx
 *
 * Two-row search card at the top of the map:
 *   • Origin row   — defaults to "My Location" (GPS); tappable to override
 *   • Destination row — free-text search via Mapbox Geocoding API
 *
 * Selecting a result from either row flies the map to that coordinate.
 * A swap button exchanges the two values.
 */

import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeocodingFeature {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
  text: string
}

type ActiveField = 'origin' | 'destination' | null

interface Props {
  /** Called when the user picks a location for either field. */
  onSelectLocation: (coord: [number, number], placeName: string, field: ActiveField) => void
  /** User's GPS [lng, lat] — shown as default origin label. */
  userCoord?: [number, number] | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocationSearchBar({ onSelectLocation, userCoord }: Props) {
  const insets = useSafeAreaInsets()

  const [originText, setOriginText]           = useState('')
  const [destinationText, setDestinationText] = useState('')
  const [activeField, setActiveField]         = useState<ActiveField>(null)
  const [results, setResults]                 = useState<GeocodingFeature[]>([])
  const [loading, setLoading]                 = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const originRef      = useRef<TextInput>(null)
  const destinationRef = useRef<TextInput>(null)

  // ── Geocoding ────────────────────────────────────────────────────────────

  const search = useCallback(async (text: string) => {
    if (text.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const token   = process.env.EXPO_PUBLIC_MAPBOX_TOKEN!
      const encoded = encodeURIComponent(text)
      const prox    = userCoord ? `&proximity=${userCoord[0]},${userCoord[1]}` : ''
      const url     =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
        `?access_token=${token}&types=address,place,poi&limit=5${prox}`
      const res  = await fetch(url)
      const json = await res.json()
      setResults(json.features ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [userCoord])

  const scheduleSearch = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(text), 300)
  }, [search])

  // ── Field handlers ───────────────────────────────────────────────────────

  const handleOriginChange = useCallback((text: string) => {
    setOriginText(text)
    scheduleSearch(text)
  }, [scheduleSearch])

  const handleDestinationChange = useCallback((text: string) => {
    setDestinationText(text)
    scheduleSearch(text)
  }, [scheduleSearch])

  const handleSelect = useCallback((feature: GeocodingFeature) => {
    if (activeField === 'origin') {
      setOriginText(feature.text)
    } else {
      setDestinationText(feature.text)
    }
    setResults([])
    Keyboard.dismiss()
    onSelectLocation(feature.center, feature.place_name, activeField)
    setActiveField(null)
  }, [activeField, onSelectLocation])

  const handleSwap = useCallback(() => {
    setOriginText(prev => {
      setDestinationText(prev)
      return destinationText
    })
    setResults([])
  }, [destinationText])

  const clearField = useCallback((field: 'origin' | 'destination') => {
    if (field === 'origin')      setOriginText('')
    else                         setDestinationText('')
    setResults([])
  }, [])

  // ── Origin label ─────────────────────────────────────────────────────────

  const originPlaceholder = 'Current location'
  const originDisplayText = originText

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.wrapper, { top: insets.top + 12 }]}>

      {/* ── Origin row ──────────────────────────────────────────────────── */}
      <View style={styles.row}>
        {/* Blue dot = origin */}
        <View style={styles.dotOrigin} />

        <TextInput
          ref={originRef}
          style={styles.input}
          placeholder={originPlaceholder}
          placeholderTextColor="#999"
          value={originDisplayText}
          onChangeText={handleOriginChange}
          onFocus={() => { setActiveField('origin'); setResults([]) }}
          onBlur={() => { if (activeField === 'origin') setActiveField(null) }}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />

        {originText.length > 0 && (
          <TouchableOpacity onPress={() => clearField('origin')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Divider + swap ──────────────────────────────────────────────── */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <TouchableOpacity style={styles.swapBtn} onPress={handleSwap} activeOpacity={0.7}>
          <Ionicons name="swap-vertical" size={16} color="#0D7EC4" />
        </TouchableOpacity>
      </View>

      {/* ── Destination row ─────────────────────────────────────────────── */}
      <View style={styles.row}>
        {/* Red pin = destination */}
        <Ionicons name="location" size={16} color="#E53935" style={styles.pinIcon} />

        <TextInput
          ref={destinationRef}
          style={styles.input}
          placeholder="Where are you going?"
          placeholderTextColor="#999"
          value={destinationText}
          onChangeText={handleDestinationChange}
          onFocus={() => { setActiveField('destination'); setResults([]) }}
          onBlur={() => { if (activeField === 'destination') setActiveField(null) }}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />

        {loading && activeField === 'destination' && (
          <ActivityIndicator size="small" color="#0D7EC4" />
        )}
        {!loading && destinationText.length > 0 && (
          <TouchableOpacity onPress={() => clearField('destination')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Results dropdown ────────────────────────────────────────────── */}
      {results.length > 0 && (
        <FlatList
          style={styles.results}
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.resultItem,
                index === results.length - 1 && styles.resultItemLast,
              ]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={15} color="#0D7EC4" style={styles.resultIcon} />
              <View style={styles.resultText}>
                <Text style={styles.resultPrimary} numberOfLines={1}>{item.text}</Text>
                <Text style={styles.resultSecondary} numberOfLines={1}>
                  {item.place_name.replace(item.text + ', ', '')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },

  // ── Rows ────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    paddingVertical: Platform.OS === 'ios' ? 0 : 2,
    marginHorizontal: 8,
  },

  // ── Origin dot ──────────────────────────────────────────────────────────
  dotOrigin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D7EC4',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#0D7EC4',
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },

  // ── Destination pin ──────────────────────────────────────────────────────
  pinIcon: {
    // no extra margin — flex row handles spacing
  },

  // ── Divider + swap ───────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8e8e8',
    marginLeft: 18, // align with text inputs
  },
  swapBtn: {
    marginLeft: 8,
    padding: 4,
  },

  // ── Results ──────────────────────────────────────────────────────────────
  results: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5e5',
    maxHeight: 220,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  resultItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  resultIcon: {
    marginRight: 10,
  },
  resultText: {
    flex: 1,
  },
  resultPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  resultSecondary: {
    fontSize: 12,
    color: '#777',
    marginTop: 1,
  },
})
