import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Bondzi mark + wordmark. Uses the same icon as the website and mobile app
 * so an admin who also tests the consumer product sees one identity.
 *
 * `unoptimized` skips the Next image optimizer on a static asset that
 * already ships at the size we draw it. Black mark in light mode, white in
 * dark — CSS-toggled so it flips with the theme class, no JS round-trip.
 */
export function BrandMark({
  wordmarkClassName,
  onClick,
}: {
  /** Applied to the wordmark, so a caller can hide it on an icon rail. */
  wordmarkClassName?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/admin"
      onClick={onClick}
      className="flex min-w-0 items-center gap-2 font-semibold text-slate-900"
    >
      <Image
        src="/brand/icon-black.png"
        alt="Bondzi"
        width={28}
        height={28}
        priority
        unoptimized
        className="h-7 w-7 shrink-0 dark:hidden"
      />
      <Image
        src="/brand/icon-white-512.png"
        alt=""
        aria-hidden
        width={28}
        height={28}
        unoptimized
        className="hidden h-7 w-7 shrink-0 dark:block"
      />
      <span className={cn("truncate", wordmarkClassName)}>Bondzi</span>
    </Link>
  );
}
