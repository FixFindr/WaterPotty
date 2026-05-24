/**
 * supabase/functions/update-washroom-status/index.ts
 *
 * Water Potty — Washroom Status Updater
 *
 * NOTE: As of the current architecture, washroom status is updated
 * automatically by the Postgres trigger `pins_recalculate_status`
 * defined in 0010_triggers.sql. That trigger fires on every pin
 * INSERT / UPDATE / DELETE and is faster than an Edge Function
 * because it runs inside Postgres with no cold-start or network hop.
 *
 * This Edge Function exists as a manual override endpoint for:
 *   1. Admin-triggered status resets (e.g. force a washroom back to 'open')
 *   2. Bulk recomputation after a data migration
 *   3. Debugging / QA — call it to verify trigger output matches
 *
 * POST body:
 *   { washroom_id: string, force_status?: string }
 *
 * If force_status is provided, it overrides computation and sets the
 * status directly (admin only). Otherwise it recomputes from active pins.
 *
 * Authorization: service role key required.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  washroom_id?: string   // if omitted, recomputes ALL washrooms (expensive)
  force_status?: 'open' | 'pinned' | 'occupied' | 'closed'
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: RequestBody = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Force status override ─────────────────────────────────────────────────────
  if (body.washroom_id && body.force_status) {
    const { error } = await supabase
      .from('washrooms')
      .update({ status: body.force_status, updated_at: new Date().toISOString() })
      .eq('id', body.washroom_id)
      .neq('status', 'pending_verification') // never override pending via this endpoint

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      washroom_id: body.washroom_id,
      new_status: body.force_status,
      method: 'forced',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Recompute from active pins ────────────────────────────────────────────────
  // This mirrors the Postgres trigger logic but runs in JS for flexibility.
  // Used for bulk recomputation or when a specific washroom is suspected of drift.

  const targetIds: string[] = []

  if (body.washroom_id) {
    targetIds.push(body.washroom_id)
  } else {
    // Fetch all non-closed washroom IDs (expensive — use sparingly)
    const { data, error } = await supabase
      .from('washrooms')
      .select('id')
      .not('status', 'in', '("closed","pending_verification")')

    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message || 'Fetch failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    targetIds.push(...data.map((r: { id: string }) => r.id))
  }

  const results: Array<{ id: string; status: string }> = []
  const now = new Date().toISOString()

  for (const washroomId of targetIds) {
    // Count active pins
    const { count, error: countError } = await supabase
      .from('pins')
      .select('id', { count: 'exact', head: true })
      .eq('washroom_id', washroomId)
      .is('released_at', null)
      .gt('expires_at', now)

    if (countError) continue

    const newStatus =
      (count ?? 0) === 0 ? 'open' :
      (count ?? 0) === 1 ? 'pinned' :
      'occupied'

    const { error: updateError } = await supabase
      .from('washrooms')
      .update({ status: newStatus, updated_at: now })
      .eq('id', washroomId)
      .not('status', 'in', '("closed","pending_verification")')

    if (!updateError) {
      results.push({ id: washroomId, status: newStatus })
    }
  }

  return new Response(JSON.stringify({
    success: true,
    recomputed: results.length,
    results,
    method: 'computed',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
