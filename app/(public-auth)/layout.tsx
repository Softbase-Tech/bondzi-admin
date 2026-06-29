/**
 * Shared layout for the three public auth pages (forgot-password,
 * reset-password, verify-email). The route group exists so we get
 * one centering layout for all three; the page-level paths
 * (`/forgot-password`, `/reset-password`, `/verify-email`) are
 * what the proxy matcher whitelists.
 *
 * Identical centering treatment to (auth)/layout.tsx so the brand
 * surface is consistent — only difference is these don't require a
 * session.
 */
export default function PublicAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
