/**
 * components/map/LocationSearchBar.tsx
 *
 * Floating search bar overlay at the top of the map.
 * Uses the Mapbox Geocoding API to suggest places/addresses.
 * Calls onSelectLocation when the user taps a result.
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

interface Props {
  /** Called when user selects a place. coord is [lng, lat]. */
  onSelectLocation: (coord: [number, number], placeName: string) => void
  /** Optional user location to bias results toward. [lng, lat] */
  userCoord?: [number, number] | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocationSearchBar({ onSelectLocation, userCoord }: Props) {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (text: string) => {
    if (text.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN!
      const encoded = encodeURIComponent(text)
      const proximity = userCoord
        ? `&proximity=${userCoord[0]},${userCoord[1]}`
        : ''
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
        `?access_token=${token}&types=address,place,poi&limit=5${proximity}`

      const res = await fetch(url)
      const json = await res.json()
      setResults(json.features ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [userCoord])

  const handleChangeText = useCallback((text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(text), 300)
  }, [search])

  const handleSelect = useCallback((feature: GeocodingFeature) => {
    setQuery(feature.text)
    setResults([])
    Keyboard.dismiss()
    onSelectLocation(feature.center, feature.place_name)
  }, [onSelectLocation])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  return (
    <View style={[styles.wrapper, { top: insets.top + 12 }]}>
      {/* Search input row */}
      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search for a location…"
          placeholderTextColor="#999"
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />
        {loading && <ActivityIndicator size="small" color="#0D7EC4" style={styles.loader} />}
        {!loading && query.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results dropdown */}
      {results.length > 0 && (
        <FlatList
          style={styles.results}
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[styles.resultItem, index === results.length - 1 && styles.resultItemLast]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={16} color="#0D7EC4" style={styles.pinIcon} />
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
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    paddingVertical: Platform.OS === 'ios' ? 0 : 2,
  },
  loader: {
    marginLeft: 8,
  },
  results: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5e5',
    maxHeight: 240,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  resultItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  pinIcon: {
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
    color: '#666',
    marginTop: 1,
  },
})
