import { createClient } from '@supabase/supabase-js'
import type { Database } from '@water-potty/db'

/**
 * Service role client — bypasses Row Level Security.
 *
 * Use ONLY in:
 *   - app/api/** route handlers
 *   - Server Actions with the 'use server' directive
 *   - Server Components that need admin-level data access
 *
 * NEVER import this in Client Components or pages without 'use server'.
 * The SUPABASE_SERVICE_ROLE_KEY must never be sent to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}
