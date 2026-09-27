import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// User-scoped server client (anon key + auth cookies). RLS applies to the signed-in user.
// Use this once Supabase Auth is wired to /auth/login; until then requests run as `anon`.
// For trusted server work that must bypass RLS, use createSupabaseServerClient from ./server.
export async function createSupabaseAuthServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh must happen in a Route Handler, Server Function, or proxy.
        }
      },
    },
  });
}
