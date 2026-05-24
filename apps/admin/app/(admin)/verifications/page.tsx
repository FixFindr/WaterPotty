/**
 * app/(admin)/verifications/page.tsx
 *
 * Water Potty Admin — Verifications Queue
 *
 * Shows pending washroom verifications.
 * Admins can approve or reject without needing to be physically nearby.
 */

import { createServiceClient } from '../../../lib/supabase-server'
import {
  AdminTable, AdminTableHead, StatCard, SectionHeader,
  StatusBadge, EmptyState, WASHROOM_TYPE_LABELS,
} from '../../../components/admin/AdminUI'
import { VerificationActions } from './VerificationActions'
import { AdminShell } from '../../../components/admin/AdminShell'
import Link from 'next/link'

interface SearchParams { status?: string }

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const serverDb = createServiceClient()
  const statusFilter = searchParams.status || 'pending'

  const [{ count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] =
    await Promise.all([
      serverDb.from('verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      serverDb.from('verifications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      serverDb.from('verifications').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    ])

  const { data: verifications = [] } = await serverDb
    .from('verifications')
    .select(`
      id, status, notes, photo_url, created_at, resolved_at,
      washroom:washrooms!verifications_washroom_id_fkey (
        id, name, type, lat, lng, is_pay_to_use
      ),
      submitter:users!verifications_submitter_id_fkey (
        id, anonymous_username
      ),
      verifier:users!verifications_verifier_id_fkey (
        id, anonymous_username
      )
    `)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('status', statusFilter as any)
    .order('created_at', { ascending: true })
    .limit(200)

  return (
    <AdminShell pageTitle="Verifications">
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Pending"  value={pendingCount ?? 0}  accent={statusFilter === 'pending'} />
          <StatCard label="Approved" value={approvedCount ?? 0} accent={statusFilter === 'approved'} />
          <StatCard label="Rejected" value={rejectedCount ?? 0} />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          {['pending', 'approved', 'rejected'].map(s => (
            <Link
              key={s}
              href={`?status=${s}`}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold border capitalize transition-colors
                ${statusFilter === s
                  ? 'bg-wp-ice text-wp-void border-wp-ice'
                  : 'bg-transparent text-wp-fog border-wp-rim hover:border-wp-ice hover:text-wp-ice'}`}
            >
              {s}
            </Link>
          ))}
        </div>

        {/* Table */}
        <SectionHeader title={`${statusFilter} verifications`} count={verifications?.length ?? 0} />

        {!verifications?.length ? (
          <EmptyState
            icon="✅"
            title={statusFilter === 'pending' ? 'Verification queue is empty' : `No ${statusFilter} verifications`}
            body={statusFilter === 'pending' ? 'No washrooms are awaiting peer review.' : undefined}
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <th className="wp-table-head">Washroom</th>
              <th className="wp-table-head">Type</th>
              <th className="wp-table-head">Submitted by</th>
              <th className="wp-table-head">Photo</th>
              <th className="wp-table-head">Notes</th>
              <th className="wp-table-head">Submitted</th>
              {statusFilter !== 'pending' && <th className="wp-table-head">Resolved</th>}
              {statusFilter === 'pending' && <th className="wp-table-head w-40">Actions</th>}
            </AdminTableHead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(verifications as any[]).map((v) => (
                <tr key={v.id} className="wp-table-row">
                  <td className="wp-table-cell">
                    <Link
                      href={`/admin/washrooms/${v.washroom?.id}`}
                      className="text-wp-ice hover:underline font-medium"
                    >
                      {v.washroom?.name || '—'}
                    </Link>
                    <p className="text-[10px] text-wp-smoke font-mono mt-0.5">
                      {v.washroom?.lat?.toFixed(4)}, {v.washroom?.lng?.toFixed(4)}
                    </p>
                  </td>
                  <td className="wp-table-cell text-wp-fog text-xs">
                    {WASHROOM_TYPE_LABELS[v.washroom?.type] || v.washroom?.type}
                  </td>
                  <td className="wp-table-cell text-wp-fog text-xs">
                    {v.submitter?.anonymous_username || '—'}
                  </td>
                  <td className="wp-table-cell">
                    {v.photo_url
                      ? <a href={v.photo_url} target="_blank" rel="noopener noreferrer"
                           className="text-wp-ice text-xs hover:underline">View →</a>
                      : <span className="text-wp-smoke text-xs">—</span>
                    }
                  </td>
                  <td className="wp-table-cell text-wp-fog text-xs max-w-[180px]">
                    {v.notes
                      ? <span className="line-clamp-2" title={v.notes}>{v.notes}</span>
                      : <span className="text-wp-smoke">—</span>
                    }
                  </td>
                  <td className="wp-table-cell text-wp-smoke text-xs font-mono">
                    {new Date(v.created_at).toLocaleDateString('en-CA')}
                  </td>
                  {statusFilter !== 'pending' && (
                    <td className="wp-table-cell">
                      <StatusBadge value={v.status} />
                    </td>
                  )}
                  {statusFilter === 'pending' && (
                    <td className="wp-table-cell">
                      <VerificationActions verification={v} />
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
