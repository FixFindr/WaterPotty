'use client'

/**
 * app/(admin)/credits/CreditAdjustmentDialog.tsx
 * Dialog for manually adjusting a user's credit balance.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addCreditAdjustment } from '../users/actions'

interface Props {
  users: Array<{ id: string; anonymous_username: string }>
}

export function CreditAdjustmentDialog({ users }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedDelta = parseInt(delta, 10)
    if (!userId || isNaN(parsedDelta) || !note.trim()) {
      setError('All fields are required and delta must be a number.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await addCreditAdjustment(userId, parsedDelta, note.trim())
        setOpen(false)
        setUserId('')
        setDelta('')
        setNote('')
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-[11px] px-3 bg-wp-amber/20 text-wp-amber border border-wp-amber/40 hover:bg-wp-amber/30">
          + Adjust credits
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-wp-surface border-wp-rim text-wp-ice">
        <DialogHeader>
          <DialogTitle>Manual credit adjustment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* User */}
          <div className="space-y-1">
            <label className="text-xs text-wp-fog">User</label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full rounded border border-wp-rim bg-wp-abyss text-wp-ice text-sm px-2 py-1.5"
            >
              <option value="">— select subscriber —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.anonymous_username}</option>
              ))}
            </select>
          </div>

          {/* Delta */}
          <div className="space-y-1">
            <label className="text-xs text-wp-fog">Delta (e.g. +5 or -2)</label>
            <Input
              type="number"
              value={delta}
              onChange={e => setDelta(e.target.value)}
              placeholder="0"
              className="bg-wp-abyss border-wp-rim text-wp-ice"
            />
          </div>

          {/* Note */}
          <div className="space-y-1">
            <label className="text-xs text-wp-fog">Note (required)</label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Reason for adjustment…"
              className="bg-wp-abyss border-wp-rim text-wp-ice"
            />
          </div>

          {error && (
            <p className="text-xs text-wp-red">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-wp-fog"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-wp-amber/20 text-wp-amber border border-wp-amber/40 hover:bg-wp-amber/30"
            >
              {isPending ? 'Saving…' : 'Apply'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
