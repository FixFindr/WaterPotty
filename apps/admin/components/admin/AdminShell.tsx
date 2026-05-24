'use client'

/**
 * components/admin/AdminShell.tsx
 *
 * Sidebar + topbar layout shell for the Water Potty admin dashboard.
 * Wraps all (admin) pages.
 *
 * Design: control-room aesthetic — dark void background, ice-blue
 * accents, monospaced type, subtle scanline on header.
 * Navigation items show live badge counts fetched on mount.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseClient } from '../../lib/supabase-client'
import { cn } from '@/lib/utils'

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  {
    href:  '/admin/washrooms',
    label: 'Washrooms',
    icon:  '🚿',
    countQuery: null,
  },
  {
    href:  '/admin/flags',
    label: 'Flags',
    icon:  '🚩',
    countQuery: 'flags',      // table name → count unresolved
  },
  {
    href:  '/admin/verifications',
    label: 'Verifications',
    icon:  '✅',
    countQuery: 'verifications', // count pending
  },
  {
    href:  '/admin/users',
    label: 'Users',
    icon:  '👥',
    countQuery: null,
  },
  {
    href:  '/admin/credits',
    label: 'Credits',
    icon:  '🪙',
    countQuery: null,
  },
]

interface NavCounts {
  flags: number
  verifications: number
}

interface Props {
  children: React.ReactNode
  pageTitle?: string
  pageActions?: React.ReactNode
}

export function AdminShell({ children, pageTitle, pageActions }: Props) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = supabaseClient
  const [counts, setCounts]   = useState<NavCounts>({ flags: 0, verifications: 0 })
  const [username, setUsername] = useState<string>('')

  // ── Fetch badge counts ────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchCounts() {
      const [{ count: flagCount }, { count: verifyCount }] = await Promise.all([
        supabase.from('flags').select('id', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setCounts({ flags: flagCount ?? 0, verifications: verifyCount ?? 0 })
    }
    fetchCounts()
  }, [])

  // ── Fetch admin username ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase
        .from('users')
        .select('anonymous_username')
        .eq('auth_id', session.user.id)
        .single()
      if (data) setUsername(data.anonymous_username)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getBadge = (item: typeof NAV[0]) => {
    if (item.countQuery === 'flags') return counts.flags
    if (item.countQuery === 'verifications') return counts.verifications
    return 0
  }

  return (
    <div className="flex h-screen overflow-hidden bg-wp-void">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-wp-rim bg-wp-abyss">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-wp-rim">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-wp-iceDim flex items-center justify-center text-sm">
              💧
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-wp-ice uppercase">Water Potty</p>
              <p className="text-[10px] text-wp-smoke tracking-widest">ADMIN CONSOLE</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(item => {
            const badge = getBadge(item)
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-100',
                  active
                    ? 'bg-wp-surface text-wp-ice border border-wp-iceDim'
                    : 'text-wp-fog hover:bg-wp-surface hover:text-wp-mist'
                )}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span className="flex-1 tracking-wide">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-wp-red text-white text-[10px] font-bold flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-wp-rim space-y-3">
          {username && (
            <p className="text-[11px] text-wp-smoke truncate">
              <span className="text-wp-fog">Signed in as </span>
              {username}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="w-full text-left text-xs text-wp-smoke hover:text-wp-red transition-colors"
          >
            → Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-12 flex-shrink-0 flex items-center justify-between
                           px-6 border-b border-wp-rim bg-wp-abyss wp-scanline">
          <h1 className="text-sm font-bold tracking-widest text-wp-mist uppercase">
            {pageTitle || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-3">
            {pageActions}
            <span className="text-[11px] text-wp-smoke font-mono">
              {new Date().toLocaleDateString('en-CA', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
