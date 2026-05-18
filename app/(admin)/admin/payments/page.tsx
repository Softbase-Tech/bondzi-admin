"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import {
  DEFAULT_PROVIDER_TONE,
  DEFAULT_WEBHOOK_TONE,
  PROVIDER_TONE,
  WEBHOOK_EVENT_TONE,
} from "@/lib/constants";
import type { PaymentEvent } from "@/types/api";

export default function PaymentsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.PAYMENT_EVENTS({}),
    queryFn: () =>
      unwrap<PaymentEvent[]>(api.get("/admin/payments")),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payment events"
        description="Every inbound webhook delivery across all providers, stored immutably. Click a row to see the raw JSON."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Provider</TableHead>
              <TableHead>Event type</TableHead>
              <TableHead>Event ID</TableHead>
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
              : (data ?? []).flatMap((evt) => [
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
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${
                          PROVIDER_TONE[evt.provider] ?? DEFAULT_PROVIDER_TONE
                        }`}
                      >
                        {evt.provider}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${WEBHOOK_EVENT_TONE[evt.eventType] ?? DEFAULT_WEBHOOK_TONE}`}
                      >
                        {evt.eventType}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {evt.providerEventId}
                    </TableCell>
                    <TableCell>
                      {evt.error ? (
                        <span className="text-xs text-rose-700">error</span>
                      ) : evt.processed ? (
                        <span className="text-xs text-emerald-700">
                          processed
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {formatDateTime(evt.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {evt.processedAt ? formatDateTime(evt.processedAt) : "—"}
                    </TableCell>
                  </TableRow>,
                  expanded === evt.id ? (
                    <TableRow key={`${evt.id}-expanded`}>
                      <TableCell colSpan={7} className="bg-slate-50">
                        {evt.error && (
                          <div className="mb-2 text-xs text-rose-700">
                            <span className="font-medium">Error:</span> {evt.error}
                          </div>
                        )}
                        <RedactedJson value={evt.rawPayload} />
                      </TableCell>
                    </TableRow>
                  ) : null,
                ])}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
