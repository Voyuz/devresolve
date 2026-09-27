"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client: anon/publishable key only. RLS applies to the signed-in user.
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
  }
  return createBrowserClient(url, key);
}

/** Alias kept from main. */
export const createClient = createSupabaseBrowserClient;
