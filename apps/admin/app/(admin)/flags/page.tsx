/**
 * app/(admin)/flags/page.tsx
 *
 * Water Potty Admin — Flags Queue
 *
 * Shows all unresolved flags submitted by users reporting problems.
 * Admin can:
 *   - Close the washroom (marks flag resolved + sets washroom.status = 'closed')
 *   - Dismiss the flag (marks resolved, washroom unchanged)
 *   - Filter by reason or washroom
 */

import { createServiceClient } from '../../../lib/supabase-server'
import {
  AdminTable, AdminTableHead, StatCard, SectionHeader,
  StatusBadge, EmptyState, FLAG_REASON_LABELS, WASHROOM_TYPE_LABELS,
} from '../../../components/admin/AdminUI'
import { FlagActions } from './FlagActions'
import { AdminShell } from '../../../components/admin/AdminShell'
import Link from 'next/link'

interface SearchParams { reason?: string; resolved?: string; washroom?: string }

export default async function FlagsPage({ searchParams }: { searchParams: SearchParams }) {
  const serverDb = createServiceClient()
  const showResolved  = searchParams.resolved === 'true'
  const reasonFilter  = searchParams.reason
  const washroomFilter = searchParams.washroom

  // Stats
  const [{ count: unresolvedCount }, { count: resolvedCount }] = await Promise.all([
    serverDb.from('flags').select('id', { count: 'exact', head: true }).eq('resolved', false),
    serverDb.from('flags').select('id', { count: 'exact', head: true }).eq('resolved', true),
  ])

  // Data
  let q = serverDb
    .from('flags')
    .select(`
      id, reason, note, resolved, resolved_at, created_at,
      washroom:washrooms!flags_washroom_id_fkey ( id, name, type, status ),
      reporter:users!flags_user_id_fkey ( id, anonymous_username )
    `)
    .order('created_at', { ascending: false })
    .limit(300)

  q = q.eq('resolved', showResolved)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (reasonFilter)   q = q.eq('reason', reasonFilter as any)
  if (washroomFilter) q = q.eq('washroom_id', washroomFilter)

  const { data: flags = [] } = await q

  return (
    <AdminShell pageTitle="Flags Queue">
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Unresolved flags" value={unresolvedCount ?? 0} accent={!showResolved} />
          <StatCard label="Resolved flags"   value={resolvedCount ?? 0}  accent={showResolved} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-wp-smoke">Show:</span>
          {[
            { label: 'Unresolved', value: 'false' },
            { label: 'Resolved',   value: 'true'  },
          ].map(opt => (
            <Link
              key={opt.value}
              href={`?resolved=${opt.value}`}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold border transition-colors
                ${String(showResolved) === opt.value
                  ? 'bg-wp-ice text-wp-void border-wp-ice'
                  : 'bg-transparent text-wp-fog border-wp-rim hover:border-wp-ice hover:text-wp-ice'}`}
            >
              {opt.label}
            </Link>
          ))}
          <div className="w-px h-4 bg-wp-rim mx-1" />
          <span className="text-xs text-wp-smoke">Reason:</span>
          {Object.entries(FLAG_REASON_LABELS).map(([k, v]) => (
            <Link
              key={k}
              href={`?reason=${reasonFilter === k ? '' : k}&resolved=${showResolved}`}
              className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors
                ${reasonFilter === k
                  ? 'bg-wp-amber/20 text-wp-amber border-wp-amber'
                  : 'bg-transparent text-wp-fog border-wp-rim hover:border-wp-ice hover:text-wp-ice'}`}
            >
              {v}
            </Link>
          ))}
        </div>

        {/* Table */}
        <SectionHeader title={showResolved ? 'Resolved flags' : 'Open flags'} count={flags?.length ?? 0} />

        {!flags?.length ? (
          <EmptyState
            icon="🚩"
            title={showResolved ? 'No resolved flags' : 'Queue is clear'}
            body={showResolved ? 'No flags have been resolved yet.' : 'No unresolved flags — the community is keeping things clean.'}
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <th className="wp-table-head">Washroom</th>
              <th className="wp-table-head">Reason</th>
              <th className="wp-table-head">Note</th>
              <th className="wp-table-head">Reported by</th>
              <th className="wp-table-head">Reported</th>
              <th className="wp-table-head">Status</th>
              {!showResolved && <th className="wp-table-head w-28">Actions</th>}
            </AdminTableHead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(flags as any[]).map((f) => (
                <tr key={f.id} className="wp-table-row">
                  <td className="wp-table-cell">
                    <Link
                      href={`/admin/washrooms/${f.washroom?.id}`}
                      className="text-wp-ice hover:underline font-medium text-sm"
                    >
                      {f.washroom?.name || '—'}
                    </Link>
                    <p className="text-[10px] text-wp-smoke mt-0.5">
                      {WASHROOM_TYPE_LABELS[f.washroom?.type] || f.washroom?.type}
                    </p>
                    <StatusBadge value={f.washroom?.status} className="mt-1" />
                  </td>
                  <td className="wp-table-cell">
                    <span className="text-xs font-semibold text-wp-amber font-mono">
                      {FLAG_REASON_LABELS[f.reason] || f.reason}
                    </span>
                  </td>
                  <td className="wp-table-cell text-wp-fog text-xs max-w-[200px]">
                    {f.note
                      ? <span className="line-clamp-2" title={f.note}>{f.note}</span>
                      : <span className="text-wp-smoke">—</span>
                    }
                  </td>
                  <td className="wp-table-cell text-wp-fog text-xs">
                    {f.reporter?.anonymous_username || 'anonymous'}
                  </td>
                  <td className="wp-table-cell text-wp-smoke text-xs font-mono">
                    {new Date(f.created_at).toLocaleDateString('en-CA')}
                  </td>
                  <td className="wp-table-cell">
                    <StatusBadge value={f.resolved ? 'closed' : 'open'} />
                  </td>
                  {!showResolved && (
                    <td className="wp-table-cell">
                      <FlagActions flag={f} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </div>
    </AdminShell>
  )
}
