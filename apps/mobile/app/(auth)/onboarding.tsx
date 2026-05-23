import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  generateUsernameSuggestions,
  getUsernameError,
} from '../../lib/username'

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === current && styles.dotActive]}
        />
      ))}
    </View>
  )
}

// ─── Username suggestion pill ─────────────────────────────────────────────────
function SuggestionPill({
  username,
  selected,
  onPress,
}: {
  username: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.suggestionPill, selected && styles.suggestionPillSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.suggestionText, selected && styles.suggestionTextSelected]}>
        {username}
      </Text>
      {selected && (
        <Ionicons name="checkmark-circle" size={16} color="#4FC3F7" style={{ marginLeft: 6 }} />
      )}
    </TouchableOpacity>
  )
}

// ─── Tier comparison card ─────────────────────────────────────────────────────
function TierCard({
  title,
  price,
  features,
  highlighted,
  accent,
}: {
  title: string
  price: string
  features: string[]
  highlighted: boolean
  accent: string
}) {
  return (
    <View style={[styles.tierCard, highlighted && styles.tierCardHighlighted]}>
      {highlighted && (
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>Most popular</Text>
        </View>
      )}
      <Text style={[styles.tierTitle, { color: accent }]}>{title}</Text>
      <Text style={styles.tierPrice}>{price}</Text>
      <View style={styles.tierFeatures}>
        {features.map((f, i) => (
          <View key={i} style={styles.tierFeatureRow}>
            <Ionicons name="checkmark" size={14} color={accent} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.tierFeatureText}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
const TOTAL_STEPS = 3

export default function OnboardingScreen() {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)

  // Step 0: username
  const [suggestions] = useState(() => generateUsernameSuggestions(3))
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [customUsername, setCustomUsername] = useState('')
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slide animation
  const slideAnim = useRef(new Animated.Value(0)).current

  const animateToStep = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -30, duration: 120, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 30, duration: 0, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
    ]).start()
    setStep(nextStep)
  }

  // ── Derived username: suggestion takes priority over custom ───────────────
  const activeUsername = selectedSuggestion || customUsername.trim()
  const usernameError = activeUsername ? getUsernameError(activeUsername) : null

  // ── Check username availability (debounced) ────────────────────────────────
  useEffect(() => {
    if (selectedSuggestion) {
      setUsernameAvailable(null)
      return
    }
    if (!customUsername.trim() || getUsernameError(customUsername.trim())) {
      setUsernameAvailable(null)
      return
    }
    if (checkTimeout.current) clearTimeout(checkTimeout.current)
    setCheckingUsername(true)
    checkTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('anonymous_username', customUsername.trim())
        .maybeSingle()
      setUsernameAvailable(!data)
      setCheckingUsername(false)
    }, 600)
  }, [customUsername, selectedSuggestion])

  // ── Save username and create user profile ─────────────────────────────────
  const handleSaveUsername = async () => {
    if (!activeUsername || usernameError) return
    setSaving(true)

    // Check availability one final time for custom usernames
    if (!selectedSuggestion) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('anonymous_username', activeUsername)
        .maybeSingle()
      if (data) {
        Alert.alert('Username taken', 'That username is already in use. Please choose another.')
        setSaving(false)
        return
      }
    }

    // Upsert user profile (may already exist from a previous login)
    const { error } = await supabase.from('users').upsert({
      auth_id: user!.id,
      anonymous_username: activeUsername,
      tier: 'free',
      role: 'user',
    }, { onConflict: 'auth_id' })

    setSaving(false)
    if (error) {
      if (error.code === '23505') {
        Alert.alert('Username taken', 'That username is already in use. Please choose another.')
      } else {
        Alert.alert('Error', error.message)
      }
      return
    }

    await refreshProfile()
    animateToStep(1)
  }

  // ── Finish onboarding, go to map ──────────────────────────────────────────
  const handleFinish = async () => {
    await refreshProfile()
    router.replace('/(tabs)/')
  }

  // ─── Step content ────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Step 0: Choose username ─────────────────────────────────────────
      case 0:
        return (
          <View>
            <View style={styles.stepIcon}>
              <Text style={{ fontSize: 32 }}>🎭</Text>
            </View>
            <Text style={styles.stepTitle}>Pick your alias</Text>
            <Text style={styles.stepSub}>
              You're anonymous on Water Potty. Your username is all anyone ever sees.
            </Text>

            {/* Suggestions */}
            <Text style={styles.fieldLabel}>Quick picks</Text>
            <View style={styles.suggestionsRow}>
              {suggestions.map(s => (
                <SuggestionPill
                  key={s}
                  username={s}
                  selected={selectedSuggestion === s}
                  onPress={() => {
                    setSelectedSuggestion(selectedSuggestion === s ? null : s)
                    setCustomUsername('')
                  }}
                />
              ))}
            </View>

            {/* Custom username */}
            <Text style={styles.fieldLabel}>Or create your own</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color="#7BA7C2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="YourAliasHere"
                placeholderTextColor="#4A6880"
                value={customUsername}
                onChangeText={v => {
                  setCustomUsername(v)
                  setSelectedSuggestion(null)
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
              />
              {/* Availability indicator */}
              {!selectedSuggestion && customUsername.trim().length > 2 && (
                <View style={{ marginLeft: 8 }}>
                  {checkingUsername ? (
                    <ActivityIndicator size="small" color="#7BA7C2" />
                  ) : usernameAvailable === true ? (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : usernameAvailable === false ? (
                    <Ionicons name="close-circle" size={20} color="#EF5350" />
                  ) : null}
                </View>
              )}
            </View>

            {/* Validation error */}
            {usernameError && customUsername.trim().length > 0 && (
              <Text style={styles.errorText}>{usernameError}</Text>
            )}
            {usernameAvailable === false && !checkingUsername && (
              <Text style={styles.errorText}>That username is taken — try another</Text>
            )}

            <Text style={styles.hintText}>3–20 characters, letters, numbers, underscores only.</Text>

            {/* CTA */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!activeUsername || !!usernameError || saving ||
                  (!selectedSuggestion && usernameAvailable === false)) && styles.btnDisabled,
              ]}
              onPress={handleSaveUsername}
              disabled={!activeUsername || !!usernameError || saving ||
                (!selectedSuggestion && usernameAvailable === false)}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Set alias &amp; continue</Text>
              )}
            </TouchableOpacity>
          </View>
        )

      // ── Step 1: Tier explanation ────────────────────────────────────────
      case 1:
        return (
          <View>
            <View style={styles.stepIcon}>
              <Text style={{ fontSize: 32 }}>🪙</Text>
            </View>
            <Text style={styles.stepTitle}>How it works</Text>
            <Text style={styles.stepSub}>
              Water Potty runs on community contributions. You're starting on the free tier.
            </Text>

            <View style={styles.tierRow}>
              <TierCard
                title="Free"
                price="Always free"
                features={[
                  'View the full map',
                  'Pin a washroom',
                  '30-min timer',
                ]}
                highlighted={false}
                accent="#7BA7C2"
              />
              <TierCard
                title="Subscriber"
                price="$10 / year or 5 credits"
                features={[
                  'Rate cleanliness',
                  'Leave comments',
                  'Add new washrooms',
                  'Earn credits',
                ]}
                highlighted={true}
                accent="#4FC3F7"
              />
            </View>

            {/* Credits explainer */}
            <View style={styles.creditsBanner}>
              <Ionicons name="star-outline" size={20} color="#FFB300" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.creditsBannerTitle}>Earn your way in</Text>
                <Text style={styles.creditsBannerSub}>
                  Add 5 verified washrooms = a free year of subscriber access. Each verified washroom earns 2 credits.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => animateToStep(2)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Got it — next</Text>
            </TouchableOpacity>
          </View>
        )

      // ── Step 2: Map icon legend ─────────────────────────────────────────
      case 2:
        return (
          <View>
            <View style={styles.stepIcon}>
              <Text style={{ fontSize: 32 }}>🗺️</Text>
            </View>
            <Text style={styles.stepTitle}>Reading the map</Text>
            <Text style={styles.stepSub}>
              Every washroom pin tells you its status, type, and cleanliness at a glance.
            </Text>

            <View style={styles.legendContainer}>
              {/* Colour legend */}
              <Text style={styles.legendSection}>Colour = availability</Text>
              {[
                { color: '#2E7D32', bg: '#E8F5E9', label: 'Green', desc: 'Open — go ahead' },
                { color: '#F9A825', bg: '#FFF9C4', label: 'Yellow', desc: 'Someone is en route' },
                { color: '#C62828', bg: '#FFEBEE', label: 'Red', desc: 'Occupied right now' },
                { color: '#666', bg: '#F5F5F5', label: 'Grey', desc: 'Closed or unavailable' },
              ].map(row => (
                <View key={row.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: row.bg, borderColor: row.color }]}>
                    <View style={[styles.legendDotInner, { backgroundColor: row.color }]} />
                  </View>
                  <View>
                    <Text style={styles.legendLabel}>{row.label}</Text>
                    <Text style={styles.legendDesc}>{row.desc}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.legendDivider} />

              {/* Symbol legend */}
              <Text style={styles.legendSection}>Symbol = type &amp; cleanliness</Text>
              {[
                { symbol: '♥', label: 'Heart', desc: 'Free to use — no purchase required' },
                { symbol: '⊗', label: 'Bow-tie', desc: 'Pay to play — buy something first' },
                { symbol: '👍', label: 'Thumbs up', desc: 'Last user rated it clean' },
                { symbol: '👎', label: 'Thumbs down', desc: 'Last user rated it dirty' },
                { symbol: '?', label: 'Question mark', desc: 'No cleanliness rating yet' },
              ].map(row => (
                <View key={row.label} style={styles.legendRow}>
                  <View style={styles.legendSymbolBox}>
                    <Text style={styles.legendSymbol}>{row.symbol}</Text>
                  </View>
                  <View>
                    <Text style={styles.legendLabel}>{row.label}</Text>
                    <Text style={styles.legendDesc}>{row.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleFinish}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Let's find a washroom 💧</Text>
            </TouchableOpacity>
          </View>
        )

      default:
        return null
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0A1628', '#112240', '#0D3B66']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top nav */}
          <View style={styles.topBar}>
            {step > 0 && (
              <TouchableOpacity onPress={() => animateToStep(step - 1)} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color="#7BA7C2" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <StepDots current={step} total={TOTAL_STEPS} />
          </View>

          {/* Animated step content */}
          <Animated.View
            style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}
          >
            {renderStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 48 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backText: { color: '#7BA7C2', fontSize: 14, marginLeft: 2 },

  dots: { flexDirection: 'row', gap: 6, paddingRight: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 18, backgroundColor: '#4FC3F7' },

  stepContainer: { flex: 1, paddingTop: 16 },

  stepIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: 'rgba(79,195,247,0.12)',
    borderWidth: 1, borderColor: 'rgba(79,195,247,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  stepSub: { fontSize: 14, color: '#7BA7C2', lineHeight: 20, marginBottom: 24 },

  // Input
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#7BA7C2', marginBottom: 8, letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, marginBottom: 6,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: '#FFFFFF', fontSize: 15 },
  errorText: { fontSize: 12, color: '#EF5350', marginTop: 2, marginBottom: 4 },
  hintText: { fontSize: 11, color: '#4A6880', marginBottom: 20 },

  // Suggestions
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  suggestionPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 100, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  suggestionPillSelected: {
    borderColor: '#4FC3F7',
    backgroundColor: 'rgba(79,195,247,0.12)',
  },
  suggestionText: { color: '#A0C4D8', fontSize: 13, fontWeight: '500' },
  suggestionTextSelected: { color: '#4FC3F7' },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0D7EC4', borderRadius: 14, height: 52, marginTop: 8,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Tier cards
  tierRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tierCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, position: 'relative',
  },
  tierCardHighlighted: {
    borderColor: '#4FC3F7',
    backgroundColor: 'rgba(79,195,247,0.07)',
  },
  tierBadge: {
    position: 'absolute', top: -10, right: 10,
    backgroundColor: '#4FC3F7', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  tierBadgeText: { fontSize: 10, fontWeight: '700', color: '#0A1628' },
  tierTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  tierPrice: { fontSize: 11, color: '#4A6880', marginBottom: 10 },
  tierFeatures: { gap: 6 },
  tierFeatureRow: { flexDirection: 'row', alignItems: 'flex-start' },
  tierFeatureText: { fontSize: 12, color: '#A0C4D8', flex: 1, lineHeight: 16 },

  // Credits banner
  creditsBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(255,179,0,0.08)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,179,0,0.2)',
    padding: 14, marginBottom: 20,
  },
  creditsBannerTitle: { fontSize: 13, fontWeight: '600', color: '#FFB300', marginBottom: 2 },
  creditsBannerSub: { fontSize: 12, color: '#A0C4D8', lineHeight: 16 },

  // Map legend
  legendContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16, marginBottom: 20,
  },
  legendSection: {
    fontSize: 11, fontWeight: '600', color: '#7BA7C2',
    letterSpacing: 0.5, marginBottom: 10,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  legendDot: {
    width: 28, height: 28, borderRadius: 7,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  legendDotInner: { width: 10, height: 10, borderRadius: 5 },
  legendSymbolBox: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  legendSymbol: { fontSize: 14, color: '#FFFFFF' },
  legendLabel: { fontSize: 13, fontWeight: '600', color: '#E0EAF0' },
  legendDesc: { fontSize: 11, color: '#4A6880', lineHeight: 14 },
  legendDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
})
