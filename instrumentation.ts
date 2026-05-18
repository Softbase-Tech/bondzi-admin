/**
 * Next 16 instrumentation hook. Runs once per runtime (node / edge / browser).
 *
 * Sentry SDK is not a project dependency yet — the dynamic import means a
 * missing module becomes a silent no-op instead of a build failure. Install
 * `@sentry/nextjs` to activate error + performance capture once the DSN is
 * configured via `NEXT_PUBLIC_SENTRY_DSN`.
 */
export async function register(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) return;

  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const Sentry = (await import('@sentry/nextjs').catch(() => null)) as
        | { init: (opts: Record<string, unknown>) => void }
        | null;
      if (!Sentry) return;
      Sentry.init({
        dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
      });
    }
  } catch {
    // Silent — the dashboard should still render without Sentry.
  }
}
