/**
 * lib/supabase-server.ts
 *
 * Service role Supabase client — server-side ONLY.
 * Bypasses all RLS. Never import this in client components.
 * Used exclusively in:
 *   - Next.js Server Components
 *   - Route Handlers (app/api/*)
 *   - Server Actions
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@water-potty/db'

export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ← service role, server only
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Convenience singleton for server components
// (safe because server components never share state between requests)
export const serverDb = createServiceClient()
