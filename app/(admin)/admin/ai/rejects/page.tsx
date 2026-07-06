"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AiRejectAggRow, AiRejectLogPage } from "@/types/api";

/**
 * Admin reject-log browser. Two panels stacked:
 *   1. Weekly aggregate — trend view. One row per
 *      (week_start, reason, provider, model). Retained forever.
 *   2. Raw log — paginated, filterable by reason / provider / model.
 *      Rows older than 30 days are pruned by the retention job.
 *
 * Consumed endpoints (both admin-only, JWT + RolesGuard):
 *   GET /admin/ai/rejects       (raw, paged)
 *   GET /admin/ai/rejects/agg   (aggregate)
 */

const PAGE_SIZE = 50;

const PROVIDER_OPTIONS = [
  { label: "All providers", value: "__all__" },
  { label: "Bedrock", value: "bedrock" },
  { label: "Ollama", value: "ollama" },
];

export default function AiRejectsPage() {
  const [reason, setReason] = useState("");
  const [provider, setProvider] = useState<string>("__all__");
  const [modelFilter, setModelFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const filters = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      reason: reason.trim() || undefined,
      provider: provider === "__all__" ? undefined : provider,
      model: modelFilter.trim() || undefined,
    }),
    [offset, reason, provider, modelFilter],
  );

  const raw = useQuery({
    queryKey: QK.AI_REJECTS(filters),
    queryFn: () =>
      unwrap<AiRejectLogPage>(
        api.get("/admin/ai/rejects", { params: filters }),
      ),
  });

  const agg = useQuery({
    queryKey: QK.AI_REJECTS_AGG(),
    queryFn: () =>
      unwrap<AiRejectAggRow[]>(api.get("/admin/ai/rejects/agg")),
  });

  const total = raw.data?.total ?? 0;
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI reject log"
        description="Every AI generation that failed validation. Raw log kept 30 days; the weekly aggregate is retained forever for trend spotting."
      />

      <Card>
        <CardHeader>
          <CardTitle>Weekly aggregate</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week start</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agg.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (agg.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-slate-500 py-6">
                    No rejections logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                (agg.data ?? []).map((r, i) => (
                  <TableRow key={`${r.weekStart}-${r.reason}-${r.model}-${i}`}>
                    <TableCell className="font-mono text-xs">
                      {r.weekStart}
                    </TableCell>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell>{r.provider}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.model}
                    </TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Input
              placeholder="Reason filter (exact match)"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setOffset(0);
              }}
            />
            <Select
              value={provider}
              onValueChange={(v) => {
                setProvider(v);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Model (exact match)"
              value={modelFilter}
              onChange={(e) => {
                setModelFilter(e.target.value);
                setOffset(0);
              }}
            />
            <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
              {total > 0 ? (
                <span>
                  {showingFrom}–{showingTo} of {total}
                </span>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {raw.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (raw.data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-sm text-slate-500 py-6"
                    >
                      No rows match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  (raw.data?.items ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{row.action}</TableCell>
                      <TableCell>{row.reason}</TableCell>
                      <TableCell>{row.provider}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {row.model}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.jobId ? row.jobId.slice(0, 8) : "—"}
                      </TableCell>
                      <TableCell className="max-w-[400px] text-xs text-slate-600">
                        {row.detail ?? ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset === 0 || raw.isLoading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              ← Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                raw.isLoading || offset + PAGE_SIZE >= total
              }
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
