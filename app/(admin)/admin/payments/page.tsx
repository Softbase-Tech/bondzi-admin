"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { formatDateTime } from "@/lib/utils";
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
  const [statusFilter, setStatusFilter] = useState<PaymentAttemptStatus | "all">(
    "all",
  );
  const [alarmFilter, setAlarmFilter] = useState<AlarmFilter>("none");
  const [page, setPage] = useState(0);

  const filters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      alarm: alarmFilter === "none" ? undefined : alarmFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [statusFilter, alarmFilter, page],
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
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        description="Every checkout attempt we initiated, regardless of outcome. Use the status filter to drill into specific operational concerns — e.g. refund triage, or abandoned-cart sweeps."
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as PaymentAttemptStatus | "all");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-48">
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
          onValueChange={(v) => {
            setAlarmFilter(v as AlarmFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No alarm filter</SelectItem>
            <SelectItem value="duplicate_plus">
              Alarm: duplicate Plus charge — refund required
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-slate-500">
          {isLoading ? "…" : `${total} attempts`}
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

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || isLoading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </Button>
        <div className="text-xs text-slate-500">
          Page {page + 1} / {pages}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= pages || isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
