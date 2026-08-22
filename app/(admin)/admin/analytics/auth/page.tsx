"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const dailySeries = useMemo(() => (data ? buildDailySeries(data) : null), [
    data,
  ]);

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
        </CardHeader>
        <CardContent>
          {dailySeries && dailySeries.days.length > 0 ? (
            <DailyChart series={dailySeries} />
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

interface DailySeries {
  days: string[];
  platforms: (string | null)[];
  // counts[platformKey][dayIndex]
  counts: Record<string, number[]>;
  maxCount: number;
}

function buildDailySeries(data: AuthAnalytics): DailySeries {
  const dayKeys: string[] = [];
  const dayStart = new Date(data.windowStart);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(data.windowEnd);
  dayEnd.setUTCHours(0, 0, 0, 0);
  for (
    let d = new Date(dayStart);
    d.getTime() <= dayEnd.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const seenPlatforms = new Set<string | null>();
  for (const r of data.logins.dailyLast30d) seenPlatforms.add(r.platform);
  const platforms = Array.from(seenPlatforms);

  const counts: Record<string, number[]> = {};
  for (const p of platforms) {
    counts[p ?? "__null"] = new Array(dayKeys.length).fill(0);
  }
  const dayIdx = new Map(dayKeys.map((d, i) => [d, i] as const));
  let max = 0;
  for (const r of data.logins.dailyLast30d) {
    const idx = dayIdx.get(r.day);
    if (idx === undefined) continue;
    const key = r.platform ?? "__null";
    counts[key][idx] = (counts[key][idx] ?? 0) + r.count;
    // Track max day-total for scaling
  }
  for (let i = 0; i < dayKeys.length; i++) {
    let day = 0;
    for (const p of platforms) day += counts[p ?? "__null"][i] ?? 0;
    if (day > max) max = day;
  }
  return { days: dayKeys, platforms, counts, maxCount: max };
}

function DailyChart({ series }: { series: DailySeries }) {
  const barWidth = 100 / series.days.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {series.platforms.map((p) => (
          <div key={p ?? "__null"} className="flex items-center gap-1.5">
            <span
              className={
                "inline-block h-2.5 w-2.5 rounded-sm " + colorFor(p)
              }
            />
            <span className="text-xs text-slate-600">
              {platformLabel(p)}
            </span>
          </div>
        ))}
      </div>
      <div
        className="relative overflow-hidden rounded border border-slate-200 bg-slate-50"
        style={{ height: 200 }}
        aria-label={`Daily sign-ins for the last ${series.days.length} days`}
      >
        {series.days.map((day, i) => {
          let offset = 0;
          const totalForDay = series.platforms.reduce(
            (n, p) => n + (series.counts[p ?? "__null"][i] ?? 0),
            0,
          );
          return (
            <div
              key={day}
              className="absolute bottom-0"
              style={{
                left: `${i * barWidth}%`,
                width: `${barWidth}%`,
                paddingLeft: 1,
                paddingRight: 1,
                height: series.maxCount
                  ? `${(totalForDay / series.maxCount) * 100}%`
                  : 0,
              }}
              title={`${day} · ${totalForDay} sign-ins`}
            >
              <div className="flex h-full w-full flex-col-reverse overflow-hidden rounded-sm">
                {series.platforms.map((p) => {
                  const c = series.counts[p ?? "__null"][i] ?? 0;
                  if (c === 0) return null;
                  const height =
                    totalForDay > 0 ? (c / totalForDay) * 100 : 0;
                  const el = (
                    <div
                      key={p ?? "__null"}
                      className={colorFor(p)}
                      style={{ height: `${height}%` }}
                    />
                  );
                  offset += height;
                  return el;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{series.days[0]}</span>
        <span>Max day: {formatNumber(series.maxCount)}</span>
        <span>{series.days[series.days.length - 1]}</span>
      </div>
    </div>
  );
}
