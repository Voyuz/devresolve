export function validateSetupRequest(request: Request, body?: unknown) {
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Setup is only available on the local server computer.");
  if (request.method === "POST") {
    if (request.headers.get("origin") !== url.origin || !request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Same-origin JSON request required.");
    if (!body || typeof body !== "object" || (body as { consent?: unknown }).consent !== true) throw new Error("Approve the Node.js and Bob Shell installation first.");
  }
}
