"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { format } from "date-fns";
import type { AiUsageRow } from "@/types/api";

interface Props {
  rows: AiUsageRow[];
  budgetUsd: number;
}

/**
 * Stacked-bar chart of the 14-day AI cost window (§6.2). A horizontal reference
 * line visualises the daily budget ceiling — when a bar crosses it, on-call
 * should already have been paged by the backend cron job.
 */
export function AiCostChart({ rows, budgetUsd }: Props) {
  // Pivot into shape { day, [model1]: cost, [model2]: cost, ... }
  const byDay = new Map<string, Record<string, number | string>>();
  const models = new Set<string>();

  for (const r of rows) {
    const day = format(new Date(r.day), "d MMM");
    const entry = byDay.get(day) ?? { day };
    entry[r.model] = (entry[r.model] as number | undefined ?? 0) + parseFloat(r.costUsd);
    models.add(r.model);
    byDay.set(day, entry);
  }

  const data = [...byDay.values()].sort((a, b) =>
    String(a.day).localeCompare(String(b.day)),
  );
  const modelList = [...models];

  const colors = ["#4f46e5", "#8b5cf6", "#06b6d4", "#f59e0b"];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={40} />
        <Tooltip
          contentStyle={{
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
          formatter={(v) => `$${Number(v).toFixed(2)}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine
          y={budgetUsd}
          stroke="#e11d48"
          strokeDasharray="4 4"
          label={{ value: "Daily budget", position: "right", fill: "#e11d48", fontSize: 10 }}
        />
        {modelList.map((m, i) => (
          <Bar
            key={m}
            dataKey={m}
            stackId="cost"
            fill={colors[i % colors.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
