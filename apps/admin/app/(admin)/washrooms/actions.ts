'use server'

/**
 * app/(admin)/washrooms/actions.ts
 * Server Actions for washroom mutations.
 * Runs with service role — bypasses RLS.
 */

import { createServiceClient } from '../../../lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateWashroomStatus(id: string, status: string) {
  const validStatuses = ['open', 'pinned', 'occupied', 'closed', 'pending_verification']
  if (!validStatuses.includes(status)) throw new Error('Invalid status')

  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { status, updated_at: new Date().toISOString() }
  if (status === 'open') updates.verified = true

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.from('washrooms').update(updates as any).eq('id', id)
  revalidatePath('/admin/washrooms')
}

export async function deleteWashroom(id: string) {
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db
    .from('washrooms')
    .update({ status: 'closed' as any, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/admin/washrooms')
}
