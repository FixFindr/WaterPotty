'use client'

/**
 * components/admin/AdminUI.tsx
 *
 * Shared primitives used across all admin pages.
 * Import individually — no barrel re-exports to keep tree-shaking clean.
 */

import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ReactNode } from 'react'

// ── Status badges ─────────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  // Washroom status
  open:                 'wp-badge-open',
  pinned:               'wp-badge-pinned',
  occupied:             'wp-badge-occupied',
  closed:               'wp-badge-closed',
  pending_verification: 'wp-badge-pending',
  // User tier
  free:                 'bg-wp-surface text-wp-fog border border-wp-rim',
  subscriber:           'wp-badge-sub',
  // Verification
  pending:              'wp-badge-pending',
  approved:             'wp-badge-open',
  rejected:             'wp-badge-closed',
  // Flag resolved
  true:                 'wp-badge-closed',
  false:                'wp-badge-occupied',
  // Cleanliness
  clean:                'wp-badge-open',
  dirty:                'wp-badge-occupied',
}

const STATUS_LABELS: Record<string, string> = {
  open:                 'Open',
  pinned:               'Pinned',
  occupied:             'Occupied',
  closed:               'Closed',
  pending_verification: 'Pending',
  free:                 'Free',
  subscriber:           'Subscriber',
  pending:              'Pending',
  approved:             'Approved',
  rejected:             'Rejected',
  clean:                'Clean',
  dirty:                'Dirty',
}

export function StatusBadge({
  value,
  className,
}: {
  value: string | boolean | null
  className?: string
}) {
  const key = String(value ?? 'null')
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide font-mono',
      STATUS_CLASSES[key] || 'bg-wp-surface text-wp-fog border border-wp-rim',
      className,
    )}>
      {STATUS_LABELS[key] || key}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, accent = false,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={cn(
      'rounded-lg border p-5 bg-wp-depth',
      accent ? 'border-wp-ice/40' : 'border-wp-rim',
    )}>
      <p className="text-[11px] font-semibold tracking-widest text-wp-smoke uppercase mb-2">
        {label}
      </p>
      <p className={cn('text-3xl font-bold font-mono', accent ? 'text-wp-ice' : 'text-wp-mist')}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-wp-smoke mt-1">{sub}</p>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon = '📭',
  title,
  body,
  action,
}: {
  icon?: string
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <span className="text-4xl">{icon}</span>
      <p className="text-sm font-semibold text-wp-fog">{title}</p>
      {body && <p className="text-xs text-wp-smoke max-w-xs">{body}</p>}
      {action}
    </div>
  )
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="bg-wp-depth border-wp-rim">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-wp-mist">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-wp-fog">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-wp-surface border-wp-rim text-wp-fog hover:bg-wp-muted">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive
              ? 'bg-wp-red hover:bg-red-800 text-white'
              : 'bg-wp-ice hover:bg-sky-400 text-wp-void'}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Table wrapper ─────────────────────────────────────────────────────────────

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-wp-rim bg-wp-depth">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-wp-rim bg-wp-abyss">
      <tr>{children}</tr>
    </thead>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

export function SectionHeader({
  title, count, children,
}: {
  title: string
  count?: number
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold tracking-widest text-wp-mist uppercase">{title}</h2>
        {count !== undefined && (
          <span className="text-xs font-mono text-wp-smoke border border-wp-rim rounded px-2 py-0.5">
            {count}
          </span>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

// ── Type / reason label maps ──────────────────────────────────────────────────

export const WASHROOM_TYPE_LABELS: Record<string, string> = {
  starbucks:     '☕ Starbucks',
  mcdonalds:     '🍟 McDonald\'s',
  canadian_tire: '🔧 Canadian Tire',
  portable:      '🚧 Portable',
  public:        '🏛️ Public',
  other:         '🏪 Other',
}

export const FLAG_REASON_LABELS: Record<string, string> = {
  closed_permanently: 'Permanently closed',
  doesnt_exist:       'Doesn\'t exist',
  incorrect_info:     'Incorrect info',
  inappropriate:      'Inappropriate',
}
