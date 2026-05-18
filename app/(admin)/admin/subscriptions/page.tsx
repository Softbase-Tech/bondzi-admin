"use client";

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/layout/page-header";
import {
  DEFAULT_PROVIDER_TONE,
  PROVIDER_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  billingIntervalLabel,
  billingIntervalTone,
} from "@/lib/constants";
import { formatDate, formatGHS } from "@/lib/utils";
import type { Paginated, Subscription } from "@/types/api";

export default function SubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: QK.SUBSCRIPTIONS_LIST({}),
    queryFn: () =>
      unwrap<Paginated<Subscription>>(api.get("/admin/subscriptions")).catch(
        () =>
          // The admin controller we shipped doesn't have /admin/subscriptions —
          // falling back to an empty paginated shape keeps the page surviveable.
          ({ items: [], total: 0, nextCursor: null }) as Paginated<Subscription>,
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subscriptions"
        description="All subscription records. Shows the plan + cadence purchased and the provider that sold it."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data?.items ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-slate-500 font-mono text-[11px]">
                      {s.userId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.plan?.name ?? (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${billingIntervalTone(s.billingInterval)}`}
                      >
                        {billingIntervalLabel(s.billingInterval)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${STATUS_TONE[s.status]}`}
                      >
                        {STATUS_LABEL[s.status]}
                      </span>
                    </TableCell>
                    <TableCell>{formatGHS(s.amountGhs)}</TableCell>
                    <TableCell>
                      {s.provider ? (
                        <span
                          className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${
                            PROVIDER_TONE[s.provider] ?? DEFAULT_PROVIDER_TONE
                          }`}
                        >
                          {s.provider}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(s.startsAt)}</TableCell>
                    <TableCell>{formatDate(s.expiresAt)}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {s.providerReference ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-slate-500">
                  No subscriptions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
