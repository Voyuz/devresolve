"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createProfile, validateCredentials } from "@/lib/auth/profiles";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Developer-only: creates a reporter account ("user" role). Server actions are callable directly,
// so the caller's signed session is checked here rather than relying on the page being hidden.
export async function registerUser(formData: FormData) {
  const session = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (session?.role !== "developer") return { error: "Only developers can register users." };

  let credentials;
  try {
    credentials = validateCredentials({ name: formData.get("namaUser"), password: formData.get("sandiUser") });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid username or password." };
  }
  try {
    const profile = await createProfile(credentials.name, credentials.password);
    revalidatePath("/developer");
    return { success: true, message: `User '${profile.name}' has been successfully registered!` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { error: message.includes("taken") ? "Username is already registered. Please choose another username." : "Failed to register new user. A server error occurred." };
  }
}
