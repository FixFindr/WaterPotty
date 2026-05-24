'use server'

import { createServiceClient } from '../../../lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function resolveVerification(
  verificationId: string,
  status: 'approved' | 'rejected',
) {
  const db = createServiceClient()

  // 1. Fetch the verification so we know the washroom_id
  const { data: v } = await db
    .from('verifications')
    .select('washroom_id')
    .eq('id', verificationId)
    .single()

  if (!v) throw new Error('Verification not found')

  // 2. Update the verification row
  await db
    .from('verifications')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', verificationId)

  // 3. If approved: open the washroom + mark it verified
  //    Credits (+2) are awarded by the DB trigger on verification.status = 'approved'
  if (status === 'approved') {
    await db
      .from('washrooms')
      .update({ status: 'open', verified: true })
      .eq('id', v.washroom_id)
  }

  // 4. If rejected: close the washroom
  if (status === 'rejected') {
    await db
      .from('washrooms')
      .update({ status: 'closed' })
      .eq('id', v.washroom_id)
  }

  revalidatePath('/admin/verifications')
  revalidatePath('/admin/washrooms')
}
