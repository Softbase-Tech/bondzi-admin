"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { RedactedJson } from "@/components/admin/redacted-json";
import {
  FINANCIAL_EVENT_LABEL,
  FINANCIAL_EVENT_TONE,
  FINANCIAL_SOURCE_LABEL,
} from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";
import type {
  FinancialEvent,
  FinancialEventSource,
  FinancialEventType,
} from "@/types/api";

const EVENT_TYPES: { value: FinancialEventType | ""; label: string }[] = [
  { value: "", label: "All event types" },
  { value: "activation", label: "Activation" },
  { value: "renewal", label: "Renewal" },
  { value: "cancellation", label: "Cancellation" },
  { value: "expiration", label: "Expiration" },
  { value: "refund", label: "Refund" },
  { value: "xp_redemption", label: "XP redemption" },
  { value: "xp_credit", label: "XP credit" },
  { value: "plan_change", label: "Plan change" },
  { value: "status_correction", label: "Status correction" },
];

const SOURCES: { value: FinancialEventSource | ""; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "webhook", label: "Webhook" },
  { value: "admin", label: "Admin" },
  { value: "system", label: "System" },
  { value: "user", label: "User" },
  { value: "job", label: "Job" },
];

/**
 * Admin "Billing log" page — surfaces the backend `financial_events`
 * table. Every activation / renewal / refund / cancellation lands here
 * regardless of source (webhook, admin action, scheduled job, user
 * self-service). The metadata column carries provider event ids and
 * references, all PII-scrubbed at write time.
 *
 * Why a separate page from /admin/payments:
 *   - /admin/payments shows the raw provider webhook envelopes
 *     (payment_events) — useful for debugging signature / ingestion.
 *   - /admin/financial-events shows the BUSINESS view (one row per
 *     money movement) regardless of provider.
 */
export default function FinancialEventsPage() {
  const [eventType, setEventType] = useState<FinancialEventType | "">("");
  const [source, setSource] = useState<FinancialEventSource | "">("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filters = {
    eventType: eventType || undefined,
    source: source || undefined,
    userId: userIdFilter.trim() || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: QK.FINANCIAL_EVENTS(filters),
    queryFn: () =>
      unwrap<FinancialEvent[]>(
        api.get("/admin/financial-events", { params: filters }),
      ),
  });

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing log"
        description="Every money-touching event — activations, renewals, refunds, XP redemptions — independent of payment provider."
      />

      <Card className="p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Event type
            </label>
            <select
              value={eventType}
              onChange={(e) =>
                setEventType(e.target.value as FinancialEventType | "")
              }
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Source
            </label>
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as FinancialEventSource | "")
              }
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              User ID (uuid)
            </label>
            <input
              type="text"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="9b5e0e10-3f7a-…"
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs"
            />
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Event</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>User</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.length === 0
                ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-12 text-center text-slate-500"
                      >
                        No financial events match these filters.
                      </TableCell>
                    </TableRow>
                  )
                : rows.flatMap((row) => {
                    const hasMeta =
                      row.metadata !== null &&
                      Object.keys(row.metadata).length > 0;
                    const isOpen = expanded === row.id;
                    return [
                      <TableRow key={row.id}>
                        <TableCell className="p-0 pl-2">
                          {hasMeta && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setExpanded(isOpen ? null : row.id)
                              }
                              aria-label={isOpen ? "Collapse" : "Expand"}
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
                              FINANCIAL_EVENT_TONE[row.eventType],
                            )}
                          >
                            {FINANCIAL_EVENT_LABEL[row.eventType]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {FINANCIAL_SOURCE_LABEL[row.source]}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.amountMinor !== null
                            ? `${row.currency ?? ""} ${(
                                row.amountMinor / 100
                              ).toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-500">
                          {row.userId ? row.userId.slice(0, 8) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                      </TableRow>,
                      isOpen ? (
                        <TableRow key={`${row.id}-detail`}>
                          <TableCell colSpan={6} className="bg-slate-50">
                            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              Metadata
                            </div>
                            <RedactedJson value={row.metadata} />
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ];
                  })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
