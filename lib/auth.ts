import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@/types/api";

interface LoginSuccess {
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    role: UserRole;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: string;
  };
}

/**
 * NextAuth v5 configuration.
 *
 * Delegates identity to the NestJS backend's /auth/login. Students never
 * log in here — they're filtered in `authorize`. Teachers and admins share
 * the same NextAuth session; proxy.ts gates which sections they can reach.
 *
 * Session lifetime: 12h. The backend access token is short-lived (15 min
 * by default; controlled by JWT_ACCESS_EXPIRY) — the `jwt` callback below
 * silently exchanges it for a fresh pair via POST /auth/refresh whenever
 * less than 60s of life remains. That keeps a working session smooth for
 * the full 12h without ever surfacing a "session expired" bounce to the
 * admin, while still rotating tokens every 15 min underneath. If the
 * refresh itself fails (network, revoked refresh token, etc.) the token
 * is marked with `error: 'RefreshAccessTokenError'`; the next backend
 * call gets 401 and the existing axios interceptor bounces to /login.
 */
export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60,
  },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        deviceId: { label: "Device", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const deviceId = credentials?.deviceId as string | undefined;
        if (!email || !password || !deviceId) return null;

        try {
          const res = await fetch(
            `${process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL}/auth/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Device-ID": deviceId,
              },
              body: JSON.stringify({ email, password, deviceId }),
            },
          );

          if (!res.ok) return null;
          const body = (await res.json()) as
            | { data?: LoginSuccess }
            | LoginSuccess;
          const payload = (
            "data" in body && body.data ? body.data : body
          ) as LoginSuccess;

          if (!payload?.user) return null;
          if (payload.user.role === "student") {
            // Students never log into the admin dashboard.
            return null;
          }

          return {
            id: payload.user.id,
            email: payload.user.email ?? undefined,
            name: payload.user.fullName,
            role: payload.user.role,
            accessToken: payload.tokens.accessToken,
            refreshToken: payload.tokens.refreshToken,
            // The backend ships accessExpiresAt as an ISO string. Convert
            // to a Unix-ms epoch once at the boundary so the jwt callback
            // can compare with `Date.now()` directly without re-parsing
            // on every request.
            accessTokenExpires: new Date(
              payload.tokens.accessExpiresAt,
            ).getTime(),
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as Record<string, unknown>;

      // Initial sign-in: persist the full user payload onto the JWT.
      if (user) {
        const u = user as {
          id: string;
          role: UserRole;
          accessToken: string;
          refreshToken: string;
          accessTokenExpires: number;
        };
        t.id = u.id;
        t.role = u.role;
        t.accessToken = u.accessToken;
        t.refreshToken = u.refreshToken;
        t.accessTokenExpires = u.accessTokenExpires;
        return t;
      }

      // Subsequent requests: refresh only when the access token is about
      // to expire (≤ 60s remaining). 60s is wide enough to cover clock
      // skew + slow network between the admin server and the backend,
      // narrow enough that we don't burn refreshes on every page render.
      const expires = t.accessTokenExpires as number | undefined;
      if (expires && Date.now() < expires - 60_000) {
        return t;
      }

      const refreshed = await refreshBackendTokens(
        t.refreshToken as string | undefined,
      );
      if (!refreshed) {
        // Mark the token so the session callback can surface the failure;
        // the existing axios interceptor will catch the resulting 401 and
        // bounce to /login. We deliberately KEEP the stale tokens — that
        // lets one transient network blip self-heal on the next call
        // instead of forcing an immediate re-login.
        t.error = "RefreshAccessTokenError";
        return t;
      }

      t.accessToken = refreshed.accessToken;
      t.refreshToken = refreshed.refreshToken;
      t.accessTokenExpires = refreshed.accessTokenExpires;
      delete t.error;
      return t;
    },
    async session({ session, token }) {
      const t = token as Record<string, unknown>;
      if (t?.id) {
        session.user.id = t.id as string;
        session.user.role = t.role as UserRole;
        session.user.accessToken = t.accessToken as string;
        session.user.refreshToken = t.refreshToken as string;
        if (t.error === "RefreshAccessTokenError") {
          session.user.error = "RefreshAccessTokenError";
        }
      }
      return session;
    },
  },
  trustHost: true,
};

/**
 * Call the backend's `/auth/refresh` to rotate the token pair. Returns the
 * new tokens + their expiry on success; `null` on any failure (network,
 * 4xx/5xx, malformed body). The caller decides what to do with `null` —
 * for our jwt callback that means "keep the stale tokens but mark the
 * JWT so the next 401 bounces the user to /login".
 *
 * Why this lives outside the NextAuth callbacks object: the callback
 * surface is async but stays purely functional; pushing the fetch into
 * a named helper makes it easier to test in isolation and easier to swap
 * for a different backend contract later (e.g. when refresh starts
 * returning device-binding info).
 */
async function refreshBackendTokens(refreshToken: string | undefined): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
} | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as
      | {
          data?: {
            accessToken: string;
            refreshToken: string;
            accessExpiresAt: string;
          };
        }
      | {
          accessToken: string;
          refreshToken: string;
          accessExpiresAt: string;
        };
    const payload = (
      "data" in body && body.data ? body.data : body
    ) as {
      accessToken: string;
      refreshToken: string;
      accessExpiresAt: string;
    };
    if (!payload?.accessToken || !payload?.refreshToken) return null;
    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      accessTokenExpires: new Date(payload.accessExpiresAt).getTime(),
    };
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
