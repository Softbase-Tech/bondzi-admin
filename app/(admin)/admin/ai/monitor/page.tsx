"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatUSD } from "@/lib/utils";
import type { AiUsageBreakdown } from "@/types/api";

const PIE_COLORS = ["#4f46e5", "#8b5cf6", "#06b6d4", "#f59e0b", "#e11d48"];

export default function AiMonitorPage() {
  const { data, isLoading } = useQuery({
    queryKey: QK.AI_USAGE("30d"),
    queryFn: () => unwrap<AiUsageBreakdown>(api.get("/admin/ai/usage")),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI monitor"
        description="Claude + OpenAI spend. Anomalies here eat profit overnight — read this page daily."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost by model — past 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={aggregateByModel(data?.byDay ?? [])}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="model" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={40} />
                  <Tooltip
                    contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v) => `$${Number(v).toFixed(2)}`}
                  />
                  <Bar dataKey="costUsd" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By action type</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={(data?.byAction ?? []).map((a) => ({
                      name: a.action,
                      value: parseFloat(a.costUsd),
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {(data?.byAction ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v) => `$${Number(v).toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top consumers — past 30 days</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={3}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : (data?.topUsers ?? []).map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell className="font-mono text-xs">
                        {u.userId}
                      </TableCell>
                      <TableCell>{u.calls}</TableCell>
                      <TableCell>{formatUSD(parseFloat(u.costUsd))}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function aggregateByModel(rows: Array<{ model: string; costUsd: string }>) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.model, (map.get(r.model) ?? 0) + parseFloat(r.costUsd));
  }
  return [...map.entries()].map(([model, costUsd]) => ({ model, costUsd }));
}
