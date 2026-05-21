import type { DefaultSession } from "next-auth";
import type { UserRole } from "./api";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      accessToken: string;
      refreshToken: string;
      error?: "RefreshAccessTokenError";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    accessToken: string;
    refreshToken: string;
    /** Unix ms — when the access token from the backend will expire. */
    accessTokenExpires: number;
  }
}

// NextAuth v5 exposes JWT via @auth/core/jwt; since we access token fields
// through Record<string, unknown> in lib/auth.ts, we skip augmenting that
// module here to stay compatible across v5 beta releases.
