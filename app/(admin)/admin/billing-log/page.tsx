"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import { RedactedJson } from "@/components/admin/redacted-json";
import { formatDateTime } from "@/lib/utils";
import type { BillingLog, BillingLogProcessStatus } from "@/types/api";

const STATUS_TONE: Record<BillingLogProcessStatus, string> = {
  received: "border-slate-300 bg-slate-50 text-slate-700",
  success: "border-emerald-300 bg-emerald-50 text-emerald-700",
  no_matching_payment:
    "border-rose-400 bg-rose-50 text-rose-700 font-semibold",
  duplicate: "border-amber-300 bg-amber-50 text-amber-700",
  error: "border-rose-300 bg-rose-50 text-rose-700",
};

const STATUS_LABEL: Record<BillingLogProcessStatus, string> = {
  received: "Received",
  success: "Success",
  no_matching_payment: "Alarm: no matching payment",
  duplicate: "Duplicate",
  error: "Error",
};

const PAGE_SIZE = 50;

export default function BillingLogPage() {
  const [statusFilter, setStatusFilter] = useState<
    BillingLogProcessStatus | "all"
  >("all");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      processStatus: statusFilter === "all" ? undefined : statusFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [statusFilter, page],
  );

  const { data, isLoading } = useQuery({
    queryKey: QK.BILLING_LOG(filters),
    queryFn: () =>
      unwrap<{ items: BillingLog[]; total: number }>(
        api.get("/admin/billing-log", {
          params: {
            limit: filters.limit,
            offset: filters.offset,
            ...(filters.processStatus
              ? { processStatus: filters.processStatus }
              : {}),
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
        title="Billing log"
        description="Append-only sink for every inbound webhook, with verbatim payload + processing audit. Filter by alarm status to spot webhooks for payments we never initiated — a fraud / mis-routing signal."
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as BillingLogProcessStatus | "all");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="received">Received (pending)</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="no_matching_payment">
              Alarm: no matching payment
            </SelectItem>
            <SelectItem value="duplicate">Duplicate</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-slate-500">
          {isLoading ? "…" : `${total} events`}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Provider</TableHead>
              <TableHead>Event type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Processed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : items.flatMap((evt) => [
                  <TableRow key={evt.id}>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() =>
                          setExpanded((x) => (x === evt.id ? null : evt.id))
                        }
                      >
                        {expanded === evt.id ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs">{evt.provider}</TableCell>
                    <TableCell className="text-xs">{evt.eventType}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {evt.reference ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${STATUS_TONE[evt.processStatus]}`}
                      >
                        {STATUS_LABEL[evt.processStatus]}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {formatDateTime(evt.receivedAt)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {evt.processedAt ? formatDateTime(evt.processedAt) : "—"}
                    </TableCell>
                  </TableRow>,
                  expanded === evt.id ? (
                    <TableRow key={`${evt.id}-expanded`}>
                      <TableCell colSpan={7} className="bg-slate-50">
                        {evt.processError ? (
                          <div className="mb-2 text-xs text-rose-700">
                            <span className="font-medium">Error:</span>{" "}
                            {evt.processError}
                          </div>
                        ) : null}
                        <RedactedJson value={evt.rawPayload} />
                      </TableCell>
                    </TableRow>
                  ) : null,
                ])}
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
