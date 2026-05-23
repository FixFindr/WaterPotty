import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../lib/supabase'
import { Ionicons } from '@expo/vector-icons'

/**
 * verify.tsx — Handles the magic link deep-link callback.
 *
 * Expo Linking sends the URL to this screen via the deep link scheme:
 *   waterpotty://auth/verify?token=xxx&type=magiclink
 *
 * In app.json, configure:
 *   "scheme": "waterpotty"
 *   "intentFilters": [{ "action": "VIEW", "data": [{ "scheme": "waterpotty" }] }]
 *
 * Supabase OTP verification uses the token_hash from the URL params.
 */
export default function VerifyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ token?: string; token_hash?: string; type?: string }>()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    verifyToken()
  }, [])

  const verifyToken = async () => {
    const token_hash = params.token_hash || params.token
    const type = (params.type as any) || 'magiclink'

    if (!token_hash) {
      setStatus('error')
      setErrorMessage('Invalid or expired link. Please request a new one.')
      return
    }

    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message || 'The link has expired. Please request a new one.')
    } else {
      setStatus('success')
      // Small delay so user sees success state, then RouteGuard takes over
      setTimeout(() => {
        router.replace('/(tabs)/')
      }, 1200)
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

      <View style={styles.center}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color="#4FC3F7" style={{ marginBottom: 20 }} />
            <Text style={styles.title}>Signing you in…</Text>
            <Text style={styles.sub}>Just a moment.</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#4FC3F7" />
            </View>
            <Text style={styles.title}>You're in!</Text>
            <Text style={styles.sub}>Taking you to the map…</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={[styles.iconCircle, styles.iconCircleError]}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF5350" />
            </View>
            <Text style={styles.title}>Link expired</Text>
            <Text style={styles.sub}>{errorMessage}</Text>
            <Text
              style={styles.backLink}
              onPress={() => router.replace('/(auth)/login')}
            >
              Back to sign in
            </Text>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(79,195,247,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  iconCircleError: { backgroundColor: 'rgba(239,83,80,0.12)' },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  sub: { fontSize: 14, color: '#7BA7C2', textAlign: 'center', lineHeight: 20 },
  backLink: {
    marginTop: 28, fontSize: 14, color: '#4FC3F7',
    textDecorationLine: 'underline', fontWeight: '500',
  },
})
