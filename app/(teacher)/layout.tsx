import Image from "next/image";
import Link from "next/link";

/**
 * Phase 2 teacher portal shell. Deliberately thin — when the first school
 * pilots the product, expand this into the full sidebar/topbar pattern used
 * by /admin. See spec §11.
 */
export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <Link href="/school" className="flex items-center gap-2 font-semibold">
          <Image
            src="/brand/icon-black.png"
            alt="Bondzi"
            width={28}
            height={28}
            priority
            unoptimized
            className="h-7 w-7"
          />
          Bondzi · Teacher
        </Link>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
