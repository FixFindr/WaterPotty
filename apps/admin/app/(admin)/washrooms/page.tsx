/**
 * app/(admin)/washrooms/page.tsx
 *
 * Water Potty Admin — Washrooms Management
 *
 * Server Component: fetches data, renders table.
 * Client actions (status change, close) use Server Actions.
 *
 * Features:
 *   - Stats row: open / pinned / occupied / closed / pending counts
 *   - Filterable, searchable table with all washrooms
 *   - Inline: force status change, close/reopen, view flags count
 *   - Links to individual washroom detail page
 */

import { createServiceClient } from '../../../lib/supabase-server'
import {
  AdminTable, AdminTableHead, StatCard, SectionHeader,
  StatusBadge, EmptyState, WASHROOM_TYPE_LABELS, ConfirmDialog,
} from '../../../components/admin/AdminUI'
import { WashroomsFilters } from './WashroomsFilters'
import { WashroomActions } from './WashroomActions'
import Link from 'next/link'
import { AdminShell } from '../../../components/admin/AdminShell'

interface SearchParams { status?: string; q?: string }

export default async function WashroomsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const serverDb = createServiceClient()
  const { status: statusFilter, q: query } = searchParams

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [
    { count: openCount },
    { count: pendingCount },
    { count: closedCount },
    { count: totalCount },
  ] = await Promise.all([
    serverDb.from('washrooms').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    serverDb.from('washrooms').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification'),
    serverDb.from('washrooms').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
    serverDb.from('washrooms').select('id', { count: 'exact', head: true }),
  ])

  // ── Data ──────────────────────────────────────────────────────────────────
  let query_ = serverDb
    .from('washrooms')
    .select(`
      id, name, type, status, is_pay_to_use,
      last_cleanliness, verified, lat, lng,
      created_at, updated_at,
      creator:users!washrooms_created_by_fkey (
        id, anonymous_username
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (statusFilter && statusFilter !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query_ = query_.eq('status', statusFilter as any)
  }
  if (query) {
    query_ = query_.ilike('name', `%${query}%`)
  }

  const { data: washrooms = [] } = await query_

  // ── Flag counts per washroom ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const washroomIds = (washrooms ?? []).map((w: any) => w.id)
  const { data: flagAgg } = washroomIds.length
    ? await serverDb
        .from('flags')
        .select('washroom_id')
        .in('washroom_id', washroomIds)
        .eq('resolved', false)
    : { data: [] }

  const flagCounts: Record<string, number> = {}
  for (const row of flagAgg ?? []) {
    flagCounts[row.washroom_id] = (flagCounts[row.washroom_id] || 0) + 1
  }

  return (
    <AdminShell pageTitle="Washrooms">
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={totalCount ?? 0} />
          <StatCard label="Open" value={openCount ?? 0} accent />
          <StatCard label="Pending" value={pendingCount ?? 0} />
          <StatCard label="Closed" value={closedCount ?? 0} />
        </div>

        {/* Table */}
        <div>
          <SectionHeader title="Washrooms" count={washrooms?.length ?? 0}>
            <WashroomsFilters />
          </SectionHeader>

          {!washrooms?.length ? (
            <EmptyState
              icon="🚿"
              title="No washrooms match this filter"
              body="Try clearing the filters or searching a different term."
            />
          ) : (
            <AdminTable>
              <AdminTableHead>
                <th className="wp-table-head">Name</th>
                <th className="wp-table-head">Type</th>
                <th className="wp-table-head">Status</th>
                <th className="wp-table-head">Pay</th>
                <th className="wp-table-head">Cleanliness</th>
                <th className="wp-table-head">Flags</th>
                <th className="wp-table-head">Added by</th>
                <th className="wp-table-head">Created</th>
                <th className="wp-table-head w-10"></th>
              </AdminTableHead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(washrooms as any[]).map((w) => (
                  <tr key={w.id} className="wp-table-row">
                    <td className="wp-table-cell">
                      <Link
                        href={`/admin/washrooms/${w.id}`}
                        className="text-wp-ice hover:underline font-medium"
                      >
                        {w.name}
                      </Link>
                      <p className="text-[10px] text-wp-smoke font-mono mt-0.5">
                        {w.lat.toFixed(4)}, {w.lng.toFixed(4)}
                      </p>
                    </td>
                    <td className="wp-table-cell text-wp-fog text-xs">
                      {WASHROOM_TYPE_LABELS[w.type] || w.type}
                    </td>
                    <td className="wp-table-cell">
                      <StatusBadge value={w.status} />
                    </td>
                    <td className="wp-table-cell text-wp-fog text-xs">
                      {w.is_pay_to_use ? '🎀 Pay' : '♥ Free'}
                    </td>
                    <td className="wp-table-cell">
                      {w.last_cleanliness
                        ? <StatusBadge value={w.last_cleanliness} />
                        : <span className="text-wp-smoke text-xs">—</span>
                      }
                    </td>
                    <td className="wp-table-cell">
                      {flagCounts[w.id] ? (
                        <Link
                          href={`/admin/flags?washroom=${w.id}`}
                          className="inline-flex items-center gap-1 text-wp-red text-xs font-semibold hover:underline"
                        >
                          🚩 {flagCounts[w.id]}
                        </Link>
                      ) : (
                        <span className="text-wp-smoke text-xs">—</span>
                      )}
                    </td>
                    <td className="wp-table-cell text-wp-fog text-xs">
                      {(w.creator as any)?.anonymous_username || '—'}
                    </td>
                    <td className="wp-table-cell text-wp-smoke text-xs font-mono">
                      {new Date(w.created_at).toLocaleDateString('en-CA')}
                    </td>
                    <td className="wp-table-cell">
                      <WashroomActions washroom={w} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
