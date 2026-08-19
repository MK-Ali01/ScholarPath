import { createClient } from '@supabase/supabase-js';

// Server-only client. SUPABASE_SERVICE_ROLE_KEY must NOT have the NEXT_PUBLIC_
// prefix — that would ship it to the browser bundle. This file is only ever
// imported from Server Components / Route Handlers, never from 'use client' code.
//
// Returns null instead of throwing if env vars are missing, so pages can
// render a graceful empty state rather than a hard server crash. This is a
// diagnostic convenience for isolating "is the deploy broken" from "are the
// env vars missing" — once real Supabase data is wired up, callers should
// still treat a null return as a real problem worth surfacing, not silently
// ignore it.
export function getServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — returning null client.');
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
