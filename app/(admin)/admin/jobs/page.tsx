"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/layout/page-header";

interface QueueSummary {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

const FALLBACK: QueueSummary[] = [
  { name: "ai-explanations", waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
  { name: "notifications", waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
  { name: "leaderboard", waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
  { name: "subscriptions", waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
];

/**
 * Polls every 10s per spec §6.9. Backend endpoint /admin/jobs isn't in the
 * shipped NestJS admin controller yet — returning the fallback keeps the
 * page usable until that endpoint lands.
 */
export default function JobsPage() {
  const { data, isLoading } = useQuery({
    queryKey: QK.JOBS_STATUS(),
    queryFn: () =>
      unwrap<QueueSummary[]>(api.get("/admin/jobs")).catch(() => FALLBACK),
    refetchInterval: 10_000,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Job queues"
        description="BullMQ queue depths. Polls every 10 seconds."
        actions={
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <RefreshCw className="h-3 w-3" /> auto
          </span>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data ?? FALLBACK).map((q) => (
            <Card key={q.name}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{q.name.replace(/-/g, " ")}</span>
                  {q.failed > 0 ? (
                    <Badge variant="destructive">{q.failed} failed</Badge>
                  ) : (
                    <Badge variant="success">healthy</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold">{q.waiting}</div>
                  <div className="text-[11px] uppercase text-slate-500">Waiting</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-primary-deep">{q.active}</div>
                  <div className="text-[11px] uppercase text-slate-500">Active</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{q.completed}</div>
                  <div className="text-[11px] uppercase text-slate-500">Completed</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
