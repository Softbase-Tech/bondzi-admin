"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
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
import { Search, Share2 } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExamTypeBadge } from "@/components/admin/shared/exam-type-badge";
import type {
  ReferralChainRow,
  ReferralMetrics,
  TopReferrerRow,
} from "@/types/api";

export default function ReferralsPage() {
  const qc = useQueryClient();
  const [chainQuery, setChainQuery] = useState("");
  const [chainSubmitted, setChainSubmitted] = useState("");
  const [template, setTemplate] = useState("");

  const { data: metrics, isLoading } = useQuery({
    queryKey: QK.REFERRAL_METRICS(),
    queryFn: () =>
      unwrap<ReferralMetrics>(api.get("/admin/referrals/metrics")),
  });

  const { data: topReferrers } = useQuery({
    queryKey: QK.REFERRAL_TOP({ limit: 50 }),
    queryFn: () =>
      unwrap<TopReferrerRow[]>(
        api.get("/admin/referrals/top", { params: { limit: 50 } }),
      ),
  });

  const { data: chain, isFetching: chainLoading } = useQuery({
    queryKey: QK.REFERRAL_CHAIN(chainSubmitted),
    enabled: !!chainSubmitted,
    queryFn: () =>
      unwrap<ReferralChainRow[]>(
        api.get("/admin/referrals/chain", { params: { q: chainSubmitted } }),
      ),
  });

  const { data: shareTemplate } = useQuery({
    queryKey: QK.REFERRAL_SHARE_TEMPLATE(),
    queryFn: () =>
      unwrap<{ template: string }>(api.get("/admin/referrals/share-template")),
  });

  const saveTemplateMut = useMutation({
    mutationFn: (t: string) =>
      unwrap(api.patch("/admin/referrals/share-template", { template: t })),
    onSuccess: () => {
      toast.success("Share template updated");
      qc.invalidateQueries({ queryKey: QK.REFERRAL_SHARE_TEMPLATE() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  const effectiveTemplate = template || shareTemplate?.template || "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Referrals"
        description="Platform growth via referrals — signups, qualifications, top referrers."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricBox label="Total signups" value={metrics?.totalSignups} />
        <MetricBox
          label="Qualification rate"
          value={
            metrics
              ? `${Math.round(metrics.qualificationRate * 100)}%`
              : undefined
          }
        />
        <MetricBox label="Total XP issued" value={metrics?.totalXpIssued} />
        <MetricBox label="This week" value={metrics?.signupsThisWeek} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daily funnel — last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {metrics?.daily30d ? (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={metrics.daily30d}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(l) => formatDate(String(l))}
                  formatter={(v, k) => [formatNumber(Number(v)), String(k)]}
                />
                <Legend />
                <Bar dataKey="signups" fill="#6366f1" name="Signups" />
                <Bar dataKey="qualified" fill="#10b981" name="Qualified" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top referrers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Qualified</TableHead>
                <TableHead className="text-right">XP earned</TableHead>
                <TableHead>Last referral</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {topReferrers?.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell>
                    <ExamTypeBadge value={r.examType} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(r.totalReferrals)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="success">
                      {formatNumber(r.qualifiedReferrals)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(r.totalXpEarned)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {r.lastReferralAt ? formatDateTime(r.lastReferralAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {(topReferrers?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-slate-500">
                    No referrers yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral chain lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setChainSubmitted(chainQuery.trim());
            }}
          >
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                value={chainQuery}
                onChange={(e) => setChainQuery(e.target.value)}
                placeholder="Referral code or user name"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          {chainSubmitted && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred user</TableHead>
                  <TableHead>Qualified</TableHead>
                  <TableHead>Signup XP</TableHead>
                  <TableHead>Qualify XP</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chainLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {chain?.map((r) => (
                  <TableRow key={r.referredId}>
                    <TableCell className="font-medium">{r.referredName}</TableCell>
                    <TableCell>
                      {r.qualified ? (
                        <Badge variant="success">
                          {r.qualifiedAt ? formatDate(r.qualifiedAt) : "Yes"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.signupXpIssued ? "✓" : "—"}
                    </TableCell>
                    <TableCell>
                      {r.qualifyXpIssued ? "✓" : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
                {(chain?.length ?? 0) === 0 && !chainLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-slate-500">
                      No referrals found for &ldquo;{chainSubmitted}&rdquo;.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4" /> Share message template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Shown pre-filled in the mobile app when students tap &ldquo;Share my
            code.&rdquo; Use{" "}
            <code className="rounded bg-slate-100 px-1">{"{code}"}</code> as the
            referral-code placeholder.
          </p>
          <Textarea
            rows={4}
            value={effectiveTemplate}
            onChange={(e) => setTemplate(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Changes deploy instantly via config endpoint.
            </div>
            <Button
              loading={saveTemplateMut.isPending}
              disabled={!template || template === shareTemplate?.template}
              onClick={() => saveTemplateMut.mutate(template)}
            >
              Save template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: number | string | undefined;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">
        {value === undefined ? (
          <Skeleton className="h-7 w-16" />
        ) : typeof value === "number" ? (
          formatNumber(value)
        ) : (
          value
        )}
      </div>
    </Card>
  );
}
