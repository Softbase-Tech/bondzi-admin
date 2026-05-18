import { Sidebar } from "@/components/admin/layout/sidebar";
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
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
