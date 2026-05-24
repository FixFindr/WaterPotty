'use client'

/**
 * app/(admin)/washrooms/WashroomActions.tsx
 * Inline action dropdown for each washroom row.
 * Uses Server Actions for mutations — no API route needed.
 */

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { updateWashroomStatus } from './actions'

interface Washroom {
  id: string
  name: string
  status: string
}

export function WashroomActions({ washroom }: { washroom: Washroom }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const act = (newStatus: string) => {
    startTransition(async () => {
      await updateWashroomStatus(washroom.id, newStatus)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-wp-smoke hover:text-wp-mist hover:bg-wp-surface"
          disabled={isPending}
        >
          ···
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-wp-depth border-wp-rim text-wp-mist text-sm w-44"
      >
        {washroom.status !== 'open' && (
          <DropdownMenuItem
            onClick={() => act('open')}
            className="text-wp-green focus:text-wp-green focus:bg-wp-surface cursor-pointer"
          >
            ✓ Force open
          </DropdownMenuItem>
        )}
        {washroom.status !== 'closed' && (
          <DropdownMenuItem
            className="text-wp-red focus:text-wp-red focus:bg-wp-surface cursor-pointer"
            onClick={() => act('closed')}
          >
            ✕ Close washroom
          </DropdownMenuItem>
        )}
        {washroom.status === 'pending_verification' && (
          <DropdownMenuItem
            onClick={() => act('open')}
            className="text-wp-amber focus:text-wp-amber focus:bg-wp-surface cursor-pointer"
          >
            ⚡ Force approve
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-wp-rim" />
        <DropdownMenuItem asChild>
          <a
            href={`/admin/washrooms/${washroom.id}`}
            className="text-wp-fog focus:text-wp-mist focus:bg-wp-surface cursor-pointer"
          >
            → View detail
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
