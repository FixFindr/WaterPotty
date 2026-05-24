'use server'

import { createServiceClient } from '../../../lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function setUserTier(userId: string, tier: 'free' | 'subscriber') {
  const db = createServiceClient()
  await db.from('users').update({ tier }).eq('id', userId)
  revalidatePath('/admin/users')
}
