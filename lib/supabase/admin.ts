import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key. Never imported
// from a client component — the service key bypasses RLS and must stay
// behind the API boundary.

let cached: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error(
      "Service-role Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function checkAdminToken(headerToken: string | null | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (!expected) return false;
  if (!headerToken) return false;
  // Constant-time compare to defeat timing oracles on a short secret.
  if (headerToken.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return mismatch === 0;
}
