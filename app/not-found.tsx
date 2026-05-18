import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-6xl font-semibold text-slate-300">404</div>
        <p className="mt-2 text-slate-600">
          This page wandered off. Try the dashboard.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
