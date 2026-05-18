import axios, { AxiosError, AxiosInstance } from "axios";
import { getSession } from "next-auth/react";
import { getOrCreateDeviceId } from "./device-id";

/**
 * Generate a v4-style request id. Used to correlate a single user action
 * across the admin server, the backend, Sentry, and any downstream logs.
 * The backend's nestjs-cls middleware accepts the `X-Request-ID` header
 * verbatim and stamps it into every log line + Sentry event + audit row
 * for the request — so one id pasted in a support ticket pulls the
 * entire trace.
 */
function newRequestId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // Modern Node + every supported browser ships `crypto.randomUUID`,
  // but keep a low-entropy fallback so a stray Edge runtime never
  // crashes here — we need uniqueness, not cryptographic strength.
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12)
  );
}

/**
 * Browser-side Axios instance. Auto-attaches the NextAuth access token and
 * normalises error envelopes. On 401 the user is bounced to /login with a
 * flag so the login page can show a "session expired" toast.
 *
 * Every outgoing call mints a fresh `X-Request-ID` so each user action
 * carries its own trace.
 *
 * For Server Components and Route Handlers, use `serverApi(accessToken)`
 * instead — that accepts the token directly and avoids `getSession()` which
 * only works in the browser.
 */
export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const session = await getSession();
    const token = session?.user?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Backend v2 enforces device-scoped sessions. Send the browser's stable
    // device id on every request so refresh / logout / session endpoints
    // can identify which device is acting.
    config.headers["X-Device-ID"] = getOrCreateDeviceId();
  }
  // Mint per request — each browser-side call is a distinct user action.
  config.headers["X-Request-ID"] = newRequestId();
  return config;
});

export interface NormalisedError {
  message: string;
  status: number;
  data?: unknown;
  /** The backend's `x-request-id` for the failing call. Surface this in
   *  toasts / Sentry tags so a support ticket can pull the exact trace. */
  requestId?: string;
}

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const msg =
      (Array.isArray(err.response?.data?.message)
        ? err.response?.data?.message.join(", ")
        : err.response?.data?.message) ??
      err.message ??
      "An unexpected error occurred";

    const status = err.response?.status ?? 0;

    if (status === 401 && typeof window !== "undefined") {
      // Session expired / token revoked — bounce out.
      window.location.href = "/login?error=session_expired";
    }

    // Axios lowercases incoming header names. Pull the id off the
    // response (if present) or fall back to the one we sent — either
    // way the value matches what the backend logged.
    const responseRid =
      (err.response?.headers?.["x-request-id"] as string | undefined) ?? undefined;
    const sentRid =
      (err.config?.headers?.["X-Request-ID"] as string | undefined) ?? undefined;

    return Promise.reject({
      message: msg,
      status,
      data: err.response?.data,
      requestId: responseRid ?? sentRid,
    } satisfies NormalisedError);
  },
);

/** Unwraps `{ data: T }` response envelopes from the NestJS TransformInterceptor. */
export async function unwrap<T>(promise: Promise<{ data: { data?: T } }>): Promise<T> {
  const res = await promise;
  return (res.data?.data ?? (res.data as unknown as T)) as T;
}

/**
 * Axios instance for server-side usage. Call from Server Components or Route
 * Handlers only. Never imports next-auth/react (would throw in RSC).
 *
 * Pass the incoming request's `x-request-id` via `opts.requestId` so the
 * trace stays contiguous from browser → admin server → backend. If
 * omitted, a fresh id is minted and shared across every call this
 * instance makes — each Server Component renders inside one logical
 * request, so all its downstream calls should share one id.
 *
 * Recommended call-site shape from a Server Component / Route Handler:
 *
 *   import { headers } from 'next/headers';
 *   const rid = (await headers()).get('x-request-id') ?? undefined;
 *   const api = serverApi(token, { requestId: rid });
 */
export function serverApi(
  accessToken: string,
  opts?: { requestId?: string },
): AxiosInstance {
  return axios.create({
    baseURL: process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL,
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Request-ID": opts?.requestId ?? newRequestId(),
    },
  });
}
