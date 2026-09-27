import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/issues";
import { passwordMatches } from "./login-input.ts";

export { validateCredentials } from "./login-input.ts";

// Accounts live in public.profiles ("NamaUser", "SandiUser", role). By the team's decision passwords are stored
// as entered (plain text), matching the existing rows; they are never returned to the client or logged.

export interface PublicProfile { id: string; name: string; role: AppRole }

export async function findProfileForLogin(name: string, password: string): Promise<PublicProfile | null> {
  const { data, error } = await createSupabaseServerClient().from("profiles")
    .select('id::text,"NamaUser","SandiUser",role').eq("NamaUser", name).limit(2);
  if (error) throw new Error("Cannot reach the account store.");
  const rows = (data ?? []) as unknown as { id: string; NamaUser: string; SandiUser: string | null; role: AppRole }[];
  // Always compare, even when the user does not exist, so timing does not reveal valid usernames.
  const match = rows.find(row => passwordMatches(row.SandiUser, password));
  if (!rows.length) passwordMatches("no-such-user-placeholder", password);
  return match ? { id: match.id, name: match.NamaUser, role: match.role } : null;
}

export async function createProfile(name: string, password: string): Promise<PublicProfile> {
  const db = createSupabaseServerClient();
  const { data: existing, error: lookupError } = await db.from("profiles").select("id").ilike("NamaUser", name.replace(/[\\%_]/g, "\\$&")).limit(1);
  if (lookupError) throw new Error("Cannot reach the account store.");
  // Case-insensitive uniqueness (wildcards escaped above) so "Budi" and "budi" cannot both register.
  if (existing?.length) throw new Error("That username is already taken.");
  // New accounts are always role "user"; developer access is granted in Supabase.
  const { data, error } = await db.from("profiles").insert({ NamaUser: name, SandiUser: password, role: "user" })
    .select('id::text,"NamaUser",role').single();
  if (error || !data) throw new Error("Cannot create the account.");
  const row = data as unknown as { id: string; NamaUser: string; role: AppRole };
  return { id: row.id, name: row.NamaUser, role: row.role };
}

/** All accounts (no passwords), for developers assigning project owners. */
export async function listProfiles(): Promise<PublicProfile[]> {
  const { data, error } = await createSupabaseServerClient().from("profiles").select('id::text,"NamaUser",role').order("NamaUser");
  if (error) throw new Error("Cannot load users.");
  return ((data ?? []) as unknown as { id: string; NamaUser: string; role: AppRole }[]).map(row => ({ id: row.id, name: row.NamaUser, role: row.role }));
}

/** Profile display names by ID, for showing who reported an issue. */
export async function profileNames(): Promise<Map<string, string>> {
  const { data, error } = await createSupabaseServerClient().from("profiles").select('id::text,"NamaUser"');
  if (error) return new Map();
  return new Map(((data ?? []) as unknown as { id: string; NamaUser: string }[]).map(row => [row.id, row.NamaUser]));
}
