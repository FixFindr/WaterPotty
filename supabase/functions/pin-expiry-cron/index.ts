/**
 * supabase/functions/pin-expiry-cron/index.ts
 *
 * Water Potty — Pin Expiry Cron Edge Function
 *
 * Triggered by: Supabase Cron (every 5 minutes) OR pg_cron webhook.
 * Also invokable manually for testing:
 *   supabase functions invoke pin-expiry-cron --no-verify-jwt
 *
 * Responsibilities:
 *   1. Read unsent pin_expiring_soon rows from notification_queue
 *   2. Look up each user's Expo push token
 *   3. Send push notifications via Expo Push API
 *   4. Mark notification_queue rows as sent
 *
 * NOTE: The actual pin expiry (UPDATE pins SET released_at = now())
 * is handled by the pg_cron job defined in 0011_cron_and_storage.sql.
 * The trigger in 0010_triggers.sql then fires recalculate_washroom_status
 * automatically. This Edge Function only handles the push notification side.
 *
 * Why not do everything in the Edge Function?
 * pg_cron runs inside Postgres with lower latency and no cold-start.
 * It's the right tool for the data mutation. The Edge Function handles
 * the external API call (Expo) which Postgres can't do natively.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface NotificationQueueRow {
  id: string
  user_id: string
  washroom_id: string
  type: string
  created_at: string
}

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default'
  badge?: number
}

Deno.serve(async (req: Request) => {
  // Verify this was called by Supabase Cron (or an authorized caller)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    // Allow invocation from supabase functions invoke (service role)
    const serviceKey = req.headers.get('x-supabase-service-role')
    if (serviceKey !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const results = {
    notifications_queued: 0,
    notifications_sent: 0,
    errors: [] as string[],
  }

  // ── 1. Fetch unsent notifications ────────────────────────────────────────────
  const { data: queueRows, error: queueError } = await supabase
    .from('notification_queue')
    .select('id, user_id, washroom_id, type')
    .eq('sent', false)
    .order('created_at', { ascending: true })
    .limit(100) // batch cap

  if (queueError) {
    return new Response(JSON.stringify({ error: queueError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!queueRows || queueRows.length === 0) {
    return new Response(JSON.stringify({ ...results, message: 'No pending notifications' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  results.notifications_queued = queueRows.length

  // ── 2. Fetch Expo push tokens for affected users ──────────────────────────────
  // NOTE: expo_push_token is stored in a push_tokens table (create separately
  // when implementing expo-notifications registration in the mobile app).
  // Schema: push_tokens(id, user_id, token, platform, created_at)
  const userIds = [...new Set(queueRows.map((r: NotificationQueueRow) => r.user_id))]

  const { data: tokenRows, error: tokenError } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)

  if (tokenError) {
    results.errors.push(`Token fetch error: ${tokenError.message}`)
  }

  const tokenMap = new Map<string, string>()
  if (tokenRows) {
    for (const row of tokenRows) {
      tokenMap.set(row.user_id, row.token)
    }
  }

  // ── 3. Fetch washroom names for notification bodies ───────────────────────────
  const washroomIds = [...new Set(queueRows.map((r: NotificationQueueRow) => r.washroom_id))]

  const { data: washroomRows } = await supabase
    .from('washrooms')
    .select('id, name')
    .in('id', washroomIds)

  const washroomMap = new Map<string, string>()
  if (washroomRows) {
    for (const row of washroomRows) {
      washroomMap.set(row.id, row.name)
    }
  }

  // ── 4. Build and send push messages ──────────────────────────────────────────
  const messages: ExpoPushMessage[] = []
  const sentIds: string[] = []

  for (const row of queueRows as NotificationQueueRow[]) {
    const token = tokenMap.get(row.user_id)
    if (!token) continue // user hasn't granted push permissions

    const washroomName = washroomMap.get(row.washroom_id) || 'your pinned washroom'

    let message: ExpoPushMessage

    if (row.type === 'pin_expiring_soon') {
      message = {
        to: token,
        title: '⏱ Almost time!',
        body: `Your pin on ${washroomName} expires in 5 minutes. How was it?`,
        data: { screen: 'map', washroomId: row.washroom_id, action: 'feedback' },
        sound: 'default',
      }
    } else {
      // verification_needed
      message = {
        to: token,
        title: '✅ Washroom to verify nearby',
        body: `A new ${washroomName} was added near you. Verify it and help the community!`,
        data: { screen: 'map', washroomId: row.washroom_id, action: 'verify' },
        sound: 'default',
      }
    }

    messages.push(message)
    sentIds.push(row.id)
  }

  // Expo recommends batches of ≤100
  const BATCH_SIZE = 100
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      if (!res.ok) {
        const text = await res.text()
        results.errors.push(`Expo batch ${i}: HTTP ${res.status} — ${text}`)
      } else {
        results.notifications_sent += batch.length
      }
    } catch (err) {
      results.errors.push(`Expo fetch error: ${String(err)}`)
    }
  }

  // ── 5. Mark sent rows ─────────────────────────────────────────────────────────
  if (sentIds.length > 0) {
    const { error: markError } = await supabase
      .from('notification_queue')
      .update({ sent: true })
      .in('id', sentIds)

    if (markError) {
      results.errors.push(`Mark sent error: ${markError.message}`)
    }
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
