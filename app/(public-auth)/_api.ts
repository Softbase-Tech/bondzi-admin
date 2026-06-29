/**
 * Tiny fetch helper for the public auth pages. The browser hits the
 * backend's public endpoints DIRECTLY (no NextAuth, no session) —
 * those endpoints are throttled and token-gated server-side, so
 * proxying through a Next.js route would just add latency.
 *
 * The helper returns the parsed JSON envelope OR throws an Error
 * whose message is the backend's `message` field — kept identical
 * across the three pages so error copy is consistent.
 */

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

type BackendError = {
  message?: string;
  error?: string;
  statusCode?: number;
};

export async function publicAuthPost(
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function publicAuthGet(path: string): Promise<unknown> {
  const res = await fetch(`${apiBase}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return parseResponse(res);
}

async function parseResponse(res: Response): Promise<unknown> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Empty body / non-JSON response — leave payload null and decide
    // on status alone.
  }
  if (!res.ok) {
    const err = (payload ?? {}) as BackendError;
    const message =
      typeof err.message === "string" && err.message.length > 0
        ? err.message
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return payload;
}
