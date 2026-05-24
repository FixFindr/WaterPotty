'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '../../../components/admin/AdminUI'
import { resolveVerification } from './actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VerificationActions({ verification }: { verification: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const act = (status: 'approved' | 'rejected') =>
    startTransition(async () => {
      await resolveVerification(verification.id, status)
      router.refresh()
    })

  return (
    <div className="flex items-center gap-1.5">
      <ConfirmDialog
        trigger={
          <Button
            size="sm"
            className="h-7 text-[11px] px-2.5 bg-wp-green/20 text-wp-green border border-wp-green/40
                       hover:bg-wp-green/30"
            disabled={isPending}
          >
            ✓ Approve
          </Button>
        }
        title="Approve this washroom?"
        description={`"${verification.washroom?.name}" will go live on the map and the submitter will receive +2 credits.`}
        confirmLabel="Approve"
        onConfirm={() => act('approved')}
      />
      <ConfirmDialog
        trigger={
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] px-2 text-wp-red border border-wp-red/30 hover:bg-red-950/40"
            disabled={isPending}
          >
            ✕ Reject
          </Button>
        }
        title="Reject this washroom?"
        description={`"${verification.washroom?.name}" will be closed and removed from the map. No credits will be awarded.`}
        confirmLabel="Reject"
        destructive
        onConfirm={() => act('rejected')}
      />
    </div>
  )
}
