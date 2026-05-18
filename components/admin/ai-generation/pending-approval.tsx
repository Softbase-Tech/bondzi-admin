"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { ShieldCheck, X } from "lucide-react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, formatNumber, formatUSD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AI_JOB_STATUS_LABEL, AI_JOB_STATUS_TONE } from "@/lib/constants";
import type { AiGenerationJob } from "@/types/api";

/**
 * High-cost AI jobs (cost > AI_COSIGN_THRESHOLD_USD on the backend) land
 * in `status='pending_approval'` instead of running. A SECOND admin (≠
 * creator) must approve before the BullMQ processor picks the job up.
 *
 * UX rules baked in here:
 *   - Approve button is disabled when the current session user is the
 *     same admin that created the job. The backend's DB CHECK +
 *     400 BadRequest would surface this anyway; the disabled UI prevents
 *     the confused click.
 *   - Reject requires a free-text reason — the backend records it on
 *     the job's errorLog so future forensics can see why we said no.
 *   - The estimated cost is the headline. That's why the job is here.
 */
export function PendingApprovalPanel() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const currentAdminId = session?.user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: QK.AI_EXPLANATIONS_PENDING_APPROVAL(),
    queryFn: () =>
      unwrap<AiGenerationJob[]>(
        api.get("/admin/explanations/pending-approval"),
      ),
    refetchInterval: 30_000,
  });

  const approve = useMutation({
    mutationFn: (jobId: string) =>
      unwrap<AiGenerationJob>(
        api.post(`/admin/explanations/jobs/${jobId}/approve`),
      ),
    onSuccess: async () => {
      toast.success("Job approved — queued for processing.");
      await Promise.all([
        qc.invalidateQueries({
          queryKey: QK.AI_EXPLANATIONS_PENDING_APPROVAL(),
        }),
        qc.invalidateQueries({ queryKey: ["ai", "generation", "jobs"] }),
      ]);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Approval failed");
    },
  });

  const [rejectTarget, setRejectTarget] = useState<AiGenerationJob | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");

  const reject = useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason: string }) =>
      unwrap<AiGenerationJob>(
        api.post(`/admin/explanations/jobs/${jobId}/reject`, { reason }),
      ),
    onSuccess: async () => {
      toast.success("Job rejected.");
      setRejectTarget(null);
      setRejectReason("");
      await Promise.all([
        qc.invalidateQueries({
          queryKey: QK.AI_EXPLANATIONS_PENDING_APPROVAL(),
        }),
        qc.invalidateQueries({ queryKey: ["ai", "generation", "jobs"] }),
      ]);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Rejection failed");
    },
  });

  const rows = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            Pending approval
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Jobs above AI_COSIGN_THRESHOLD_USD waiting for a second admin.
          </p>
        </div>
        {rows.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
              AI_JOB_STATUS_TONE.pending_approval,
            )}
          >
            {rows.length} waiting
          </span>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Estimated cost</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                  No jobs awaiting approval.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((j) => {
                const isOwnJob = currentAdminId === j.triggeredBy;
                const inFlight =
                  approve.isPending && approve.variables === j.id;
                return (
                  <TableRow key={j.id}>
                    <TableCell className="text-sm">
                      {j.jobType === "explanation_bulk"
                        ? "Explanations"
                        : "PM Test"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatNumber(j.totalItems ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-amber-700">
                      {formatUSD(j.estimatedCostUsd ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {j.triggeredByName ?? j.triggeredBy.slice(0, 8)}
                      {isOwnJob && (
                        <span className="ml-2 text-xs text-amber-700">
                          (you)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDateTime(j.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectTarget(j)}
                          disabled={reject.isPending}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approve.mutate(j.id)}
                          disabled={isOwnJob || inFlight}
                          loading={inFlight}
                          title={
                            isOwnJob
                              ? "Co-sign requires a different admin than the creator."
                              : undefined
                          }
                        >
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this job?</DialogTitle>
            <DialogDescription>
              The reason is recorded on the job for audit. The job moves to
              CANCELLED and cannot be re-approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">
              Reason
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. wrong filter — covers all subjects, not just maths"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectTarget) return;
                reject.mutate({
                  jobId: rejectTarget.id,
                  reason: rejectReason.trim() || "no reason given",
                });
              }}
              loading={reject.isPending}
            >
              Reject job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
