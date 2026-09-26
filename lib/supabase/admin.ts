import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client menggunakan service role key — bypass RLS.
 * HANYA dipakai di server-side (Server Actions, API Routes).
 * JANGAN import file ini di client component.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
