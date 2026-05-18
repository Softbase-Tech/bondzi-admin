import type { NextConfig } from "next";

/**
 * Spec §10.2 — security headers.
 *
 * CSP strategy:
 *   - Strict default-src 'self' so nothing loads unless explicitly allowed.
 *   - `'unsafe-inline'` is permitted on scripts AND styles because Next 16's
 *     hydration relies on an inline state script per page, and Tailwind v4 +
 *     KaTeX inject runtime styles. Tightening to a nonce-based CSP would
 *     require threading per-request nonces through `proxy.ts` and every
 *     `<Script>` tag — that's the recommended next step if/when we add
 *     third-party scripts that need lockdown. For an internal admin panel
 *     served only to authenticated staff, inline-allow is the pragmatic
 *     baseline.
 *   - `connect-src` is built from env vars at evaluation time:
 *       NEXT_PUBLIC_API_URL  → backend origin (where the browser calls
 *                              after NextAuth has handled the session
 *                              cookie via server-side BACKEND_URL).
 *       NEXT_PUBLIC_SENTRY_DSN → Sentry ingest origin (when configured).
 *     Vercel evaluates these at build time, so the CSP that ships in the
 *     header is the one matching the deployed env.
 *   - CSP is only attached in production. Emitting it in dev would block
 *     the HMR `ws://` connection and the Next dev overlay's inline scripts.
 */

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildCsp(): string {
  const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL);
  const sentryOrigin = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);

  // Sentry SaaS uses two hostname families: *.ingest.sentry.io for event
  // ingestion and *.sentry.io for the rest (source maps, replays, etc.).
  // Both are allowed when Sentry is in use; if NEXT_PUBLIC_SENTRY_DSN is
  // unset the SDK never loads and these directives sit dormant.
  const sentryHosts = [
    sentryOrigin,
    "https://*.sentry.io",
    "https://*.ingest.sentry.io",
  ].filter((v): v is string => Boolean(v));

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://res.cloudinary.com",
      "https://*.s3.af-south-1.amazonaws.com",
      "https://*.supabase.co",
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(apiOrigin ? [apiOrigin] : []),
      ...sentryHosts,
    ],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.s3.af-south-1.amazonaws.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      // Cloudinary hosts the question/option/stimulus images referenced
      // by bulk imports (e.g. res.cloudinary.com/nation-books/...).
      // Without this entry Next/Image returns 400 in prod because the
      // optimizer refuses to fetch un-whitelisted hosts.
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    const securityHeaders: Array<{ key: string; value: string }> = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    if (isProd) {
      securityHeaders.unshift({
        key: "Content-Security-Policy",
        value: buildCsp(),
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
