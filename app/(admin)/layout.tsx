import { Sidebar } from "@/components/admin/layout/sidebar";
import { MobileNav } from "@/components/admin/layout/mobile-nav";
import { Topbar } from "@/components/admin/layout/topbar";

// Admin pages are auth-gated and read URL search params in the topbar.
// Static prerender would fail on useSearchParams and leak empty HTML —
// force dynamic rendering for the whole route group.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `h-dvh`, not `h-screen`: on mobile browsers `100vh` is the viewport
    // with the URL bar hidden, so a `h-screen` column is taller than what
    // is actually visible and the last rows of every page sit under the
    // browser chrome. `dvh` tracks the real viewport as that bar hides and
    // shows.
    <div className="flex h-dvh bg-slate-50">
      <Sidebar />
      {/* min-w-0 is load-bearing: without it this flex child adopts the
          intrinsic width of its widest content — a 12-column table — and
          the whole page scrolls sideways instead of the table doing it. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
      {/* Portalled; renders nothing until opened. Mounted once here rather
          than inside Topbar so the drawer is not torn down and rebuilt if
          the topbar ever re-renders. */}
      <MobileNav />
    </div>
  );
}
