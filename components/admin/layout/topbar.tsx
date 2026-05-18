"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ChevronRight, LogOut, Search, Settings } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";

/**
 * Builds breadcrumbs from the pathname. `/admin/users/123` →
 *   Admin · Users · 123
 */
function buildCrumbs(pathname: string) {
  const segs = pathname.split("/").filter(Boolean);
  return segs.map((seg, i) => ({
    label: seg === "admin" ? "Admin" : seg.replace(/-/g, " "),
    href: "/" + segs.slice(0, i + 1).join("/"),
  }));
}

export function Topbar() {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const params = useSearchParams();
  const { data } = useSession();
  const crumbs = buildCrumbs(pathname);

  // Keyed state — remounts the input when the URL or route changes, so the
  // initial value tracks ?search= without a setState-in-effect. Typing after
  // that is local until the user submits.
  const urlSearch = params?.get("search") ?? "";
  const stateKey = `${pathname}?${urlSearch}`;
  const [query, setQuery] = useState(urlSearch);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/admin/questions?search=${encodeURIComponent(q)}`);
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <nav
        aria-label="Breadcrumb"
        className="hidden md:flex items-center gap-1 text-sm text-slate-500"
      >
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
              {last ? (
                <span className="capitalize text-slate-900 font-medium">{c.label}</span>
              ) : (
                <Link
                  href={c.href}
                  className="capitalize hover:text-slate-900"
                >
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex-1" />

      <form onSubmit={submit} className="relative w-64 hidden lg:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          key={stateKey}
          defaultValue={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions… (↵ to run)"
          className="pl-9 h-9 bg-slate-50"
          aria-label="Search questions"
        />
      </form>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar>
            <AvatarFallback>{initials(data?.user?.name)}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start text-left">
            <span className="text-xs font-medium text-slate-900 leading-tight">
              {data?.user?.name ?? "Admin"}
            </span>
            <span className="text-[11px] text-slate-500 capitalize leading-tight">
              {data?.user?.role ?? "staff"}
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{data?.user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2">
            <Settings className="h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700"
            onSelect={() => void signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
