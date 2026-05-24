'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { setUserTier } from './actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function UserActions({ user }: { user: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const act = (fn: () => Promise<void>) =>
    startTransition(async () => { await fn(); router.refresh() })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost" size="sm"
          className="h-7 w-7 p-0 text-wp-smoke hover:text-wp-mist hover:bg-wp-surface"
          disabled={isPending}
        >
          ···
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-wp-depth border-wp-rim text-wp-mist text-sm w-48">
        {user.tier !== 'subscriber' && (
          <DropdownMenuItem
            onClick={() => act(() => setUserTier(user.id, 'subscriber'))}
            className="text-wp-ice focus:text-wp-ice focus:bg-wp-surface cursor-pointer"
          >
            ↑ Upgrade to subscriber
          </DropdownMenuItem>
        )}
        {user.tier !== 'free' && (
          <DropdownMenuItem
            onClick={() => act(() => setUserTier(user.id, 'free'))}
            className="text-wp-amber focus:text-wp-amber focus:bg-wp-surface cursor-pointer"
          >
            ↓ Downgrade to free
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-wp-rim" />
        <DropdownMenuItem asChild>
          <a href={`/admin/users/${user.id}`} className="text-wp-fog focus:text-wp-mist focus:bg-wp-surface cursor-pointer">
            → View detail
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/admin/credits?user=${user.id}`} className="text-wp-fog focus:text-wp-mist focus:bg-wp-surface cursor-pointer">
            🪙 Credit history
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
