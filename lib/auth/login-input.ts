// Pure login-input helpers (no database access), shared by the auth routes, server actions, and tests.
// Named "login-input" rather than "credentials": .gitignore excludes *credentials* files, which would keep
// this source file out of the repository.
import { createHash, timingSafeEqual } from "node:crypto";

export function validateCredentials(value: unknown): { name: string; password: string } {
  const body = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[A-Za-z0-9 _.-]{3,50}$/.test(name)) throw new Error("Username must be 3-50 letters, numbers, spaces, dots, dashes, or underscores.");
  if (password.length < 6 || password.length > 100) throw new Error("Password must be 6-100 characters.");
  return { name, password };
}

/** Constant-time comparison that does not leak either value's length. */
export function passwordMatches(stored: string | null | undefined, supplied: string) {
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return typeof stored === "string" && stored.length > 0 && timingSafeEqual(digest(stored), digest(supplied));
}
