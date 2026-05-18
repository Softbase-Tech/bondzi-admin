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
 * Session lifetime: 2h idle (spec §9.2) — NextAuth handles this via the
 * session.maxAge config. The underlying backend access token is short-lived
 * (15 min); when it expires, axios interceptors catch the 401 and bounce
 * to /login. We deliberately do NOT do silent refresh here — the admin is
 * used by a small staff and re-login beats refresh-error loops that hide
 * real auth problems.
 */
export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60,
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
      // Only mutate on the initial sign-in; subsequent requests reuse what
      // was persisted into the JWT payload.
      if (user) {
        const u = user as {
          id: string;
          role: UserRole;
          accessToken: string;
          refreshToken: string;
        };
        t.id = u.id;
        t.role = u.role;
        t.accessToken = u.accessToken;
        t.refreshToken = u.refreshToken;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as Record<string, unknown>;
      if (t?.id) {
        session.user.id = t.id as string;
        session.user.role = t.role as UserRole;
        session.user.accessToken = t.accessToken as string;
        session.user.refreshToken = t.refreshToken as string;
      }
      return session;
    },
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
