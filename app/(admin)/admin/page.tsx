"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  Coins,
  CreditCard,
  FlagTriangleRight,
  Gift,
  ListChecks,
  Share2,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import {
  formatDate,
  formatGHS,
  formatNumber,
  formatUSD,
} from "@/lib/utils";
import { MetricCard } from "@/components/admin/dashboard/metric-card";
import { AiCostChart } from "@/components/admin/dashboard/ai-cost-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AiUsageBreakdown, DashboardMetrics } from "@/types/api";

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: QK.DASHBOARD_METRICS(),
    queryFn: () => unwrap<DashboardMetrics>(api.get("/admin/dashboard")),
    refetchInterval: 5 * 60_000,
  });

  const { data: aiUsage } = useQuery({
    queryKey: QK.AI_USAGE("28d"),
    queryFn: () => unwrap<AiUsageBreakdown>(api.get("/admin/ai/usage")),
  });

  const xpIssued = metrics?.xpIssuedThisWeek ?? 0;
  const xpRedeemed = metrics?.xpRedeemedThisWeek ?? 0;
  const xpRatio = xpRedeemed > 0 ? xpIssued / xpRedeemed : Infinity;
  const xpHealthy = xpRatio >= 1;

  const beceCount = metrics?.activeUsersBece ?? 0;
  const wassceCount = metrics?.activeUsersWassce ?? 0;
  const novdecCount = metrics?.activeUsersNovdec ?? 0;
  const examSplit = [
    { name: "BECE", value: beceCount, fill: "#3b82f6" },
    { name: "WASSCE", value: wassceCount, fill: "#6366f1" },
    { name: "NOVDEC", value: novdecCount, fill: "#f97316" },
  ];

  const winnersPending =
    metrics?.winnersPendingWeeklyBece ||
    metrics?.winnersPendingWeeklyWassce ||
    metrics?.winnersPendingWeeklyNovdec;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">
          Platform health at a glance. Auto-refreshes every 5 minutes.
        </p>
      </div>

      {metrics && metrics.pendingFlags > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {metrics.pendingFlags} flagged questions awaiting review
          </AlertTitle>
          <AlertDescription>
            <Link
              href="/admin/flags"
              className="font-medium underline underline-offset-4"
            >
              Go to the flag queue →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {winnersPending && (
        <Alert variant="warning">
          <Gift className="h-4 w-4" />
          <AlertTitle>This week&rsquo;s winners have not been selected</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              Period ended{" "}
              {metrics?.winnersPeriodEndedAt
                ? formatDate(metrics.winnersPeriodEndedAt)
                : "—"}
              .
            </span>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link href="/admin/winners">Select winners →</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Users"
          value={formatNumber(metrics?.totalUsers ?? 0)}
          icon={Users}
          isLoading={isLoading}
        />
        <MetricCard
          label="MRR"
          value={formatGHS(metrics?.mrrGhs ?? 0)}
          icon={CreditCard}
          isLoading={isLoading}
        />
        <MetricCard
          label="AI cost today"
          value={formatUSD(metrics?.aiCostUsdToday ?? 0)}
          icon={Bot}
          isLoading={isLoading}
          tone={
            metrics && metrics.aiCostUsdToday > 40 ? "destructive" : "default"
          }
        />
        <MetricCard
          label="XP outstanding"
          value={formatNumber(metrics?.spendableXpOutstanding ?? 0)}
          icon={Coins}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-4 w-4" /> Referral funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  This week
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {formatNumber(metrics?.referralSignupsThisWeek ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Qualified
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {Math.round((metrics?.referralQualificationRate ?? 0) * 100)}%
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  XP today
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {formatNumber(metrics?.referralXpIssuedToday ?? 0)}
                </div>
              </div>
            </div>
            <div className="mt-4 h-24">
              {metrics?.referralDaily14d ? (
                <ResponsiveContainer width="100%" height={96}>
                  <BarChart data={metrics.referralDaily14d}>
                    <XAxis dataKey="day" hide />
                    <Tooltip
                      formatter={(v) => [formatNumber(Number(v)), "Signups"]}
                      labelFormatter={(l) => formatDate(String(l))}
                    />
                    <Bar dataKey="signups" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
            <Link
              href="/admin/referrals"
              className="mt-2 inline-flex text-sm text-primary-deep hover:text-primary"
            >
              View referral analytics →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4" /> XP economy health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Issued
                </div>
                <div className="mt-1 text-2xl font-semibold text-emerald-700">
                  {formatNumber(xpIssued)}
                </div>
              </div>
              <div className="text-slate-300">vs</div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Redeemed
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {formatNumber(xpRedeemed)}
                </div>
              </div>
            </div>
            {!isLoading &&
              (xpHealthy ? (
                <Badge variant="success" className="mt-3">
                  Healthy
                </Badge>
              ) : (
                <Badge variant="warning" className="mt-3">
                  Redemption &gt; earning — review thresholds
                </Badge>
              ))}
            <Link
              href="/admin/xp-economy"
              className="mt-3 inline-flex text-sm text-primary-deep hover:text-primary"
            >
              Open XP economy →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exam levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-24 w-24 shrink-0">
                {metrics ? (
                  <ResponsiveContainer width={96} height={96}>
                    <PieChart>
                      <Pie
                        data={examSplit}
                        dataKey="value"
                        innerRadius={22}
                        outerRadius={36}
                      >
                        {examSplit.map((s) => (
                          <Cell key={s.name} fill={s.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => formatNumber(Number(v))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-full w-full rounded-full" />
                )}
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                  BECE&nbsp;
                  <span className="font-semibold">
                    {formatNumber(beceCount)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  WASSCE&nbsp;
                  <span className="font-semibold">
                    {formatNumber(wassceCount)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                  NOVDEC&nbsp;
                  <span className="font-semibold">
                    {formatNumber(novdecCount)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600 grid grid-cols-2 gap-2">
              <div>
                <div className="text-slate-500">BECE questions</div>
                <div className="font-semibold text-slate-900">
                  {formatNumber(metrics?.questionsBece ?? 0)}
                  <span className="ml-1 text-slate-500 font-normal">
                    (
                    {metrics?.questionsBece
                      ? Math.round(
                          (metrics.questionsBeceExplained /
                            metrics.questionsBece) *
                            100,
                        )
                      : 0}
                    % explained)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-slate-500">
                  WASSCE questions
                  <span className="text-slate-400"> · shared with NOVDEC</span>
                </div>
                <div className="font-semibold text-slate-900">
                  {formatNumber(metrics?.questionsWassce ?? 0)}
                  <span className="ml-1 text-slate-500 font-normal">
                    (
                    {metrics?.questionsWassce
                      ? Math.round(
                          (metrics.questionsWassceExplained /
                            metrics.questionsWassce) *
                            100,
                        )
                      : 0}
                    % explained)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI cost — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {aiUsage ? (
              <AiCostChart rows={aiUsage.byDay} budgetUsd={50} />
            ) : (
              <Skeleton className="h-60 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" /> PM Test status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                BECE active:{" "}
                <span className="ml-1 font-semibold text-slate-900">
                  {formatNumber(metrics?.pmTestActiveBece ?? 0)}
                </span>
              </Badge>
              <Badge variant="outline">
                WASSCE active:{" "}
                <span className="ml-1 font-semibold text-slate-900">
                  {formatNumber(metrics?.pmTestActiveWassce ?? 0)}
                </span>
              </Badge>
              <Badge
                variant={
                  (metrics?.pmTestPendingReview ?? 0) > 0
                    ? "warning"
                    : "outline"
                }
              >
                Pending review:{" "}
                <span className="ml-1 font-semibold">
                  {formatNumber(metrics?.pmTestPendingReview ?? 0)}
                </span>
              </Badge>
              <Badge variant="outline">
                Last gen:{" "}
                <span className="ml-1 font-medium">
                  {metrics?.pmTestLastGenerationAt
                    ? formatDate(metrics.pmTestLastGenerationAt)
                    : "—"}
                </span>
              </Badge>
            </div>
            {(metrics?.pmTestPendingReview ?? 0) > 0 && (
              <Link
                href="/admin/pm-test/review"
                className="mt-3 inline-flex text-sm text-primary-deep hover:text-primary"
              >
                Open review queue →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlagTriangleRight className="h-4 w-4" /> Flag queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-semibold">
              {formatNumber(metrics?.pendingFlags ?? 0)}
            </div>
            <div className="text-xs text-slate-500">
              unresolved flags — fix before students notice.
            </div>
          </div>
          <Link
            href="/admin/flags"
            className="mt-3 inline-flex text-sm text-primary-deep hover:text-primary"
          >
            Open the queue →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
