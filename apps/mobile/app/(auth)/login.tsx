import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Dimensions,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../../lib/supabase'
import { Ionicons } from '@expo/vector-icons'

WebBrowser.maybeCompleteAuthSession()

const { width, height } = Dimensions.get('window')

// ─── Water drop decorative element (rendered via View shapes) ────────────────
function WaterDropAccent({ style }: { style?: object }) {
  return (
    <View style={[styles.dropContainer, style]}>
      <View style={styles.dropOval} />
      <View style={styles.dropTip} />
    </View>
  )
}

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  // Google OAuth setup
  const [_request, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  })

  // ── Magic link ────────────────────────────────────────────────────────────
  const handleMagicLink = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: 'waterpotty://auth/verify',
        shouldCreateUser: true,
      },
    })
    setLoading(false)
    if (error) {
      Alert.alert('Something went wrong', error.message)
    } else {
      setEmailSent(true)
    }
  }

  // ── Apple Sign In ─────────────────────────────────────────────────────────
  const handleAppleSignIn = async () => {
    setAppleLoading(true)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        })
        if (error) Alert.alert('Apple sign in failed', error.message)
        // RouteGuard in _layout.tsx handles redirect after session is set
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple sign in failed', e.message)
      }
    } finally {
      setAppleLoading(false)
    }
  }

  // ── Google Sign In ────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    const result = await promptGoogleAsync()
    if (result?.type === 'success') {
      const { id_token } = result.params
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
      })
      if (error) Alert.alert('Google sign in failed', error.message)
    }
  }

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A1628', '#112240', '#0D3B66']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />

      {/* Decorative water drop accents */}
      <WaterDropAccent style={{ position: 'absolute', top: -30, right: -20, opacity: 0.08, transform: [{ scale: 4 }] }} />
      <WaterDropAccent style={{ position: 'absolute', bottom: 120, left: -40, opacity: 0.05, transform: [{ scale: 5 }] }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoDropEmoji}>💧</Text>
          </View>
          <Text style={styles.appName}>Water Potty</Text>
          <Text style={styles.tagline}>Find your next stop — anonymously.</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          {emailSent ? (
            // ── Email sent state ──────────────────────────────────────────
            <View style={styles.sentContainer}>
              <View style={styles.sentIconCircle}>
                <Ionicons name="mail-outline" size={32} color="#4FC3F7" />
              </View>
              <Text style={styles.sentTitle}>Check your inbox</Text>
              <Text style={styles.sentBody}>
                We sent a sign-in link to{'\n'}
                <Text style={styles.sentEmail}>{email.trim().toLowerCase()}</Text>
              </Text>
              <Text style={styles.sentHint}>
                Tap the link in the email to continue. It expires in 1 hour.
              </Text>
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => setEmailSent(false)}
              >
                <Text style={styles.resendBtnText}>Use a different email</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Main login form ───────────────────────────────────────────
            <>
              <Text style={styles.cardTitle}>Sign in or create account</Text>
              <Text style={styles.cardSub}>No password needed. Your identity stays anonymous.</Text>

              {/* Email input */}
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color="#7BA7C2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#4A6880"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleMagicLink}
                />
              </View>

              {/* Magic link button */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleMagicLink}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="link-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Send magic link</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Apple Sign In — iOS only */}
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={12}
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                />
              )}

              {/* Google Sign In */}
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGoogleSignIn}
                activeOpacity={0.85}
              >
                {/* Google "G" logo as coloured text — no asset needed */}
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              <Text style={styles.legalNote}>
                By continuing you agree to our{' '}
                <Text style={styles.legalLink}>Privacy Policy</Text>
                {' '}and{' '}
                <Text style={styles.legalLink}>Terms of Use</Text>.
                {'\n'}Your email is never shown to other users.
              </Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1, justifyContent: 'flex-end', paddingBottom: 40 },

  // Water drop decorative
  dropContainer: { width: 40, height: 56, alignItems: 'center' },
  dropOval: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4FC3F7' },
  dropTip: {
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 20,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#4FC3F7',
    marginTop: -2,
    transform: [{ rotate: '180deg' }],
  },

  // Header
  header: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 24 },
  logoMark: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(79,195,247,0.15)',
    borderWidth: 1, borderColor: 'rgba(79,195,247,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoDropEmoji: { fontSize: 36 },
  appName: {
    fontSize: 34, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: -0.5, marginBottom: 6,
  },
  tagline: { fontSize: 15, color: '#7BA7C2', textAlign: 'center' },

  // Card
  card: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
  },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#7BA7C2', marginBottom: 20, lineHeight: 18 },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, height: 50, color: '#FFFFFF',
    fontSize: 15,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0D7EC4',
    borderRadius: 12, height: 50, marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  appleBtn: { width: '100%', height: 50, marginBottom: 10 },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, height: 50,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 16,
  },
  googleG: {
    fontSize: 18, fontWeight: '700',
    color: '#4285F4', marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  socialBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#4A6880', fontSize: 12, marginHorizontal: 12 },

  // Legal
  legalNote: { fontSize: 11, color: '#4A6880', textAlign: 'center', lineHeight: 16 },
  legalLink: { color: '#7BA7C2', textDecorationLine: 'underline' },

  // Email sent state
  sentContainer: { alignItems: 'center', paddingVertical: 8 },
  sentIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(79,195,247,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  sentTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  sentBody: { fontSize: 14, color: '#7BA7C2', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  sentEmail: { color: '#4FC3F7', fontWeight: '600' },
  sentHint: { fontSize: 12, color: '#4A6880', textAlign: 'center', lineHeight: 17, marginBottom: 24 },
  resendBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  resendBtnText: { color: '#4FC3F7', fontSize: 14, fontWeight: '500' },
})
