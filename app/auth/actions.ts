"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/issues";

const SESSION_COOKIE = "devresolve_session";

export async function signIn(formData: FormData) {
  const namaUser = (formData.get("namaUser") as string)?.trim();
  const sandiUser = formData.get("sandiUser") as string;

  if (!namaUser || !sandiUser) {
    redirect("/auth/login?error=Username+and+password+are+required");
  }

  // Gunakan admin client (service role) agar bisa bypass RLS
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, NamaUser, SandiUser, role")
    .eq("NamaUser", namaUser)
    .single();

  if (error) {
    console.error("[signIn] Supabase error:", JSON.stringify(error));
    redirect("/auth/login?error=Username+not+found");
  }

  if (!data) {
    redirect("/auth/login?error=Username+not+found");
  }

  if (data.SandiUser !== sandiUser) {
    redirect("/auth/login?error=Incorrect+password");
  }

  // Save session to cookie
  const session: SessionUser = { id: data.id, NamaUser: data.NamaUser!, role: data.role };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });

  if (data.role === "developer") {
    redirect("/developer");
  } else {
    redirect("/dashboard");
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/auth/login");
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
