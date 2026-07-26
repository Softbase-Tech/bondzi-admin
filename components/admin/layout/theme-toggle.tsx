"use client";

import * as React from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/components/providers/theme-provider";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Theme switcher for the topbar. The trigger shows the *resolved* icon
 * (sun/moon) so it reflects what's actually on screen; the menu lets the
 * admin pin Light/Dark or fall back to System (the default).
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Until mounted, `theme` is the SSR placeholder ("system"); render a
  // stable icon to avoid a hydration mismatch, then swap to the real one.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const TriggerIcon = !mounted
    ? Monitor
    : resolvedTheme === "dark"
      ? Moon
      : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change theme"
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <TriggerIcon className="h-[18px] w-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            className="gap-2"
            onSelect={() => setTheme(value)}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            <Check
              className={cn(
                "h-4 w-4",
                mounted && theme === value ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
