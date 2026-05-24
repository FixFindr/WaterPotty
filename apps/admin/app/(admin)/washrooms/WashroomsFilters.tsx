'use client'

/**
 * app/(admin)/washrooms/WashroomsFilters.tsx
 * Client component for search + status filter on washrooms page.
 * Updates URL search params — page re-renders via Server Component.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'

const STATUSES = [
  { value: 'all',                  label: 'All' },
  { value: 'open',                 label: 'Open' },
  { value: 'pinned',               label: 'Pinned' },
  { value: 'occupied',             label: 'Occupied' },
  { value: 'closed',               label: 'Closed' },
  { value: 'pending_verification', label: 'Pending' },
]

export function WashroomsFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const setParam = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === 'all' || value === '') next.delete(key)
    else next.set(key, value)
    startTransition(() => router.push(`?${next.toString()}`))
  }, [params, router])

  const currentStatus = params.get('status') || 'all'
  const currentQ      = params.get('q') || ''

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        placeholder="Search washrooms…"
        defaultValue={currentQ}
        onChange={e => setParam('q', e.target.value)}
        className="h-8 w-48 bg-wp-surface border-wp-rim text-wp-mist text-xs
                   placeholder:text-wp-smoke focus-visible:ring-wp-ice"
      />
      <div className="flex items-center gap-1">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setParam('status', s.value)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold border transition-colors
              ${currentStatus === s.value
                ? 'bg-wp-ice text-wp-void border-wp-ice'
                : 'bg-transparent text-wp-fog border-wp-rim hover:border-wp-ice hover:text-wp-ice'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
