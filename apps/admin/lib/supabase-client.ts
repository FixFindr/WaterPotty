'use client'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@water-potty/db'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton — reuse the same client instance across all client components
export const supabaseClient = createClient<Database>(url, anonKey)
