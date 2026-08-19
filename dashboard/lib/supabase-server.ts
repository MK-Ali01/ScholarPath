import { createClient } from '@supabase/supabase-js';

// Server-only client. SUPABASE_SERVICE_ROLE_KEY must NOT have the NEXT_PUBLIC_
// prefix — that would ship it to the browser bundle. This file is only ever
// imported from Server Components / Route Handlers, never from 'use client' code.
export function getServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
