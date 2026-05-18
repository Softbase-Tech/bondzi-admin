"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJobProgress } from "@/hooks/use-job-progress";
import { formatNumber, formatUSD } from "@/lib/utils";
import { AI_JOB_STATUS_LABEL, AI_JOB_STATUS_TONE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function JobProgressPanel({ jobId }: { jobId: string }) {
  const { progress, connected, error } = useJobProgress(jobId);

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;
  const etaMin =
    progress?.etaSeconds != null ? Math.ceil(progress.etaSeconds / 60) : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-900">
          Generation progress
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {progress?.status ? (
            <span
              className={cn(
                "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
                AI_JOB_STATUS_TONE[progress.status],
              )}
            >
              {progress.status === "running" && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              {AI_JOB_STATUS_LABEL[progress.status]}
            </span>
          ) : (
            <Badge variant="outline">Connecting…</Badge>
          )}
          <span className={connected ? "text-emerald-600" : "text-slate-400"}>
            {connected ? "● live" : "○"}
          </span>
        </div>
      </div>

      <div>
        <Progress value={pct} />
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>
            {formatNumber(progress?.processed ?? 0)} /{" "}
            {formatNumber(progress?.total ?? 0)}
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <div className="uppercase tracking-wide text-slate-500">Rate</div>
          <div className="font-semibold text-slate-900">
            {(progress?.rate ?? 0).toFixed(1)} /s
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-slate-500">Cost</div>
          <div className="font-semibold text-slate-900">
            {formatUSD(progress?.costUsdSoFar ?? 0)}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-slate-500">Failed</div>
          <div
            className={cn(
              "font-semibold",
              (progress?.failed ?? 0) > 0 ? "text-rose-600" : "text-slate-900",
            )}
          >
            {formatNumber(progress?.failed ?? 0)}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-slate-500">ETA</div>
          <div className="font-semibold text-slate-900">
            {etaMin == null ? "—" : `~${etaMin}m`}
          </div>
        </div>
      </div>

      {progress?.status === "completed" && (
        <div className="flex items-center justify-between gap-2 text-sm text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Completed successfully.
          </div>
          {progress.failed > 0 && (
            <Button asChild size="sm" variant="outline">
              <a
                href={`/api/admin/ai-generation/jobs/${jobId}/failures.csv`}
                download
              >
                <Download className="h-3.5 w-3.5" /> Failure report (
                {formatNumber(progress.failed)})
              </a>
            </Button>
          )}
        </div>
      )}
      {progress?.status === "failed" && (
        <div className="flex items-center justify-between gap-2 text-sm text-rose-700">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Job failed — check error log.
          </div>
          <Button asChild size="sm" variant="outline">
            <a
              href={`/api/admin/ai-generation/jobs/${jobId}/failures.csv`}
              download
            >
              <Download className="h-3.5 w-3.5" /> Download log
            </a>
          </Button>
        </div>
      )}
      {error && progress?.status !== "completed" && (
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <AlertTriangle className="h-3 w-3" /> {error}
        </div>
      )}
    </Card>
  );
}
