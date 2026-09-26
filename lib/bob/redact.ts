export function redactSecrets<T>(value: T, secrets: (string | undefined)[]): T {
  let json = JSON.stringify(value);
  for (const secret of secrets) {
    if (secret) json = json.split(JSON.stringify(secret).slice(1, -1)).join("[REDACTED]");
  }
  return JSON.parse(json) as T;
}
