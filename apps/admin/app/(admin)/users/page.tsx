/**
 * app/(admin)/users/page.tsx
 *
 * Water Potty Admin — User Management
 *
 * Shows all users with tier, credits, subscription status.
 * Admin can: change tier, view credit history, suspend (future).
 */

import { createServiceClient } from '../../../lib/supabase-server'
import {
  AdminTable, AdminTableHead, StatCard, SectionHeader,
  StatusBadge, EmptyState,
} from '../../../components/admin/AdminUI'
import { UserActions } from './UserActions'
import { AdminShell } from '../../../components/admin/AdminShell'
import Link from 'next/link'

interface SearchParams { tier?: string; q?: string }

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const serverDb = createServiceClient()
  const { tier: tierFilter, q: query } = searchParams

  // Stats
  const [{ count: totalUsers }, { count: subCount }, { count: freeCount }] = await Promise.all([
    serverDb.from('users').select('id', { count: 'exact', head: true }),
    serverDb.from('users').select('id', { count: 'exact', head: true }).eq('tier', 'subscriber'),
    serverDb.from('users').select('id', { count: 'exact', head: true }).eq('tier', 'free'),
  ])

  // Users with credit balance via view
  let usersQuery = serverDb
    .from('users')
    .select('id, anonymous_username, email, tier, role, subscription_expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (tierFilter && tierFilter !== 'all') usersQuery = usersQuery.eq('tier', tierFilter as any)
  if (query) usersQuery = usersQuery.ilike('anonymous_username', `%${query}%`)

  const { data: users = [] } = await usersQuery

  // Fetch credit balances for returned users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = (users ?? []).map((u: any) => u.id)
  const { data: balances = [] } = userIds.length
    ? await serverDb
        .from('user_credit_balances')
        .select('user_id, credits')
        .in('user_id', userIds)
    : { data: [] }

  const creditMap: Record<string, number> = {}
  for (const b of balances ?? []) {
    if (b.user_id != null) creditMap[b.user_id] = b.credits ?? 0
  }

  return (
    <AdminShell pageTitle="Users">
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total users"   value={totalUsers ?? 0} />
          <StatCard label="Subscribers"   value={subCount ?? 0}   accent />
          <StatCard label="Free tier"     value={freeCount ?? 0} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <input
            placeholder="Search username…"
            defaultValue={query}
            className="h-8 w-48 bg-wp-surface border border-wp-rim rounded px-3 text-wp-mist text-xs
                       placeholder:text-wp-smoke focus:outline-none focus:border-wp-ice"
            // Note: wrap in a form or use client component for live search
            // Shown as static for Server Component simplicity
          />
          <div className="flex items-center gap-1">
            {[
              { value: 'all',        label: 'All' },
              { value: 'subscriber', label: 'Subscribers' },
              { value: 'free',       label: 'Free' },
            ].map(opt => (
              <Link
                key={opt.value}
                href={`?tier=${opt.value}`}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold border transition-colors
                  ${(tierFilter || 'all') === opt.value
                    ? 'bg-wp-ice text-wp-void border-wp-ice'
                    : 'bg-transparent text-wp-fog border-wp-rim hover:border-wp-ice hover:text-wp-ice'}`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Table */}
        <SectionHeader title="Users" count={users?.length ?? 0} />

        {!users?.length ? (
          <EmptyState icon="👥" title="No users found" />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <th className="wp-table-head">Username</th>
              <th className="wp-table-head">Email</th>
              <th className="wp-table-head">Tier</th>
              <th className="wp-table-head">Role</th>
              <th className="wp-table-head">Credits</th>
              <th className="wp-table-head">Sub expires</th>
              <th className="wp-table-head">Joined</th>
              <th className="wp-table-head w-10"></th>
            </AdminTableHead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(users as any[]).map((u) => {
                const credits = creditMap[u.id] ?? 0
                const subExpired = u.subscription_expires_at
                  && new Date(u.subscription_expires_at) < new Date()

                return (
                  <tr key={u.id} className="wp-table-row">
                    <td className="wp-table-cell">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-wp-ice hover:underline font-semibold"
                      >
                        {u.anonymous_username}
                      </Link>
                    </td>
                    <td className="wp-table-cell text-wp-fog text-xs font-mono">
                      {u.email || '—'}
                    </td>
                    <td className="wp-table-cell">
                      <StatusBadge value={u.tier} />
                    </td>
                    <td className="wp-table-cell">
                      {u.role === 'admin'
                        ? <span className="text-[11px] font-bold text-wp-gold font-mono">ADMIN</span>
                        : <span className="text-wp-smoke text-xs">user</span>
                      }
                    </td>
                    <td className="wp-table-cell">
                      <span className={`text-sm font-bold font-mono ${
                        credits >= 5 ? 'text-wp-gold' :
                        credits > 0  ? 'text-wp-amber' : 'text-wp-smoke'
                      }`}>
                        {credits}
                      </span>
                    </td>
                    <td className="wp-table-cell text-xs font-mono">
                      {u.subscription_expires_at
                        ? <span className={subExpired ? 'text-wp-red' : 'text-wp-green'}>
                            {new Date(u.subscription_expires_at).toLocaleDateString('en-CA')}
                            {subExpired && ' ⚠'}
                          </span>
                        : <span className="text-wp-smoke">—</span>
                      }
                    </td>
                    <td className="wp-table-cell text-wp-smoke text-xs font-mono">
                      {new Date(u.created_at).toLocaleDateString('en-CA')}
                    </td>
                    <td className="wp-table-cell">
                      <UserActions user={u} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </AdminTable>
        )}
      </div>
    </AdminShell>
  )
}
