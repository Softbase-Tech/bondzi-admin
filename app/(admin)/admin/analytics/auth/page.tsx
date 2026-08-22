"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PLATFORM_ORDER,
  PlatformBadge,
  platformLabel,
} from "@/components/admin/shared/platform-badge";
import { formatDate, formatNumber } from "@/lib/utils";

/**
 * `/admin/analytics/auth` — the operator-facing readout for platform
 * tracking.
 *
 * The page answers three questions in order:
 *
 *   1. Where do accounts come from? (`users.signup_platform`, all-time
 *      + last 30 days).
 *   2. What do sign-ins look like right now? (`auth_login_events` last
 *      30 days, sliced by platform × event type — distinguishes fresh
 *      registers, password logins, Google, and OTP).
 *   3. What's the daily cadence? A per-platform bar chart of daily
 *      sign-in counts for the last 30 days.
 *
 * Data is cheap to compute (grouped counts on indexed columns) so we
 * refetch on tab focus — no cache-buster needed.
 */
interface AuthAnalytics {
  windowStart: string;
  windowEnd: string;
  signups: {
    byPlatformAllTime: { platform: string | null; count: number }[];
    byPlatformLast30d: { platform: string | null; count: number }[];
  };
  logins: {
    byPlatformLast30d: {
      platform: string | null;
      eventType: string;
      count: number;
    }[];
    dailyLast30d: {
      day: string;
      platform: string | null;
      count: number;
    }[];
  };
}

const EVENT_TYPES = ["register", "login", "google", "otp"] as const;

