/**
 * app/(admin)/credits/page.tsx
 *
 * Water Potty Admin — Credit Ledger
 *
 * Append-only audit trail. Shows all credit events.
 * Admin can add a manual adjustment with a required note.
 */

import { createServiceClient } from '../../../lib/supabase-server'
import {
  AdminTable, AdminTableHead, StatCard, SectionHeader, EmptyState,
} from '../../../components/admin/AdminUI'
import { CreditAdjustmentDialog } from './CreditAdjustmentDialog'
import { AdminShell } from '../../../components/admin/AdminShell'

const REASON_LABELS: Record<string, string> = {
  washroom_verified:    '✅ Washroom verified',
  subscription_renewal: '🔄 Subscription renewal',
  subscription_partial: '💳 Partial renewal',
  manual_admin_adjust:  '🛠 Manual adjustment',
  bonus:                '🎁 Bonus',
}

interface SearchParams { user?: string }

export default async function CreditsPage({ searchParams }: { searchParams: SearchParams }) {
  const serverDb = createServiceClient()
  const userFilter = searchParams.user

  // Stats
  const { data: topEarners } = await serverDb
    .from('user_credit_balances')
    .select('user_id, credits')
    .order('credits', { ascending: false })
    .limit(1)

  const { count: totalEntries } = await serverDb
    .from('credit_ledger')
    .select('id', { count: 'exact', head: true })

  // Ledger
  let q = serverDb
    .from('credit_ledger')
    .select(`
      id, delta, reason, note, reference_id, created_at,
      user:users!credit_ledger_user_id_fkey ( id, anonymous_username )
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (userFilter) q = q.eq('user_id', userFilter)

  const { data: entries = [] } = await q

  // All users for the adjustment dialog
  const { data: allUsers = [] } = await serverDb
    .from('users')
    .select('id, anonymous_username')
    .eq('tier', 'subscriber')
    .order('anonymous_username')

  return (
    <AdminShell pageTitle="Credits">
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Ledger entries" value={totalEntries ?? 0} />
          <StatCard
            label="Top balance"
            value={topEarners?.[0]?.credits ?? 0}
            sub="credits"
            accent
          />
        </div>

        {/* Actions */}
        <SectionHeader title="Credit ledger" count={entries?.length ?? 0}>
          <CreditAdjustmentDialog users={allUsers ?? []} />
        </SectionHeader>

        {/* Filter notice */}
        {userFilter && (
          <div className="flex items-center gap-2 text-xs text-wp-amber border border-wp-amber/30 bg-wp-amber/5 rounded px-3 py-2">
            <span>Filtered by user ID</span>
            <a href="/admin/credits" className="underline text-wp-ice">Clear filter</a>
          </div>
        )}

        {/* Table */}
        {!entries?.length ? (
          <EmptyState icon="🪙" title="No credit entries" />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <th className="wp-table-head">User</th>
              <th className="wp-table-head">Delta</th>
              <th className="wp-table-head">Reason</th>
              <th className="wp-table-head">Note</th>
              <th className="wp-table-head">Date</th>
            </AdminTableHead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(entries as any[]).map((e) => (
                <tr key={e.id} className="wp-table-row">
                  <td className="wp-table-cell">
                    <a
                      href={`/admin/users/${e.user?.id}`}
                      className="text-wp-ice hover:underline text-sm"
                    >
                      {e.user?.anonymous_username || '—'}
                    </a>
                  </td>
                  <td className="wp-table-cell">
                    <span className={`text-base font-bold font-mono ${
                      e.delta > 0 ? 'text-wp-green' : 'text-wp-red'
                    }`}>
                      {e.delta > 0 ? `+${e.delta}` : e.delta}
                    </span>
                  </td>
                  <td className="wp-table-cell text-xs text-wp-fog">
                    {REASON_LABELS[e.reason] || e.reason}
                  </td>
                  <td className="wp-table-cell text-xs text-wp-fog max-w-[260px]">
                    <span className="line-clamp-2">{e.note || '—'}</span>
                  </td>
                  <td className="wp-table-cell text-xs text-wp-smoke font-mono">
                    {new Date(e.created_at).toLocaleDateString('en-CA')}{' '}
                    <span className="text-[10px]">
                      {new Date(e.created_at).toLocaleTimeString('en-CA', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </div>
    </AdminShell>
  )
}
