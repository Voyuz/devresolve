// In-memory limiter for failed logins (single local server; resets on restart).
const WINDOW_MS = 60_000;
const MAX_FAILURES = 5;
const failures = new Map<string, number[]>();

const recent = (key: string, now: number) => (failures.get(key) ?? []).filter(time => now - time < WINDOW_MS);

export function isLimited(key: string, now = Date.now()) { return recent(key, now).length >= MAX_FAILURES; }
export function recordFailure(key: string, now = Date.now()) { failures.set(key, [...recent(key, now), now]); }
export function clearFailures(key: string) { failures.delete(key); }
