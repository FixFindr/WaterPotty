'use server'

import { createServiceClient } from '../../../lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function setUserTier(userId: string, tier: 'free' | 'subscriber') {
  const db = createServiceClient()
  await db
    .from('users')
    .update({ tier, updated_at: new Date().toISOString() })
    .eq('id', userId)
  revalidatePath('/admin/users')
}

export async function addCreditAdjustment(
  userId: string,
  delta: number,
  note: string,
) {
  if (delta === 0) throw new Error('Delta cannot be zero')
  if (!note.trim()) throw new Error('Note is required for manual adjustments')

  const db = createServiceClient()
  await db.from('credit_ledger').insert({
    user_id: userId,
    delta,
    reason: 'manual_admin_adjust',
    note: note.trim(),
  })
  revalidatePath('/admin/users')
  revalidatePath('/admin/credits')
}
