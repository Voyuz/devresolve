"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function registerUser(formData: FormData) {
  const namaUser = (formData.get("namaUser") as string)?.trim();
  const sandiUser = formData.get("sandiUser") as string;
  const role = (formData.get("role") as string) || "user"; // Just in case there is a role column later

  if (!namaUser || !sandiUser) {
    return { error: "Username and password are required." };
  }

  const supabase = createAdminClient();

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("NamaUser", namaUser)
    .single();

  if (existingUser) {
    return { error: "Username is already registered. Please choose another username." };
  }

  // Insert new user
  const { error } = await supabase
    .from("profiles")
    .insert([{ NamaUser: namaUser, SandiUser: sandiUser }]);

  if (error) {
    console.error("[registerUser] Supabase error:", error);
    return { error: "Failed to register new user. A server error occurred." };
  }

  revalidatePath("/developer");
  return { success: true, message: `User '${namaUser}' has been successfully registered!` };
}
