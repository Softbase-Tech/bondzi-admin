"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/use-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/layout/page-header";
import { TablePager } from "@/components/admin/shared/table-pager";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { PaymentAttempt, PaymentAttemptStatus } from "@/types/api";

const STATUS_TONE: Record<PaymentAttemptStatus, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  paid: "border-emerald-300 bg-emerald-50 text-emerald-700",
  failed: "border-rose-300 bg-rose-50 text-rose-700",
  refunded: "border-slate-300 bg-slate-50 text-slate-700",
  abandoned: "border-slate-200 bg-slate-50 text-slate-500",
};

const PAGE_SIZE = 50;

type AlarmFilter = "none" | "duplicate_plus";

export default function PaymentsPage() {
  const [statusFilter, setStatusFilterRaw] = useState<
    PaymentAttemptStatus | "all"
  >("all");
  const [alarmFilter, setAlarmFilterRaw] = useState<AlarmFilter>("none");
  const { page, limit, setPage } = usePagination(PAGE_SIZE);

  const setStatusFilter = (v: PaymentAttemptStatus | "all") => {
    setStatusFilterRaw(v);
    setPage(1);
  };
  const setAlarmFilter = (v: AlarmFilter) => {
    setAlarmFilterRaw(v);
    setPage(1);
  };

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (alarmFilter !== "none" ? 1 : 0);
  const clearAllFilters = () => {
    setStatusFilterRaw("all");
    setAlarmFilterRaw("none");
    setPage(1);
  };

  const filters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      alarm: alarmFilter === "none" ? undefined : alarmFilter,
      limit,
      offset: (page - 1) * limit,
    }),
    [statusFilter, alarmFilter, page, limit],
  );

  const { data, isLoading } = useQuery({
    queryKey: QK.PAYMENT_ATTEMPTS(filters),
    queryFn: () =>
      unwrap<{ items: PaymentAttempt[]; total: number }>(
        api.get("/admin/payments", {
          params: {
            limit: filters.limit,
            offset: filters.offset,
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.alarm ? { alarm: filters.alarm } : {}),
          },
        }),
      ),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        description="Every checkout attempt we initiated, regardless of outcome. Use the status filter to drill into specific operational concerns — e.g. refund triage, or abandoned-cart sweeps."
      />

      <ReconcileCard />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as PaymentAttemptStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={alarmFilter}
          onValueChange={(v) => setAlarmFilter(v as AlarmFilter)}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No alarm filter</SelectItem>
            <SelectItem value="duplicate_plus">
              Alarm: duplicate Plus charge — refund required
            </SelectItem>
          </SelectContent>
        </Select>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        )}
        <div className="ml-auto text-sm text-slate-500">
          {isLoading ? "…" : `${formatNumber(total)} attempts`}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Initiated</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : items.map((row) => {
                  const resolvedAt =
                    row.paidAt ??
                    row.failedAt ??
                    row.refundedAt ??
                    row.abandonedAt;
                  const planLabel = row.plan
                    ? `${row.plan.account} · ${row.plan.level.toUpperCase()}`
                    : "—";
                  const alarmFlag =
                    row.metadata &&
                    typeof row.metadata === "object" &&
                    (row.metadata as Record<string, unknown>)
                      .alarmDuplicatePlus === true;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${STATUS_TONE[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.user ? (
                          <Link
                            href={`/admin/users/${row.userId}`}
                            className="text-slate-700 hover:underline"
                          >
                            {row.user.fullName ?? row.user.email ?? row.userId}
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px] text-slate-500">
                            {row.userId.slice(0, 8)}…
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {planLabel}
                        {row.billingInterval ? (
                          <span className="ml-1 text-slate-500">
                            · {row.billingInterval}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.currency} {Number(row.amountGhs).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-500">
                        {row.providerReference}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {formatDateTime(row.initiatedAt)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {resolvedAt ? formatDateTime(resolvedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {alarmFlag ? (
                          <span className="rounded-sm border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-700">
                            Duplicate Plus — refund
                          </span>
                        ) : row.failureReason ? (
                          <span
                            className="line-clamp-1 text-rose-700"
                            title={row.failureReason}
                          >
                            {row.failureReason}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </Card>

      <TablePager
        page={page}
        limit={limit}
        itemCount={items.length}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}

interface ReconcileResult {
  outcome: "already_recorded" | "verified_existing" | "reconciled";
  reference: string;
  userId: string;
  planId: string | null;
  account: string | null;
  level: string | null;
  interval: string | null;
  amountGhs: number | null;
}

/**
 * Repair tool for "money at Paystack, nothing in our books" (popup
 * channel-switch retries, missed webhooks). Backend verifies the
 * reference server-to-server with Paystack and, only on an exact
 * catalogue-price match, replays it through the normal activation
 * path — so the payment row, subscription, MRR and receipt email all
 * come out as if the payment had worked first time. The optional
 * overrides are for transactions whose metadata can't identify the
 * user or plan.
 */
function ReconcileCard() {
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState("");
  const [interval, setInterval_] = useState<string>("auto");
  const [result, setResult] = useState<ReconcileResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (): Promise<ReconcileResult> =>
      unwrap(
        api.post("/admin/payments/reconcile", {
          reference: reference.trim(),
          ...(userId.trim() ? { userId: userId.trim() } : {}),
          ...(planId.trim() ? { planId: planId.trim() } : {}),
          ...(interval !== "auto" ? { interval } : {}),
        }),
      ),
    onSuccess: (data) => {
      setResult(data);
      toast.success(
        data.outcome === "already_recorded"
          ? "Already recorded — nothing to do"
          : data.outcome === "verified_existing"
            ? "Existing attempt verified and activated"
            : "Transaction reconciled and account activated",
      );
      void qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (err: { message: string }) => {
      setResult(null);
      toast.error(err.message);
    },
  });

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Reconcile a Paystack transaction</h2>
        <p className="text-xs text-muted-foreground max-w-3xl">
          For money that exists at Paystack with no record here. The backend
          verifies the reference with Paystack directly and only activates on
          an exact catalogue-price match; the payment lands in the books
          through the same path as a normal checkout. User / plan / interval
          are only needed when the transaction metadata can&apos;t supply them
          (the error message will say so).
        </p>
      </div>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (reference.trim().length >= 6 && !mutation.isPending) {
            mutation.mutate();
          }
        }}
      >
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <Label htmlFor="rec-ref">Transaction reference</Label>
          <Input
            id="rec-ref"
            placeholder="e.g. T392794704738743 or pm_…"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rec-user">User ID (optional)</Label>
          <Input
            id="rec-user"
            placeholder="uuid"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rec-plan">Plan ID (optional)</Label>
          <Input
            id="rec-plan"
            placeholder="uuid"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Interval (recurring plans)</Label>
          <Select value={interval} onValueChange={setInterval_}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">From transaction metadata</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="six_month">6 months</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={reference.trim().length < 6}
          >
            Verify with Paystack &amp; reconcile
          </Button>
        </div>
      </form>
      {result ? (
        <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          <span className="font-semibold uppercase">{result.outcome.replace(/_/g, " ")}</span>
          {" · "}ref {result.reference}
          {" · "}user {result.userId}
          {result.account ? ` · ${result.account} ${result.level ?? ""}` : ""}
          {result.interval ? ` · ${result.interval}` : ""}
          {result.amountGhs !== null ? ` · GHS ${result.amountGhs.toFixed(2)}` : ""}
        </div>
      ) : null}
    </Card>
  );
}
