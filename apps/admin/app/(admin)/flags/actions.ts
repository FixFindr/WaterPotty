'use server'

import { createServiceClient } from '../../../lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function resolveFlag(flagId: string) {
  const db = createServiceClient()
  await db
    .from('flags')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', flagId)
  revalidatePath('/admin/flags')
}

export async function closeFlaggedWashroom(flagId: string, washroomId: string) {
  const db = createServiceClient()
  await Promise.all([
    db.from('flags')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', flagId),
    db.from('washrooms')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', washroomId),
  ])
  revalidatePath('/admin/flags')
  revalidatePath('/admin/washrooms')
}
