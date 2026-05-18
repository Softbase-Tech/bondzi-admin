"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
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
import { formatNumber } from "@/lib/utils";

interface CalibrationRow {
  model: string;
  action: string;
  n: number;
  p50_input: number;
  p50_output: number;
  p95_output: number;
}

/**
 * Surfaces actual P50 / P95 of input + output tokens from ai_usage_log,
 * scoped to the chosen window. Use this after ~a week of real traffic
 * to recalibrate the hardcoded TOKEN_ESTIMATES in the backend's
 * estimates.util.ts so the cost-gate stops under-counting.
 *
 * The endpoint clamps `days` to [1, 90]; the dropdown matches.
 */
const WINDOWS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export function CalibrationPanel() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useQuery({
    queryKey: QK.AI_EXPLANATIONS_CALIBRATION(days),
    queryFn: () =>
      unwrap<CalibrationRow[]>(
        api.get("/admin/explanations/calibration", { params: { days } }),
      ),
  });

  const rows = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-primary" />
            Token-estimate calibration
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            P50 / P95 actual tokens per (model, action). Bump
            TOKEN_ESTIMATES in the backend if these drift from the hardcoded
            defaults (explanation: input 400 / output 200; pmTest: 300 / 450).
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          aria-label="Calibration window"
        >
          {WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Samples</TableHead>
              <TableHead className="text-right">P50 input</TableHead>
              <TableHead className="text-right">P50 output</TableHead>
              <TableHead className="text-right">P95 output</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-6 text-center text-sm text-slate-500"
                >
                  Not enough usage data in this window yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={`${r.model}-${r.action}`}>
                  <TableCell className="font-mono text-xs">
                    {r.model.replace(/^anthropic\./, "")}
                  </TableCell>
                  <TableCell className="text-sm">{r.action}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatNumber(r.n)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatNumber(Math.round(r.p50_input))}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatNumber(Math.round(r.p50_output))}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatNumber(Math.round(r.p95_output))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
