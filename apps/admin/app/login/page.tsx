/**
 * app/login/page.tsx
 * Admin login — magic link only (no social sign-in for admin console).
 */
'use client'

import { useState } from 'react'
import { supabaseClient } from '../../lib/supabase-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email.includes('@')) { setError('Enter a valid email'); return }
    setLoading(true); setError('')
    const { error: err } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin/washrooms` },
    })
    setLoading(false)
    if (err) setError(err.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-wp-void flex items-center justify-center p-6">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{ backgroundImage: 'linear-gradient(#4FC3F7 1px, transparent 1px), linear-gradient(90deg, #4FC3F7 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-wp-iceDim/30 border border-wp-ice/20 mb-4">
            <span className="text-2xl">💧</span>
          </div>
          <p className="text-[11px] font-bold tracking-[0.3em] text-wp-smoke uppercase">
            Water Potty · Admin Console
          </p>
        </div>

        {/* Card */}
        <div className="bg-wp-depth border border-wp-rim rounded-xl p-8">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="text-3xl">📬</div>
              <p className="text-sm font-semibold text-wp-mist">Check your inbox</p>
              <p className="text-xs text-wp-fog">
                Magic link sent to <span className="text-wp-ice">{email}</span>
              </p>
              <button onClick={() => setSent(false)} className="text-xs text-wp-smoke hover:text-wp-fog underline mt-4">
                Use a different email
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-wp-smoke uppercase tracking-widest font-semibold mb-2">
                  Admin email
                </p>
                <Input
                  type="email"
                  placeholder="admin@fixfindr.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="bg-wp-surface border-wp-rim text-wp-mist placeholder:text-wp-smoke
                             focus-visible:ring-wp-ice font-mono"
                />
              </div>
              {error && <p className="text-xs text-wp-red font-mono">{error}</p>}
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-wp-ice text-wp-void hover:bg-sky-300 font-bold tracking-wide"
              >
                {loading ? 'Sending…' : 'Send magic link →'}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-wp-smoke mt-6">
          Admin access only · Water Potty / Trescommas Holdings
        </p>
      </div>
    </div>
  )
}
