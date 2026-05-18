import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

/** Merge Tailwind classes intelligently — the one helper used everywhere. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const GHS = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 0,
});
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("en-GH");

export function formatGHS(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "GHS 0";
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? GHS.format(n) : "GHS 0";
}

export function formatUSD(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "$0.00";
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? USD.format(n) : "$0.00";
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? NUM.format(n) : "0";
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "d MMM yyyy");
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "d MMM yyyy HH:mm");
}

export function relativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function truncate(s: string, max = 80): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function percent(numerator: number, denominator: number): string {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}
