"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatDateTime, formatNumber, formatUSD } from "@/lib/utils";
import { AI_JOB_STATUS_LABEL, AI_JOB_STATUS_TONE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AiGenerationJob } from "@/types/api";

export function GenerationHistory() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: QK.AI_GENERATION_JOBS({ limit: 10 }),
    queryFn: () =>
      unwrap<AiGenerationJob[]>(
        api.get("/admin/ai-generation/jobs", { params: { limit: 10 } }),
      ),
    refetchInterval: 10_000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Generation history</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-180",
            )}
          />
          {open ? "Hide" : "Show last 10 jobs"}
        </Button>
      </CardHeader>
      {open && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Triggered by</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : (data ?? []).map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="text-sm">
                        {j.jobType === "explanation_bulk"
                          ? "Explanations"
                          : "PM Test"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
                            AI_JOB_STATUS_TONE[j.status],
                          )}
                        >
                          {AI_JOB_STATUS_LABEL[j.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(j.completedItems)} /{" "}
                        {formatNumber(j.totalItems ?? 0)}
                        {j.failedItems > 0 && (
                          <span className="ml-1 text-rose-600">
                            ({j.failedItems} failed)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatUSD(j.actualCostUsd ?? j.estimatedCostUsd ?? 0)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {j.triggeredByName ?? j.triggeredBy.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatDateTime(j.startedAt ?? j.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-6 text-center text-sm text-slate-500"
                  >
                    No jobs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
