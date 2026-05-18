import axios, { AxiosError, AxiosInstance } from "axios";
import { getSession } from "next-auth/react";
import { getOrCreateDeviceId } from "./device-id";

/**
 * Browser-side Axios instance. Auto-attaches the NextAuth access token and
 * normalises error envelopes. On 401 the user is bounced to /login with a
 * flag so the login page can show a "session expired" toast.
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
  return config;
});

export interface NormalisedError {
  message: string;
  status: number;
  data?: unknown;
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

    return Promise.reject({
      message: msg,
      status,
      data: err.response?.data,
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
 */
export function serverApi(accessToken: string): AxiosInstance {
  return axios.create({
    baseURL: process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL,
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