export default function AuthAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: QK.AUTH_ANALYTICS(),
    queryFn: () =>
      unwrap<AuthAnalytics>(api.get(`/admin/analytics/auth`)),
    staleTime: 60_000,
  });

  const daily = useMemo(() => (data ? buildDaily(data) : null), [data]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const allTimeTotal = data.signups.byPlatformAllTime.reduce(
    (n, r) => n + r.count,
    0,
  );
  const last30Total = data.signups.byPlatformLast30d.reduce(
    (n, r) => n + r.count,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auth analytics"
        description={`Signups and sign-ins by platform · window ${formatDate(
          data.windowStart,
        )} – ${formatDate(data.windowEnd)}`}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlatformBreakdownCard
          title="Signups — all time"
          subtitle={`${formatNumber(allTimeTotal)} accounts on the platform`}
          rows={normalise(data.signups.byPlatformAllTime, allTimeTotal)}
        />
        <PlatformBreakdownCard
          title="Signups — last 30 days"
          subtitle={`${formatNumber(last30Total)} accounts created in-window`}
          rows={normalise(data.signups.byPlatformLast30d, last30Total)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign-ins — last 30 days, by platform × event</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                {EVENT_TYPES.map((e) => (
                  <TableHead key={e} className="text-right capitalize">
                    {e}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildPlatformEventMatrix(data.logins.byPlatformLast30d).map(
                (row) => (
                  <TableRow key={row.platform ?? "__null"}>
                    <TableCell>
                      <PlatformBadge platform={row.platform} />
                    </TableCell>
                    {EVENT_TYPES.map((e) => (
                      <TableCell
                        key={e}
                        className="text-right tabular-nums text-sm"
                      >
                        {row[e] > 0 ? formatNumber(row[e]) : "—"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right tabular-nums text-sm font-semibold">
                      {formatNumber(row.total)}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily sign-ins, last 30 days</CardTitle>
          <p className="text-xs text-slate-500">
            Every real sign-in — register, password login, Google, or
            OTP — stacked by platform. Refresh-token rotations excluded.
          </p>
        </CardHeader>
        <CardContent>
          {daily && daily.rows.some((r) => Number(r.total) > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={daily.rows}
                margin={{ top: 10, right: 12, bottom: 4, left: -12 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={shortDate}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                  labelFormatter={(v) =>
                    new Date(`${v}T00:00:00Z`).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="square"
                />
                {daily.platforms.map((p) => (
                  <Bar
                    key={p ?? "__null"}
                    dataKey={p ?? "__null"}
                    name={platformLabel(p)}
                    stackId="signins"
                    fill={hexFor(p)}
                    radius={
                      p === daily.platforms[daily.platforms.length - 1]
                        ? [3, 3, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              No sign-in events recorded in the last 30 days.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function shortDate(v: string): string {
  const d = new Date(`${v}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function hexFor(platform: string | null): string {
  const key = (platform ?? "").toLowerCase();
  if (key === "web") return "#6366f1"; // indigo-500
  if (key === "ios") return "#1e293b"; // slate-800
  if (key === "android") return "#10b981"; // emerald-500
  if (key === "admin-web") return "#f59e0b"; // amber-500
  return "#cbd5e1"; // slate-300 — Unknown bucket
}

function PlatformBreakdownCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: { platform: string | null; count: number; pct: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">No data.</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.platform ?? "__null"}
              className="flex items-center gap-3"
            >
              <div className="w-24 shrink-0">
                <PlatformBadge platform={r.platform} />
              </div>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded bg-slate-100">
                  <div
                    className={
                      "h-full " + colorFor(r.platform)
                    }
                    style={{ width: `${r.pct.toFixed(1)}%` }}
                  />
                </div>
              </div>
              <div className="w-24 text-right tabular-nums text-sm">
                {formatNumber(r.count)}
                <span className="ml-1 text-xs text-slate-500">
                  ({r.pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function colorFor(platform: string | null): string {
  const key = (platform ?? "").toLowerCase();
  if (key === "web") return "bg-indigo-500";
  if (key === "ios") return "bg-slate-800";
  if (key === "android") return "bg-emerald-500";
  if (key === "admin-web") return "bg-amber-500";
  return "bg-slate-300";
}

function normalise(
  rows: { platform: string | null; count: number }[],
  total: number,
): { platform: string | null; count: number; pct: number }[] {
  const map = new Map<string, { platform: string | null; count: number }>();
  for (const p of PLATFORM_ORDER) {
    map.set(p ?? "__null", { platform: p, count: 0 });
  }
  for (const r of rows) {
    const k = r.platform ?? "__null";
    map.set(k, { platform: r.platform, count: r.count });
  }
  const out = Array.from(map.values())
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((r) => ({
      ...r,
      pct: total > 0 ? (r.count / total) * 100 : 0,
    }));
  return out;
}

function buildPlatformEventMatrix(
  rows: { platform: string | null; eventType: string; count: number }[],
): Array<{
  platform: string | null;
  register: number;
  login: number;
  google: number;
  otp: number;
  total: number;
}> {
  const map = new Map<
    string,
    {
      platform: string | null;
      register: number;
      login: number;
      google: number;
      otp: number;
      total: number;
    }
  >();
  for (const r of rows) {
    const k = r.platform ?? "__null";
    const entry =
      map.get(k) ??
      {
        platform: r.platform,
        register: 0,
        login: 0,
        google: 0,
        otp: 0,
        total: 0,
      };
    if (r.eventType === "register") entry.register += r.count;
    else if (r.eventType === "login") entry.login += r.count;
    else if (r.eventType === "google") entry.google += r.count;
    else if (r.eventType === "otp") entry.otp += r.count;
    entry.total += r.count;
    map.set(k, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/**
 * Shape the backend's sparse `dailyLast30d` array into a dense row
 * per day, one column per platform — the exact shape recharts wants
 * for a stacked BarChart. Zero-fills every missing (day, platform)
 * pair so the x-axis is continuous even when a platform has quiet
 * days. Platform order is `PLATFORM_ORDER` filtered to what actually
 * appears in the data, so the stack is stable across renders.
 */
interface DailyChartData {
  rows: Array<Record<string, string | number>>;
  platforms: (string | null)[];
}

function buildDaily(data: AuthAnalytics): DailyChartData {
  const dayStart = new Date(data.windowStart);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(data.windowEnd);
  dayEnd.setUTCHours(0, 0, 0, 0);
  const days: string[] = [];
  for (
    let d = new Date(dayStart);
    d.getTime() <= dayEnd.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    days.push(d.toISOString().slice(0, 10));
  }

  const seen = new Set<string | null>();
  for (const r of data.logins.dailyLast30d) seen.add(r.platform);
  const platforms = PLATFORM_ORDER.filter((p) => seen.has(p));

  const byDay = new Map<string, Record<string, string | number>>();
  for (const day of days) {
    const row: Record<string, string | number> = { day, total: 0 };
    for (const p of platforms) row[p ?? "__null"] = 0;
    byDay.set(day, row);
  }
  for (const r of data.logins.dailyLast30d) {
    const row = byDay.get(r.day);
    if (!row) continue;
    const key = r.platform ?? "__null";
    row[key] = (row[key] as number) + r.count;
    row.total = (row.total as number) + r.count;
  }
  return { rows: days.map((d) => byDay.get(d)!), platforms };
}
